import { matchTimezone } from '@/lib/events/us-timezones';

/**
 * Event times are stored as UTC instants plus the event's IANA timezone. Admins enter and
 * read times as wall-clock time *at the event*, and the public site shows them the same way,
 * regardless of the timezone of the browser or server.
 */

type WallParts = { year: number; month: number; day: number; hour: number; minute: number };

function wallPartsIn(date: Date, timezone: string): WallParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute') };
}

/** Offset of `timezone` from UTC at `date`, in milliseconds (positive east of UTC). */
function offsetMs(date: Date, timezone: string): number {
  const p = wallPartsIn(date, timezone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return asUtc - Math.floor(date.getTime() / 60_000) * 60_000;
}

/**
 * Converts a `datetime-local` value ("YYYY-MM-DDTHH:mm"), read as wall-clock time in
 * `timezone`, to the UTC instant. Throws on an invalid value or unknown timezone.
 */
export function wallTimeToUtc(wallTime: string, timezone: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(wallTime);
  if (!match) throw new RangeError(`Invalid date-time: ${wallTime}`);
  const [, y, mo, d, h, mi] = match.map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  // Two passes settle the offset correctly around daylight-saving transitions.
  const first = guess - offsetMs(new Date(guess), timezone);
  const second = guess - offsetMs(new Date(first), timezone);
  return new Date(second);
}

/** Formats a UTC instant as a `datetime-local` value in `timezone`. */
export function utcToWallTime(date: Date, timezone: string): string {
  const p = wallPartsIn(date, timezone);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/**
 * Formats a UTC instant in the event's timezone. Old typed values (e.g. "EST") are matched to
 * their zone; anything unrecognisable falls back to UTC rather than crashing the page.
 */
export function formatInEventTimezone(
  date: Date,
  timezone: string,
  options: Omit<Intl.DateTimeFormatOptions, 'timeZone'>,
): string {
  const zone = matchTimezone(timezone) ?? 'UTC';
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: zone }).format(date);
}

/** True if `timezone` is an IANA timezone this runtime recognises. */
export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}
