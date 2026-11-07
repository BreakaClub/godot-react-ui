import type { Server } from 'node:http';

/** One request for an object served from `objects`. */
export interface ObjectRequest {
  /** `/o/<hash>/<name>` */
  path: string;
  method: string;
  /** The size of the object; 0 for one that does not exist. */
  bytes: number;
  missing: boolean;
}

export interface ExportServer {
  server: Server;
  /** Every request for an object, in order (see `objects`). */
  objectRequests: ObjectRequest[];
  port: number;
  /** `http://127.0.0.1:<port>/` */
  url: string;
  close(): Promise<void>;
}

export function startExportServer(options: {
  root: string;
  port?: number;
  /** A query string (`?demo=navigator`) that a request for the bare address `/` is redirected to. */
  landing?: string;
  /** A directory of `<hash>/<name>` files served at `/o/<hash>/<name>`: the font slices. */
  objects?: string;
}): Promise<ExportServer>;
