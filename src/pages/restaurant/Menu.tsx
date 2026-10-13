import React, { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Eye, EyeOff, Search, Package, ChefHat } from "lucide-react";
import { Card, Button, Input, Badge, Select, Modal, Loading, Alert, Textarea, Tabs } from "../../components/ui";
import type { TabItem } from "../../components/ui";
import { subscribeToMenuItems, createMenuItem, updateMenuItem, deleteMenuItem, toggleMenuItemAvailability } from "../../services/restaurantService";
import { getInventoryItems, getRecipeForMenuItem, saveRecipe } from "../../services/inventoryService";
import type { MenuItem, InventoryItem, InventoryUnit } from "../../config/supabase";
import { formatCurrency } from "../../utils/helpers";
import { useAuth, useRestaurantId } from "../../hooks/useAuth";
import { ImageDropZone } from "../../components/ImageDropZone";

const Menu: React.FC = () => {
  const { restaurant } = useAuth();
  const restaurantId = useRestaurantId();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;

    const subscription = subscribeToMenuItems(restaurantId, (data) => {
      setMenuItems(data);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [restaurantId]);

  const categories = [
    "all",
    ...new Set(menuItems.map((item) => item.category).filter(Boolean)),
  ];

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleToggleAvailability = async (item: MenuItem) => {
    await toggleMenuItemAvailability(item.id, !item.is_available);
  };

  const handleEdit = (item: MenuItem) => {
    setSelectedItem(item);
    setShowEditModal(true);
  };

  const handleDelete = (item: MenuItem) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  if (loading) {
    return <Loading text="Cargando tu menú..." />;
  }

  return (
    <div className="space-y-6">
      {/* Banner de Límite de Prueba */}
      {restaurant?.subscription_plan === "free_trial" && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
          menuItems.length >= 30 
            ? "bg-red-500/10 border-red-500/30 text-red-500 font-medium" 
            : "bg-amber-500/10 border-amber-500/30 text-amber-600 font-medium"
        }`}>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            <span>
              {menuItems.length >= 30 
                ? "⚠️ Has alcanzado el límite de 30 platos del plan de prueba. Por favor, actualiza tu plan en Configuración para agregar más platos."
                : `Límite de platos en Plan de Prueba: ${menuItems.length} / 30 platos creados.`}
            </span>
          </div>
          {menuItems.length < 30 && (
            <span className="font-bold">{(30 - menuItems.length)} disponibles</span>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text mb-2">Gestión del Menú</h2>
          <p className="text-text-secondary">
            Administra los platos de tu carta y su disponibilidad para los clientes.
          </p>
        </div>
        <Button
          icon={<Plus className="w-5 h-5" />}
          onClick={() => setShowAddModal(true)}
          disabled={restaurant?.subscription_plan === "free_trial" && menuItems.length >= 30}
        >
          Agregar Plato
        </Button>
      </div>

      {/* Real-time indicator */}
      <div className="flex items-center space-x-2 text-sm text-success">
        <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
        <span>
          Actualización en tiempo real activa • Los cambios de disponibilidad se muestran de inmediato en la carta de clientes.
        </span>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Buscar plato en el menú..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="w-5 h-5" />}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setCategoryFilter(category || "all")}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                categoryFilter === category
                  ? "bg-accent text-white"
                  : "bg-white text-text-secondary border border-border hover:text-text"
              }`}
            >
              {category === "all" ? "Todos" : category}
            </button>
          ))}
        </div>
      </div>

      {/* Menu List */}
      {filteredItems.length === 0 ? (
        <Card className="text-center py-12">
          <Package className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold text-text mb-2">
            No se encontraron platos
          </h3>
          <p className="text-text-secondary">
            Intenta ajustando tu búsqueda o agrega un nuevo platillo a tu carta.
          </p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              className={`hover:shadow-lg transition-shadow relative overflow-hidden ${
                !item.is_available ? "opacity-75 bg-bg-subtle" : ""
              }`}
            >
              <div className="flex gap-4">
                {/* Image */}
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    loading="lazy"
                    width={96}
                    height={96}
                    className="w-24 h-24 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-bg-subtle border flex items-center justify-center text-text-secondary">
                    Sin foto
                  </div>
                )}

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-bold text-text truncate">{item.name}</h3>
                    <Badge variant={item.is_available ? "success" : "neutral"}>
                      {item.is_available ? "Disponible" : "Pausado"}
                    </Badge>
                  </div>
                  <p className="text-sm text-text-secondary line-clamp-2 mb-2">
                    {item.description || "Sin descripción."}
                  </p>
                  <div className="space-y-1 text-xs text-text-secondary">
                    <div>
                      <span className="text-text-secondary">Precio Base: </span>
                      <span className="text-accent font-semibold text-sm">
                        {formatCurrency(item.base_price)}
                      </span>
                    </div>

                    {item.sizes && item.sizes.length > 0 && (
                      <div>
                        <span className="text-text-secondary">Tamaños: </span>
                        <span className="text-text">
                          {item.sizes.map((s) => s.name).join(", ")}
                        </span>
                      </div>
                    )}

                    {item.addons && item.addons.length > 0 && (
                      <div>
                        <span className="text-text-secondary">Agregados: </span>
                        <span className="text-text">
                          {item.addons.length} disponibles
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                <Button
                  size="sm"
                  variant={item.is_available ? "outline" : "secondary"}
                  icon={
                    item.is_available ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )
                  }
                  onClick={() => handleToggleAvailability(item)}
                  fullWidth
                >
                  {item.is_available ? "Desactivar" : "Activar"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Edit className="w-4 h-4" />}
                  onClick={() => handleEdit(item)}
                  fullWidth
                >
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Trash2 className="w-4 h-4 text-error" />}
                  onClick={() => handleDelete(item)}
                  fullWidth
                >
                  Eliminar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modals */}
      <MenuItemModal
        key={`add:${showAddModal}`}
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        mode="add"
        menuItemsCount={menuItems.length}
      />

      <MenuItemModal
        key={`edit:${showEditModal}:${selectedItem?.id ?? "new"}`}
        isOpen={showEditModal}
        item={selectedItem}
        onClose={() => {
          setShowEditModal(false);
          setSelectedItem(null);
        }}
        mode="edit"
        menuItemsCount={menuItems.length}
      />

      {/* Delete Modal */}
      <DeleteModal
        isOpen={showDeleteModal}
        item={selectedItem}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedItem(null);
        }}
      />
    </div>
  );
};

// Menu Item Modal (Add/Edit)
interface MenuItemModalProps {
  isOpen: boolean;
  item?: MenuItem | null;
  onClose: () => void;
  mode: "add" | "edit";
  menuItemsCount?: number;
}

const UNITS: InventoryUnit[] = ["kg", "g", "l", "ml", "unidad", "porcion"];
const UNIT_LABELS: Record<InventoryUnit, string> = {
  kg: "kg",
  g: "g",
  l: "l",
  ml: "ml",
  unidad: "unidad",
  porcion: "porción",
};

const MenuItemModal: React.FC<MenuItemModalProps> = ({
  isOpen,
  item,
  onClose,
  mode,
  menuItemsCount = 0,
}) => {
  const { restaurant } = useAuth();
  const restaurantId = useRestaurantId();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedMenuId, setSavedMenuId] = useState(item?.id);
  const [formData, setFormData] = useState(() => mode === "edit" && item ? {
        name: item.name,
        name_pt: item.name_pt || "",
        description: item.description || "",
        description_pt: item.description_pt || "",
        category: item.category || "",
        base_price: item.base_price.toString(),
        image_url: item.image_url || "",
        image_urls: item.image_urls && item.image_urls.length > 0
          ? [...item.image_urls, "", "", ""].slice(0, 3)
          : [item.image_url || "", "", ""],
        is_available: item.is_available,
        sizes: item.sizes || [],
        addons: item.addons || [],
      } : {
        name: "",
        name_pt: "",
        description: "",
        description_pt: "",
        category: "",
        base_price: "",
        image_url: "",
        image_urls: ["", "", ""],
        is_available: true,
        sizes: [],
        addons: [],
      });

  const [newSize, setNewSize] = useState({ name: "", price: "" });
  const [newAddon, setNewAddon] = useState({ name: "", price: "" });

  // --- Receta / Ingredientes ---
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [recipeIngredients, setRecipeIngredients] = useState<
    { inventory_item_id: string; quantity_needed: number; unit: string; name: string }[]
  >([]);
  const [selectedIngredientId, setSelectedIngredientId] = useState("");
  const [selectedIngredientQty, setSelectedIngredientQty] = useState("");
  const [selectedIngredientUnit, setSelectedIngredientUnit] = useState<InventoryUnit>("unidad");
  const [recipeLoading, setRecipeLoading] = useState(() => isOpen && mode === "edit" && Boolean(item) && ["pro", "enterprise"].includes(restaurant?.subscription_plan || ""));
  const [recipeError, setRecipeError] = useState("");

  // Determinar si el plan tiene inventario (para mostrar tab de receta)
  const hasInventory = ["pro", "enterprise"].includes(
    restaurant?.subscription_plan || ""
  );

  // Read both sides before replacing the editable recipe; errors never become an empty recipe.
  useEffect(() => {
    if (!isOpen || !restaurantId || !hasInventory) return;
    let active = true;
    Promise.all([
      getInventoryItems(restaurantId),
      mode === "edit" && item ? getRecipeForMenuItem(item.id) : Promise.resolve({ data: null, error: null }),
    ]).then(([inventory, recipe]) => {
      if (!active) return;
      if (inventory.error || recipe.error) throw new Error("recipe_lookup_failed");
      const items = inventory.data ?? [];
      const byId = new Map(items.map(row => [row.id, row]));
      setInventoryItems(items.filter(row => row.is_active));
      setRecipeIngredients((recipe.data?.ingredients ?? []).map(ingredient => ({
        inventory_item_id: ingredient.inventory_item_id, quantity_needed: ingredient.quantity_needed,
        unit: ingredient.unit, name: byId.get(ingredient.inventory_item_id)?.name ?? "Insumo eliminado",
      })));
      setRecipeError(""); setRecipeLoading(false);
    }).catch(() => {
      if (!active) return;
      const message = "No se pudo cargar la receta. Cierra y vuelve a abrir el plato para reintentar.";
      setRecipeError(message); setError(message); setRecipeLoading(false);
    });
    return () => { active = false; };
  }, [isOpen, restaurantId, mode, item, hasInventory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (recipeLoading || recipeError) { setError(recipeError || "Espera a que se cargue la receta."); return; }

    if (!formData.name || !formData.base_price) {
      setError("El nombre y el precio base son obligatorios");
      return;
    }

    if (!restaurantId) {
      setError("No se encontró el ID del restaurante");
      return;
    }

    // Validación del límite estricto de ciberseguridad/reglas de negocio de 30 platos del plan de prueba
    if (mode === "add" && restaurant?.subscription_plan === "free_trial" && menuItemsCount >= 30) {
      setError("Tu plan de prueba tiene una restricción de un máximo de 30 platos. Por favor, actualiza tu plan en Configuración para agregar más platos.");
      return;
    }

    setLoading(true);

    const activeImages = formData.image_urls.filter(Boolean);
    const menuItemData = {
      restaurant_id: restaurantId,
      name: formData.name,
      name_pt: formData.name_pt || undefined,
      description: formData.description || undefined,
      description_pt: formData.description_pt || undefined,
      category: formData.category || undefined,
      base_price: parseFloat(formData.base_price),
      image_url: activeImages[0] || undefined, // Retrocompatibilidad
      image_urls: activeImages,
      is_available: formData.is_available,
      sizes: formData.sizes.length > 0 ? formData.sizes : undefined,
      addons: formData.addons.length > 0 ? formData.addons : undefined,
    };

    let result;
    if (!savedMenuId) {
      result = await createMenuItem(menuItemData);
    } else {
      result = await updateMenuItem(savedMenuId, menuItemData);
    }
    if (result?.success && result.id) setSavedMenuId(result.id);

    // Guardar receta si hay ingredientes (solo si se creó/actualizó el item)
    if (result && result.success && hasInventory) {
      const targetItemId = result.id;
      if (targetItemId) {
        const recipeResult = await saveRecipe(
          targetItemId,
          restaurantId,
          recipeIngredients.map((ri) => ({
            inventory_item_id: ri.inventory_item_id,
            quantity_needed: ri.quantity_needed,
            unit: ri.unit,
          }))
        );
        if(recipeResult.error){
          setLoading(false);
          setError("El plato quedó guardado, pero la receta no se pudo guardar. Reintenta para conservar sus ingredientes.");
          return;
        }
      }
    }

    setLoading(false);

    if (result && result.success) {
      onClose();
    } else {
      setError(result?.error || `No se pudo ${mode === "add" ? "agregar" : "editar"} el plato`);
    }
  };

  const addSize = () => {
    if (newSize.name && newSize.price) {
      setFormData({
        ...formData,
        sizes: [
          ...formData.sizes,
          { name: newSize.name, price: parseFloat(newSize.price) },
        ],
      });
      setNewSize({ name: "", price: "" });
    }
  };

  const removeSize = (index: number) => {
    setFormData({
      ...formData,
      sizes: formData.sizes.filter((_, i) => i !== index),
    });
  };

  const addAddon = () => {
    if (newAddon.name && newAddon.price) {
      setFormData({
        ...formData,
        addons: [
          ...formData.addons,
          { name: newAddon.name, price: parseFloat(newAddon.price) },
        ],
      });
      setNewAddon({ name: "", price: "" });
    }
  };

  const removeAddon = (index: number) => {
    setFormData({
      ...formData,
      addons: formData.addons.filter((_, i) => i !== index),
    });
  };

  // --- Receta helpers ---
  const addRecipeIngredient = () => {
    if (!selectedIngredientId || !Number(selectedIngredientQty) || Number(selectedIngredientQty) <= 0) return;
    const invItem = inventoryItems.find((i) => i.id === selectedIngredientId);
    if (!invItem) return;
    setRecipeIngredients((prev) => [
      ...prev,
      {
        inventory_item_id: selectedIngredientId,
        quantity_needed: Number(selectedIngredientQty),
        unit: selectedIngredientUnit,
        name: invItem.name,
      },
    ]);
    setSelectedIngredientId("");
    setSelectedIngredientQty("");
    setSelectedIngredientUnit("unidad");
  };

  const removeRecipeIngredient = (index: number) => {
    setRecipeIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  // --- Tab content ---
  const generalTab: TabItem = {
    key: "general",
    label: "General",
    content: (
      <div className="space-y-5">
        <Input
          label="Nombre del Plato"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ej: Pizza Margherita"
          required
        />

        <Textarea
          label="Descripción (Opcional)"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="Describe los ingredientes o preparación..."
          rows={2}
        />

        <Input
          label="Nombre en Português (Opcional — carta BR)"
          value={formData.name_pt}
          onChange={(e) => setFormData({ ...formData, name_pt: e.target.value })}
          placeholder="Ex: Pizza Margherita"
        />

        <Textarea
          label="Descrição em Português (Opcional)"
          value={formData.description_pt}
          onChange={(e) =>
            setFormData({ ...formData, description_pt: e.target.value })
          }
          placeholder="Descreva os ingredientes ou o preparo..."
          rows={2}
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Categoría"
            value={formData.category}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value })
            }
            placeholder="Ej: Pizzas, Bebidas"
          />

          <Input
            label="Precio Base"
            type="number"
            value={formData.base_price}
            onChange={(e) =>
              setFormData({ ...formData, base_price: e.target.value })
            }
            placeholder="0"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="label">Fotos del Plato (Hasta 3 imágenes, Máx. 2MB c/u)</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ImageDropZone
              value={formData.image_urls[0]}
              onChange={(base64) => {
                const newUrls = [...formData.image_urls];
                newUrls[0] = base64;
                setFormData({ ...formData, image_urls: newUrls });
              }}
              label="Foto 1 (Principal)"
            />
            <ImageDropZone
              value={formData.image_urls[1]}
              onChange={(base64) => {
                const newUrls = [...formData.image_urls];
                newUrls[1] = base64;
                setFormData({ ...formData, image_urls: newUrls });
              }}
              label="Foto 2 (Opcional)"
            />
            <ImageDropZone
              value={formData.image_urls[2]}
              onChange={(base64) => {
                const newUrls = [...formData.image_urls];
                newUrls[2] = base64;
                setFormData({ ...formData, image_urls: newUrls });
              }}
              label="Foto 3 (Opcional)"
            />
          </div>
        </div>

        {/* Sizes */}
        <div>
          <label className="label mb-3">Opciones de Tamaño (Opcional)</label>
          <div className="space-y-2 mb-3">
            {formData.sizes.map((size, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-bg-subtle rounded-lg"
              >
                <span className="text-text">
                  {size.name} - {formatCurrency(size.price)}
                </span>
                <button
                  type="button"
                  onClick={() => removeSize(index)}
                  className="text-error hover:bg-error/10 p-1 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Nombre (Ej: Mediana)"
              value={newSize.name}
              onChange={(e) => setNewSize({ ...newSize, name: e.target.value })}
            />
            <Input
              placeholder="Precio"
              type="number"
              value={newSize.price}
              onChange={(e) =>
                setNewSize({ ...newSize, price: e.target.value })
              }
            />
            <Button type="button" onClick={addSize} variant="outline">
              Agregar
            </Button>
          </div>
        </div>

        {/* Add-ons */}
        <div>
          <label className="label mb-3">Ingredientes Adicionales / Agregados (Opcional)</label>
          <div className="space-y-2 mb-3">
            {formData.addons.map((addon, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-bg-subtle rounded-lg"
              >
                <span className="text-text">
                  {addon.name} - +{formatCurrency(addon.price)}
                </span>
                <button
                  type="button"
                  onClick={() => removeAddon(index)}
                  className="text-error hover:bg-error/10 p-1 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Agregado (Ej: Queso extra)"
              value={newAddon.name}
              onChange={(e) =>
                setNewAddon({ ...newAddon, name: e.target.value })
              }
            />
            <Input
              placeholder="Precio extra"
              type="number"
              value={newAddon.price}
              onChange={(e) =>
                setNewAddon({ ...newAddon, price: e.target.value })
              }
            />
            <Button type="button" onClick={addAddon} variant="outline">
              Agregar
            </Button>
          </div>
        </div>

        {/* Availability */}
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.is_available}
            onChange={(e) =>
              setFormData({ ...formData, is_available: e.target.checked })
            }
            className="rounded border-border"
          />
          <span className="text-text">Disponible para ordenar hoy</span>
        </label>
      </div>
    ),
  };

  const recipeTab: TabItem = {
    key: "recipe",
    label: "Receta",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          Asocia insumos del inventario a este plato. Al completar un pedido, el
          stock se descontará automáticamente según esta receta.
        </p>

        {recipeLoading ? (
          <div className="text-center py-4 text-text-secondary text-sm">
            Cargando receta...
          </div>
        ) : (
          <>
            {/* Lista de ingredientes de la receta */}
            {recipeIngredients.length > 0 && (
              <div className="space-y-2">
                <label className="label">Ingredientes de la receta</label>
                {recipeIngredients.map((ri, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-bg-subtle rounded-lg"
                  >
                    <span className="text-text">
                      {ri.name} — <span className="font-medium">{ri.quantity_needed} {ri.unit}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeRecipeIngredient(index)}
                      className="text-error hover:bg-error/10 p-1 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Agregar ingrediente */}
            <div className="space-y-2">
              <label className="label">Agregar ingrediente</label>
              <div className="flex gap-2 flex-wrap">
                <div className="flex-1 min-w-[150px]">
                  <Select
                    value={selectedIngredientId}
                    onChange={(e) => setSelectedIngredientId(e.target.value)}
                    options={[
                      { value: "", label: "Seleccionar insumo..." },
                      ...inventoryItems
                        .filter(
                          (i) =>
                            !recipeIngredients.some(
                              (ri) => ri.inventory_item_id === i.id
                            )
                        )
                        .map((i) => ({
                          value: i.id,
                          label: `${i.name} (${i.current_stock} ${i.unit} disponible)`,
                        })),
                    ]}
                  />
                </div>
                <Input
                  type="number"
                  placeholder="Cantidad"
                  value={selectedIngredientQty}
                  onChange={(e) => setSelectedIngredientQty(e.target.value)}
                  className="w-28"
                  min="0.01"
                  step="0.01"
                />
                <Select
                  value={selectedIngredientUnit}
                  onChange={(e) =>
                    setSelectedIngredientUnit(
                      e.target.value as InventoryUnit
                    )
                  }
                  className="w-28"
                  options={UNITS.map((u) => ({ value: u, label: UNIT_LABELS[u] }))}
                />
                <Button
                  type="button"
                  onClick={addRecipeIngredient}
                  variant="outline"
                  disabled={
                    !selectedIngredientId ||
                    !Number(selectedIngredientQty) ||
                    Number(selectedIngredientQty) <= 0
                  }
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {recipeIngredients.length === 0 && (
              <div className="text-center py-6 bg-bg-subtle rounded-lg">
                <ChefHat className="w-8 h-8 mx-auto mb-2 text-text-secondary opacity-50" />
                <p className="text-sm text-text-secondary">
                  Sin ingredientes. Agrega insumos del inventario para que el
                  stock se descuente al vender este plato.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    ),
  };

  const modalTabs: TabItem[] = hasInventory
    ? [generalTab, recipeTab]
    : [generalTab];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "add" ? "Agregar Plato al Menú" : "Editar Plato"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert type="error" message={error} />}

        <Tabs tabs={modalTabs} defaultActiveKey="general" />

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} fullWidth>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} fullWidth>
            {mode === "add" ? "Agregar Plato" : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Delete Modal
interface DeleteModalProps {
  isOpen: boolean;
  item: MenuItem | null;
  onClose: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ isOpen, item, onClose }) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!item) return;

    setLoading(true);
    const success = await deleteMenuItem(item.id);
    setLoading(false);

    if (success) {
      onClose();
    }
  };

  if (!item) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Eliminar Plato del Menú" size="md">
      <div className="space-y-4">
        <Alert
          type="warning"
          message={`¿Estás seguro que deseas eliminar "${item.name}"? Esta acción no se puede deshacer y el plato se quitará de la carta.`}
        />

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} fullWidth>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            loading={loading}
            fullWidth
          >
            Confirmar Eliminación
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default Menu;
