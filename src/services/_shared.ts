/**
 * Helpers compartidos por los servicios de operaciones de restaurante.
 *
 * Manejo centralizado de errores de Postgres (RPC) para evitar repetir
 * lógica en cada servicio. Las funciones SECURITY DEFINER del proyecto
 * elevan `RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501'` cuando
 * el caller no es dueño del restaurante; este helper lo detecta.
 */

export interface ServiceError {
  message: string;
  code?: string;
}

/**
 * Mensaje estándar para errores de autorización (42501).
 */
export const AUTH_ERROR_MESSAGE =
  "No tienes permiso para realizar esta acción en este restaurante.";

/**
 * Detecta si un error de Supabase/Postgres es de autorización (42501).
 */
export function isUnauthorized(error: unknown): boolean {
  if (!error) return false;
  const code =
    (error as { code?: string })?.code ??
    (error as { error?: { code?: string } })?.error?.code;
  if (code === "42501") return true;
  const message = String((error as { message?: string })?.message ?? "");
  return /unauthorized|42501/i.test(message);
}

/**
 * Normaliza un error de servicio a { message, code }.
 */
export function toServiceError(error: unknown): ServiceError {
  if (isUnauthorized(error)) {
    return { message: AUTH_ERROR_MESSAGE, code: "42501" };
  }
  const message = String((error as { message?: string })?.message ?? error ?? "Error desconocido");
  const code = (error as { code?: string })?.code;
  return { message, code };
}
