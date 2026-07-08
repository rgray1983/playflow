const fs = require("fs");
const path = require("path");

const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
const schema = fs.readFileSync(schemaPath, "utf8");

const nextEnum = `enum PartyStatus {
  PENDING
  CONFIRMED
  READY
  IN_PROGRESS
  CLEANING_UP
  COMPLETED
  CANCELLED
}`;

const updated = schema.replace(/enum PartyStatus \{[\s\S]*?\n\}/, nextEnum);

if (updated === schema) {
  console.error("Could not find PartyStatus enum in prisma/schema.prisma");
  process.exit(1);
}

fs.writeFileSync(schemaPath, updated);
console.log("Updated PartyStatus enum in prisma/schema.prisma");
