// Simulates a bundler `alias` for `react` and `react/jsx-runtime`, limited to files under the named packages in overlay/node_modules.
// Libraries compiled to CommonJS call `React.createElement("div", ...)` on THEIR require('react'); this hands those files a React whose
// createElement / jsx go through the DOM shim and which is otherwise the same React (same hooks, same instance).
import Module from 'node:module';
import path from 'node:path';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { shimCreateElement, shimJsx } from './dom-shim';

type Loader = (request: string, parent: { filename?: string } | undefined, isMain: boolean) => unknown;
const internals = Module as unknown as { _load: Loader }; // Module._load is Node-internal; this is probe code simulating a bundler alias.

export function installShim(packages: readonly string[]): void {
  const original = internals._load;
  const roots = packages.map((name) => path.join(__dirname, '../node_modules', name) + path.sep);
  const shimmedReact = { ...React, createElement: shimCreateElement, default: undefined as unknown };
  shimmedReact.default = shimmedReact;
  const shimmedRuntime = { ...jsxRuntime, jsx: shimJsx, jsxs: shimJsx, jsxDEV: shimJsx };
  internals._load = function load(this: unknown, request, parent, isMain) {
    const from = parent?.filename;
    if (from !== undefined && roots.some((root) => from.startsWith(root))) {
      if (request === 'react') return shimmedReact;
      if (request === 'react/jsx-runtime' || request === 'react/jsx-dev-runtime') return shimmedRuntime;
    }
    return original.call(this, request, parent, isMain);
  };
}
