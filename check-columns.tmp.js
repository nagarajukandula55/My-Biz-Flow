const fs = require("fs");
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) {
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const tables = process.argv.slice(2);

async function main() {
  for (const t of tables) {
    const cols = await prisma.$queryRawUnsafe(`
      select column_name, is_nullable, data_type
      from information_schema.columns
      where table_schema='public' and table_name = $1
      order by ordinal_position;
    `, t);
    console.log(`\n=== ${t} ===`);
    if (cols.length === 0) console.log("(table does not exist)");
    else console.log(cols.map(c => `${c.column_name} (${c.data_type}, nullable=${c.is_nullable})`).join("\n"));
  }
}
main().finally(() => prisma.$disconnect());
