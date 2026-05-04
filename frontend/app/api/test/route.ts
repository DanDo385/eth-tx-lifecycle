// Test API route to verify if API routes are working at all
import { NextResponse } from 'next/server';

export async function GET() {
  // Keep this endpoint available during local debugging only.
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_TEST_API_ROUTE !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ 
    message: 'API routes are working',
    timestamp: new Date().toISOString(),
    goApiOrigin: process.env.GOAPI_ORIGIN || 'not set'
  });
}
