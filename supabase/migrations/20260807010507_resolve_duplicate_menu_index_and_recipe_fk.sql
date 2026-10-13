-- Keep the pre-existing canonical menu index and remove the duplicate added by
-- the prior performance migration.  Complete the remaining active FK index.
DROP INDEX IF EXISTS public.idx_menu_items_restaurant;

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_inventory_item
  ON public.recipe_ingredients (inventory_item_id);
