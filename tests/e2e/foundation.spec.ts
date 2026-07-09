import { expect, test } from "@playwright/test";

test("renders the foundation shell", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "RIBBAI OPS" })).toBeVisible();
  await expect(page.getByText("Foundation validated")).toBeVisible();
});
