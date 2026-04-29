import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Professional Verification Flow', () => {
    const timestamp = Date.now();
    const testEmail = `pro_${timestamp}@example.com`;
    const testPassword = 'Password123!';
    const proBusinessName = `Pro Automation ${timestamp}`;
    const adminEmail = 'admin_test_bot2@example.com';
    const adminPassword = 'Password123!';

    // Create a temporary file to upload
    const testFilePath = path.join(process.cwd(), `dummy_license_${timestamp}.pdf`);

    test.beforeAll(() => {
        fs.writeFileSync(testFilePath, 'Dummy PDF content for testing');
    });

    test.afterAll(() => {
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }
    });

    test('Professional can upload docs and admin can approve them', async ({ page }) => {
        // -----------------------------------------
        // 1. SIGNUP AS PROFESSIONAL
        // -----------------------------------------
        await page.goto('/signup');
        await page.getByRole('heading', { name: 'Professional Tradesman' }).click();

        const activeForm = page.locator('.signup-card.active');
        await activeForm.getByPlaceholder('Business/Full Name').fill(proBusinessName);
        await activeForm.getByPlaceholder('Email Address').fill(testEmail);
        await activeForm.getByPlaceholder('Zip / Postal').fill('90210');
        await activeForm.getByPlaceholder('Password', { exact: true }).fill(testPassword);
        await activeForm.getByPlaceholder('Confirm Password').fill(testPassword);

        page.once('dialog', dialog => dialog.accept());
        await activeForm.getByRole('button', { name: 'Create Account' }).click();

        // Verify successful login
        await expect(page).toHaveURL(/.*\/$/);

        // Professionals should have a link/button somewhere to Verify if they aren't verified yet
        // Since it's in the pro dashboard or the header. Let's just directly navigate to /verification
        await page.goto('/verification');
        await expect(page).toHaveURL(/.*\/verification/);

        // -----------------------------------------
        // 2. UPLOAD DOCUMENT & SUBMIT
        // -----------------------------------------
        // Select document type "License"
        await page.getByRole('button', { name: 'License' }).click();

        // Set file input
        const fileInput = page.locator('input[type="file"]').first();
        await fileInput.setInputFiles(testFilePath);

        // Click "Upload Document" and wait for upload
        const uploadBtn = page.getByRole('button', { name: 'Upload Document' });
        await uploadBtn.click();

        // Button should eventually switch back from "Uploading..." to "Upload Document"
        await expect(uploadBtn).toHaveText('Upload Document', { timeout: 15000 });

        // Wait for the uploaded file to appear in the list using the app's naming convention (e.g., License_12345.pdf)
        await expect(page.locator('text=/License_.*\\.pdf/')).toBeVisible({ timeout: 15000 });

        // Click "Submit Application for Review"
        page.once('dialog', dialog => dialog.accept());
        await page.getByRole('button', { name: 'Submit Application for Review' }).click();

        // Verify UI says "Under Review"
        await expect(page.getByRole('heading', { name: 'Under Review' })).toBeVisible({ timeout: 15000 });

        // -----------------------------------------
        // 3. LOGOUT
        // -----------------------------------------
        // Navigate home, click Log Out
        await page.goto('/');
        const logOutBtn = page.getByRole('button', { name: /Log Out/i });
        if (await logOutBtn.count() > 0) {
            await logOutBtn.click();
        } else {
            // Fallback: forcefully clear localstorage and reload if button wasn't found
            await page.evaluate(() => localStorage.clear());
            await page.reload();
        }

        // -----------------------------------------
        // 4. LOGIN AS ADMIN
        // -----------------------------------------
        await page.goto('/login');
        await page.getByPlaceholder('Enter your email').fill(adminEmail);
        // The password field has label "Password" or placeholder "Enter your password"
        await page.getByPlaceholder('Enter your password').fill(adminPassword);
        await page.locator('form').getByRole('button', { name: 'Log In', exact: true }).click();

        await expect(page).toHaveURL(/.*\/$/);

        // Admin goes to Admin Dashboard
        await page.goto('/admin');
        await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();

        // -----------------------------------------
        // 5. APPROVE APPLICATION
        // -----------------------------------------
        // Click Verifications tab
        await page.getByRole('button', { name: /Verifications/i }).click();

        // Ensure the specific professional is in the list
        const applicantHeading = page.locator('h3', { hasText: proBusinessName });
        await expect(applicantHeading).toBeVisible({ timeout: 10000 });

        const applicantRow = applicantHeading.locator('..').locator('..').locator('..'); // Navigate to the parent card
        await expect(applicantRow).toBeVisible();

        // Click Approve
        page.once('dialog', dialog => dialog.accept());
        // Since there are many "Approve" buttons potentially, we scope to the user's row
        await applicantRow.getByRole('button', { name: /Approve/i }).click();

        // Verify the user disappears from the pending list
        await expect(page.locator('div', { hasText: proBusinessName })).toHaveCount(0, { timeout: 10000 });
    });
});
