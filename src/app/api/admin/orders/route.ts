import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, UnauthorizedError, ForbiddenError } from '@/lib/auth/require-admin';
import { errorResponse } from '@/lib/http/errors';
import { listOrders, type OrderListFilters } from '@/server/services/order-service';
import type { OrderStatus } from '@prisma/client';

const VALID_STATUSES: OrderStatus[] = ['PENDING', 'PAID', 'EXPIRED', 'CANCELLED', 'REFUNDED'];

export async function GET(request: NextRequest) {
  try {
    await requirePermission('payments:view');
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const filters: OrderListFilters = {
      buyerEmail: searchParams.get('buyerEmail') ?? undefined,
      eventId: searchParams.get('eventId') ?? undefined,
      status: statusParam && VALID_STATUSES.includes(statusParam as OrderStatus) ? (statusParam as OrderStatus) : undefined,
    };
    const orders = await listOrders(filters);
    return NextResponse.json({ orders });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to list orders');
  }
}
