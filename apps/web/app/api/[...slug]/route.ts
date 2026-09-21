import { app } from 'thirdeye-api/app';
import { forwardToExpress } from '@/lib/forwardToExpress';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return forwardToExpress(app, request);
}

export async function POST(request: Request) {
  return forwardToExpress(app, request);
}

export async function PUT(request: Request) {
  return forwardToExpress(app, request);
}

export async function PATCH(request: Request) {
  return forwardToExpress(app, request);
}

export async function DELETE(request: Request) {
  return forwardToExpress(app, request);
}

export async function OPTIONS(request: Request) {
  return forwardToExpress(app, request);
}
