import { useEffect, useState } from "react";
import { getLowStockItems } from "../services/inventoryService";
import type { InventoryItem } from "../config/supabase";

/**
 * Hook que carga los menu_item_ids con stock bajo (vía recetas) para mostrar
 * un badge en el POS. Es best-effort: si el restaurante no tiene inventario
 * configurado (plan < pro, o sin insumos), retorna set vacío y no afecta el
 * flujo del POS.
 *
 * Nota: por ahora asocia stock bajo a nivel de insumo; el badge se muestra en
 * items del menú que tengan receta con al menos un insumo en stock bajo.
 * La asociación menu_item → insumo se resuelve consultando recetas; para
 * evitar N queries, este hook trae los insumos bajos y deja el mapeo fino
 * al componente consumidor.
 */
export const useInventoryBadge = (restaurantId: string | null) => {
  const [lowStockItemIds, setLowStockItemIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;
    let cancelled = false;
    getLowStockItems(restaurantId)
      .then(({ data }) => {
        if (cancelled) return;
        // Por ahora marcamos los insumos bajos; el POS puede mostrar un badge
        // global "stock bajo" si hay alguno. El mapeo insumo→menu_item se
        // hará cuando se carguen recetas en Fase 1 (getRecipeForMenuItem).
        setLowStockItemIds(new Set((data ?? []).map((i: InventoryItem) => i.id)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  return { lowStockItemIds, loading };
};
