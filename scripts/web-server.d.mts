import type { Server } from 'node:http';

export interface ExportServer {
  server: Server;
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
}): Promise<ExportServer>;
