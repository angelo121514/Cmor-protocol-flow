// --------------------------------------------------------------------
// Configuración regional multi-país (Fase 1 multi-country)
//
// SEPARACIÓN DE RESPONSABILIDADES:
//   - REGIONAL_CONFIG: valores por defecto / recomendados por país.
//   - La BD (restaurants.country / restaurants.currency / restaurants.tax_rate)
//     guarda la CONFIGURACIÓN EFECTIVA de cada restaurante. El país sugiere,
//     el dueño decide.
//   - PLAN_PRICES: precios de planes por país, separados de la config
//     tributaria. Los valores de CL son una copia EXACTA de APP_CONFIG.plans
//     (config.ts) — el test U22 vigila esa igualdad.
//
// REGLA DE COMPATIBILIDAD: Chile (CL) debe comportarse EXACTAMENTE igual a
// como lo hacía antes de esta migración (regresión sagrada). Cualquier
// valor nuevo aquí debe tener el mismo efecto que el código legacy para CL.
// --------------------------------------------------------------------

import type { PlanId } from "./config";

export type CountryCode = "CL" | "BR" | "BO" | "PE";
export type LanguageCode = "es" | "en" | "pt";
export type CurrencyCode = "CLP" | "USD" | "BRL" | "BOB" | "PEN";

export interface RegionalConfig {
  /** Etiqueta visible en selectores (español, el panel está en es) */
  label: string;
  currency: CurrencyCode;
  currencySymbol: string;
  locale: string;
  /** Decimales de la moneda: CLP 0, resto 2 */
  decimals: number;
  phonePrefix: string;
  /** Idiomas disponibles para la carta pública (QR) */
  languages: LanguageCode[];
  /**
   * Tasa de impuesto SUGERIDA al configurar (fracción: 0.19 = 19%).
   * null = sin sugerencia (el dueño debe configurar su régimen; 0 = no desglosar).
   * Es configuración inicial, NO legislación rígida.
   */
  suggestedTaxRate: number | null;
  /** Nombre del impuesto para etiquetas ("IVA", "IGV", ...) */
  taxName: string;
  /** Pasarela de pago online disponible en Fase 1 */
  paymentGateway: "flow" | "mp" | "manual";
}

export const REGIONAL_CONFIG: Record<CountryCode, RegionalConfig> = {
  CL: {
    label: "Chile",
    currency: "CLP",
    currencySymbol: "$",
    locale: "es-CL",
    decimals: 0,
    phonePrefix: "+56",
    languages: ["es", "en"],
    suggestedTaxRate: 0.19,
    taxName: "IVA",
    paymentGateway: "flow",
  },
  BR: {
    label: "Brasil",
    currency: "BRL",
    currencySymbol: "R$",
    locale: "pt-BR",
    decimals: 2,
    phonePrefix: "+55",
    languages: ["pt", "en"],
    suggestedTaxRate: null, // Sin sugerencia: el dueño configura ISS/ICMS de su régimen
    taxName: "Impuesto",
    paymentGateway: "mp",
  },
  BO: {
    label: "Bolivia",
    currency: "BOB",
    currencySymbol: "Bs",
    locale: "es-BO",
    decimals: 2,
    phonePrefix: "+591",
    languages: ["es", "en"],
    suggestedTaxRate: 0.13,
    taxName: "IVA",
    paymentGateway: "manual",
  },
  PE: {
    label: "Perú",
    currency: "PEN",
    currencySymbol: "S/",
    locale: "es-PE",
    decimals: 2,
    phonePrefix: "+51",
    languages: ["es", "en"],
    suggestedTaxRate: 0.18,
    taxName: "IGV",
    paymentGateway: "mp",
  },
};

export const COUNTRY_CODES = Object.keys(REGIONAL_CONFIG) as CountryCode[];

/** Fallback total: cualquier valor inesperado se comporta como Chile (legacy). */
export const DEFAULT_COUNTRY: CountryCode = "CL";

export const getRegionalConfig = (
  country?: string | null
): RegionalConfig =>
  (country && country in REGIONAL_CONFIG
    ? REGIONAL_CONFIG[country as CountryCode]
    : REGIONAL_CONFIG[DEFAULT_COUNTRY]);

/**
 * ¿El restaurante usa pago online Flow.cl? (Solo Chile)
 */
export const isFlowCountry = (country?: string | null): boolean =>
  getRegionalConfig(country).paymentGateway === "flow";

/**
 * ¿El restaurante usa Mercado Pago como pasarela online? (BR/PE, Fase 2)
 */
export const isMpCountry = (country?: string | null): boolean =>
  getRegionalConfig(country).paymentGateway === "mp";

export interface PlanPrice {
  price: number;
  original_price?: number;
  price_annual?: number;
  original_price_annual?: number;
}

/**
 * Precios de planes por país. La moneda implícita es REGIONAL_CONFIG[country].currency.
 *
 * El catálogo canónico vive en shared/plan-prices.ts. Modifica ese módulo con una spec de cambio.
 */
export { PLAN_PRICES } from "../../shared/plan-prices";
import { PLAN_PRICES } from "../../shared/plan-prices";

/**
 * Precios de planes para un país (fallback CL si el país es desconocido).
 */
export const getPlanPrices = (country?: string | null): Record<PlanId, PlanPrice> => {
  const c =
    country && country in REGIONAL_CONFIG ? (country as CountryCode) : DEFAULT_COUNTRY;
  const result = {} as Record<PlanId, PlanPrice>;
  (Object.keys(PLAN_PRICES) as PlanId[]).forEach((plan) => {
    result[plan] = PLAN_PRICES[plan][c];
  });
  return result;
};