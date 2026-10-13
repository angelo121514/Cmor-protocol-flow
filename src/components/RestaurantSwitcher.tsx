import { errorMessage } from "../../shared/errors";
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ChevronDown, Store, Check, PlusCircle } from 'lucide-react';
import { MAX_RESTAURANTS_PER_USER } from '../config/config';
import { createRestaurantBranch } from '../services/restaurantService';
import { Button, Input, Modal } from './ui';

export function RestaurantSwitcher() {
  const { profile, restaurant, restaurants, switchRestaurant } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [formValues, setFormValues] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    address: '',
    restaurant_type: '',
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!restaurant || !restaurants || restaurants.length === 0) {
    return (
      <h1 className="text-md font-extrabold text-text">
        {restaurant?.name || "Restaurante"}
      </h1>
    );
  }

  const handleSelect = async (id: string) => {
    if (id !== restaurant.id) {
      setIsOpen(false);
      await switchRestaurant(id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id || !restaurant) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const { data: newBranch, error } = await createRestaurantBranch(
        profile.id,
        {
          subscription_plan: restaurant.subscription_plan,
          status: restaurant.status,
          is_active: restaurant.is_active,
        },
        {
          name: formValues.name,
          email: formValues.email,
          phone: formValues.phone,
          city: formValues.city || undefined,
          address: formValues.address || undefined,
          restaurant_type: formValues.restaurant_type || undefined,
        }
      );

      if (error) {
        setErrorMsg(error.message || "Error al crear la sucursal");
      } else if (newBranch) {
        setIsModalOpen(false);
        // Switch to the new branch immediately
        await switchRestaurant(newBranch.id);
      }
    } catch (err: unknown) {
      setErrorMsg(errorMessage(err) || "Ocurrió un error inesperado");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 p-2 rounded-lg transition-colors"
      >
        <Store className="w-4 h-4 text-accent" />
        <h1 className="text-md font-extrabold text-text text-left max-w-[200px] truncate">
          {restaurant.name}
        </h1>
        <ChevronDown className={`w-4 h-4 text-text/60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-bg border border-border rounded-xl shadow-lg overflow-hidden z-50">
          <div className="p-2 border-b border-border bg-black/5 dark:bg-white/5">
            <p className="text-xs font-semibold text-text/60 uppercase tracking-wider mb-1">
              Mis Sucursales ({restaurants.length}/{MAX_RESTAURANTS_PER_USER})
            </p>
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {restaurants.map((r) => (
              <button
                key={r.id}
                onClick={() => handleSelect(r.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                  r.id === restaurant.id
                    ? 'bg-accent/10 text-accent font-medium'
                    : 'text-text hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <span className="truncate">{r.name}</span>
                {r.id === restaurant.id && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
          
          <div className="p-1 border-t border-border">
            <button
              onClick={() => {
                setIsOpen(false);
                setFormValues({name:"",email:"",phone:"",city:"",address:"",restaurant_type:""});
                setErrorMsg(null);
                setIsModalOpen(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-accent hover:bg-accent/10 rounded-lg transition-colors"
              title="Agregar nueva sucursal"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Agregar sucursal</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal Nueva Sucursal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nueva Sucursal"
      >
        {!['pro', 'enterprise'].includes(restaurant.subscription_plan) ? (
          <div className="space-y-4">
            <div className="p-4 bg-error/10 border border-error/20 text-error rounded-lg text-sm">
              La creación de sucursales es una función exclusiva para el plan <strong>Pro o Enterprise</strong>.
              Tu plan actual es <strong>{restaurant.subscription_plan || 'Ninguno'}</strong>.
            </div>
            <p className="text-text-secondary text-sm">
              Por favor, actualiza tu plan en la sección de Configuración para poder gestionar múltiples sucursales.
            </p>
            <div className="flex justify-end pt-2">
              <Button type="button" onClick={() => setIsModalOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        ) : restaurants.length >= MAX_RESTAURANTS_PER_USER ? (
          <div className="space-y-4">
            <div className="p-4 bg-error/10 border border-error/20 text-error rounded-lg text-sm">
              Límite alcanzado: máximo {MAX_RESTAURANTS_PER_USER} restaurantes por usuario.
            </div>
            <p className="text-text-secondary text-sm">
              Ya tienes {restaurants.length} sucursales registradas, que es el máximo permitido para tu cuenta.
            </p>
            <div className="flex justify-end pt-2">
              <Button type="button" onClick={() => setIsModalOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-error/10 border border-error/20 text-error rounded-lg text-sm">
                {errorMsg}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nombre"
                required
                value={formValues.name}
                onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
                placeholder="Ej. Bella Italia Poniente"
              />
              
              <Input
                label="Email"
                required
                type="email"
                value={formValues.email}
                onChange={(e) => setFormValues({ ...formValues, email: e.target.value })}
                placeholder="Ej. sample-16@example.test"
              />

              <Input
                label="Teléfono"
                required
                value={formValues.phone}
                onChange={(e) => setFormValues({ ...formValues, phone: e.target.value })}
                placeholder="Ej. +56900000000"
              />

              <Input
                label="Tipo de Restaurante"
                value={formValues.restaurant_type}
                onChange={(e) => setFormValues({ ...formValues, restaurant_type: e.target.value })}
                placeholder="Ej. Pizzería, Cafetería"
              />

              <Input
                label="Ciudad"
                value={formValues.city}
                onChange={(e) => setFormValues({ ...formValues, city: e.target.value })}
                placeholder="Ej. Santiago"
              />

              <Input
                label="Dirección"
                value={formValues.address}
                onChange={(e) => setFormValues({ ...formValues, address: e.target.value })}
                placeholder="Ej. Av. Providencia 1245"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={isSubmitting}>
                Crear Sucursal
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

