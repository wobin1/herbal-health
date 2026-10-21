import { describe, expect, it } from 'vitest';
import { formatEventStart } from '@/lib/events/format-start';

describe('formatEventStart', () => {
  it('formats the UTC start in the event timezone with a zone label', () => {
    const result = formatEventStart(new Date('2026-06-01T15:00:00Z'), 'America/Chicago');
    expect(result).toBe('Monday, June 1, 2026 at 10:00 AM CDT');
  });

  it('never returns a raw ISO timestamp', () => {
    expect(formatEventStart(new Date('2026-06-01T15:00:00Z'), 'Europe/London')).not.toContain('T15:00');
  });
});
