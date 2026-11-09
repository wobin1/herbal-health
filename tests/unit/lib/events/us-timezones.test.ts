import { describe, expect, it } from 'vitest';
import { US_TIMEZONES, matchTimezone } from '@/lib/events/us-timezones';
import { isValidTimezone } from '@/lib/events/event-time';

describe('US_TIMEZONES', () => {
  it('covers every US timezone region', () => {
    const values = US_TIMEZONES.map((z) => z.value);
    expect(values).toEqual(
      expect.arrayContaining([
        'America/New_York',
        'America/Chicago',
        'America/Denver',
        'America/Phoenix',
        'America/Los_Angeles',
        'America/Anchorage',
        'Pacific/Honolulu',
        'America/Puerto_Rico',
      ]),
    );
  });

  it('only contains timezones the runtime recognises', () => {
    for (const zone of US_TIMEZONES) expect(isValidTimezone(zone.value)).toBe(true);
  });
});

describe('matchTimezone', () => {
  it.each([
    ['Eastern Standard Time (EST, UTC−5)', 'America/New_York'],
    ['EST', 'America/New_York'],
    ['EDT', 'America/New_York'],
    ['eastern', 'America/New_York'],
    ['Central Time', 'America/Chicago'],
    ['CST', 'America/Chicago'],
    ['Mountain Standard Time', 'America/Denver'],
    ['Arizona', 'America/Phoenix'],
    ['Pacific Daylight Time (PDT)', 'America/Los_Angeles'],
    ['Alaska', 'America/Anchorage'],
    ['Hawaii Standard Time', 'Pacific/Honolulu'],
    ['Atlantic Standard Time', 'America/Puerto_Rico'],
  ])('maps the typed value %s to %s', (input, expected) => {
    expect(matchTimezone(input)).toBe(expected);
  });

  it('keeps a value that is already a valid IANA timezone', () => {
    expect(matchTimezone('America/Detroit')).toBe('America/Detroit');
    expect(matchTimezone('  America/Chicago ')).toBe('America/Chicago');
  });

  it('returns null for something it cannot match', () => {
    expect(matchTimezone('Portland')).toBeNull();
    expect(matchTimezone('')).toBeNull();
  });
});
