const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const source = fs.readFileSync('src/lib/designer/modules.ts','utf8');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:exportsObject});
const registry = fs.readFileSync('src/lib/designer/registerAll.ts','utf8');
const modules = exportsObject.MODULES.map(module => {
 const root = `src/app/partner/[partnerId]/${module.slug}`;
 const pages = fs.readdirSync(root,{recursive:true}).filter(file=>file.endsWith('page.tsx')).map(file=>file.replaceAll('\\','/'));
 const missingImports = pages.filter(file=>!registry.includes(`${module.slug}/${file.replace(/\.tsx$/,'')}`));
 const missingDefinitions = pages.filter(file=>!fs.readFileSync(`${root}/${file}`,'utf8').includes('registerPage('));
 return { id:module.slug, module:module.label, pages:pages.length, entryRoute:fs.existsSync(`${root}/page.tsx`),
  missingImports, missingDefinitions, workflowStatus:module.slug==='service-centre'?'Live data - regression testing required':'End-to-end validation required' };
});
const report = { scope:'Static route and Designer coverage only; not a runtime readiness certificate.', modules };
fs.mkdirSync('docs',{recursive:true});
fs.writeFileSync('docs/module-coverage.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({modules:modules.length,pages:modules.reduce((n,m)=>n+m.pages,0),missingImports:modules.flatMap(m=>m.missingImports),missingDefinitions:modules.flatMap(m=>m.missingDefinitions)}));
