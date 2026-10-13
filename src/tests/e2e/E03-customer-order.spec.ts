/**
 * E-03: Cliente hace pedido completo
 * menú → carrito → checkout → owner recibe notificación
 */
import { test, expect } from "@playwright/test";

test("E-03 · Cliente hace pedido E2E", async ({ page, context }) => {
  const slug = process.env.E2E_RESTAURANT_SLUG;
  const ownerEmail = process.env.E2E_OWNER_EMAIL;
  const ownerPassword = process.env.E2E_OWNER_PASSWORD;
  test.skip(
    !slug || !ownerEmail || !ownerPassword,
    "Requiere credenciales y restaurante de un entorno E2E aislado."
  );
  const customerName = `Cliente E2E ${Date.now()}`;

  // 1. Cliente abre menú
  await page.goto(`/menu/${slug!}`);
  await expect(page.getByRole("button", { name: "AGREGAR", exact: true }).first()).toBeVisible();
  const necessaryCookies = page.getByRole("button", { name: "Solo necesarias" });
  if (await necessaryCookies.isVisible().catch(() => false)) {
    await necessaryCookies.click();
  }

  // 2. Agregar item al carrito
  const addButton = page.getByRole("button", { name: "AGREGAR", exact: true }).first();
  await expect(addButton).toBeVisible();
  await addButton.click();
  const customizationSubmit = page.getByRole("button", { name: "Agregar al Carrito", exact: true });
  if (await customizationSubmit.isVisible().catch(() => false)) {
    await customizationSubmit.click();
  }

  // 3. Ir al carrito
  await page.getByRole("button", { name: /Ver Carrito/i }).click();
  await expect(page.locator("body")).toContainText(/total|subtotal/i);

  // 4. Checkout
  await page.getByRole("button", { name: "Proceder a enviar a cocina", exact: true }).click();
  await page.getByPlaceholder("Ej: Mesa 4, Barra, Terraza 2").fill("Mesa E2E");
  await page.getByPlaceholder("Escribe tu nombre").fill(customerName);
  await page.getByPlaceholder("Ej: +56900000000").fill("+56900000000");

  await page.getByRole("button", { name: "Confirmar y Enviar Pedido", exact: true }).click();

  // 5. Verificar confirmación
  await expect(page.locator("body")).toContainText("¡Pedido Exitoso!");

  // 6. En otra pestaña, owner debe ver el nuevo pedido
  const ownerPage = await context.newPage();
  await ownerPage.goto("/login");
  await ownerPage.fill('input[name="email"], #email', ownerEmail!);
  await ownerPage.fill('input[name="password"], #password', ownerPassword!);
  await ownerPage.click('button[type="submit"]');
  await ownerPage.waitForURL(/\/restaurant/);

  await ownerPage.click('a:has-text("Pedidos"), a:has-text("Orders")');
  await expect(ownerPage.locator("body")).toContainText(customerName);
});
