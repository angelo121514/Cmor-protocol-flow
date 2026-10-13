// Autorización explícita para Edge Functions que usan service role.
// El cliente de service role omite RLS, por lo que cada ruta debe comprobar
// identidad y propiedad antes de leer o modificar datos de un restaurante.

import {isRecord, type AuthPort, type EdgeDatabase} from './ports.ts';

export async function getAuthenticatedUser(supabase: AuthPort, req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return { authorized: false as const, reason: "missing_token" };
  }

  const { data, error } = await supabase.auth.getUser(authHeader.slice(7));
  if (error || !data.user) {
    return { authorized: false as const, reason: "invalid_token" };
  }
  // Only read claims after getUser has authenticated this exact JWT.
  let aal: string;
  let issuedAt: number;
  try {
    const payload = authHeader.slice(7).split(".")[1];
    const claims: unknown = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    if (!isRecord(claims) || !['aal1', 'aal2'].includes(String(claims.aal)) ||
      !Number.isSafeInteger(claims.iat) || Number(claims.iat) <= 0) throw new Error('invalid_claims');
    aal = String(claims.aal);
    issuedAt = Number(claims.iat);
  } catch { return { authorized: false as const, reason: "invalid_token" }; }
  return { authorized: true as const, user: data.user, aal, issuedAt };
}

export async function requireRestaurantOwner(supabase: EdgeDatabase & AuthPort, req: Request, restaurantId: string) {
  const identity = await getAuthenticatedUser(supabase, req);
  if (!identity.authorized) return identity;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, restaurant_id,admin_mfa_blocked,admin_mfa_reset_at")
    .eq("id", identity.user.id)
    .maybeSingle();

  if (!profile) return { authorized: false as const, reason: "profile_not_found" };
  if (profile.role === "admin") return hasAdminMfa(identity,profile)
    ? { authorized: true as const, user: identity.user }
    : { authorized: false as const, reason: "mfa_required" };
  if (profile.role !== "owner") return { authorized: false as const, reason: "owner_role_required" };
  if (profile.restaurant_id === restaurantId) return { authorized: true as const, user: identity.user };

  const { data: membership } = await supabase
    .from("profile_restaurants")
    .select("profile_id")
    .eq("profile_id", identity.user.id)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  return membership
    ? { authorized: true as const, user: identity.user }
    : { authorized: false as const, reason: "restaurant_access_denied" };
}

export async function requireAdmin(supabase: EdgeDatabase & AuthPort, req: Request) {
  const identity = await getAuthenticatedUser(supabase, req);
  if (!identity.authorized) return identity;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role,admin_mfa_blocked,admin_mfa_reset_at")
    .eq("id", identity.user.id)
    .maybeSingle();
  return profile?.role === "admin" && hasAdminMfa(identity,profile)
    ? { authorized: true as const, user: identity.user }
    : { authorized: false as const, reason: "admin_role_required" };
}

function hasAdminMfa(identity:{aal:string;issuedAt:number;user:{factors?:{status:string}[]}},profile:{admin_mfa_blocked?:boolean;admin_mfa_reset_at?:string|null}):boolean{
 return identity.aal==='aal2'&&!profile.admin_mfa_blocked&&identity.user.factors?.some(f=>f.status==='verified')===true&&
  (!profile.admin_mfa_reset_at||identity.issuedAt*1000>=Date.parse(profile.admin_mfa_reset_at));
}
