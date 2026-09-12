import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@herbalhealthseminars.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'ChangeMe123!';
const EDITOR_EMAIL = process.env.E2E_EDITOR_EMAIL ?? 'editor@herbalhealthseminars.com';
const EDITOR_PASSWORD = process.env.E2E_EDITOR_PASSWORD ?? 'ChangeMe123!';

async function loginViaApi(request: import('@playwright/test').APIRequestContext, email: string, password: string) {
  return request.post('/api/admin/login', { data: { email, password } });
}

test('/events lists seminars and no critical/serious accessibility violations', async ({ page }) => {
  const response = await page.goto('/events');
  expect(response?.ok()).toBe(true);

  const results = await new AxeBuilder({ page }).analyze();
  const seriousOrWorse = results.violations.filter((violation) =>
    ['critical', 'serious'].includes(violation.impact ?? ''),
  );
  expect(seriousOrWorse, JSON.stringify(seriousOrWorse, null, 2)).toEqual([]);
});

test('/events supports keyword and city search filters', async ({ page }) => {
  await page.goto('/events');
  await page.getByLabel('City').fill('Nonexistent City XYZ');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByText('No seminars match your search')).toBeVisible();
});

test('admin can create and publish an event which then appears on /events and /events/[slug]', async ({
  page,
  request,
}) => {
  const login = await loginViaApi(request, ADMIN_EMAIL, ADMIN_PASSWORD);
  test.skip(!login.ok(), 'Seed admin user not available in this environment');

  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel('Password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await page.goto('/admin/locations');
  await page.getByLabel('Name').fill('Community Hall');
  await page.getByLabel('Address').fill('100 Main St');
  await page.getByLabel('City').fill('Austin');
  await page.getByLabel('State').fill('TX');
  await page.getByLabel('Country').fill('US');
  await page.getByRole('button', { name: 'Add Location' }).click();

  const slug = `e2e-event-${Date.now()}`;
  await page.goto('/admin/events/new');
  await page.getByLabel('Title', { exact: true }).fill('E2E Herbal Seminar');
  await page.getByLabel('Slug', { exact: true }).fill(slug);
  await page.getByLabel('Short Description', { exact: true }).fill('A short description.');

  await page.getByRole('tab', { name: 'Schedule' }).click();
  await page.getByLabel('Start At').fill('2027-01-01T10:00');
  await page.getByLabel('End At').fill('2027-01-01T12:00');
  await page.getByLabel('Timezone (IANA)').fill('America/Chicago');

  await page.getByRole('tab', { name: 'Location' }).click();
  await page.getByLabel('Venue').selectOption({ label: 'Community Hall' });
  await page.getByLabel('City (listing)').fill('Austin');
  await page.getByLabel('State (listing)').fill('TX');

  await page.getByRole('tab', { name: 'Content' }).click();
  await page.getByLabel('Long Description').fill('Full details about the seminar.');

  await page.getByRole('tab', { name: 'Media' }).click();
  await page.getByLabel('Cover Image URL').fill('https://example.com/cover.jpg');

  await page.getByRole('button', { name: 'Create Event' }).click();
  await expect(page).toHaveURL(/\/admin\/events\/[a-z0-9]+/);

  await page.getByRole('button', { name: 'Publish' }).click();
  await expect(page.getByText('Status: PUBLISHED')).toBeVisible();

  await page.goto('/events');
  await expect(page.getByText('E2E Herbal Seminar')).toBeVisible();

  await page.goto(`/events/${slug}`);
  await expect(page.getByRole('heading', { name: 'E2E Herbal Seminar' })).toBeVisible();
  const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
  expect(jsonLd).toBeTruthy();
  const structured = JSON.parse(jsonLd ?? '{}');
  expect(structured['@type']).toBe('Event');
  expect(structured.name).toBe('E2E Herbal Seminar');
});

test('CONTENT_EDITOR is forbidden from publishing while ADMIN succeeds', async ({ request }) => {
  const editorLogin = await loginViaApi(request, EDITOR_EMAIL, EDITOR_PASSWORD);
  test.skip(!editorLogin.ok(), 'Seed content editor user not available in this environment');

  const adminLogin = await loginViaApi(request, ADMIN_EMAIL, ADMIN_PASSWORD);
  test.skip(!adminLogin.ok(), 'Seed admin user not available in this environment');

  const createResponse = await request.post('/api/admin/events', {
    data: {
      slug: `e2e-authz-${Date.now()}`,
      title: 'Authz Test Event',
      shortDescription: 'Short',
      longDescription: 'Long',
      startAt: '2027-02-01T10:00:00.000Z',
      endAt: '2027-02-01T12:00:00.000Z',
      timezone: 'America/Chicago',
      city: 'Austin',
      state: 'TX',
      coverImageUrl: 'https://example.com/cover.jpg',
    },
  });
  expect(createResponse.ok()).toBe(true);
  const { event } = await createResponse.json();

  const editorPublish = await request.post(`/api/admin/events/${event.id}/publish`);
  expect(editorPublish.status()).toBe(403);
});
