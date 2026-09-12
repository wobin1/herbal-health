import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, UnauthorizedError, ForbiddenError } from '@/lib/auth/require-admin';
import { errorResponse } from '@/lib/http/errors';
import { listAttendeesForExport } from '@/server/services/registration-service';

function csvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  try {
    await requirePermission('attendees:export');
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId') ?? undefined;
    const registrations = await listAttendeesForExport({ eventId });

    const header = ['Reference', 'Status', 'Event', 'First Name', 'Last Name', 'Email', 'Phone', 'Country'];
    const rows = registrations.map((registration) =>
      [
        registration.reference,
        registration.status,
        registration.event.title,
        registration.attendee.firstName,
        registration.attendee.lastName,
        registration.attendee.email,
        registration.attendee.phone,
        registration.attendee.country,
      ]
        .map((value) => csvField(String(value)))
        .join(','),
    );
    const csv = [header.map(csvField).join(','), ...rows].join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="attendees.csv"',
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to export attendees');
  }
}
