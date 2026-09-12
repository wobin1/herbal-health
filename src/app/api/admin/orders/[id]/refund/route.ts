import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, UnauthorizedError, ForbiddenError } from '@/lib/auth/require-admin';
import { errorResponse } from '@/lib/http/errors';
import {
  refundOrder,
  OrderNotFoundError,
  OrderNotRefundableError,
  PaymentNotFoundError,
} from '@/server/services/refund-service';

export async function POST(request: NextRequest, ctx: RouteContext<'/api/admin/orders/[id]/refund'>) {
  try {
    const session = await requirePermission('refunds:process');
    const { id } = await ctx.params;
    const ipAddress = request.headers.get('x-forwarded-for');
    const order = await refundOrder(id, { actorId: session.adminUser.id, ipAddress });
    return NextResponse.json({ order });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    if (error instanceof OrderNotFoundError) return errorResponse(404, 'NOT_FOUND', 'Order not found');
    if (error instanceof OrderNotRefundableError) {
      return errorResponse(409, 'NOT_REFUNDABLE', 'Order is not in a refundable state');
    }
    if (error instanceof PaymentNotFoundError) return errorResponse(409, 'NO_PAYMENT', 'No succeeded payment to refund');
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to refund order');
  }
}
