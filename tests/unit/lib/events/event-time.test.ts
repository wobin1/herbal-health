import { describe, expect, it } from 'vitest';
import { formatInEventTimezone, utcToWallTime, wallTimeToUtc } from '@/lib/events/event-time';

describe('wallTimeToUtc', () => {
  it('treats the entered wall-clock time as local to the event timezone (winter, PST)', () => {
    expect(wallTimeToUtc('2026-12-06T10:00', 'America/Los_Angeles').toISOString()).toBe('2026-12-06T18:00:00.000Z');
  });

  it('applies daylight saving time (summer, PDT)', () => {
    expect(wallTimeToUtc('2026-07-01T10:00', 'America/Los_Angeles').toISOString()).toBe('2026-07-01T17:00:00.000Z');
  });

  it('handles timezones ahead of UTC across a date boundary', () => {
    expect(wallTimeToUtc('2026-12-06T00:30', 'Africa/Lagos').toISOString()).toBe('2026-12-05T23:30:00.000Z');
  });

  it('does not depend on the timezone of the machine running it', () => {
    // Same input must always give the same instant; uses only the event timezone.
    expect(wallTimeToUtc('2026-03-15T09:15', 'UTC').toISOString()).toBe('2026-03-15T09:15:00.000Z');
  });

  it('throws on an unknown timezone instead of silently saving a wrong time', () => {
    expect(() => wallTimeToUtc('2026-12-06T10:00', 'Not/AZone')).toThrow();
  });
});

describe('utcToWallTime', () => {
  it('shows a stored instant as wall-clock time in the event timezone', () => {
    expect(utcToWallTime(new Date('2026-12-06T18:00:00Z'), 'America/Los_Angeles')).toBe('2026-12-06T10:00');
  });

  it('round-trips with wallTimeToUtc so re-saving never shifts the time', () => {
    const wall = '2026-07-01T19:45';
    expect(utcToWallTime(wallTimeToUtc(wall, 'Europe/London'), 'Europe/London')).toBe(wall);
  });

  it('formats midnight as 00, not 24', () => {
    expect(utcToWallTime(new Date('2026-12-06T08:00:00Z'), 'America/Los_Angeles')).toBe('2026-12-06T00:00');
  });
});

describe('formatInEventTimezone', () => {
  it('formats in the event timezone, including the correct local day', () => {
    // 02:00 UTC on Dec 7 is still Dec 6 evening in Portland.
    const out = formatInEventTimezone(new Date('2026-12-07T02:00:00Z'), 'America/Los_Angeles', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    expect(out).toBe('Dec 6, 6:00 PM');
  });

  it('falls back to UTC rather than crashing the page on an invalid timezone', () => {
    const out = formatInEventTimezone(new Date('2026-12-07T02:00:00Z'), 'Not/AZone', { hour: 'numeric', minute: '2-digit' });
    expect(out).toBe('2:00 AM');
  });

  it('understands an old typed timezone like "Eastern Standard Time (EST)" instead of falling back to UTC', () => {
    const out = formatInEventTimezone(new Date('2027-01-08T13:00:00Z'), 'Eastern Standard Time (EST, UTC−5)', {
      hour: 'numeric',
      minute: '2-digit',
    });
    expect(out).toBe('8:00 AM');
  });
});

