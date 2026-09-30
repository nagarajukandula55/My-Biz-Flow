const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Every dependency is supplied explicitly, so tests cannot reach live services.
module.exports = function loadModule(file, mocks = {}, globals = {}) {
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports, Buffer, URL, AbortSignal, console,
    require(name) {
      if (!(name in mocks)) throw new Error(`Unmocked dependency: ${name}`);
      return mocks[name];
    },
    ...globals,
  }, { filename: file });
  return exports;
};
