import type {SupabaseClient} from 'https://esm.sh/@supabase/supabase-js@2.86.0';

/** Superficies del SDK usadas por los ejecutores inyectables. No contienen credenciales. */
export type EdgeDatabase = Pick<SupabaseClient, 'from' | 'rpc'>;
export type RpcDatabase = Pick<EdgeDatabase, 'rpc'>;
export interface AuthPort {
  auth: {getUser(jwt: string): Promise<{
    data: {user: {id: string; email?: string; email_confirmed_at?: string | null; factors?: {status: string}[]} | null};
    error: unknown;
  }>};
}
export interface InvitationAuthPort {
  auth: {admin: {inviteUserByEmail(email: string, options: {redirectTo: string}): Promise<{error: unknown}>}};
}
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
