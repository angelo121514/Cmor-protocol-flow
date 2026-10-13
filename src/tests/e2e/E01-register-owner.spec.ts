/**
 * E-01: Flujo completo de registro de owner
 * Landing → registro → selección de plan. La activación e invitación se
 * validan por separado contra el sandbox de Flow/las Edge Functions.
 *
 * Requiere: app corriendo en http://localhost:5173 con .env (no mock)
 * o modo demo (mock).
 */
import { test, expect } from "@playwright/test";
import { faker } from "@faker-js/faker";

test("E-01 · Registro owner avanza a selección de plan", async ({ page }) => {
  test.skip(
    process.env.E2E_REGISTRATION_ENABLED !== "true",
    "Requiere un entorno E2E aislado: el registro persiste una solicitud en Supabase."
  );
  const email = faker.internet.email();

  // 1. Landing page
  await page.goto("/");
  await expect(page).toHaveTitle(/CMOR|Cmor|food/i);

  // 2. Click en registrarse
  await page.click('a[href="/register"], button:has-text("Registrar")');
  await page.waitForURL(/\/register/);

  // 3. Llenar formulario de registro
  await page.fill('input[name="restaurant_name"], #restaurant_name', faker.company.name());
  await page.fill('input[name="owner_name"], #owner_name', faker.person.fullName());
  await page.fill('input[name="email"], #email', email);
  await page.fill('input[name="phone"], #phone', "+56900000000");
  await page.fill('input[name="city"], #city', "Santiago");
  await page.selectOption('select[name="restaurant_type"]', { label: "Restaurante" });

  // 4. El registro válido avanza a la selección de los cuatro planes, incluida
  // la licencia de por vida. No se crea un pago real desde un E2E local.
  await page.getByRole("button", { name: "Continuar al Pago y Activación" }).click();
  await expect(page.getByRole("heading", { name: "Paso 2: Activa tu Plan de Suscripción" })).toBeVisible();
  await expect(page.getByText("De por vida", { exact: true })).toBeVisible();
});
