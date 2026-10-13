/**
 * E-05: Admin login → dashboard → approve pending → toggle restaurant
 */
import { test, expect } from "@playwright/test";

test("E-05 · Admin approve + toggle restaurant", async ({ page }) => {
  const adminEmail = process.env.E2E_ADMIN_EMAIL;
  const adminPassword = process.env.E2E_ADMIN_PASSWORD;
  test.skip(
    process.env.E2E_ADMIN_MUTATIONS_ENABLED !== "true" || !adminEmail || !adminPassword,
    "Requiere un entorno E2E aislado: aprueba solicitudes y cambia estados de restaurantes."
  );
  // 1. Login admin
  await page.goto("/admin/login");
  await page.fill('input[name="email"], #email', adminEmail!);
  await page.fill('input[name="password"], #password', adminPassword!);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin/);

  // 2. Ver dashboard
  await expect(page.locator("body")).toContainText(/dashboard|pendientes|restaurantes/i);

  // 3. Ir a solicitudes pendientes
  await page.click('a:has-text("Pendientes"), a:has-text("solicitudes")');
  await page.waitForURL(/\/admin\/pending/);

  // 4. Aprobar primera solicitud (si existe)
  const approveBtn = page.locator('button:has-text("Aprobar")').first();
  if (await approveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await approveBtn.click();
    await expect(page.locator("body")).toContainText(/aprobado|success|éxito/i);
  }

  // 5. Ir a restaurantes
  await page.click('a:has-text("Restaurantes"), a:has-text("All Restaurants")');
  await page.waitForURL(/\/admin\/restaurants/);

  // 6. Toggle status del primer restaurante
  const toggleBtn = page.locator('button:has-text("Bloquear"), button:has-text("Activar")').first();
  if (await toggleBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await toggleBtn.click();
    // No debe dar error de permisos (P0-3 REVOKE ejecutado)
    await expect(page.locator("body")).not.toContainText(/error|denied|no autorizado/i);
  }
});
