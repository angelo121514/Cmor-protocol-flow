import { test, expect } from "@playwright/test";
import { faker } from "@faker-js/faker";

test("E-06 · Registro owner con pago Webpay Plus", async ({ page }) => {
  test.skip(
    process.env.E2E_WEBPAY_ENABLED !== "true",
    "Webpay no es la pasarela configurada actualmente; no ejecutar fuera de un sandbox dedicado."
  );
  const email = faker.internet.email().toLowerCase();
  const password = "TestPassword123!";
  const restaurantName = faker.company.name();

  // 1. Landing page
  await page.goto("/");
  await expect(page).toHaveTitle(/CMOR|Cmor|food/i);

  // 2. Click en registrarse
  await page.click('a[href="/register"], button:has-text("Registrar")');
  await page.waitForURL(/\/register/);

  // 3. Llenar formulario de registro (Paso 1)
  await page.fill('input[name="restaurant_name"], #restaurant_name', restaurantName);
  await page.fill('input[name="owner_name"], #owner_name', faker.person.fullName());
  await page.fill('input[name="email"], #email', email);
  await page.fill('input[name="phone"], #phone', "+56900000000");
  await page.fill('input[name="password"], #password', password);
  
  // Seleccionar tipo de restaurante y ciudad para pasar validaciones
  await page.selectOption('select[name="restaurant_type"], #restaurant_type', { index: 1 });
  await page.fill('input[name="city"], #city', "Santiago");

  // 4. Submit de la primera pantalla para ir al paso de pago
  await page.click('button[type="submit"]:has-text("Continuar al Pago y Activación")');

  // 5. Esperar a que pase al paso de pago (Paso 2)
  await expect(page.locator("body")).toContainText(/Activa tu Plan de Suscripción/i, { timeout: 15_000 });

  // 6. Seleccionar plan Starter (Básico) en el paso de pago
  await page.click('h3:has-text("Starter"), div:has(h3:has-text("Starter")), [data-plan="starter"]');

  // 7. Click en "Pagar con Webpay Plus"
  await page.click('button:has-text("Pagar con Webpay Plus")');

  // 8. Esperar la redirección a Transbank (Integration Sandbox)
  await page.waitForURL(/transbank\.cl/, { timeout: 25_000 });
  console.log("Redirigido a Transbank:", page.url());

  // 9. En el portal de Transbank, simular el pago
  // 9.1 Seleccionar el acordeón de tarjetas
  await page.getByRole('button', { name: /Tarjetas/i }).click();
  console.log("Seleccionado medio de pago: Tarjetas");
  await page.waitForTimeout(2000);

  // 9.2 Ingresar tarjeta de crédito de prueba
  const ccInput = page.getByPlaceholder('XXXX XXXX XXXX XXXX');
  await ccInput.waitFor({ state: 'visible', timeout: 5000 });
  await ccInput.fill("4051885600446623");
  console.log("Ingresada tarjeta de crédito de prueba");
  await page.waitForTimeout(1000);

  // Hacer click en "Continuar" para avanzar al formulario de fecha/CVV
  await page.getByRole('button', { name: 'Continuar' }).click();
  console.log("Click en Continuar tarjeta");
  await page.waitForTimeout(2000);

  // 9.3 Rellenar fecha de expiración y CVV
  const expInput = page.getByPlaceholder('MM/AA');
  if (await expInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await expInput.fill("12/28");
    console.log("Ingresada fecha de expiración de prueba (12/28)");
  }

  const cvvInput = page.getByPlaceholder('•••');
  if (await cvvInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await cvvInput.fill("123");
    console.log("Ingresado CVV de prueba (123)");
  }
  await page.waitForTimeout(1000);

  // 9.4 Hacer click en el botón de pagar
  await page.getByRole('button', { name: 'Pagar', exact: true }).click();
  console.log("Click en Pagar");
  await page.waitForTimeout(4000);

  // 9.5 Simulación del banco (Redbanc) - Completar Rut y Clave
  // Esperamos a estar en testcommercebank/authenticator.cgi
  await page.waitForURL(/testcommercebank/, { timeout: 15_000 });
  console.log("En pantalla de simulación bancaria de Redbanc");

  // El primer textbox es Rut y el segundo es Clave
  const textboxes = page.getByRole('textbox');
  await textboxes.nth(0).fill("11111111-1");
  await textboxes.nth(1).fill("123");
  console.log("Ingresadas credenciales de banco simulado (RUT y Clave)");
  await page.waitForTimeout(1000);

  // Click en "Aceptar" del banco simulado
  await page.getByRole('button', { name: "Aceptar" }).click();
  console.log("Click en Aceptar simulación bancaria");
  await page.waitForTimeout(4000);

  // 9.6 En la pantalla de éxito final de Transbank, hacer click en continuar para regresar al comercio
  // Si vuelve a aparecer un botón de continuar/regresar
  const volverBtn = page.getByRole('button', { name: /Continuar|Regresar/i });
  if (await volverBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
    await volverBtn.click();
    console.log("Click en regresar al comercio");
  }

  // 10. Tras el pago exitoso, Transbank llama al webhook local, que nos redirige al setup-password
  await page.waitForURL(/\/setup-password/, { timeout: 45_000 });
  console.log("Redirigido de vuelta a setup-password:", page.url());

  // 11. Verificar el comprobante de pago
  await expect(page.locator("body")).toContainText(/Comprobante de Pago/i);
  await expect(page.locator("body")).toContainText(/Transacción procesada/i);

  // 12. Guardar la contraseña para finalizar
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]:has-text("Finalizar"), button[type="submit"]');

  // 13. Debe redirigir al Dashboard del restaurante
  await page.waitForURL(/\/restaurant|\/login/, { timeout: 15_000 });
  if (page.url().includes("/restaurant")) {
    await expect(page.locator("body")).toContainText(/dashboard|restaurante|menú|menu/i);
  }
});
