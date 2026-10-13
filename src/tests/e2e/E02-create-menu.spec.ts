/**
 * E-02: Owner crea categoría + menú + imagen + activa
 * Cliente ve menú por slug
 */
import { test, expect } from "@playwright/test";
import { faker } from "@faker-js/faker";

test("E-02 · Owner crea un plato y cliente lo ve", async ({ page, context }) => {
  const ownerEmail = process.env.E2E_OWNER_EMAIL;
  const ownerPassword = process.env.E2E_OWNER_PASSWORD;
  const slug = process.env.E2E_RESTAURANT_SLUG;
  test.skip(
    !ownerEmail || !ownerPassword || !slug,
    "Requiere credenciales y restaurante de un entorno E2E aislado."
  );
  const productName = faker.commerce.productName();
  // 1. Login como owner preaprovisionado.
  await page.goto("/login");
  await page.fill('input[name="email"], #email', ownerEmail!);
  await page.fill('input[name="password"], #password', ownerPassword!);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/restaurant/);

  // A newly provisioned owner must accept the required privacy notice before
  // interacting with the workspace. Existing owners do not see this dialog.
  const privacyDialog = page.getByRole("heading", { name: "Aviso de Privacidad" });
  const privacyConsent = page.getByRole("checkbox", {
    name: /He leído y acepto la política de privacidad/i,
  });
  const privacyNoticeIsShown = await privacyDialog
    .waitFor({ state: "visible", timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (privacyNoticeIsShown) {
    await privacyConsent.check();
    const acceptPrivacy = page.getByRole("button", { name: "Aceptar y continuar" });
    await expect(acceptPrivacy).toBeEnabled();
    await acceptPrivacy.click();
    await expect(privacyDialog).toBeHidden();
  }

  // 2. Ir al menú y crear un plato disponible.
  await page.goto("/restaurant/menu");
  await expect(page.getByRole("heading", { name: "Gestión del Menú" })).toBeVisible();
  await page.getByRole("button", { name: "Agregar Plato", exact: true }).click();
  await page.getByPlaceholder("Ej: Pizza Margherita").fill(productName);
  await page
    .getByPlaceholder("Describe los ingredientes o preparación...")
    .fill(faker.commerce.productDescription());
  await page.getByPlaceholder("Ej: Pizzas, Bebidas").fill(faker.commerce.department());
  await page.getByPlaceholder("0").fill("9990");
  await page.getByRole("button", { name: "Agregar Plato", exact: true }).last().click();

  const itemCard = page.locator(".hover\\:shadow-lg", { hasText: productName }).first();
  await expect(itemCard).toBeVisible();

  // 3. Abrir menú público en nueva pestaña (como cliente).
  const customerPage = await context.newPage();
  await customerPage.goto(`/menu/${slug!}`);

  // 4. Verificar que el item aparece en el menú público.
  await expect(customerPage.locator("body")).toContainText(productName);

  // 5. Limpiar el plato temporal del entorno de prueba.
  await itemCard.getByRole("button", { name: "Eliminar", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar Eliminación", exact: true }).click();
  await expect(page.locator("body")).not.toContainText(productName);
});
