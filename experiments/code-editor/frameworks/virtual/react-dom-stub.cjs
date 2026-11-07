// A react-dom that exists only so `import { flushSync } from 'react-dom'` resolves (@tanstack/react-virtual does it at
// the top of its module). There is no react-dom in godot-react-ui's dependencies. flushSync(fn) just runs fn.
exports.flushSync = (callback) => { callback(); };
exports.__stub = true;
