// A react-dom that exists only so `require('react-dom')` resolves (slate-react does at the top of its CJS bundle).
// flushSync(fn) and unstable_batchedUpdates(fn) just run fn; createPortal is absent on purpose.
exports.flushSync = (callback) => callback();
exports.unstable_batchedUpdates = (callback, a) => callback(a);
exports.__stub = true;
