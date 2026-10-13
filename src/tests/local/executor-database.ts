import type {EdgeDatabase} from '../../../supabase/functions/_shared/ports';

/**
 * Adapta dobles parciales de los ejecutores al puerto del SDK.
 * Estas pruebas comprueban fallos y orden de efectos; las suites SQL/HTTP
 * comprueban el SDK, PostgREST y permisos reales con fixtures locales.
 */
export function executorDatabase<T extends object>(double: T): T & EdgeDatabase {
  return double as T & EdgeDatabase;
}
