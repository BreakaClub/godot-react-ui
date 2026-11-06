import type { Server } from 'node:http';

export interface ExportServer {
  server: Server;
  port: number;
  /** `http://127.0.0.1:<port>/` */
  url: string;
  close(): Promise<void>;
}

export function startExportServer(options: { root: string; port?: number }): Promise<ExportServer>;
