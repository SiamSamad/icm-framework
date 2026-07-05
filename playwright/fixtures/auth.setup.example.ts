/**
 * Example auth setup (rename to auth.setup.ts and wire into a project's dependencies when a
 * product needs a logged-in state). Reads credentials from env — never hardcode them.
 *
 * This is a template, not an active setup. Delete or adapt per product.
 */
import { test as setup } from '@playwright/test';

const authFile = 'playwright/.auth/example-product.json';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Username' }).fill(process.env.APP_USER ?? '');
  await page.getByRole('textbox', { name: 'Password' }).fill(process.env.APP_PASS ?? '');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.context().storageState({ path: authFile });
});
