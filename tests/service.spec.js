import { test, expect } from '@playwright/test';

test.describe('Service Request Flow', () => {
    const timestamp = Date.now();
    const testEmail = `homeowner_${timestamp}@example.com`;
    const testPassword = 'Password123!';
    const uniqueRequestDetails = `My kitchen sink is leaking continuously. (Test ${timestamp})`;

    test('Homeowner can create a service request and it appears in the feed', async ({ page }) => {
        // 1. Sign up as Homeowner
        await page.goto('/signup');
        await page.getByRole('heading', { name: 'Homeowner' }).click();

        await page.getByPlaceholder('Full Name').fill('Automation Homeowner');
        await page.getByPlaceholder('Email Address').fill(testEmail);
        await page.getByPlaceholder('Zip / Postal').fill('90210');

        const activeForm = page.locator('.signup-card.active');
        await activeForm.getByPlaceholder('Password', { exact: true }).fill(testPassword);
        await activeForm.getByPlaceholder('Confirm Password').fill(testPassword);

        page.once('dialog', dialog => dialog.accept());
        await activeForm.getByRole('button', { name: 'Create Account' }).click();

        await expect(page).toHaveURL(/.*\/$/); // Confirm redirection to home

        // 2. Navigate to "Request a Repair"
        // Assuming there's a button or link in the header or homepage
        await page.goto('/request-repair');
        await expect(page).toHaveURL(/.*\/request-repair/);

        // 3. Fill out the repair request form

        // Category
        await page.getByLabel('Plumbing', { exact: true }).check();

        // Details
        await page.getByPlaceholder('Example: Kitchen sink leaking under cabinet when water is running.').fill(uniqueRequestDetails);

        // Property Type
        await page.getByLabel('Single-family home', { exact: true }).check();

        // Primary Residence
        // Note: There are 'Yes' and 'No' labels. It's safe to use exact text
        await page.getByLabel('Yes', { exact: true }).check();

        // Age
        await page.getByLabel('5–15 years', { exact: true }).check();

        // Location
        await page.getByPlaceholder('Enter ZIP Code').fill('90210');

        // Urgency
        await page.locator('label').filter({ hasText: 'Urgent (24–48 hours)' }).locator('input').check();

        // Start Time
        await page.getByLabel('Today', { exact: true }).check();

        // Submit Request
        page.once('dialog', dialog => dialog.accept());
        await page.getByRole('button', { name: 'Submit Request' }).click();

        // 4. Verify Redirection to Services Page and Visibility
        await expect(page).toHaveURL(/.*\/services/);

        // Wait for the new request details to appear on the screen
        await expect(page.getByRole('heading', { name: uniqueRequestDetails })).toBeVisible({ timeout: 10000 });
    });
});
