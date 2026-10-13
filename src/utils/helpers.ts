import { splitGrossTax } from "../../shared/money";
import { APP_CONFIG } from "../config/config";
import { getRegionalConfig, type CurrencyCode } from "../config/regional";

// --------------------------------------------------------------------
// SESSION / STORAGE HELPERS
// Robust wrappers around localStorage that never throw on parse
// failures and expire legacy display caches. These unsigned values never
// establish identity or grant server permissions. Supabase Auth is authoritative.
// --------------------------------------------------------------------

const SESSION_DURATION_MS = 1000 * 60 * 60 * 8; // 8 hours

interface StoredSession {
  __exp?: number;
  [key: string]: unknown;
  id?: string; email?: string; role?: string; restaurant_id?: string;
  restaurant?: {name:string;slug:string;is_active:boolean};
}

/**
 * Read and validate a JSON session from localStorage.
 * Returns null if the entry is missing, malformed, or expired.
 * Never throws.
 */
export const getStoredSession = (key: string): StoredSession | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.__exp && Date.now() > parsed.__exp) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    // Corrupted entry — clear it so the route can recover.
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    return null;
  }
};

/** Write a session object to localStorage with an expiry timestamp. */
export const setStoredSession = (key: string, data: Record<string,unknown>): void => {
  try {
    const payload: StoredSession = {
      ...data,
      __exp: Date.now() + SESSION_DURATION_MS,
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    /* storage full or unavailable — ignore */
  }
};

/** Remove a session entry safely. */
export const clearStoredSession = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
};

/** Convenience wrappers for the restaurant user session. */
export const getStoredUser = (): StoredSession | null => getStoredSession("user");
export const getStoredAdmin = (): StoredSession | null => getStoredSession("admin");

export const formatCurrency = (
  amount: number | undefined | null,
  currency: string = "CLP",
  exchangeRate: number = 950,
  isConverted: boolean = true
): string => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return currency === "USD" ? "$0.00" : "$0";
  }

  let finalAmount = amount;
  if (currency === "USD" && !isConverted) {
    finalAmount = amount / exchangeRate;
  }

  if (currency === "USD") {
    return `$${finalAmount.toFixed(2)}`;
  } else if (currency === "CLP" || !(currency in CURRENCY_DECIMALS)) {
    // CLP: no decimals, dot separator (idéntico al comportamiento legacy)
    return `$${Math.round(finalAmount).toLocaleString("es-CL")}`;
  } else {
    // BRL/BOB/PEN: moneda local con símbolo, locale y decimales del país
    const decimals = CURRENCY_DECIMALS[currency];
    return formatLocalCurrency(finalAmount, currency as CurrencyCode, decimals);
  }
};

// --------------------------------------------------------------------
// MULTI-PAÍS (Fase 1): utilidades regionales
// --------------------------------------------------------------------

/** Decimales por moneda. Monedas fuera de la lista usan 0 (legacy CLP). */
export const CURRENCY_DECIMALS: Record<string, number> = {
  CLP: 0,
  USD: 2,
  BRL: 2,
  BOB: 2,
  PEN: 2,
};

/**
 * Formatea un monto en la moneda local del país (BRL/BOB/PEN) usando
 * Intl con locale y símbolo correctos. Para CLP/USD no se usa: esos
 * casos los maneja formatCurrency con su lógica legacy intacta.
 */
const formatLocalCurrency = (
  amount: number,
  currency: CurrencyCode,
  decimals: number
): string => {
  try {
    return new Intl.NumberFormat(localeForCurrency(currency), {
      style: "currency",
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  } catch {
    // Fallback: símbolo manual + toLocaleString del locale
    const symbol = SYMBOL_BY_CURRENCY[currency] ?? "$";
    return `${symbol}${amount.toFixed(decimals)}`;
  }
};

/** locale por moneda (BRL→pt-BR, BOB→es-BO, PEN→es-PE) */
const localeForCurrency = (currency: string): string =>
  ({
    BRL: "pt-BR",
    BOB: "es-BO",
    PEN: "es-PE",
  } as Record<string, string>)[currency] ?? "es-CL";

const SYMBOL_BY_CURRENCY: Record<string, string> = {
  BRL: "R$",
  BOB: "Bs",
  PEN: "S/",
};

/**
 * Redondeo monetario en la frontera definida: persistencia (item_total),
 * desglose de impuesto, propina y display. 0 decimales = Math.round
 * (idéntico a legacy). No usar para cálculos intermedios.
 */
export { roundMoney } from "../../shared/money";

/** Normaliza -0 a 0 (Math.round de negativos pequeños produce -0). */
export const normalizeMoneyZero = (v: number): number => (Object.is(v, -0) ? 0 : v);

/**
 * Descompone un total (impuesto incluido) en neto + impuesto usando la
 * tasa efectiva del restaurante. `taxRate` y `decimals` opcionales con
 * defaults legacy (19% + Math.round entero) — los callers chilenos
 * existentes no cambian. Para monedas con centavos pasar
 * getCurrencyDecimals(currency).
 */
export const splitTaxFromTotal = (
  total: number,
  taxRate?: number,
  decimals: number = 0
) => {
  const rate = Number.isFinite(taxRate as number) ? (taxRate as number) : APP_CONFIG.taxRate;
  if(!Number.isFinite(total)||total<0||(taxRate!==undefined&&(!Number.isFinite(taxRate)||taxRate<0||taxRate>1)))throw new Error("invalid_tax_input");
  return splitGrossTax(total,rate,decimals);
};

/**
 * Etiqueta de impuesto según país y tasa efectiva. "" si tasa 0 (ocultar).
 * "IVA (19%)" para Chile — string exacto al legado para no romper la UI.
 */
export const getTaxLabel = (country?: string | null, taxRate?: number | null): string => {
  const cfg = getRegionalConfig(country);
  const rate = Number.isFinite(taxRate as number) ? (taxRate as number) : cfg.suggestedTaxRate ?? APP_CONFIG.taxRate;
  if (rate <= 0) return "";
  const pct = Math.round(rate * 1000) / 10; // 19 -> "19", 18.5 -> "18.5"
  return `${cfg.taxName} (${pct}%)`;
};

/**
 * Devuelve los decimales de una moneda (0 para CLP/desconocida).
 */
export const getCurrencyDecimals = (currency?: string | null): number => {
  if (!currency) return 0;
  return CURRENCY_DECIMALS[currency] ?? 0;
};

/**
 * Wrapper fino para formatear montos con la moneda del restaurante sin
 * repetir el fallback `|| 950` en cada call-site. Acepta la shape mínima
 * { currency?, usd_exchange_rate? } para usar con useAuth().restaurant.
 */
export const fmtMoney = (
  amount: number | undefined | null,
  restaurant?: { currency?: string | null; usd_exchange_rate?: number | null } | null
): string =>
  formatCurrency(
    amount,
    restaurant?.currency || "CLP",
    restaurant?.usd_exchange_rate || 950
  );

/**
 * Generate unique slug from restaurant name
 */
export const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50);
};

/**
 * Generate random order number
 */
export const generateOrderNumber = (): string => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `${APP_CONFIG.orderPrefix}${timestamp}${random}`;
};

/**
 * Generate temporary password
 */
export const generateTempPassword = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let password = "";
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

/**
 * Calculate order totals (usa APP_CONFIG.taxRate como única fuente del IVA)
 */
export const calculateOrderTotals = (items: {item_total:number}[]) => {
  const total = items.reduce((sum, item) => sum + item.item_total, 0);
  return splitTaxFromTotal(total);
};

/**
 * Días restantes de trial (0 si venció o no hay fecha). Fuente única:
 * antes estaba copiado en 6 archivos con variantes.
 */
export const getTrialDaysLeft = (endsAt?: string | null): number => {
  if (!endsAt) return 0;
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

/**
 * ¿El trial del restaurante está expirado? (corte de servicio en UI)
 */
export const isTrialExpired = (
  subscriptionPlan?: string | null,
  trialEndsAt?: string | null
): boolean =>
  subscriptionPlan === "free_trial" &&
  !!trialEndsAt &&
  getTrialDaysLeft(trialEndsAt) === 0;

/**
 * Format date and time
 */
export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

export const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

/**
 * Validate email
 */
export const isValidEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

/**
 * Validate phone number. Sin país: validación chilena legacy exacta
 * (+569XXXXXXXX / 9XXXXXXXX, 8-12 dígitos). Con país: prefijo local +
 * 6-12 dígitos significativos.
 */
export const isValidPhone = (
  phone: string,
  country?: string | null
): boolean => {
  const digits = phone.replace(/[\s\-()+]/g, "");
  if (!country || country === "CL") {
    const national = digits.startsWith("56") ? digits.slice(2) : digits;
    return /^9\d{8}$/.test(national) || /^\d{8,12}$/.test(national);
  }
  const cfg = getRegionalConfig(country);
  const prefix = cfg.phonePrefix.replace("+", "");
  const national = digits.startsWith(prefix)
    ? digits.slice(prefix.length)
    : digits;
  return /^\d{6,12}$/.test(national);
};

/**
 * Hash password using SHA-256
 * Works on both HTTP and HTTPS (mobile and desktop)
 */
export const hashPassword = async (password: string): Promise<string> => {
  // Use crypto-js for consistent hashing across all platforms
  const CryptoJS = (await import("crypto-js")).default;
  return CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex);
};

/**
 * Debounce function
 */
export const debounce = <Args extends unknown[], Result>(
  func: (...args:Args)=>Result,
  wait: number
): ((...args: Args) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Get status color class
 */
export const getStatusColor = (status: string): string => {
  const statusConfig =
    APP_CONFIG.orderStatuses[status as keyof typeof APP_CONFIG.orderStatuses];
  return statusConfig?.color || "neutral";
};

/**
 * Calculate item price with size and addons
 */
export const calculateItemPrice = (
  basePrice: number,
  selectedSize?: { price: number },
  selectedAddons?: { price: number }[]
): number => {
  let price = selectedSize ? selectedSize.price : basePrice;
  if (selectedAddons && selectedAddons.length > 0) {
    price += selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
  }
  return price;
};

/**
 * Download file
 */
export const downloadFile = (url: string, filename: string) => {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Copy to clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

/**
 * Play notification sound
 * Uses native Web Audio API to synthesize a high-fidelity, clean chime sound (ding-dong)
 * self-contained, high-performance, bypassing browser media file limitations.
 */
export const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as Window & {webkitAudioContext?:typeof window.AudioContext}).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    // Helper to play a single bell/chime tone with attack and exponential decay
    const playTone = (startTime: number, frequency: number, duration: number, volume: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, startTime);
      
      // Clean chime volume envelope
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.02); // Quick attack
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration); // Smooth decay
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    
    const now = ctx.currentTime;
    // Tone 1 ("Ding"): D5 (587.33 Hz) played immediately
    playTone(now, 587.33, 0.5, 0.25);
    // Tone 2 ("Dong"): A5 (880.00 Hz) played slightly delayed
    playTone(now + 0.12, 880.00, 0.7, 0.20);
  } catch (e) {
    console.warn("Audio playback blocked by autoplay policy or unsupported:", e);
  }
};

/**
 * Play sound (alias for playNotificationSound)
 */
export const playSound = (
  _type: "notification" | "success" | "error" = "notification"
) => {
  void _type; // Los tres avisos comparten actualmente el mismo sonido.
  playNotificationSound();
};
