const assert = require('node:assert/strict'), test = require('node:test'), fs = require('node:fs');
const load = require('./loadModule.cjs');
test('partner catalog snapshot matches actual page metadata', () => {
 require('node:child_process').execFileSync(process.execPath, ['scripts/export-designer-catalog.cjs', '--check']);
});
test('all module entry routes and partner pages remain discoverable by Designer', () => {
 const modules=load('src/lib/designer/modules.ts').MODULES;
 const imports=fs.readFileSync('src/lib/designer/registerAll.ts','utf8');
 for (const module of modules) {
  const root=`src/app/partner/[partnerId]/${module.slug}`;
  assert.ok(fs.existsSync(`${root}/page.tsx`),`${module.slug} entry route`);
  for(const file of fs.readdirSync(root,{recursive:true}).filter(file=>file.endsWith('page.tsx'))) {
   const normalized=file.replaceAll('\\','/');
   assert.ok(fs.readFileSync(`${root}/${file}`,'utf8').includes('registerPage('),`${module.slug}/${normalized} metadata`);
   assert.ok(imports.includes(`${module.slug}/${normalized.replace(/\.tsx$/,'')}`),`${module.slug}/${normalized} import`);
  }
 }
});
