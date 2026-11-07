interface Env {
  ASSET_UPLOADS_BUCKET: {
    get(key: string): Promise<any>;
    head?(key: string): Promise<any>;
  };
  REACT_DEMO_R2_PREFIX?: string;
}

const CrossOriginIsolatedHeaders: Record<string, string> = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'cross-origin',
};

const DefaultR2Prefix = 'react-demo/current';

const contentTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.pck': 'application/octet-stream',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function getFileExtension(path: string): string {
  const lastDot = path.lastIndexOf('.');
  return lastDot >= 0 ? path.slice(lastDot).toLowerCase() : '';
}

function normalizeRequestPath(url: URL): string {
  const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
  const segments = pathname.split('/').filter(Boolean);
  if (segments.some(s => s === '.' || s === '..')) {
    throw new Error(`Invalid path: ${pathname}`);
  }
  return segments.join('/');
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestUrl = new URL(request.url);

    // Bare root without search params redirects to the Lab Navigator
    if (requestUrl.pathname === '/' && requestUrl.search === '') {
      return Response.redirect(new URL('/?demo=navigator', request.url), 302);
    }

    let relativePath: string;
    try {
      relativePath = normalizeRequestPath(requestUrl);
    } catch {
      return new Response('Bad Request', { status: 400 });
    }

    const prefix = (env.REACT_DEMO_R2_PREFIX || DefaultR2Prefix).replace(/^\/+|\/+$/g, '');
    const objectKey = `${prefix}/${relativePath}`;

    const ifNoneMatch = request.headers.get('if-none-match');
    const object = await env.ASSET_UPLOADS_BUCKET.get(objectKey);

    if (!object) {
      return new Response('Not Found', { status: 404 });
    }

    const headers = new Headers();
    if (typeof object.writeHttpMetadata === 'function') {
      object.writeHttpMetadata(headers);
    }

    const etag = object.httpEtag ?? object.etag;
    if (etag) {
      headers.set('ETag', etag);
      if (ifNoneMatch && (ifNoneMatch === etag || ifNoneMatch === `W/${etag}` || `W/${ifNoneMatch}` === etag)) {
        for (const [k, v] of Object.entries(CrossOriginIsolatedHeaders)) {
          headers.set(k, v);
        }
        return new Response(null, { status: 304, headers });
      }
    }

    // MIME type fallback
    const ext = getFileExtension(relativePath);
    if (contentTypes[ext]) {
      headers.set('Content-Type', contentTypes[ext]);
    }

    // Cache control
    if (ext === '.html') {
      headers.set('Cache-Control', 'no-store');
    } else {
      headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=86400');
    }

    // Cross-origin isolation headers for SharedArrayBuffer / Wasm threads
    for (const [k, v] of Object.entries(CrossOriginIsolatedHeaders)) {
      headers.set(k, v);
    }

    return new Response(request.method === 'HEAD' ? null : object.body, {
      status: 200,
      headers,
    });
  },
};
