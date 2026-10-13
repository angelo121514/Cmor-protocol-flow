/**
 * E-09: Validación completa de Mesas y Códigos QR
 * Carga de página -> Creación de Mesa -> Ver QR -> Copiar URL -> Regenerar QR -> Eliminar Mesa
 */
/**
 * E-09: Validación completa de Mesas y Códigos QR
 * Carga de página -> Creación de Mesa -> Ver QR -> Copiar URL -> Regenerar QR -> Eliminar Mesa
 */
import { test, expect } from "@playwright/test";

test("E-09 · Control completo de Mesas y QR", async ({ page }) => {
  const ownerEmail = process.env.E2E_OWNER_EMAIL;
  const ownerPassword = process.env.E2E_OWNER_PASSWORD;
  test.skip(
    !ownerEmail || !ownerPassword,
    "Requiere un owner preaprovisionado en un entorno E2E aislado."
  );
  // 1. Iniciar sesión con el owner sembrado, sin crear una cuenta real.
  await page.goto("/login");
  await page.fill('input[name="email"], #email', ownerEmail!);
  await page.fill('input[name="password"], #password', ownerPassword!);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/restaurant/);

  // 2. Navegar a la sección de Mesas
  await page.goto("/restaurant/tables");
  await expect(page.getByRole("heading", { name: "Mesas y QR" })).toBeVisible({ timeout: 15000 });

  // Aceptar el modal de Aviso de Privacidad si aparece
  try {
    const privacyModal = page.locator('text=Aviso de Privacidad');
    await privacyModal.waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('input[type="checkbox"]').first().check({ force: true });
    await page.click('button:has-text("Aceptar y continuar")');
    await page.waitForTimeout(1000);
  } catch {
    // Continuar si no aparece
  }

  // Definir número de mesa único para evitar colisiones
  const tableNum = `Mesa-E2E-${Date.now()}`;

  // 3. Crear una nueva mesa
  await page.click('button:has-text("Nueva mesa")');
  await page.fill('input[placeholder*="Ej: Mesa 1"]', tableNum);
  await page.fill('input[type="number"]', "6");
  
  await page.click('button:has-text("Crear mesa")');

  // Validar alerta de éxito y que la mesa aparece en pantalla
  await page.waitForSelector(`text=creada`);
  const cardLocator = page.locator(`div:has-text("${tableNum}")`).first();
  await expect(cardLocator).toBeVisible();

  // 4. Ver código QR
  // Hacemos click en el botón "Ver QR" del card de nuestra mesa
  const tableCard = page.locator(".p-4", { hasText: tableNum });
  await tableCard.locator('button:has-text("Ver QR")').click();

  // Verificar que el modal de QR se abre y muestra el código QR
  await expect(page.locator(".bg-white img")).toBeVisible();
  const qrUrl = await page.locator(".break-all").textContent();
  expect(qrUrl).toContain("/mesa/");

  // Click en Copiar URL dentro del modal
  await page.click('button:has-text("Copiar URL")');

  // Cerrar el modal
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await expect(page.locator(".bg-white img")).not.toBeVisible();

  // 5. Copiar URL directamente desde el card de la mesa
  await tableCard.locator('button[title="Copiar URL del QR"]').click();
  // Debería cambiar brevemente el icono o marcar como copiado

  // 6. Regenerar el QR
  // Configuramos el listener para aceptar la confirmación
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("Regenerar el QR invalidará");
    await dialog.accept();
  });
  await tableCard.locator('button[title="Regenerar QR"]').click();

  // Se abre el modal con el nuevo QR
  await expect(page.locator(".bg-white img")).toBeVisible();
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();

  // 7. Eliminar la mesa creada
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("¿Eliminar la mesa");
    await dialog.accept();
  });
  await tableCard.locator('button[title="Eliminar mesa"]').click();

  // Esperar confirmación de eliminación y validar que ya no existe la mesa
  await page.waitForSelector(`text=Mesa eliminada`);
  await expect(page.locator(`text=${tableNum}`)).not.toBeVisible();
});
