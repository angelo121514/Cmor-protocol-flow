import { PLAN_PRICES } from "../../shared/plan-prices";
// Supabase Configuration
// Replace these with your actual Supabase project credentials
// Get them from: https://app.supabase.com/project/_/settings/api

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "YOUR_SUPABASE_URL";
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY";

// Application Configuration
export const MAX_RESTAURANTS_PER_USER = 5;

export type PlanId = "free_trial" | "starter" | "pro" | "lifetime";

export const APP_CONFIG = {
  appName: "CMOR FLOW",
  defaultCurrency: "$",
  taxRate: 0.19, // 19% IVA (Chile)
  orderPrefix: "PED",

  // Subscription plans
  plans: {
    free_trial: {
      name: "Prueba Gratuita",
      price: 0,
      price_usd: 0,
      price_annual: 0,
      price_annual_usd: 0,
      duration: "14 días",
      billing_type: "trial",
      features: [
        "Hasta 50 pedidos/mes",
        "Gestión básica de menú",
        "Pedidos por código QR",
        "CRM Integrado de Clientes",
        "Soporte por correo electrónico",
      ],
    },
    starter: {
      name: "Básico",
      price: PLAN_PRICES.starter.CL.price,
      original_price: PLAN_PRICES.starter.CL.original_price,
      price_usd: 35,
      original_price_usd: 50,
      price_annual: PLAN_PRICES.starter.CL.price_annual,
      original_price_annual: PLAN_PRICES.starter.CL.original_price_annual,
      price_annual_usd: 357,
      original_price_annual_usd: 510,
      duration: "por mes",
      billing_type: "recurring",
      offer_label: "¡Oferta sólo por 30 días, precio permanente!",
      features: [
        "Pedidos ilimitados",
        "Gestión completa de menú",
        "Pedidos por código QR",
        "Reportes básicos",
        "CRM Integrado de Clientes",
        "Soporte por WhatsApp",
      ],
    },
    pro: {
      name: "Pro",
      price: PLAN_PRICES.pro.CL.price,
      original_price: PLAN_PRICES.pro.CL.original_price,
      price_usd: 110,
      original_price_usd: 130,
      price_annual: PLAN_PRICES.pro.CL.price_annual,
      original_price_annual: PLAN_PRICES.pro.CL.original_price_annual,
      price_annual_usd: 1122,
      original_price_annual_usd: 1326,
      duration: "por mes",
      billing_type: "recurring",
      offer_label: "¡Oferta sólo por 30 días, precio permanente!",
      features: [
        "Todo lo del plan Básico",
        "Página web personalizada, posicionada en Google y con botones de llamada de acción",
        "Integración pasarela de pago online Transbank en página web",
        "Multi-sucursal (hasta 5 locales)",
        "Estadísticas y reportes avanzados",
        "Contenido para redes sociales",
        "Marca personalizada",
        "Asistente local de la carta; IA externa desactivada",
        "CRM Integrado de Clientes",
        "Soporte Premium 24/7",
      ],
    },
    lifetime: {
      name: "De por vida",
      price: PLAN_PRICES.lifetime.CL.price,
      price_usd: 0,
      original_price_usd: 0,
      price_annual: undefined,
      original_price_annual: undefined,
      price_annual_usd: undefined,
      original_price_annual_usd: undefined,
      duration: "pago único",
      billing_type: "one_time",
      features: [
        "Acceso completo al software para siempre",
        "Todo lo incluido en el plan Pro",
        "Hasta 5 locales",
        "Actualizaciones del producto incluidas",
        "Sin mensualidades ni renovaciones",
        "Soporte Premium",
      ],
    },
  },

  // Restaurant types
  restaurantTypes: [
    "Restaurante",
    "Food Truck",
    "Cafetería",
    "Pastelería / Panadería",
    "Cocina Oculta (Cloud Kitchen)",
    "Cena Fina",
    "Comida Rápida",
    "Pizzería",
    "Sushi bar",
    "Otro",
  ],

  // Menu categories
  menuCategories: [
    "Entradas",
    "Platos Principales",
    "Desayunos",
    "Almuerzos",
    "Bebidas",
    "Postres",
    "Pizzas",
    "Sushi",
    "Snacks / Sándwiches",
    "Otro",
  ],

  // Order statuses
  orderStatuses: {
    pending: { label: "Pendiente", color: "warning" },
    accepted: { label: "Aceptado", color: "accent-secondary" },
    preparing: { label: "Preparando", color: "accent-secondary" },
    ready: { label: "Listo", color: "success" },
    completed: { label: "Completado", color: "success" },
    cancelled: { label: "Cancelado", color: "error" },
    rejected: { label: "Rechazado", color: "error" },
  },

  // Payment methods
  paymentMethods: ["Efectivo", "Transferencia", "Tarjeta de Débito/Crédito", "Otro"],

  // Registration sources
  heardFromOptions: [
    "Búsqueda en Google",
    "Redes Sociales",
    "Recomendación de un Amigo",
    "Publicidad",
    "Otro",
  ],
};
