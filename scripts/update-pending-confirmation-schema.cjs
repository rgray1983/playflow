const fs = require("fs");
const path = require("path");

const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (!schema.includes("READY")) {
  schema = schema.replace(
    /enum PartyStatus \{\n([\s\S]*?)\n\}/,
    `enum PartyStatus {\n  PENDING\n  CONFIRMED\n  READY\n  IN_PROGRESS\n  CLEANING_UP\n  COMPLETED\n  CANCELLED\n}`,
  );
}

const fieldBlock = `  workflowStep          String?\n  confirmationToken     String?   @unique\n  confirmationUrl       String?\n  confirmationExpiresAt DateTime?\n  confirmedAt           DateTime?\n  depositCapturedAt     DateTime?`;

if (!schema.includes("workflowStep")) {
  schema = schema.replace(
    /  status\s+PartyStatus @default\(PENDING\)\n/,
    `  status         PartyStatus @default(PENDING)\n${fieldBlock}\n`,
  );
}

if (!schema.includes("@@index([workflowStep])")) {
  schema = schema.replace(
    /  @@index\(\[status\]\)\n\}/,
    `  @@index([status])\n  @@index([workflowStep])\n  @@index([confirmationExpiresAt])\n}`,
  );
}

fs.writeFileSync(schemaPath, schema);
console.log("Updated prisma/schema.prisma for pending confirmation + party progress fields.");
