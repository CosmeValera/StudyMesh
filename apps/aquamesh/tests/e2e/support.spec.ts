import { test, expect } from '@playwright/test'
test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('http://localhost:3000/')
})

test.describe('Landing tutorial page', () => {
  test('should show the onboarding workflow', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'AquaMesh' }).first(),
    ).toBeVisible()
    await expect(
      page.getByText('Create operational dashboard widgets without code.'),
    ).toBeVisible()
    await expect(page.getByText('Build one widget, then reuse it')).toBeVisible()
    await expect(page.getByText('Made for daily operations')).toBeVisible()

    await expect(page.getByText('What should I do first?')).toBeVisible()
  })

  test('should open the workspace from the landing CTA', async ({ page }) => {
    await page
      .getByRole('button', { name: 'Create Daily Operations widget' })
      .click()

    await page.waitForURL('http://localhost:3000/workspace')
    await expect(page.getByText('Building Blocks')).toBeVisible({
      timeout: 5000,
    })
  })
})
