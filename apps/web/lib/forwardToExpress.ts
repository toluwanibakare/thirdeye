import { Readable } from 'node:stream';
import http from 'node:http';
import type { IncomingMessage } from 'node:http';
import type { Express } from 'express';

/**
 * Bridges a Next.js App Router Web standard Request to an Express app handler
 * and returns a Web standard Response.
 */
export async function forwardToExpress(app: Express, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pathWithQuery = url.pathname + url.search;

  // Read request body into memory buffer
  let bodyBuffer: Buffer;
  try {
    const arrayBuffer = await request.arrayBuffer();
    bodyBuffer = Buffer.from(arrayBuffer);
  } catch {
    bodyBuffer = Buffer.alloc(0);
  }

  // First try proxying to standalone Express server on port 4000 if running
  try {
    const targetUrl = `http://localhost:4000${pathWithQuery}`;
    const headers = new Headers();
    request.headers.forEach((val, key) => {
      if (key.toLowerCase() !== 'host') headers.set(key, val);
    });

    const proxyRes = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) || bodyBuffer.length === 0 ? undefined : new Uint8Array(bodyBuffer),
      cache: 'no-store',
    });

    return proxyRes;
  } catch {
    /* Fallback to in-process Express app handler if port 4000 is unreachable */
  }

  return new Promise<Response>((resolve, reject) => {
    // Construct readable stream compatible with Node IncomingMessage
    const req = new Readable({
      read() {
        this.push(bodyBuffer);
        this.push(null);
      },
    }) as IncomingMessage;

    req.url = pathWithQuery;
    req.method = request.method;
    req.headers = {};
    request.headers.forEach((val, key) => {
      req.headers[key.toLowerCase()] = val;
    });

    if (bodyBuffer.length > 0 && !req.headers['content-length']) {
      req.headers['content-length'] = String(bodyBuffer.length);
    }

    const responseHeaders = new Headers();
    const chunks: Buffer[] = [];

    // Create ServerResponse mock
    const res = new http.ServerResponse(req);

    res.setHeader = (key: string, value: any) => {
      if (Array.isArray(value)) {
        responseHeaders.delete(key);
        value.forEach(v => responseHeaders.append(key, String(v)));
      } else {
        responseHeaders.set(key, String(value));
      }
      return res;
    };

    res.writeHead = (statusCode: number, ...args: any[]) => {
      res.statusCode = statusCode;
      for (const arg of args) {
        if (typeof arg === 'object' && arg !== null) {
          for (const [k, v] of Object.entries(arg)) {
            res.setHeader(k, v as any);
          }
        }
      }
      return res;
    };

    res.write = (chunk: any) => {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return true;
    };

    res.end = (chunk?: any) => {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const fullBody = Buffer.concat(chunks);
      resolve(
        new Response(fullBody, {
          status: res.statusCode || 200,
          headers: responseHeaders,
        })
      );
      return res;
    };

    try {
      (app as any).handle(req, res, (err: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(
            new Response(JSON.stringify({ error: 'Endpoint not found', path: pathWithQuery }), {
              status: 404,
              headers: { 'content-type': 'application/json' },
            })
          );
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}
