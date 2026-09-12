import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PUBLIC_ROUTES = ['/', '/about', '/faq', '/contact', '/terms', '/privacy', '/refund-policy', '/disclaimer'];

for (const route of PUBLIC_ROUTES) {
  test(`${route} renders with no critical/serious accessibility violations`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.ok()).toBe(true);

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrWorse = results.violations.filter((violation) =>
      ['critical', 'serious'].includes(violation.impact ?? ''),
    );
    expect(seriousOrWorse, JSON.stringify(seriousOrWorse, null, 2)).toEqual([]);
  });
}

test('primary navigation links to the core public pages', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Primary' });
  await expect(nav.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about');
  await expect(nav.getByRole('link', { name: 'FAQ' })).toHaveAttribute('href', '/faq');
  await expect(page.getByRole('banner').getByRole('link', { name: 'Contact' })).toHaveAttribute(
    'href',
    '/contact',
  );
});

test('footer links to all required legal pages', async ({ page }) => {
  await page.goto('/');
  const footer = page.getByRole('contentinfo');
  await expect(footer.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/terms');
  await expect(footer.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
  await expect(footer.getByRole('link', { name: 'Refund Policy' })).toHaveAttribute(
    'href',
    '/refund-policy',
  );
  await expect(footer.getByRole('link', { name: 'Disclaimer' })).toHaveAttribute('href', '/disclaimer');
});
