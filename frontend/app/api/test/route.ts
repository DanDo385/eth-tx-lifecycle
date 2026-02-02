// Test API route to verify if API routes are working at all
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: 'API routes are working',
    timestamp: new Date().toISOString(),
    goApiOrigin: process.env.GOAPI_ORIGIN || 'not set'
  });
}
