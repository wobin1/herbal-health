import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { logout } from '@/server/services/auth-service';
import { getAdminSession } from '@/lib/auth/require-admin';
import { errorResponse } from '@/lib/http/errors';

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!session || !token) {
    return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
  }

  await logout(token, session.adminUser.id, request.headers.get('x-forwarded-for'));

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, '', { path: '/', maxAge: 0 });
  return response;
}
