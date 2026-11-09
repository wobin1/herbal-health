function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/** US timezones offered in the event form: a friendly label and the IANA name that is stored. */
export const US_TIMEZONES: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'America/New_York', label: 'Eastern Time (New York, Atlanta, Miami)' },
  { value: 'America/Chicago', label: 'Central Time (Chicago, Dallas, Houston)' },
  { value: 'America/Denver', label: 'Mountain Time (Denver, Salt Lake City)' },
  { value: 'America/Phoenix', label: 'Mountain Time – Arizona, no daylight saving (Phoenix)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles, Seattle, Portland)' },
  { value: 'America/Anchorage', label: 'Alaska Time (Anchorage)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (Honolulu)' },
  { value: 'America/Puerto_Rico', label: 'Atlantic Time (Puerto Rico, US Virgin Islands)' },
  { value: 'Pacific/Guam', label: 'Chamorro Time (Guam, Northern Mariana Islands)' },
  { value: 'Pacific/Pago_Pago', label: 'Samoa Time (American Samoa)' },
];

/** Keyword patterns for free-text values typed before the dropdown existed. Order matters. */
const LEGACY_PATTERNS: Array<[RegExp, string]> = [
  [/\barizona\b|\bphoenix\b/i, 'America/Phoenix'],
  [/\beastern\b|\be[sd]t\b/i, 'America/New_York'],
  [/\bcentral\b|\bc[sd]t\b/i, 'America/Chicago'],
  [/\bmountain\b|\bm[sd]t\b/i, 'America/Denver'],
  [/\bpacific\b|\bp[sd]t\b/i, 'America/Los_Angeles'],
  [/\balaska\b|\bak[sd]t\b/i, 'America/Anchorage'],
  [/\bhawaii\b|\bhst\b/i, 'Pacific/Honolulu'],
  [/\batlantic\b|\bast\b|puerto rico/i, 'America/Puerto_Rico'],
];

/**
 * Resolves a stored timezone to a valid IANA name: keeps valid IANA values, maps common
 * typed names like "Eastern Standard Time (EST)" to their zone, or returns null.
 */
export function matchTimezone(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.includes('/') && isValidTimezone(trimmed)) return trimmed;
  for (const [pattern, zone] of LEGACY_PATTERNS) {
    if (pattern.test(trimmed)) return zone;
  }
  return null;
}
