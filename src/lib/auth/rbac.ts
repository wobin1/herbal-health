import type { AdminRole } from '@prisma/client';

export type Permission =
  | 'dashboard:view'
  | 'events:edit'
  | 'events:publish'
  | 'tickets:managePrices'
  | 'payments:view'
  | 'refunds:process'
  | 'attendees:viewPii'
  | 'attendees:export'
  | 'faqs:manage'
  | 'pages:manage'
  | 'instructors:manage'
  | 'educationFocusItems:manage'
  | 'locations:manage'
  | 'contactMessages:manage'
  | 'users:manage'
  | 'auditLogs:view'
  | 'settings:manage'
  | 'gallery:manage';

const ADMIN_PERMISSIONS: Permission[] = [
  'dashboard:view',
  'events:edit',
  'events:publish',
  'tickets:managePrices',
  'payments:view',
  'refunds:process',
  'attendees:viewPii',
  'attendees:export',
  'faqs:manage',
  'pages:manage',
  'instructors:manage',
  'educationFocusItems:manage',
  'locations:manage',
  'contactMessages:manage',
  'users:manage',
  'auditLogs:view',
  'settings:manage',
  'gallery:manage',
];

const CONTENT_EDITOR_PERMISSIONS: Permission[] = [
  'dashboard:view',
  'events:edit',
  'faqs:manage',
  'pages:manage',
  'instructors:manage',
  'educationFocusItems:manage',
  'locations:manage',
  'contactMessages:manage',
  'gallery:manage',
];

const PERMISSIONS_BY_ROLE: Record<AdminRole, Permission[]> = {
  ADMIN: ADMIN_PERMISSIONS,
  CONTENT_EDITOR: CONTENT_EDITOR_PERMISSIONS,
};

export function hasPermission(role: AdminRole, permission: Permission): boolean {
  return PERMISSIONS_BY_ROLE[role].includes(permission);
}
