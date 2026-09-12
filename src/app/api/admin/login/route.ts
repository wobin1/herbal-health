import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validation/auth';
import { login, InvalidCredentialsError, AccountLockedError } from '@/server/services/auth-service';
import { errorResponse } from '@/lib/http/errors';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, 'INVALID_INPUT', 'Invalid login request');
  }

  const ipAddress = request.headers.get('x-forwarded-for');
  const userAgent = request.headers.get('user-agent');

  try {
    const result = await login(parsed.data.email, parsed.data.password, { ipAddress, userAgent });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      return errorResponse(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }
    if (error instanceof AccountLockedError) {
      return errorResponse(423, 'ACCOUNT_LOCKED', 'Account is temporarily locked');
    }
    console.error('[admin/login] unexpected error', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to process login');
  }
}
