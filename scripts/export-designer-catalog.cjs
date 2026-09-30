// Extract literal page metadata without importing or executing application code.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function literal(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(node.properties.map(property => {
    if (!ts.isPropertyAssignment(property)) throw new Error('Literal metadata required');
    return [property.name.text, literal(property.initializer)];
  }));
  throw new Error('Nonliteral page metadata: ' + node.getText());
}
const root = path.join('src', 'app', 'partner', '[partnerId]');
const pages = [];
for (const file of fs.readdirSync(root, { recursive: true }).filter(file => file.endsWith('page.tsx'))) {
  const sourceFile = path.join(root, file).replaceAll('\\', '/');
  const ast = ts.createSourceFile(sourceFile, fs.readFileSync(sourceFile, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText() === 'registerPage') pages.push(literal(node.arguments[0]));
    ts.forEachChild(node, visit);
  }
  visit(ast);
}
const ids = new Set();
for (const page of pages) {
  if (ids.has(page.id)) throw new Error('Duplicate page ID: ' + page.id);
  ids.add(page.id);
}
pages.sort((a, b) => a.id.localeCompare(b.id));
const output = JSON.stringify(pages, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (fs.readFileSync('docs/partner-designer-catalog.json', 'utf8').replaceAll('\r\n', '\n') !== output) throw new Error('Partner catalog is stale; regenerate it and refresh the Admin copy.');
} else fs.writeFileSync('docs/partner-designer-catalog.json', output);
console.log(`Exported ${pages.length} partner page definitions.`);
