/** Public installation settings. These values are included in the browser bundle. */
export const PUBLIC_CONTACTS = {
  supportWhatsApp: (import.meta.env.VITE_SUPPORT_WHATSAPP || "").replace(/[^0-9]/g, ""),
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || "support@example.test",
  salesEmail: import.meta.env.VITE_SALES_EMAIL || "sales@example.test",
  privacyEmail: import.meta.env.VITE_PRIVACY_EMAIL || "privacy@example.test",
  operatorName: import.meta.env.VITE_OPERATOR_NAME || "Operador de esta instalación",
};
