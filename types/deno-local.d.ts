// Static compilation adapter only. Runtime certification still requires Deno/Edge.
declare namespace Deno { const env:{get(name:string):string|undefined};function serve(handler:(req:Request)=>Response|Promise<Response>):unknown; }
interface ImportMeta {main:boolean;}
declare module 'https://esm.sh/@supabase/supabase-js@2.86.0' {
 export const createClient:typeof import('@supabase/supabase-js').createClient;
 export type SupabaseClient = import('@supabase/supabase-js').SupabaseClient;
}
