export type PlanId = "free_trial" | "starter" | "pro" | "lifetime";
export type CountryCode = "CL" | "BR" | "BO" | "PE";
export interface PlanPrice { price: number; original_price?: number; price_annual?: number; original_price_annual?: number; }
export const PLAN_PRICES: Record<PlanId, Record<CountryCode, PlanPrice>> = {
  free_trial: {
    CL: { price: 0 },
    BR: { price: 0 },
    BO: { price: 0 },
    PE: { price: 0 },
  },
  starter: {
    // CL: exacto a config.ts (28000 / 285600 anual con 15% dcto)
    CL: { price: 28000, original_price: 40000, price_annual: 285600, original_price_annual: 408000 },
    BR: { price: 149, original_price: 199, price_annual: 1490, original_price_annual: 1990 },
    BO: { price: 190, original_price: 250, price_annual: 1900, original_price_annual: 2500 },
    PE: { price: 119, original_price: 159, price_annual: 1190, original_price_annual: 1590 },
  },
  pro: {
    // CL: exacto a config.ts (98000 / 999600 anual)
    CL: { price: 98000, original_price: 120000, price_annual: 999600, original_price_annual: 1224000 },
    BR: { price: 520, original_price: 690, price_annual: 5190, original_price_annual: 6900 },
    BO: { price: 660, original_price: 890, price_annual: 6600, original_price_annual: 8900 },
    PE: { price: 390, original_price: 519, price_annual: 3899, original_price_annual: 5190 },
  },
  lifetime: {
    // CL: exacto a config.ts (1900000 pago único)
    CL: { price: 1900000 },
    BR: { price: 9900 },
    BO: { price: 12500 },
    PE: { price: 7500 },
  },
};
