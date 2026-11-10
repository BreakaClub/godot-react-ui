import { Time } from 'godot';
import * as React from 'react';
import type { ComponentType } from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import * as library from 'godot-react-ui';
import type { ReactRoot } from 'godot-react-ui';
import { readProject, type LiveCompileHost } from './live-compile-host';
import { performRefresh, refreshHooks } from './live-compile-refresh';
import { LiveSession } from './live-compile-session';

const MICROSECONDS_PER_MILLISECOND = 1000;
/** A lab that imports the library by its source path (`text-styles-lab.tsx` does) means the package. */
const LIBRARY_SOURCE_PATH = '../../src';

export interface LiveSessionRequest {
  /**
   * The compiler and the checker. The caller owns it and closes it: one host serves every session of the page, because each host is a
   * thread, and a browser has a small pool of them.
   */
  readonly host: LiveCompileHost;
  readonly root: ReactRoot;
  /** The lab's id in the registry (`demo/src/labs.tsx`). */
  readonly labId: string;
  /** The name its first source file exports the lab's component under. */
  readonly exportName: string;
  /** The lab is rendered by `LiveSession.Lab` inside a tree the caller owns (the navigator's), and `root` is the root that tree is in. */
  readonly embedded?: boolean;
  /** What `LiveSession.Lab` renders until the lab has been compiled and run: the bundled lab. */
  readonly placeholder?: ComponentType;
}

/**
 * A live session of one lab, over this bundle's own React and library (the labs it compiles must use the same copies the root
 * does: two Reacts in one realm cannot share hooks). The editor phase calls this once for the lab it opens, then
 * `LiveSession.update` on each change.
 */
export function openLiveSession(request: LiveSessionRequest): LiveSession {
  return new LiveSession({
    ...request,
    project: readProject(),
    externals: { react: React, 'react/jsx-runtime': jsxRuntime, 'godot-react-ui': library },
    aliases: { [LIBRARY_SOURCE_PATH]: 'godot-react-ui' },
    refresh: refreshHooks,
    performRefresh,
    now: () => Time.getTicksUsec() / MICROSECONDS_PER_MILLISECOND,
  });
}
