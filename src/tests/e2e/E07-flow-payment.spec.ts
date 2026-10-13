import { errorMessage } from "../../../shared/errors";
import { test, expect } from "@playwright/test";
import { faker } from "@faker-js/faker";
import type { Page } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:5173";
const flowSandboxEnabled = process.env.E2E_FLOW_SANDBOX_ENABLED === "true";
const paymentTestEmail = process.env.E2E_PAYMENT_TEST_EMAIL;

// Helper para crear registros de restaurantes
async function fillRegistrationForm(page: Page, email: string, restaurantName: string) {
  await page.goto(BASE_URL + "/register");
  
  await page.fill('input[name="restaurant_name"], #restaurant_name', restaurantName);
  await page.fill('input[name="owner_name"], #owner_name', faker.person.fullName());
  await page.fill('input[name="email"], #email', email);
  await page.fill('input[name="phone"], #phone', "+56900000000");
  await page.selectOption('select[name="restaurant_type"], #restaurant_type', { label: "Restaurante" });
  await page.fill('input[name="city"], #city', "Santiago");

  await page.click('button[type="submit"]:has-text("Continuar al Pago y Activación")');
  await expect(page.locator("body")).toContainText(/Activa tu Plan de Suscripción/i, { timeout: 15_000 });
}

// Helper genérico para presionar el botón de regresar al comercio en Flow Sandbox
async function handleFlowSandboxReturn(page: Page) {
  console.log("Esperando pantalla de confirmación/retorno de Flow Sandbox...");
  await page.waitForTimeout(4000);
  
  // Buscar botones de retorno (suelen ser de submit o links de volver al comercio)
  const volverFlowBtn = page.locator('button, input[type="submit"], a:has-text("Volver"), button:has-text("Volver"), a:has-text("comercio")').first();
  if (await volverFlowBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
    console.log("Haciendo click en botón de retorno de Flow Sandbox");
    await volverFlowBtn.click();
  }
}

// ─────────────────────────────────────────────────────────────────────
// 1. UN PAGO ACEPTADO POR CADA PLAN PAGADO
// ─────────────────────────────────────────────────────────────────────

for (const { plan, heading } of [
  { plan: "starter", heading: "Básico" },
  { plan: "pro", heading: "Pro" },
  { plan: "lifetime", heading: "De por vida" },
] as const) {
  test(`E-07 · Pago Aceptado Flow · ${heading}`, async ({ page }) => {
    test.skip(
      !flowSandboxEnabled || !paymentTestEmail,
      "Requiere Flow Sandbox y un correo de prueba configurados explícitamente."
    );
    // Incrementar timeout del test para pasarelas
    test.setTimeout(90000);

    const email = paymentTestEmail!;
    const restaurantName = `Restaurante E2E Flow ${plan} ${Date.now()}`;

    console.log(`[FlowTest ${plan}] Iniciando registro...`);
    await fillRegistrationForm(page, email, restaurantName);

    // Cada plan debe iniciar el mismo checkout seguro; "De por vida" es
    // explícitamente un pago único, no una suscripción recurrente.
    await page.getByRole("heading", { name: heading, exact: true }).click();

    // Click en "Pagar con Flow.cl"
    await page.click('button:has-text("Pagar con Flow.cl")');
    console.log(`[FlowTest ${plan}] Redirigiendo a Flow...`);

    // Esperar redirección al portal de Flow
    await page.waitForURL(/flow\.cl/, { timeout: 25_000 });
    console.log(`[FlowTest ${plan}] En pasarela Flow:`, page.url());

    // 1. Seleccionar "Tarjetas de crédito y débito" y presionar "Pagar ahora" en Flow
    await page.locator('text="Tarjetas de crédito y débito"').first().click();
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Pagar ahora")');
    console.log(`[FlowTest ${plan}] Seleccionado medio de pago y enviado. Redirigiendo a Transbank...`);

    // 2. Esperar que cargue el portal de Transbank y hacer click en "Tarjetas"
    await page.click('button:has-text("Tarjetas"), button:has-text("Crédito, Débito, Prepago")');
    await page.waitForTimeout(1000);

    // 3. Rellenar datos de la tarjeta
    const ccInput = page.getByPlaceholder('XXXX XXXX XXXX XXXX');
    await ccInput.waitFor({ state: 'visible', timeout: 15000 });
    await ccInput.fill("4051885600446623");

    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.waitForTimeout(2000);

    const expInput = page.getByPlaceholder('MM/AA');
    if (await expInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expInput.fill("12/28");
    }
    const cvvInput = page.getByPlaceholder('•••');
    if (await cvvInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await cvvInput.fill("123");
    }
    await page.waitForTimeout(1000);

    // Click en Pagar
    await page.getByRole('button', { name: 'Pagar', exact: true }).click();
    await page.waitForTimeout(4000);

    // 4. Simulación del banco (Redbanc)
    await page.waitForURL(/testcommercebank|authenticator/, { timeout: 25_000 });
    console.log(`[FlowTest ${plan}] En el simulador bancario`);

    const textboxes = page.getByRole('textbox');
    await textboxes.nth(0).fill("11111111-1");
    await textboxes.nth(1).fill("123");
    
    await page.getByRole('button', { name: "Aceptar" }).click();
    await page.waitForTimeout(5000);

    // 5. Retorno a Flow Sandbox y redirección al comercio
    await handleFlowSandboxReturn(page);

    // 6. Esperar redirección al frontend de la aplicación en setup-password
    await page.waitForURL(/\/setup-password/, { timeout: 45_000 });
    console.log(`[FlowTest ${plan}] Redirigido de vuelta al setup-password. URL actual:`, page.url());

    // Validar comprobante o formulario de contraseña
    await expect(page.locator("body")).toContainText(/Activa tu Cuenta|Establecer contraseña|Comprobante de Pago|Procesada|Éxito/i);
    console.log(`[FlowTest ${plan}] Pruebas completadas con éxito.`);
  });
}

// ─────────────────────────────────────────────────────────────────────
// 2. DOS PAGOS RECHAZADOS / CANCELADOS
// ─────────────────────────────────────────────────────────────────────

for (const index of [1, 2]) {
  test(`E-07 · Pago Rechazado Flow #${index}`, async ({ page }) => {
    test.skip(
      !flowSandboxEnabled || !paymentTestEmail,
      "Requiere Flow Sandbox y un correo de prueba configurados explícitamente."
    );
    // Incrementar timeout del test para pasarelas
    test.setTimeout(90000);

    const email = paymentTestEmail!;
    const restaurantName = `Restaurante Rechazado Flow ${index}`;

    console.log(`[FlowTest Fail #${index}] Iniciando registro...`);
    await fillRegistrationForm(page, email, restaurantName);

    // Seleccionar plan Básico.
    await page.getByRole("heading", { name: "Básico", exact: true }).click();

    // Click en "Pagar con Flow.cl"
    await page.click('button:has-text("Pagar con Flow.cl")');

    // Esperar redirección
    await page.waitForURL(/flow\.cl/, { timeout: 25_000 });
    console.log(`[FlowTest Fail #${index}] En pasarela Flow...`);

    // 1. En la pantalla inicial de Flow, seleccionar "Tarjetas de crédito y débito" y presionar "Pagar ahora"
    await page.locator('text="Tarjetas de crédito y débito"').first().click();
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Pagar ahora")');
    console.log(`[FlowTest Fail #${index}] Botón Pagar ahora presionado. Redirigiendo a Transbank...`);

    // Esperar a que cargue Transbank
    await page.waitForTimeout(3000);

    // 2. Intentar anular la compra en Transbank haciendo click en "Anular compra y volver"
    console.log(`[FlowTest Fail #${index}] Buscando botón de anulación en Transbank...`);
    const anularSelector = 'button:has-text("Anular"), a:has-text("Anular"), button:has-text("volver"), a:has-text("volver")';
    try {
      await page.locator(anularSelector).first().click();
      console.log(`[FlowTest Fail #${index}] Botón de anular presionado.`);
    } catch (e: unknown) {
      console.log(`[FlowTest Fail #${index}] No se pudo presionar botón de anular directo: ${errorMessage(e)}. Intentando avanzar a Tarjetas...`);
      // Si no encuentra el botón de anular directamente, hacemos click en Tarjetas y anulamos adentro
      await page.click('button:has-text("Tarjetas"), button:has-text("Crédito, Débito, Prepago")');
      await page.waitForTimeout(2000);
      await page.locator(anularSelector).first().click();
      console.log(`[FlowTest Fail #${index}] Enlace de anular presionado en el portal de tarjetas.`);
    }

    // 3. Al anular, Transbank nos devuelve a Flow Sandbox. Manejamos el retorno.
    console.log(`[FlowTest Fail #${index}] Volviendo a Flow Sandbox... URL antes de retorno:`, page.url());
    await handleFlowSandboxReturn(page);
    await page.waitForTimeout(3000);
    console.log(`[FlowTest Fail #${index}] Retorno procesado. URL actual:`, page.url());

    // 4. Esperar a ser devuelto al comercio en la pantalla de error o de registro original
    try {
      await page.waitForURL(/\/payment\/error|error|register/, { timeout: 25_000 });
      console.log(`[FlowTest Fail #${index}] Redirigido exitosamente al comercio. URL actual:`, page.url());
    } catch (e) {
      console.log(`[FlowTest Fail #${index}] Timeout esperando retorno. URL final:`, page.url());
      throw e;
    }

    // Validar según la URL de retorno
    const currentUrl = page.url();
    if (currentUrl.includes("/register")) {
      await expect(page.locator("body")).toContainText(/Registra tu Restaurante|Detalles del Restaurante/i);
      console.log(`[FlowTest Fail #${index}] Compra anulada: Redirigido correctamente de vuelta al registro.`);
    } else {
      await expect(page.locator("body")).toContainText(/Pago Fallido|Fallido|Error|Problema|Cancelada/i);
      console.log(`[FlowTest Fail #${index}] Compra anulada: Redirigido correctamente a pantalla de error.`);
    }
  });
}
