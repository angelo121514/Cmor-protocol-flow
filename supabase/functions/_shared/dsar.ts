// Executors live in SQL transactions. This module registers no HTTP server.
import { handleOptions, jsonResponse } from "./cors.ts";
import {isRecord, type EdgeDatabase, type RpcDatabase, type AuthPort} from './ports.ts';
type Clients = { db: EdgeDatabase; auth: AuthPort; anonKey?: string };
interface DsarResult {
  success?: boolean; error?: string; requestId?: string; download_token?: string;
  request_type?: string; status?: string; data?: Record<string, unknown>;
}
type Mailer = (email: string, url: string) => Promise<void>;
const scopes = ["cookies", "marketing", "analytics", "ai_profiling", "third_party_share"];

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}
export function validatePrivacyInput(body: unknown, type: string) {
  if (!isRecord(body)) throw new Error('invalid_body');
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("invalid_email");
  if (body.type && body.type !== type) throw new Error("invalid_type");
  const payload = body.payload ?? {};
  if (!isRecord(payload)) throw new Error("invalid_payload");
  if (["object", "revoke-consent"].includes(type) && !scopes.includes(String(payload.scope))) throw new Error("invalid_scope");
  if (type === "rectify" && (!Array.isArray(payload.fields) || payload.fields.length < 1 || payload.fields.length > 10 ||
    payload.fields.some((f: unknown) => !isRecord(f) || !["name", "phone"].includes(String(f.field)) || typeof f.correct !== "string" || !f.correct.trim() || f.correct.length > 120))) {
    throw new Error("invalid_rectification_fields");
  }
  if (type === "contact" && (typeof payload.message !== "string" || !payload.message.trim() || payload.message.length > 5000)) throw new Error("invalid_message");
  return { email, payload };
}
export function exportCsv(data: Record<string, unknown>): string {
  const cell = (value: unknown) => {
    let text = typeof value === "string" ? value : JSON.stringify(value ?? "");
    if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  return "dataset,record\r\n" + Object.entries(data).flatMap(([key, records]) =>
    (Array.isArray(records) ? records : [records]).map(record => `${cell(key)},${cell(record)}`)).join("\r\n");
}
export async function collectDsarDownload(db: RpcDatabase, result: DsarResult): Promise<DsarResult> {
  if (!result?.download_token) return result;
  if(typeof result.requestId!=='string'||!/^[a-f0-9]{64}$/.test(result.download_token))throw new Error('invalid_download');
  const hash=await hashToken(result.download_token);
  const datasets: Record<string, unknown[]>={authUsers:[],customers:[],orders:[],registrationRequests:[],invitations:[],consents:[]};
  let cursor=0, count=0;
  for (;;) {
    const page=await db.rpc('read_dsar_download',{p_id:result.requestId,p_hash:hash,p_after:cursor});
    const data: unknown = page.data;
    if(page.error||!isRecord(data)||!Array.isArray(data.rows)||typeof data.more!=='boolean')throw new Error('download_failed');
    for(const row of data.rows){
      if(!isRecord(row)||typeof row.dataset!=='string'||!Object.hasOwn(datasets,row.dataset)||!isRecord(row.record))throw new Error('invalid_dataset');
      datasets[row.dataset].push(row.record);
      if(++count>100000)throw new Error('download_requires_operator');
    }
    if(!data.more)break;
    if(typeof data.cursor!=='number'||!Number.isSafeInteger(data.cursor)||data.cursor<=cursor)throw new Error('invalid_cursor');
    cursor=data.cursor;
  }
  const completed=await db.rpc('finish_dsar_download',{p_id:result.requestId,p_hash:hash});
  if(completed.error||!isRecord(completed.data)||completed.data.success!==true)throw new Error('download_not_completed');
  return {...completed.data,data:datasets,download_token:result.download_token};
}
async function resultResponse(req: Request, input: unknown, db: RpcDatabase) {
  if(!isRecord(input)||typeof input.success!=='boolean')return jsonResponse(req,{success:false,error:'request_failed'},503);
  let result: DsarResult = input;
  try{ result=await collectDsarDownload(db,result); }
  catch{return jsonResponse(req,{success:false,error:'download_incomplete',requestId:result.requestId,download_token:result.download_token},503);}
  const status = !result?.success ? (result?.error === "expired" ? 410 : 404) : 200;
  if (result?.success && result.request_type === "export") {
    if(!isRecord(result.data))return jsonResponse(req,{success:false,error:'download_incomplete'},503);
    result.data = { json: result.data, csv: exportCsv(result.data) };
  }
  return jsonResponse(req, result, status);
}
export function privacyHandler(clients: Clients, type: string, sendMail: Mailer, appUrl: string) {
  return async (req: Request): Promise<Response> => {
    const options = handleOptions(req); if (options) return options;
    if (req.method !== "POST") return jsonResponse(req, { success: false, error: "method_not_allowed" }, 405);
    let input: ReturnType<typeof validatePrivacyInput>;
    try { input = validatePrivacyInput(await req.json(), type); }
    catch { return jsonResponse(req, { success: false, error: "invalid_request" }, 400); }
    const bearer = req.headers.get("authorization")?.replace(/^Bearer /, "");
    let subjectId = null;
    if (bearer && bearer !== clients.anonKey) {
      const { data, error } = await clients.auth.auth.getUser(bearer);
      if (error || !data.user) return jsonResponse(req, { success: false, error: "invalid_token" }, 401);
      if (!data.user.email_confirmed_at || data.user.email?.toLowerCase() !== input.email) {
        return jsonResponse(req, { success: false, error: "identity_mismatch" }, 403);
      }
      subjectId = data.user.id;
    }
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, "0")).join("");
    try {
      const { data, error } = await clients.db.rpc("submit_dsar", {
        p_email: input.email, p_type: type, p_payload: input.payload, p_subject_id: subjectId,
        p_hash: subjectId || type === "contact" ? null : await hashToken(token), p_ip: null,
      });
      if (error) return jsonResponse(req, { success: false, error: error.message === "rate_limit" ? "rate_limit" : "request_failed" }, error.message === "rate_limit" ? 429 : 503);
      if(!isRecord(data)||data.success!==true||typeof data.requestId!=='string')return jsonResponse(req,{success:false,error:'request_failed'},503);
      if (type === "contact") return jsonResponse(req, data, 200);
      if (!subjectId) {
        try { await sendMail(input.email, `${appUrl.replace(/\/$/, "")}/verify-dsar#token=${token}`); }
        catch {
          const failure = await clients.db.from("data_subject_requests").update({ status: "failed", token_hash: null }).eq("id", data.requestId);
          if (failure.error) return jsonResponse(req, { success: false, error: "delivery_state_unknown" }, 503);
          return jsonResponse(req, { success: false, error: "verification_delivery_failed" }, 503);
        }
        return jsonResponse(req, { ...data, message: "Solicitud recibida. Revisa tu correo para verificarla." }, 200);
      }
      const execution = await clients.db.rpc("execute_dsar", { p_id: data.requestId, p_hash: null });
      if (execution.error) return jsonResponse(req, { success: false, error: "request_failed" }, 503);
      return resultResponse(req, execution.data, clients.db);
    } catch { return jsonResponse(req, { success: false, error: "request_failed" }, 503); }
  };
}
export function verificationHandler(db: RpcDatabase) {
  return async (req: Request) => {
    const options = handleOptions(req); if (options) return options;
    if (req.method !== "POST") return jsonResponse(req, { success: false, error: "method_not_allowed" }, 405);
    try {
      const body: unknown = await req.json();
      if(!isRecord(body))return jsonResponse(req,{success:false,error:'invalid_request'},400);
      if(body.download_token&&typeof body.download_token==='string'&&/^[a-f0-9]{64}$/.test(body.download_token)&&typeof body.requestId==='string'&&body.confirm===true){
        return resultResponse(req,{success:true,requestId:body.requestId,download_token:body.download_token},db);
      }
      if (typeof body.token !== "string" || !/^[a-zA-Z0-9_-]{32,128}$/.test(body.token) || body.confirm !== true) {
        return jsonResponse(req, { success: false, error: "confirmation_required" }, 400);
      }
      const { data, error } = await db.rpc("execute_dsar", { p_id: null, p_hash: await hashToken(body.token) });
      if (error) return jsonResponse(req, { success: false, error: "request_failed" }, 503);
      return resultResponse(req, data, db);
    } catch { return jsonResponse(req, { success: false, error: "invalid_request" }, 400); }
  };
}
