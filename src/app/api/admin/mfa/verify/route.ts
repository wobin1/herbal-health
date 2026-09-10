import { NextRequest, NextResponse } from 'next/server';
import { mfaVerifySchema } from '@/lib/validation/auth';
import {
  verifyMfaAndCreateSession,
  InvalidChallengeError,
  InvalidMfaError,
} from '@/server/services/auth-service';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { errorResponse } from '@/lib/http/errors';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = mfaVerifySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, 'INVALID_INPUT', 'Invalid MFA verification request');
  }

  const ipAddress = request.headers.get('x-forwarded-for');
  const userAgent = request.headers.get('user-agent');

  try {
    const session = await verifyMfaAndCreateSession(parsed.data.challengeToken, parsed.data.code, {
      ipAddress,
      userAgent,
    });

    const response = NextResponse.json({
      adminUser: session.adminUser,
      expiresAt: session.expiresAt,
    });
    response.cookies.set(SESSION_COOKIE_NAME, session.token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      expires: session.expiresAt,
    });
    return response;
  } catch (error) {
    if (error instanceof InvalidChallengeError) {
      return errorResponse(401, 'INVALID_CHALLENGE', 'Login session expired, please sign in again');
    }
    if (error instanceof InvalidMfaError) {
      return errorResponse(401, 'INVALID_MFA_CODE', 'Invalid authentication code');
    }
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to process verification');
  }
}
