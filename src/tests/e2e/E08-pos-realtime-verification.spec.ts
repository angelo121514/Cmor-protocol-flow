import { test, expect } from "@playwright/test";

test("E-08 · POS se actualiza cuando entra un pedido QR", async ({ page }) => {
  const ownerEmail = process.env.E2E_OWNER_EMAIL;
  const ownerPassword = process.env.E2E_OWNER_PASSWORD;
  const slug = process.env.E2E_RESTAURANT_SLUG;
  const apiUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  test.skip(
    !ownerEmail || !ownerPassword || !slug || !apiUrl || !anonKey,
    "Requiere owner, restaurante y Supabase de un entorno E2E aislado."
  );

  // El checkout visual completo se cubre en E-03. Aquí el foco es que el POS
  // recibe un pedido nuevo, usando la misma RPC pública y validada del checkout.
  await page.goto("/login");
  await page.fill('input[name="email"], #email', ownerEmail!);
  await page.fill('input[name="password"], #password', ownerPassword!);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/restaurant/);
  await page.goto("/restaurant/pos");
  await expect(page.getByRole("heading", { name: /Detalle del Pedido/i })).toBeVisible();

  const headers = { apikey: anonKey!, Authorization: `Bearer ${anonKey!}` };
  const restaurantResponse = await fetch(
    `${apiUrl}/rest/v1/restaurants?select=id&slug=eq.${encodeURIComponent(slug!)}`,
    { headers }
  );
  expect(restaurantResponse.ok).toBeTruthy();
  const [restaurant] = (await restaurantResponse.json()) as Array<{ id: string }>;
  expect(restaurant?.id).toBeTruthy();

  const itemResponse = await fetch(
    `${apiUrl}/rest/v1/menu_items?select=id&restaurant_id=eq.${restaurant.id}&is_available=eq.true&limit=1`,
    { headers }
  );
  expect(itemResponse.ok).toBeTruthy();
  const [item] = (await itemResponse.json()) as Array<{ id: string }>;
  expect(item?.id).toBeTruthy();

  const customerName = `Cliente POS E2E ${Date.now()}`;
  const orderResponse = await fetch(`${apiUrl}/rest/v1/rpc/create_order`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      p_restaurant_id: restaurant.id,
      p_items: [{ menu_item_id: item.id, quantity: 1 }],
      p_customer_name: customerName,
      p_customer_phone: "+56900000000",
      p_order_type: "qr",
      p_table_number: "Mesa POS E2E",
      p_payment_method: "qr",
    }),
  });
  expect(orderResponse.ok).toBeTruthy();
  expect((await orderResponse.json()).success).toBe(true);

  // Realtime o, como respaldo, el refresco del POS deben mostrar el pedido
  // sin intervención adicional del dueño.
  await expect(page.getByText(customerName, { exact: false })).toBeVisible({ timeout: 15_000 });
});
