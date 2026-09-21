import { app } from 'thirdeye-api/app';
import { forwardToExpress } from '@/lib/forwardToExpress';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return forwardToExpress(app, request);
}

export async function OPTIONS(request: Request) {
  return forwardToExpress(app, request);
}
