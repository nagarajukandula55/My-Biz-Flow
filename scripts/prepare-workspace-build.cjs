// Isolated build copy: excludes all deployment environment files and customer data.
const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const target = path.join(root, '.local-test-db', 'workspace-readiness-build');
fs.mkdirSync(target, { recursive: true });
for (const folder of ['src', 'public', 'prisma', 'data', 'scripts']) {
  if (fs.existsSync(path.join(root, folder))) fs.cpSync(path.join(root, folder), path.join(target, folder), { recursive: true });
}
for (const file of ['package.json', 'package-lock.json', 'next.config.mjs', 'next-env.d.ts', 'tsconfig.json', 'tailwind.config.ts', 'postcss.config.js']) {
  fs.copyFileSync(path.join(root, file), path.join(target, file));
}
if (!fs.existsSync(path.join(target, 'node_modules'))) fs.symlinkSync(path.join(root, 'node_modules'), path.join(target, 'node_modules'), 'junction');
console.log(target);
