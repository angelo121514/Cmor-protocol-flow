/**
 * E-10: Validación completa de Gestión de Menú/Carta
 * Registro/Login -> Navegación a Menú -> Crear Plato -> Cambiar Disponibilidad -> Editar Plato -> Eliminar Plato
 */
/**
 * E-10: Validación completa de Gestión de Menú/Carta
 * Registro/Login -> Navegación a Menú -> Crear Plato -> Cambiar Disponibilidad -> Editar Plato -> Eliminar Plato
 */
import { test, expect } from "@playwright/test";

test("E-10 · Control completo de Menú y Carta", async ({ page }) => {
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

  // 2. Navegar a la sección de Menú/Carta
  await page.goto("/restaurant/menu");

  // Aceptar el modal de Aviso de Privacidad si aparece
  try {
    const privacyModal = page.locator('text=Aviso de Privacidad');
    await privacyModal.waitFor({ state: 'visible', timeout: 8000 });
    await page.locator('input[type="checkbox"]').first().check({ force: true });
    await page.click('button:has-text("Aceptar y continuar")');
    await page.waitForTimeout(1500);
  } catch {
    // Continuar si no aparece
  }

  await expect(page.getByRole("heading", { name: "Gestión del Menú" })).toBeVisible({ timeout: 15000 });

  const platoName = `Sushi E2E ${Date.now()}`;

  // 3. Crear un nuevo plato
  await page.click('button:has-text("Agregar Plato")');
  // Esperar a que el estado local de autenticación del modal se resuelva
  await page.waitForTimeout(1500);
  await page.fill('input[placeholder*="Ej: Pizza Margherita"]', platoName);
  await page.fill('textarea[placeholder*="Describe los ingredientes"]', "Descripción de sushi de prueba E2E");
  await page.fill('input[placeholder*="Ej: Pizzas, Bebidas"]', "Sushis");
  await page.fill('input[placeholder="0"]', "8990");
  
  await page.click('button[type="submit"]:has-text("Agregar Plato")');

  // Validar que el plato fue creado y es visible en la lista
  const itemCard = page.locator(".hover\\:shadow-lg", { hasText: platoName }).first();
  await expect(itemCard).toBeVisible({ timeout: 10000 });

  // 4. Cambiar disponibilidad (Desactivar/Activar)
  // Desactivamos el plato
  await itemCard.locator('button:has-text("Desactivar")').click();
  await expect(itemCard.locator('text=Pausado')).toBeVisible();

  // Lo volvemos a activar
  await itemCard.locator('button:has-text("Activar")').click();
  await expect(itemCard.locator('text=Disponible')).toBeVisible();

  // 5. Editar el plato
  await itemCard.locator('button:has-text("Editar")').click();
  // Esperar a que el estado local de autenticación del modal se resuelva
  await page.waitForTimeout(1500);
  
  // Modificar el nombre
  const updatedPlatoName = `${platoName} Modificado`;
  await page.fill('input[placeholder*="Ej: Pizza Margherita"]', updatedPlatoName);
  await page.click('button[type="submit"]:has-text("Guardar Cambios")');

  // Verificar el nuevo nombre en la lista
  const updatedItemCard = page.locator(".hover\\:shadow-lg", { hasText: updatedPlatoName }).first();
  await expect(updatedItemCard).toBeVisible({ timeout: 10000 });

  // 6. Eliminar el plato
  await updatedItemCard.locator('button:has-text("Eliminar")').click();
  
  // Confirmar eliminación en el modal
  await page.click('button:has-text("Confirmar Eliminación")');

  // Validar que ya no existe en la lista
  const deletedCard = page.locator(".hover\\:shadow-lg", { hasText: updatedPlatoName });
  await expect(deletedCard).not.toBeVisible({ timeout: 10000 });
});
