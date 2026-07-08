const fs = require("fs");
const path = require("path");

const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (!schema.includes("READY") || !schema.includes("IN_PROGRESS") || !schema.includes("CLEANING_UP")) {
  schema = schema.replace(
    /enum PartyStatus \{[\s\S]*?\}/,
    `enum PartyStatus {
  PENDING
  CONFIRMED
  READY
  IN_PROGRESS
  CLEANING_UP
  COMPLETED
  CANCELLED
}`,
  );
}

if (!schema.includes("workflowStep")) {
  schema = schema.replace(
    /  status\s+PartyStatus @default\(PENDING\)\n/,
    `  status         PartyStatus @default(PENDING)
  workflowStep   Int         @default(0)
`,
  );
}

if (!schema.includes("confirmationToken")) {
  schema = schema.replace(
    /  inviteUrl\s+String\?\n/,
    `  inviteUrl      String?
  confirmationToken String? @unique
  confirmationUrl   String?
  pendingExpiresAt  DateTime?
  confirmedAt       DateTime?
`,
  );
}

if (!schema.includes("@@index([workflowStep])")) {
  schema = schema.replace(
    /  @@index\(\[status\]\)\n/, 
    `  @@index([status])
  @@index([workflowStep])
  @@index([pendingExpiresAt])
`,
  );
}

fs.writeFileSync(schemaPath, schema);
console.log("Updated prisma/schema.prisma for party workflowStep source-of-truth fields.");
