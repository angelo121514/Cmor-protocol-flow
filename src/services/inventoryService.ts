import { supabase } from "../config/supabase";
import type {
  InventoryItem,
  InventoryMovement,
  InventoryMovementType,
  InventoryUnit,
  Recipe,
  RecipeIngredient,
} from "../config/supabase";
import { toServiceError, type ServiceError } from "./_shared";

// ---------------------------------------------------------------------------
// Inventario — Fase 1
// Patrón: retornar { data, error } (igual que restaurantService).
// El restaurante activo se pasa explícitamente (RLS valida con is_my_restaurant).
// ---------------------------------------------------------------------------

export interface InventoryItemInput {
  restaurant_id: string;
  name: string;
  unit: InventoryUnit;
  current_stock?: number;
  min_stock?: number;
  cost_per_unit?: number;
  category?: string;
}

export interface RecipeIngredientInput {
  inventory_item_id: string;
  quantity_needed: number;
  unit: string;
}

// --- Inventory items -------------------------------------------------------

export const getInventoryItems = async (restaurantId: string) => {
  const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("name", { ascending: true });
  return { data: (data as InventoryItem[] | null) ?? null, error };
};

export const createInventoryItem = async (item: InventoryItemInput) => {
  const { data, error } = await supabase
    .from("inventory_items")
    .insert([item])
    .select()
    .single();
  return { data: data as InventoryItem | null, error };
};

export const updateInventoryItem = async (
  id: string,
  updates: Partial<InventoryItemInput>
) => {
  const { data, error } = await supabase
    .from("inventory_items")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  return { data: data as InventoryItem | null, error };
};

export const deleteInventoryItem = async (id: string) => {
  // ON DELETE CASCADE borra recetas/ingredientes asociados; el caller debe
  // confirmar. Si no quiere cascade, validar antes en UI.
  const { error } = await supabase.from("inventory_items").delete().eq("id", id);
  return { error };
};

export const getLowStockItems = async (restaurantId: string) => {
  const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .filter("current_stock", "lte", "min_stock")
    .order("name", { ascending: true });
  return { data: (data as InventoryItem[] | null) ?? null, error };
};

// --- Recetas --------------------------------------------------------------

export const getRecipeForMenuItem = async (
  menuItemId: string
): Promise<{ data: Recipe | null; error: ServiceError | null }> => {
  const { data: recipe, error } = await supabase
    .from("recipes")
    .select("id, menu_item_id, restaurant_id, created_at, updated_at")
    .eq("menu_item_id", menuItemId)
    .maybeSingle();

  if (error) return { data: null, error: toServiceError(error) };
  if (!recipe) return { data: null, error: null };

  const { data: ingredients, error: ingError } = await supabase
    .from("recipe_ingredients")
    .select("*")
    .eq("recipe_id", recipe.id);

  if (ingError) return { data: null, error: toServiceError(ingError) };

  return {
    data: { ...recipe, ingredients: (ingredients as RecipeIngredient[]) ?? [] },
    error: null,
  };
};

export const saveRecipe = async (
  menuItemId: string,
  restaurantId: string,
  ingredients: RecipeIngredientInput[]
): Promise<{ data: Recipe | null; error: ServiceError | null }> => {
  const { data, error } = await supabase.rpc("save_recipe", {
    p_menu_item_id: menuItemId, p_restaurant_id: restaurantId, p_ingredients: ingredients,
  });
  return { data: data as Recipe | null, error: error ? toServiceError(error) : null };
};

// --- Movimientos / ajustes ------------------------------------------------

export const adjustStock = async (
  itemId: string,
  restaurantId: string,
  quantity: number,
  type: InventoryMovementType,
  notes?: string
): Promise<{ data: InventoryMovement | null; error: ServiceError | null }> => {
  // Ajuste atómico server-side: UPDATE del stock + INSERT del movimiento
  // en una sola transacción (RPC adjust_inventory_stock, migración
  // 20260828000006). El read-then-write del cliente perdía escrituras
  // con ajustes concurrentes y dejaba movimientos sin log.
  void restaurantId; // el servidor resuelve restaurant_id desde el item
  const { data, error } = await supabase.rpc("adjust_inventory_stock", {
    p_item_id: itemId,
    p_delta: quantity,
    p_movement_type: type,
    p_notes: notes ?? null,
  });

  if (error) return { data: null, error: toServiceError(error) };
  return { data: (data as unknown as InventoryMovement) ?? null, error: null };
};

export const getInventoryMovements = async (
  restaurantId: string,
  dateRange?: { from: string; to: string }
) => {
  let query = supabase
    .from("inventory_movements")
    .select(
      "id, restaurant_id, inventory_item_id, movement_type, quantity, reference_id, notes, created_by, created_at, inventory_items(name)"
    )
    .eq("restaurant_id", restaurantId);

  if (dateRange) {
    query = query
      .gte("created_at", dateRange.from)
      .lte("created_at", dateRange.to);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  return {
    data: (data as unknown as (InventoryMovement & { inventory_items: { name: string } | null })[]) ?? null,
    error,
  };
};

// --- Descuento manual por pedido (diagnóstico) ----------------------------

export const deductInventoryForOrder = async (orderId: string) => {
  const { data, error } = await supabase.rpc("deduct_inventory_for_order", {
    p_order_id: orderId,
  });
  return { data, error };
};
