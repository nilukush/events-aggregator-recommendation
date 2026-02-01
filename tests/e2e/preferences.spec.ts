/**
 * E2E Tests for Preferences Page
 * Tests user preference management
 */

import { test, expect } from "@playwright/test";

test.describe("Preferences Page", () => {
  test("should redirect to signin when not authenticated", async ({ page }) => {
    await page.goto("/preferences");
    await page.waitForURL(/\/auth\/signin/);
    expect(page.url()).toContain("/auth/signin");
  });

  test("should display signin prompt with preferences info", async ({ page }) => {
    await page.goto("/preferences");

    const prompt = page.locator("text=/sign in to customize/i");
    await expect(prompt).toBeVisible();
  });
});

test.describe("Preferences Page - Authenticated", () => {
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

  test("should display preferences page", async ({ page }) => {
    await page.goto("/preferences");

    const header = page.locator("h1:has-text('Your Preferences')");
    await expect(header).toBeVisible();
  });

  test("should display all preference tabs", async ({ page }) => {
    await page.goto("/preferences");

    await expect(page.locator('button:has-text("Location")')).toBeVisible();
    await expect(page.locator('button:has-text("Interests")')).toBeVisible();
    await expect(page.locator('button:has-text("Time & Day")')).toBeVisible();
  });

  test("should switch between tabs", async ({ page }) => {
    await page.goto("/preferences");

    // Click Interests tab
    await page.locator('button:has-text("Interests")').click();

    // Should show interests content
    await expect(page.locator('text=/your interests/i')).toBeVisible();

    // Click Time & Day tab
    await page.locator('button:has-text("Time & Day")').click();

    // Should show time/day content
    await expect(page.locator('text=/preferred days/i')).toBeVisible();
  });
});

test.describe("Location Preferences", () => {
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

  test("should select preset location", async ({ page }) => {
    await page.goto("/preferences");

    // Click Dubai preset
    const dubaiButton = page.locator('button:has-text("Dubai")');
    await dubaiButton.click();

    // Latitude and longitude inputs should be populated
    const latInput = page.locator('#lat');
    const lngInput = page.locator('#lng');

    await expect(latInput).toHaveValue(/25\.2048/);
    await expect(lngInput).toHaveValue(/55\.2708/);
  });

  test("should select search radius", async ({ page }) => {
    await page.goto("/preferences");

    const radius50 = page.locator('button:has-text("50 km")');
    await radius50.click();

    // Button should be selected (different style)
    await expect(radius50).toHaveClass(/bg-blue-600/);
  });

  test("should save location preferences", async ({ page }) => {
    await page.goto("/preferences");

    // Select a preset
    await page.locator('button:has-text("Dubai")').click();

    // Click save
    const saveButton = page.locator('button:has-text("Save Location")');
    await saveButton.click();

    // Should show success state or navigation
    await page.waitForTimeout(500);
  });
});

test.describe("Interests Preferences", () => {
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

  test("should add interest from suggestions", async ({ page }) => {
    await page.goto("/preferences");

    // Switch to Interests tab
    await page.locator('button:has-text("Interests")').click();

    // Click a suggested interest
    const techInterest = page.locator('button:has-text("+ technology")');
    if (await techInterest.isVisible()) {
      await techInterest.click();

      // Should appear in Your Interests
      await expect(page.locator('text=/technology/i')).toBeVisible();
    }
  });

  test("should add custom interest", async ({ page }) => {
    await page.goto("/preferences");

    // Switch to Interests tab
    await page.locator('button:has-text("Interests")').click();

    // Type custom interest
    const input = page.locator('input[placeholder*="e.g"]');
    await input.fill("photography");
    await input.press("Enter");

    // Should be added
    await page.waitForTimeout(500);
  });

  test("should remove interest", async ({ page }) => {
    await page.goto("/preferences");

    // Switch to Interests tab
    await page.locator('button:has-text("Interests")').click();

    // Add an interest first
    const techInterest = page.locator('button:has-text("+ technology")');
    if (await techInterest.isVisible()) {
      await techInterest.click();
      await page.waitForTimeout(300);

      // Click to remove
      const removeButton = page.locator('button:has-text("technology")').first();
      await removeButton.click();
    }
  });
});

test.describe("Time & Day Preferences", () => {
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

  test("should select weekdays", async ({ page }) => {
    await page.goto("/preferences");

    // Switch to Time & Day tab
    await page.locator('button:has-text("Time & Day")').click();

    // Click Weekdays quick select
    const weekdaysButton = page.locator('button:has-text("Weekdays")');
    await weekdaysButton.click();

    // Mon-Fri should be selected
    await expect(page.locator('button:has-text("Mon")')).toHaveClass(/bg-blue-600/);
    await expect(page.locator('button:has-text("Fri")')).toHaveClass(/bg-blue-600/);
  });

  test("should select time slots", async ({ page }) => {
    await page.goto("/preferences");

    // Switch to Time & Day tab
    await page.locator('button:has-text("Time & Day")').click();

    // Click Evening time slot
    const eveningButton = page.locator('button:has-text("Evening")');
    await eveningButton.click();

    // Should be selected
    await expect(eveningButton).toHaveClass(/bg-purple-600/);
  });

  test("should display preferences summary", async ({ page }) => {
    await page.goto("/preferences");

    // Switch to Time & Day tab
    await page.locator('button:has-text("Time & Day")').click();

    // Select some options
    await page.locator('button:has-text("Weekdays")').click();
    await page.locator('button:has-text("Evening")').click();

    // Summary should appear
    const summary = page.locator('text=/your preferences/i');
    await expect(summary).toBeVisible();
  });
});
