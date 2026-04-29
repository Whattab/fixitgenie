import { test, expect } from '@playwright/test';

test.describe('Community Forum Flow', () => {
    const timestamp = Date.now();
    const testEmail = `forum_tester_${timestamp}@example.com`;
    const testPassword = 'Password123!';
    const uniqueQuestion = `How do I fix my sink? (Automated Test ${timestamp})`;
    const uniqueReply = `This is an automated reply generated at ${timestamp}`;

    test('Signup, Post Question, Upvote, and Reply', async ({ page }) => {
        // 1. Sign up a new user
        await page.goto('/signup');
        await page.getByRole('heading', { name: 'Homeowner' }).click();

        await page.getByPlaceholder('Full Name').fill('Automation Tester');
        await page.getByPlaceholder('Email Address').fill(testEmail);
        await page.getByPlaceholder('Zip / Postal').fill('90210');

        // There are multiple password fields on the page (because of the hidden professional form)
        // We target the active form's inputs by looking for the visible ones
        const activeForm = page.locator('.signup-card.active');
        await activeForm.getByPlaceholder('Password', { exact: true }).fill(testPassword);
        await activeForm.getByPlaceholder('Confirm Password').fill(testPassword);

        // Accept successful signup alert
        page.once('dialog', dialog => {
            dialog.accept();
        });

        await activeForm.getByRole('button', { name: 'Create Account' }).click();

        // 2. Wait for redirection to home
        await expect(page).toHaveURL(/.*\/$/); // Ends with /

        // If we're not automatically logged in, log in. Supabase auth signUp usually auto logs in. 
        // We can verify we are logged in by checking if "Log Out" exists OR by seeing the user name.

        // 3. Navigate to Community Forum
        await page.getByRole('link', { name: 'Community Forum' }).click();
        await expect(page).toHaveURL(/.*\/forum/);

        // 4. Fill out the "Ask a Question" form
        await page.getByRole('combobox').selectOption('Plumbing');
        await page.getByPlaceholder('Describe your issue in detail...').fill(uniqueQuestion);

        // Accept successful post alert if any (the code uses alert("Question posted..."))
        page.once('dialog', dialog => {
            dialog.accept();
        });

        await page.getByRole('button', { name: 'Post Question' }).click();

        // 5. Verify the question appears in the feed
        // 6. Upvote the question
        // We navigate up to the parent card from the specific heading
        const questionHeading = page.locator('h4', { hasText: uniqueQuestion });
        await expect(questionHeading).toBeVisible({ timeout: 15000 });

        const questionCard = questionHeading.locator('..'); // Parent div of the heading

        const upvoteButton = questionCard.locator('button', { hasText: /Upvotes/i }).first();
        await upvoteButton.click();

        // 7. Click "Replies" to open the reply box
        const repliesButton = questionCard.locator('button', { hasText: /Replies/i }).first();
        await repliesButton.click();

        // 8. Submit a reply
        const replyInput = questionCard.getByPlaceholder('Write a reply...');
        await replyInput.fill(uniqueReply);
        await questionCard.getByRole('button', { name: 'Reply', exact: true }).click();

        // 9. Verify the reply text appears below the question
        await expect(questionCard.getByText(uniqueReply)).toBeVisible({ timeout: 10000 });
    });
});
