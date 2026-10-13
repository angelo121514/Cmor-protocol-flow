-- Fase 9: Vincular mesas con meseros (asignación directa)
--
-- Agrega:
--   - assigned_waiter_id en restaurant_tables (FK a waiters, ON DELETE SET NULL).
--
-- Esto permite que cada mesa tenga un mesero responsable asignado, visible
-- tanto en la vista de Mesas como en la vista de Meseros (turnos activos).

BEGIN;

-- 1. Agregar columna assigned_waiter_id ------------------------------------
ALTER TABLE public.restaurant_tables
  ADD COLUMN IF NOT EXISTS assigned_waiter_id uuid REFERENCES public.waiters(id) ON DELETE SET NULL;

-- Índice para consultas rápidas de mesas por mesero
CREATE INDEX IF NOT EXISTS idx_tables_assigned_waiter
  ON public.restaurant_tables(assigned_waiter_id)
  WHERE assigned_waiter_id IS NOT NULL;

-- RLS: la columna se hereda de las políticas existentes de restaurant_tables
-- (is_my_restaurant). No se necesitan políticas adicionales.

COMMIT;
