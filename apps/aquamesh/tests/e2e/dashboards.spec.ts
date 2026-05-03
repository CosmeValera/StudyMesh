import { test, expect } from '@playwright/test'
import { loginAs, navigateToDashboards, dismissActiveDialog } from './helpers'

test.beforeEach(async ({ page }) => {
  // Login as admin for all dashboard tests
  await loginAs(page, 'admin')

  // Set consistent viewport size
  await page.setViewportSize({ width: 1280, height: 720 })

  // Make sure no dialogs are active
  await dismissActiveDialog(page)
})

test.describe('Dashboards', () => {
  test('should open predefined dashboards', async ({ page }) => {
    // Dismiss any active dialog
    await dismissActiveDialog(page)

    // Navigate to dashboards
    await navigateToDashboards(page)

    // Wait for menu to appear
    await page.waitForSelector('[role="menu"]', { timeout: 5000 })

    // Open the product example dashboard
    await page.getByText('Daily Operations Example').click()

    // Wait for dashboard to load
    await page.waitForTimeout(1500)

    // Verify that the dashboard is open
    await expect(page.getByText('Daily Operations Dashboard')).toBeVisible()

    // Wait before taking screenshot to ensure everything is loaded
    await page.waitForTimeout(500)
    const screenshot = await page.screenshot()
    await expect(screenshot).toMatchSnapshot('dashboard-system-overview.png')
  })

  test('should create a new dashboard', async ({ page }) => {
    // Dismiss any active dialog
    await dismissActiveDialog(page)

    // Click on the + button to add a new dashboard using the data-testid
    await page.getByTestId('add-dashboard-button').click()

    // Wait for the dashboard to be created
    await page.waitForTimeout(1500)

    // Verify a new tab is created - using a more specific selector for the heading
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

    // Wait before taking screenshot
    await page.waitForTimeout(500)
    const screenshot = await page.screenshot()
    await expect(screenshot).toMatchSnapshot('new-dashboard-created.png')
  })

  test('should show Add Widget menu from a blank dashboard', async ({
    page,
  }) => {
    // Create a new dashboard
    await dismissActiveDialog(page)

    // Click on the + button to add a new dashboard using the data-testid
    await page.getByTestId('add-dashboard-button').click()

    await page.waitForTimeout(1500)

    // Open widgets from top nav
    await dismissActiveDialog(page)
    await page.getByRole('button', { name: 'Add Widget' }).click()

    // Wait for menu to appear
    await page.waitForSelector('[role="menu"]', { timeout: 5000 })

    await expect(page.getByText('Saved Widgets')).toBeVisible()

    // Wait before taking screenshot
    await page.waitForTimeout(500)
    const screenshot = await page.screenshot()
    await expect(screenshot).toMatchSnapshot('dashboard-with-widget.png')
  })

  test('should open operations example dashboard', async ({ page }) => {
    // Open an example dashboard with actual AquaMesh-created content
    await dismissActiveDialog(page)

    await navigateToDashboards(page)
    await page.waitForSelector('[role="menu"]', { timeout: 5000 })
    await page.getByText('Daily Operations Example').click()
    await page.waitForTimeout(1500)

    await expect(page.getByText('Daily Operations Dashboard')).toBeVisible()

    const screenshot = await page.screenshot()
    await expect(screenshot).toMatchSnapshot('operations-dashboard-example.png')
  })
})
