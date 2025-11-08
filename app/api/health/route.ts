import { NextResponse } from 'next/server';
import { ApiResponse } from '@/types';

export async function GET() {
  const response: ApiResponse = {
    success: true,
    message: 'API is running',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    },
  };

  return NextResponse.json(response);
}
