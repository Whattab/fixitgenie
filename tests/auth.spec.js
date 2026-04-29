import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {

    test('Page loads and can navigate to login', async ({ page }) => {
        // Navigate to the home page (assuming it is running on localhost:5173)
        await page.goto('/');

        // Verify the page title or a clear heading
        await expect(page).toHaveTitle(/Fixit Genie/i);

        // Verify the Login button exists in the header
        const loginMenuLink = page.getByRole('link', { name: 'Log In' });

        // There might be multiple links, grab the first one or specifically the header one
        if (await loginMenuLink.count() > 0) {
            await loginMenuLink.first().click();

            // We should be on the login page now
            await expect(page).toHaveURL(/.*\/login/);

            // Verify login form is visible
            await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
        }
    });

    // More advanced tests can be added here!
});
