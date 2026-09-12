import { NextResponse } from 'next/server';
import { requirePermission, UnauthorizedError, ForbiddenError } from '@/lib/auth/require-admin';
import { errorResponse } from '@/lib/http/errors';
import { getOrderDetail, OrderNotFoundError } from '@/server/services/order-service';

export async function GET(_request: Request, ctx: RouteContext<'/api/admin/orders/[id]'>) {
  try {
    await requirePermission('payments:view');
    const { id } = await ctx.params;
    const order = await getOrderDetail(id);
    return NextResponse.json({ order });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    if (error instanceof OrderNotFoundError) return errorResponse(404, 'NOT_FOUND', 'Order not found');
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to load order');
  }
}
