// Resolve a bare module name to a stub, for packages that import something godot-react-ui does not have (react-dom,
// react-native). Load it FIRST in a probe: `import './alias'`, then `installAlias({...})` before requiring the package.
const Module = require('node:module');
const original = Module._resolveFilename;
const table = new Map();
Module._resolveFilename = function resolveWithAlias(request, ...rest) {
  const target = table.get(request);
  if (target !== undefined) return target;
  return original.call(this, request, ...rest);
};
exports.installAlias = (name, file) => { table.set(name, file); };
