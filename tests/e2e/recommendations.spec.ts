/**
 * E2E Tests for Recommendations Page
 * Tests personalized event recommendations
 */

import { test, expect } from "@playwright/test";

test.describe("Recommendations Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/recommendations");
  });

  test("should redirect to signin when not authenticated", async ({ page }) => {
    await page.waitForURL(/\/auth\/signin/);
    expect(page.url()).toContain("/auth/signin");
  });

  test("should display signin prompt", async ({ page }) => {
    const prompt = page.locator("text=/sign in to get personalized/i");
    await expect(prompt).toBeVisible();
  });
});

test.describe("Recommendations Page - Authenticated", () => {
  // These tests would run with authenticated sessions
  // Using test.use to configure authentication

  test.use({
    storageState: {
      cookies: [
        {
          name: "sb-access-token",
          value: "mock-jwt-token",
          domain: "localhost",
          path: "/",
        },
      ],
      origins: [],
    },
  });

  test("should display personalized recommendations", async ({ page }) => {
    await page.goto("/recommendations");

    // Wait for content
    await page.waitForTimeout(1000);

    const header = page.locator("h1");
    await expect(header).toContainText("For You");
  });

  test("should have refresh button", async ({ page }) => {
    await page.goto("/recommendations");

    const refreshButton = page.locator('button:has-text("Refresh")');
    await expect(refreshButton).toBeVisible();
  });

  test("should refresh recommendations on click", async ({ page }) => {
    await page.goto("/recommendations");

    const refreshButton = page.locator('button:has-text("Refresh")');
    await refreshButton.click();

    // Should show loading state
    const spinner = page.locator('.animate-spin');
    await expect(spinner).toBeVisible();
  });
});

test.describe("Recommendations Filters", () => {
  test.use({
    storageState: {
      cookies: [
        {
          name: "sb-access-token",
          value: "mock-jwt-token",
          domain: "localhost",
          path: "/",
        },
      ],
      origins: [],
    },
  });

  test("should open filters panel", async ({ page }) => {
    await page.goto("/recommendations");

    const filterButton = page.locator('button[aria-label="Open filters"]');
    await filterButton.click();

    const filters = page.locator('[data-testid="event-filters"]');
    await expect(filters).toBeVisible();
  });

  test("should filter by category", async ({ page }) => {
    await page.goto("/recommendations");

    const filterButton = page.locator('button[aria-label="Open filters"]');
    await filterButton.click();

    const techCategory = page.locator('button:has-text("Technology")');
    await techCategory.click();

    // Should update results
    await page.waitForTimeout(500);
  });
});
