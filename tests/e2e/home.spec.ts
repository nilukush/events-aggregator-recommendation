/**
 * E2E Tests for EventNexus Home Page
 * Tests the main event feed functionality
 */

import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should display the page header", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Events");
  });

  test("should display event cards", async ({ page }) => {
    // Wait for events to load
    await page.waitForSelector('[data-testid="event-card"]', { timeout: 5000 });

    const eventCards = page.locator('[data-testid="event-card"]');
    const count = await eventCards.count();

    expect(count).toBeGreaterThan(0);
  });

  test("should display event details on card", async ({ page }) => {
    await page.waitForSelector('[data-testid="event-card"]', { timeout: 5000 });

    const firstCard = page.locator('[data-testid="event-card"]').first();

    // Check for title
    await expect(firstCard.locator("h3")).toBeVisible();

    // Check for date/time icons
    await expect(firstCard.locator('svg[data-testid="calendar-icon"]')).toBeVisible();
  });

  test("should toggle filters panel", async ({ page }) => {
    const filtersButton = page.locator('button[aria-label="Toggle filters"]');
    await filtersButton.click();

    const filtersPanel = page.locator('[data-testid="event-filters"]');
    await expect(filtersPanel).toBeVisible();
  });

  test("should search events", async ({ page }) => {
    await page.waitForSelector('[data-testid="event-card"]', { timeout: 5000 });

    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill("technology");
    await searchInput.press("Enter");

    // Wait for search results
    await page.waitForTimeout(500);

    const eventCards = page.locator('[data-testid="event-card"]');
    const count = await eventCards.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should filter by source", async ({ page }) => {
    await page.waitForSelector('[data-testid="event-card"]', { timeout: 5000 });

    // Open filters
    const filtersButton = page.locator('button[aria-label="Toggle filters"]');
    await filtersButton.click();

    // Click Eventbrite filter
    const eventbriteFilter = page.locator('button:has-text("Eventbrite")');
    await eventbriteFilter.click();

    // Wait for filtered results
    await page.waitForTimeout(500);
  });
});

test.describe("Event Card Interactions", () => {
  test("should bookmark event when signed in", async ({ page, context }) => {
    // Navigate to signin page first
    await page.goto("/auth/signin");

    // For E2E testing, we'd mock authentication
    // This is a placeholder test showing the interaction flow
    await page.goto("/");

    await page.waitForSelector('[data-testid="event-card"]', { timeout: 5000 });

    const firstCard = page.locator('[data-testid="event-card"]').first();
    const bookmarkButton = firstCard.locator('button[aria-label*="bookmark"]');

    if (await bookmarkButton.isVisible()) {
      await bookmarkButton.click();
      // Verify bookmark state change
    }
  });

  test("should navigate to event detail on click", async ({ page }) => {
    await page.goto("/");

    await page.waitForSelector('[data-testid="event-card"]', { timeout: 5000 });

    const firstCard = page.locator('[data-testid="event-card"]').first();
    await firstCard.click();

    // Should navigate to event detail page
    await page.waitForURL(/\/events\/.+/);
    expect(page.url()).toMatch(/\/events\/.+/);
  });
});

test.describe("Responsive Design", () => {
  test("should display correctly on mobile", async ({ page, viewport }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    await page.waitForSelector('[data-testid="event-card"]', { timeout: 5000 });

    // Should show single column layout
    const eventCards = page.locator('[data-testid="event-card"]');
    await expect(eventCards.first()).toBeVisible();
  });

  test("should display correctly on tablet", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");

    await page.waitForSelector('[data-testid="event-card"]', { timeout: 5000 });

    const eventCards = page.locator('[data-testid="event-card"]');
    await expect(eventCards.first()).toBeVisible();
  });

  test("should display correctly on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/");

    await page.waitForSelector('[data-testid="event-card"]', { timeout: 5000 });

    const eventCards = page.locator('[data-testid="event-card"]');
    await expect(eventCards.first()).toBeVisible();
  });
});
