import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Plus, Edit, Trash2, Search, Package, AlertTriangle, TrendingDown, ShoppingCart, ChefHat, ChevronDown, ChevronRight } from "lucide-react";
import { Card, Button, Input, Badge, Modal, Loading, Alert, Select, Tabs } from "../../components/ui";
import type { TabItem } from "../../components/ui";
import { useRestaurantId } from "../../hooks/useAuth";
import { formatCurrency } from "../../utils/helpers";
import type { InventoryItem, InventoryUnit, InventoryMovement, InventoryMovementType, Recipe, RecipeIngredient } from "../../config/supabase";
import { supabase } from "../../config/supabase";
import { getInventoryItems, createInventoryItem, updateInventoryItem, deleteInventoryItem, getLowStockItems, getInventoryMovements, adjustStock } from "../../services/inventoryService";

const UNITS: InventoryUnit[] = ["kg", "g", "l", "ml", "unidad", "porcion"];
const UNIT_LABELS: Record<InventoryUnit, string> = {
  kg: "Kilogramos (kg)",
  g: "Gramos (g)",
  l: "Litros (l)",
  ml: "Mililitros (ml)",
  unidad: "Unidad",
  porcion: "Porción",
};
const MOVEMENT_LABELS: Record<InventoryMovementType, string> = {
  purchase: "Compra",
  sale_deduction: "Venta (auto)",
  manual_adjustment: "Ajuste manual",
  waste: "Merma",
  return: "Devolución",
};

type Status = { type: "success" | "error" | null; message: string };

const Inventory: React.FC = () => {
  const restaurantId = useRestaurantId();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [lowStock, setLowStock] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<
    (InventoryMovement & { inventory_items: { name: string } | null })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Status>({ type: null, message: "" });

  // Modal de insumo (crear/editar)
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [itemForm, setItemForm] = useState({
    name: "",
    unit: "unidad" as InventoryUnit,
    current_stock: 0,
    min_stock: 0,
    cost_per_unit: 0,
    category: "",
  });

  // Modal de ajuste
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustForm, setAdjustForm] = useState({
    quantity: 0,
    type: "purchase" as InventoryMovementType,
    notes: "",
  });

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const loadData = useCallback(async () => {
    if (!restaurantId) return;
    const [itemsRes, lowRes, movRes] = await Promise.all([
      getInventoryItems(restaurantId),
      getLowStockItems(restaurantId),
      getInventoryMovements(restaurantId),
    ]);
    setItems(itemsRes.data ?? []);
    setLowStock(lowRes.data ?? []);
    setMovements(movRes.data ?? []);
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) return;
    let cancelled = false;
    Promise.all([
      getInventoryItems(restaurantId),
      getLowStockItems(restaurantId),
      getInventoryMovements(restaurantId),
    ]).then(([itemsRes, lowRes, movRes]) => {
      if (cancelled) return;
      setItems(itemsRes.data ?? []);
      setLowStock(lowRes.data ?? []);
      setMovements(movRes.data ?? []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  const categories = [
    "all",
    ...Array.from(new Set(items.map((i) => i.category).filter(Boolean))) as string[],
  ];

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleSaveItem = async () => {
    if (!restaurantId || !itemForm.name.trim()) {
      setStatus({ type: "error", message: "El nombre es obligatorio" });
      return;
    }
    setStatus({ type: null, message: "" });
    const payload = {
      restaurant_id: restaurantId,
      name: itemForm.name.trim(),
      unit: itemForm.unit,
      current_stock: Number(itemForm.current_stock),
      min_stock: Number(itemForm.min_stock),
      cost_per_unit: Number(itemForm.cost_per_unit),
      category: itemForm.category.trim() || undefined,
    };

    let result;
    if (editingItem) {
      result = await updateInventoryItem(editingItem.id, payload);
    } else {
      result = await createInventoryItem(payload);
    }

    if (result.error) {
      setStatus({
        type: "error",
        message: result.error.message || "Error al guardar el insumo",
      });
      return;
    }
    setShowItemModal(false);
    setEditingItem(null);
    setStatus({
      type: "success",
      message: editingItem ? "Insumo actualizado" : "Insumo creado",
    });
    await loadData();
  };

  const handleDeleteItem = async (item: InventoryItem) => {
    if (
      !window.confirm(
        `¿Eliminar "${item.name}"? Se borrarán también sus recetas asociadas.`
      )
    )
      return;
    const { error } = await deleteInventoryItem(item.id);
    if (error) {
      setStatus({ type: "error", message: "Error al eliminar" });
      return;
    }
    setStatus({ type: "success", message: "Insumo eliminado" });
    await loadData();
  };

  const handleAdjustStock = async () => {
    if (!adjustItem || !restaurantId) return;
    const qty = Number(adjustForm.quantity);
    if (qty === 0) {
      setStatus({ type: "error", message: "La cantidad no puede ser 0" });
      return;
    }
    const { error } = await adjustStock(
      adjustItem.id,
      restaurantId,
      qty,
      adjustForm.type,
      adjustForm.notes.trim() || undefined
    );
    if (error) {
      // Mensaje claro para el rechazo server-side más común (CHECK stock >= 0).
      const msg = error.message?.includes("insufficient_stock")
        ? "Stock insuficiente: el ajuste dejaría el inventario en negativo"
        : error.message;
      setStatus({ type: "error", message: msg });
      return;
    }
    setShowAdjustModal(false);
    setAdjustItem(null);
    setStatus({ type: "success", message: "Stock ajustado" });
    await loadData();
  };

  const openCreate = () => {
    setEditingItem(null);
    setItemForm({
      name: "",
      unit: "unidad",
      current_stock: 0,
      min_stock: 0,
      cost_per_unit: 0,
      category: "",
    });
    setShowItemModal(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      unit: item.unit,
      current_stock: item.current_stock,
      min_stock: item.min_stock,
      cost_per_unit: item.cost_per_unit,
      category: item.category ?? "",
    });
    setShowItemModal(true);
  };

  const openAdjust = (item: InventoryItem) => {
    setAdjustItem(item);
    setAdjustForm({ quantity: 0, type: "purchase", notes: "" });
    setShowAdjustModal(true);
  };

  if (loading) {
    return <Loading text="Cargando inventario..." />;
  }

  const isLow = (item: InventoryItem) =>
    item.current_stock <= item.min_stock && item.min_stock > 0;

  // --- Tabs content -------------------------------------------------------

  const itemsTab: TabItem = {
    key: "items",
    label: "Insumos",
    content: (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <Input
              placeholder="Buscar insumo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="sm:w-48"
            options={categories.map((c) => ({
              value: c,
              label: c === "all" ? "Todas las categorías" : c,
            }))}
          />
          <Button icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
            Nuevo insumo
          </Button>
        </div>

        {filteredItems.length === 0 ? (
          <Card className="p-8 text-center text-text-secondary">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
            No hay insumos. Crea el primero con "Nuevo insumo".
          </Card>
        ) : (
          <div className="grid gap-3">
            {filteredItems.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-text">{item.name}</span>
                      {isLow(item) && (
                        <Badge className="bg-error/15 text-error border border-error/30">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Stock bajo
                        </Badge>
                      )}
                      {!item.is_active && (
                        <Badge className="bg-bg-subtle text-text-secondary">
                          Inactivo
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-text-secondary mt-1">
                      {item.category && <span>{item.category} · </span>}
                      Stock: {item.current_stock} {item.unit} · Min: {item.min_stock}{" "}
                      {item.unit} · {formatCurrency(item.cost_per_unit)}/{item.unit}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<TrendingDown className="w-4 h-4" />}
                      onClick={() => openAdjust(item)}
                    >
                      Ajustar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Edit className="w-4 h-4" />}
                      onClick={() => openEdit(item)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Trash2 className="w-4 h-4" />}
                      onClick={() => handleDeleteItem(item)}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    ),
  };

  const movementsTab: TabItem = {
    key: "movements",
    label: "Movimientos",
    content: (
      <div className="space-y-3">
        {movements.length === 0 ? (
          <Card className="p-8 text-center text-text-secondary">
            No hay movimientos registrados.
          </Card>
        ) : (
          movements.map((m) => {
            const isPositive = Number(m.quantity) > 0;
            return (
              <Card key={m.id} className="p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-text">
                    {m.inventory_items?.name ?? "Insumo eliminado"}
                  </div>
                  <div className="text-sm text-text-secondary">
                    {MOVEMENT_LABELS[m.movement_type]} ·{" "}
                    {new Date(m.created_at).toLocaleString("es-CL")}
                    {m.notes && ` · ${m.notes}`}
                  </div>
                </div>
                <span
                  className={`font-bold ${
                    isPositive ? "text-success" : "text-error"
                  }`}
                >
                  {isPositive ? "+" : ""}
                  {m.quantity}
                </span>
              </Card>
            );
          })
        )}
      </div>
    ),
  };

  const alertsTab: TabItem = {
    key: "alerts",
    label: `Alertas${lowStock.length > 0 ? ` (${lowStock.length})` : ""}`,
    content: (
      <div className="space-y-3">
        {lowStock.length === 0 ? (
          <Card className="p-8 text-center text-text-secondary">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
            No hay alertas de stock bajo. Todo en orden.
          </Card>
        ) : (
          lowStock.map((item) => (
            <Card
              key={item.id}
              className="p-4 border-error/30 bg-error/5 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-error shrink-0" />
                <div>
                  <div className="font-semibold text-text">{item.name}</div>
                  <div className="text-sm text-text-secondary">
                    Quedan {item.current_stock} {item.unit} · Mínimo: {item.min_stock}{" "}
                    {item.unit}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                icon={<ShoppingCart className="w-4 h-4" />}
                onClick={() => openAdjust(item)}
              >
                Reabastecer
              </Button>
            </Card>
          ))
        )}
      </div>
    ),
  };

  const recipesTab: TabItem = {
    key: "recipes",
    label: "Recetas",
    content: <RecipeList items={items} />,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Inventario</h1>
          <p className="text-text-secondary text-sm mt-1">
            Gestiona insumos, recetas y movimientos de stock.
          </p>
        </div>
      </div>

      {status.type && (
        <Alert
          type={status.type === "error" ? "error" : "success"}
          message={status.message}
        />
      )}

      <Tabs
        tabs={[itemsTab, recipesTab, movementsTab, alertsTab]}
        defaultActiveKey="items"
      />

      {/* Modal crear/editar insumo */}
      <Modal
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        title={editingItem ? "Editar insumo" : "Nuevo insumo"}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Nombre *
            </label>
            <Input
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              placeholder="Ej: Harina"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Unidad
              </label>
              <Select
                value={itemForm.unit}
                onChange={(e) =>
                  setItemForm({
                    ...itemForm,
                    unit: e.target.value as InventoryUnit,
                  })
                }
                options={UNITS.map((u) => ({ value: u, label: UNIT_LABELS[u] }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Categoría
              </label>
              <Input
                value={itemForm.category}
                onChange={(e) =>
                  setItemForm({ ...itemForm, category: e.target.value })
                }
                placeholder="Ej: Lácteos"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Stock actual
              </label>
              <Input
                type="number"
                value={itemForm.current_stock}
                onChange={(e) =>
                  setItemForm({
                    ...itemForm,
                    current_stock: Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Stock mínimo
              </label>
              <Input
                type="number"
                value={itemForm.min_stock}
                onChange={(e) =>
                  setItemForm({
                    ...itemForm,
                    min_stock: Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Costo/unit
              </label>
              <Input
                type="number"
                value={itemForm.cost_per_unit}
                onChange={(e) =>
                  setItemForm({
                    ...itemForm,
                    cost_per_unit: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowItemModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveItem}>Guardar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal ajustar stock */}
      <Modal
        isOpen={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        title={`Ajustar stock: ${adjustItem?.name ?? ""}`}
        size="md"
      >
        <div className="space-y-4">
          <div className="text-sm text-text-secondary">
            Stock actual:{" "}
            <span className="font-semibold text-text">
              {adjustItem?.current_stock} {adjustItem?.unit}
            </span>
            . Usa cantidades positivas para entradas (compra, devolución) y
            negativas para salidas (merma, ajuste).
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Tipo
              </label>
              <Select
                value={adjustForm.type}
                onChange={(e) =>
                  setAdjustForm({
                    ...adjustForm,
                    type: e.target.value as InventoryMovementType,
                  })
                }
                options={[
                  { value: "purchase", label: "Compra (+)" },
                  { value: "manual_adjustment", label: "Ajuste manual" },
                  { value: "waste", label: "Merma (-)" },
                  { value: "return", label: "Devolución (+)" },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Cantidad
              </label>
              <Input
                type="number"
                value={adjustForm.quantity}
                onChange={(e) =>
                  setAdjustForm({
                    ...adjustForm,
                    quantity: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Notas
            </label>
            <Input
              value={adjustForm.notes}
              onChange={(e) =>
                setAdjustForm({ ...adjustForm, notes: e.target.value })
              }
              placeholder="Opcional"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowAdjustModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAdjustStock}>Aplicar ajuste</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Componente RecipeList: muestra las recetas configuradas con sus ingredientes
// y estado de stock.
// ---------------------------------------------------------------------------

interface RecipeWithMenuItem extends Recipe {
  menu_items?: { name: string; id: string } | null;
}

const RecipeList: React.FC<{ items: InventoryItem[] }> = ({ items }) => {
  const restaurantId = useRestaurantId();
  const [recipes, setRecipes] = useState<RecipeWithMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Mapa de insumos para resolver nombres y stock
  // Memoizado: se usa en el render de cada receta; sin useMemo se
  // reconstruye en cada render (y con N+1 eliminado ya no hay refetch
  // que lo refresque indirectamente).
  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  useEffect(() => {
    if (!restaurantId) return;
    let cancelled = false;
    const fetch = async () => {
      // Obtener todas las recetas del restaurante con sus ingredientes y
      // nombre del plato en UNA query (join anidado de PostgREST) — antes
      // era una query por receta (N+1).
      const { data, error } = await supabase
        .from("recipes")
        .select(
          "id, menu_item_id, restaurant_id, created_at, updated_at, menu_items(name, id), recipe_ingredients(*)"
        )
        .eq("restaurant_id", restaurantId);

      if (cancelled || error || !data) {
        setLoading(false);
        return;
      }

      const recipesWithIngredients: RecipeWithMenuItem[] = data.map((r) => ({
        ...r,
        menu_items: Array.isArray(r.menu_items) ? r.menu_items[0] : r.menu_items,
        ingredients: (r.recipe_ingredients ?? []) as RecipeIngredient[],
      })) as RecipeWithMenuItem[];
      if (!cancelled) {
        setRecipes(recipesWithIngredients);
        setLoading(false);
      }
    };
    fetch();
    return () => {
      cancelled = true;
    };
  }, [restaurantId, items]);

  if (loading) {
    return (
      <div className="text-center py-6 text-text-secondary text-sm">
        Cargando recetas...
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <Card className="p-8 text-center text-text-secondary">
        <ChefHat className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p className="text-sm">
          No hay recetas configuradas. Puedes asociar insumos a cada plato
          editándolo desde la página de <strong>Menú/Carta</strong>.
        </p>
        <p className="text-xs mt-2 text-text-secondary">
          Al completar un pedido, el stock se descontará automáticamente según
          las recetas configuradas.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {recipes.map((recipe) => {
        const isExpanded = expandedId === recipe.id;
        const dishName = recipe.menu_items?.name ?? "Plato eliminado";
        return (
          <Card key={recipe.id} className="p-4">
            <button
              type="button"
              className="w-full flex items-center justify-between gap-3 text-left"
              onClick={() =>
                setExpandedId(isExpanded ? null : recipe.id)
              }
            >
              <div className="flex items-center gap-2 min-w-0">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-text-secondary shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-text-secondary shrink-0" />
                )}
                <span className="font-semibold text-text truncate">
                  {dishName}
                </span>
                <Badge className="bg-accent/10 text-accent border border-accent/20 text-[10px]">
                  {recipe.ingredients.length} ingrediente{recipe.ingredients.length !== 1 ? "s" : ""}
                </Badge>
              </div>
            </button>

            {isExpanded && recipe.ingredients.length > 0 && (
              <div className="mt-3 ml-6 space-y-2">
                {recipe.ingredients.map((ing) => {
                  const invItem = itemMap.get(ing.inventory_item_id);
                  const stockOk =
                    invItem && invItem.current_stock >= ing.quantity_needed;
                  return (
                    <div
                      key={ing.id}
                      className="flex items-center justify-between text-sm p-2 bg-bg-subtle rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-text">
                          {invItem?.name ?? "Insumo eliminado"}
                        </span>
                        <span className="text-text-secondary">
                          → {ing.quantity_needed} {ing.unit}
                        </span>
                      </div>
                      <Badge
                        className={`text-[10px] ${
                          stockOk
                            ? "bg-green-100 text-green-700 border border-green-200"
                            : "bg-red-100 text-red-700 border border-red-200"
                        }`}
                      >
                        Stock: {invItem?.current_stock ?? 0} {invItem?.unit ?? ""}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default Inventory;
