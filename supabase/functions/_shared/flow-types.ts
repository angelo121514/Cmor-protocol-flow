// =====================================================
// Deno Edge Functions shared code — flow-types.ts
// Tipos de datos e interfaces para la API de Flow.cl
// =====================================================

export type FlowInterval = 1 | 2 | 3 | 4; // 1=daily, 2=weekly, 3=monthly, 4=yearly
export type FlowCouponDuration = "once" | "repeating" | "forever";

export interface FlowConfig {
  apiKey: string;
  secretKey: string;
  apiUrl: string;
}

// --- PAYMENTS ---

export interface FlowPaymentCreateParams {
  commerceOrder: string;
  subject: string;
  amount: number;
  email: string;
  urlConfirmation: string;
  urlReturn: string;
  currency?: "CLP" | "UF";
  paymentMethod?: number; // 9 = All
  optional?: string; // JSON string
  timeout?: number;
  merchantId?: string;
  payment_currency?: string;
}

export interface FlowPaymentResponse {
  url: string;
  token: string;
  flowOrder: number;
}

export interface FlowPaymentStatusResponse {
  flowOrder: number;
  commerceOrder: string;
  requestDate: string;
  status: number; // 1=Pending, 2=Paid, 3=Rejected, 4=Cancelled
  subject: string;
  currency: string;
  amount: number;
  payer: string;
  optional?: Record<string, string>;
  pending_info?: {
    media: string;
    date: string;
  };
  paymentData?: {
    date: string;
    media: string;
    conversionDate?: string;
    conversionRate?: number;
    amount: number;
    currency: string;
    fee: number;
    balance: number;
    transferDate: string;
  };
  merchantId?: string;
}

// --- CUSTOMERS ---

export interface FlowCustomerCreateParams {
  name: string;
  email: string;
  externalId: string;
}

export interface FlowCustomerResponse {
  customerId: string;
  name: string;
  email: string;
  externalId: string;
  status: string;
  registerDate: string;
  creditCardType?: string;
  last4CardDigits?: string;
}

export interface FlowCustomerRegisterParams {
  customerId: string;
  url_return: string;
}

export interface FlowCustomerRegisterResponse {
  url: string;
  token: string;
}

export interface FlowCustomerRegisterStatusResponse {
  status: string; // "active" or "pending" or others
  creditCardType?: string;
  last4CardDigits?: string;
  customerId: string;
}

export interface FlowCustomerChargeParams {
  customerId: string;
  commerceOrder: string;
  subject: string;
  amount: number;
  currency: "CLP" | "UF";
  urlConfirmation: string;
  urlReturn: string;
  byEmail?: 0 | 1;
}

// --- PLANS ---

export interface FlowPlanCreateParams {
  planId: string;
  name: string;
  amount: number;
  currency: "CLP" | "UF";
  interval: FlowInterval;
  interval_count?: number;
  trial_period_days?: number;
  days_until_due?: number;
  periods_number?: number;
  urlCallback?: string;
}

export interface FlowPlanResponse {
  planId: string;
  name: string;
  amount: number;
  currency: string;
  interval: FlowInterval;
  interval_count: number;
  trial_period_days: number;
  days_until_due: number;
  periods_number: number;
  created: string;
  status: number;
}

// --- SUBSCRIPTIONS ---

export interface FlowSubscriptionCreateParams {
  planId: string;
  customerId: string;
  subscription_start?: string; // YYYY-MM-DD
  couponId?: string;
  trial_period_days?: number;
  periods_number?: number;
}

export interface FlowSubscriptionResponse {
  subscriptionId: string;
  planId: string;
  customerId: string;
  status: number; // 0=Created, 1=Active, 2=Past_due, 3=Unpaid, 4=Cancelled, 5=Trial
  subscription_start: string;
  trial_start?: string;
  trial_end?: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: number; // 0 o 1
  created: string;
  moleskinData?: {
    url: string;
    token: string;
  };
}

// --- COUPONS ---

export interface FlowCouponCreateParams {
  couponId: string; // custom coupon ID
  name: string;
  percent_off?: number;
  amount_off?: number;
  currency?: string;
  duration: FlowCouponDuration;
  duration_in_months?: number;
  max_redemptions?: number;
}

export interface FlowCouponResponse {
  couponId: string;
  name: string;
  percent_off: number;
  amount_off: number;
  currency: string;
  duration: FlowCouponDuration;
  duration_in_months: number;
  max_redemptions: number;
  times_redeemed: number;
  created: string;
  status: number;
}

// --- INVOICES ---

export interface FlowInvoiceResponse {
  invoiceId: string;
  subscriptionId: string;
  customerId: string;
  amount: number;
  currency: string;
  status: string; // "pending" | "paid" | "cancelled" | "overdue"
  dueDate: string;
  paidAt?: string;
  periodStart: string;
  periodEnd: string;
  created: string;
}
