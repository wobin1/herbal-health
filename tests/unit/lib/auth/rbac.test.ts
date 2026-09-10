import { describe, expect, it } from 'vitest';
import { hasPermission } from '@/lib/auth/rbac';

describe('RBAC permission matrix (spec §5)', () => {
  it('grants Admin every permission', () => {
    expect(hasPermission('ADMIN', 'payments:view')).toBe(true);
    expect(hasPermission('ADMIN', 'refunds:process')).toBe(true);
    expect(hasPermission('ADMIN', 'users:manage')).toBe(true);
    expect(hasPermission('ADMIN', 'auditLogs:view')).toBe(true);
    expect(hasPermission('ADMIN', 'attendees:export')).toBe(true);
  });

  it('denies Content Editor financial and PII-export capabilities', () => {
    expect(hasPermission('CONTENT_EDITOR', 'payments:view')).toBe(false);
    expect(hasPermission('CONTENT_EDITOR', 'refunds:process')).toBe(false);
    expect(hasPermission('CONTENT_EDITOR', 'tickets:managePrices')).toBe(false);
    expect(hasPermission('CONTENT_EDITOR', 'attendees:export')).toBe(false);
    expect(hasPermission('CONTENT_EDITOR', 'users:manage')).toBe(false);
    expect(hasPermission('CONTENT_EDITOR', 'auditLogs:view')).toBe(false);
    expect(hasPermission('CONTENT_EDITOR', 'settings:manage')).toBe(false);
  });

  it('grants Content Editor content-management capabilities', () => {
    expect(hasPermission('CONTENT_EDITOR', 'events:edit')).toBe(true);
    expect(hasPermission('CONTENT_EDITOR', 'faqs:manage')).toBe(true);
    expect(hasPermission('CONTENT_EDITOR', 'pages:manage')).toBe(true);
    expect(hasPermission('CONTENT_EDITOR', 'instructors:manage')).toBe(true);
    expect(hasPermission('CONTENT_EDITOR', 'locations:manage')).toBe(true);
  });

  it('does not grant Content Editor event publishing by default (spec marks it Optional)', () => {
    expect(hasPermission('CONTENT_EDITOR', 'events:publish')).toBe(false);
  });
});
