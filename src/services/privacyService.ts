import {readAllPages} from "./pagination";
import { supabase } from "../config/supabase";
import type {
  Consent,
  ConsentScope,
  DataSubjectRequest,
  DsarType,
} from "../config/supabase";
import { CURRENT_POLICY_VERSION } from "../config/supabase";

// --------------------------------------------------------------------
// Helpers de invocación a Edge Functions (privacy/*)
// Cada función devuelve { success, data, error, message }.
// --------------------------------------------------------------------

interface InvokeResult<T = unknown> {
  success: boolean;
  data: T | null;
  error: string | null;
  message: string | null;
}

async function invokePrivacy<T = unknown>(
  fn: string,
  body: Record<string, unknown>
): Promise<InvokeResult<T>> {
  try {
    const { data, error } = await supabase.functions.invoke(fn, { body });
    if (error) {
      return {
        success: false,
        data: null,
        error: error.message,
        message: null,
      };
    }
    const payload = (data ?? {}) as Record<string, unknown>;
    return {
      success: payload.success !== false,
      data: (payload.data ?? payload) as T,
      error: (payload.error as string) ?? null,
      message: (payload.message as string) ?? null,
    };
  } catch (err: unknown) {
    return {
      success: false,
      data: null,
      error: String(err),
      message: null,
    };
  }
}

// --------------------------------------------------------------------
// DSAR — los 6 derechos del titular
// --------------------------------------------------------------------

export const requestAccess = (email: string) =>
  invokePrivacy("privacy-access", { email, type: "access" });

export const requestRectify = (
  email: string,
  payload: { fields: { field: string; current: string; correct: string }[] }
) => invokePrivacy("privacy-rectify", { email, type: "rectify", payload });

export const requestErase = (email: string) =>
  invokePrivacy("privacy-erase", { email, type: "erase" });

export const requestObject = (email: string, scope: ConsentScope) =>
  invokePrivacy("privacy-object", {
    email,
    type: "object",
    payload: { scope },
  });

export const requestExport = (email: string) =>
  invokePrivacy<{ json: unknown; csv: string }>("privacy-export", {
    email,
    type: "export",
  });

export const requestRevokeConsent = (email: string, scope: ConsentScope) =>
  invokePrivacy("privacy-revoke-consent", {
    email,
    type: "revoke-consent",
    payload: { scope },
  });

// --------------------------------------------------------------------
// Contacto DPO (graba en data_subject_requests con type='contact')
// --------------------------------------------------------------------

export const contactDpo = async (
  email: string,
  message: string,
  name?: string
): Promise<InvokeResult> => {
  return invokePrivacy("privacy-contact", { email, type: "contact", payload: { message, name } });
};

// --------------------------------------------------------------------
// Consulta de estado (RLS: el titular ve solo los suyos)
// --------------------------------------------------------------------

export const listMyDsars = async (email: string): Promise<DataSubjectRequest[]> => {
  const { data, error } = await supabase
    .from("data_subject_requests")
    .select("id,request_type,subject_id,subject_email,status,payload,fulfilled_at,fulfilled_by,result_metadata,rejection_reason,sla_due_at,created_at,updated_at,verified_at")
    .eq("subject_email", email)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("listMyDsars error:", error);
    return [];
  }
  return (data ?? []) as unknown as DataSubjectRequest[];
};

export const listAllDsars = async (): Promise<DataSubjectRequest[]> => {
  const rows=await readAllPages<DataSubjectRequest>((from,to)=>supabase.from("data_subject_requests")
    .select("id,request_type,subject_id,subject_email,status,payload,fulfilled_at,fulfilled_by,result_metadata,rejection_reason,sla_due_at,created_at,updated_at,verified_at,retention_hold")
    .order("id").range(from,to));
  return rows.sort((a,b)=>b.created_at.localeCompare(a.created_at));
};

export const updateDsarStatus = async (
  dsarId: string,
  status: DataSubjectRequest["status"],
  notes?: { rejection_reason?: string; result_metadata?: Record<string, unknown> }
): Promise<boolean> => {
  const { data: request, error: readError } = await supabase.from("data_subject_requests").select("request_type").eq("id", dsarId).single();
  if (readError || !request) return false;
  const { error } = request.request_type === "rectify" && ["fulfilled", "rejected"].includes(status)
    ? await supabase.rpc("review_dsar_rectification", { p_id: dsarId, p_approve: status === "fulfilled", p_reason: notes?.rejection_reason ?? null })
    : await supabase.rpc("admin_transition_dsar", { p_id: dsarId, p_status: status, p_reason: notes?.rejection_reason ?? null });
  return !error;
};

// --------------------------------------------------------------------
// Consentimientos
// --------------------------------------------------------------------

export const getMyConsents = async (email: string): Promise<Consent[]> => {
  const { data, error } = await supabase
    .from("consents")
    .select("*")
    .eq("subject_email", email)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("getMyConsents error:", error);
    return [];
  }
  return (data ?? []) as unknown as Consent[];
};

export const grantConsent = async (params: {
  subjectId: string | null;
  subjectEmail: string;
  scope: ConsentScope;
  purpose: string;
  legalBasis: Consent["legal_basis"];
  granted: boolean;
  via: NonNullable<NonNullable<Consent["proof"]>["via"]>;
}): Promise<boolean> => {
  // SQL derives identity; supplied email/id are not proof.
  if (!params.subjectId) return false;
  const { error } = await supabase.rpc("record_my_consent", {
    p_scope: params.scope, p_purpose: params.purpose, p_legal_basis: params.legalBasis,
    p_granted: params.granted, p_policy_version: CURRENT_POLICY_VERSION, p_via: params.via,
  });
  return !error;
};

export const revokeConsentScope = async (
  email: string,
  scope: ConsentScope
): Promise<boolean> => {
  const result = await requestRevokeConsent(email, scope);
  return result.success;
};

export const listAllConsents = async (): Promise<Consent[]> => {
  const { data, error } = await supabase
    .from("consents")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.error("listAllConsents error:", error);
    return [];
  }
  return (data ?? []) as unknown as Consent[];
};

// --------------------------------------------------------------------
// Utilidad: ¿el titular ya tiene algún consentimiento registrado?
// (para decidir si mostrar el modal de primer login)
// --------------------------------------------------------------------

export const hasAnyConsent = async (email: string): Promise<boolean> => {
  const { count, error } = await supabase
    .from("consents")
    .select("*", { count: "exact", head: true })
    .eq("subject_email", email);
  if (error) return false;
  return (count ?? 0) > 0;
};

// `DsarType` se re-exporta implícitamente desde el import para que los
// consumidores (DsarForm) puedan importarlo desde config/supabase.
export type { DsarType };
