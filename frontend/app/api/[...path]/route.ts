import { NextRequest, NextResponse } from 'next/server';

// When PROXY_MODE=route (e.g. on Railway/Vercel where rewrites may not work),
// this catch-all route proxies /api/* to the Go backend.
// Otherwise, Next.js rewrites in next.config.mjs handle proxying with zero overhead.
const PROXY_ENABLED = process.env.PROXY_MODE === 'route';
const GOAPI_ORIGIN = process.env.GOAPI_ORIGIN || 'http://localhost:8080';

async function proxy(request: NextRequest, params: { path: string[] }, method: string) {
  if (!PROXY_ENABLED) {
    // Fall through to next.config.mjs rewrites
    return NextResponse.next();
  }

  const path = params.path.join('/');
  const searchParams = new URL(request.url).searchParams.toString();
  const queryString = searchParams ? `?${searchParams}` : '';
  const targetUrl = `${GOAPI_ORIGIN}/api/${path}${queryString}`;

  try {
    const response = await fetch(targetUrl, {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(method === 'POST' ? { body: await request.text() } : {}),
    });

    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Failed to proxy request' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxy(request, params, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxy(request, params, 'POST');
}
