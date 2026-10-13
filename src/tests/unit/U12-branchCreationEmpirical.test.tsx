import {authFixture} from '../helpers/auth-fixture';
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { RestaurantSwitcher } from "../../components/RestaurantSwitcher";
import { useAuth } from "../../hooks/useAuth";
import "../../services/restaurantService";
import { MockSupabaseClient } from "../../config/mockSupabase";

// Mock the dependencies
vi.mock("../../hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../services/restaurantService", () => ({
  createRestaurantBranch: vi.fn(),
}));

describe("U12 · Empirical Branch Creation and Switch Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("Mock Client & Local Storage Limit Enforcement", () => {
    it("debe bloquear la inserción en profile_restaurants si ya existen 5 asociaciones en el mock client", async () => {
      const client = new MockSupabaseClient();
      const profileId = "profile-test-123";

      // 1. Limpiamos la tienda de profile_restaurants
      localStorage.setItem("mock_db_profile_restaurants", JSON.stringify([]));

      // 2. Insertamos 5 asociaciones secuencialmente
      for (let i = 0; i < 5; i++) {
        const res = await client.from("profile_restaurants").insert([
          {
            profile_id: profileId,
            restaurant_id: `restaurant-id-${i}`,
            is_primary: i === 0,
          },
        ]);
        expect(res.error).toBeNull();
        expect(res.data.length).toBe(1);
      }

      // 3. Verificamos que la inserción de la sexta asociación falle con el error correspondiente
      const res6 = await client.from("profile_restaurants").insert([
        {
          profile_id: profileId,
          restaurant_id: "restaurant-id-5",
          is_primary: false,
        },
      ]);

      expect(res6.error).not.toBeNull();
      expect(res6.error.message).toBe("Límite alcanzado: máximo 5 restaurantes por usuario");
      expect(res6.data.length).toBe(0);
    });
  });

  describe("UI Subscription Plan Restriction", () => {
    it("debe mostrar el mensaje de bloqueo y no el formulario si el plan NO es 'pro'", async () => {
      // Mock useAuth return value for a starter plan
      vi.mocked(useAuth).mockReturnValue(authFixture({
        profile: { id: "user-123", role: "owner" },
        restaurant: { id: "rest-1", name: "Restaurante Starter", subscription_plan: "starter", status: "active", is_active: true },
        restaurants: [
          { id: "rest-1", name: "Restaurante Starter", subscription_plan: "starter", status: "active", is_active: true }
        ],
        switchRestaurant: vi.fn(),
      }));

      render(<RestaurantSwitcher />);

      // Click on the switcher button to open the dropdown
      const switcherButton = screen.getByRole("button", { name: /Restaurante Starter/i });
      fireEvent.click(switcherButton);

      // Click on "Agregar sucursal" button
      const addBranchButton = screen.getByText("Agregar sucursal");
      fireEvent.click(addBranchButton);

      // Verify that the blocking message is shown
      expect(screen.getByText(/La creación de sucursales es una función exclusiva para el plan/i)).toBeInTheDocument();
      expect(screen.getByText(/Pro/i)).toBeInTheDocument();
      expect(screen.queryByPlaceholderText("Ej. Bella Italia Poniente")).not.toBeInTheDocument();
    });

    it("debe permitir abrir el formulario si el plan es 'pro' y no se ha alcanzado el límite", async () => {
      // Mock useAuth return value for a pro plan
      vi.mocked(useAuth).mockReturnValue(authFixture({
        profile: { id: "user-123", role: "owner" },
        restaurant: { id: "rest-1", name: "Restaurante Pro", subscription_plan: "pro", status: "active", is_active: true },
        restaurants: [
          { id: "rest-1", name: "Restaurante Pro", subscription_plan: "pro", status: "active", is_active: true }
        ],
        switchRestaurant: vi.fn(),
      }));

      render(<RestaurantSwitcher />);

      const switcherButton = screen.getByRole("button", { name: /Restaurante Pro/i });
      fireEvent.click(switcherButton);

      const addBranchButton = screen.getByText("Agregar sucursal");
      fireEvent.click(addBranchButton);

      // Verify that the blocking subscription plan message is NOT shown and form fields are present
      expect(screen.queryByText(/La creación de sucursales es una función exclusiva para el plan/i)).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText("Ej. Bella Italia Poniente")).toBeInTheDocument();
    });

    it("debe mostrar el mensaje de límite alcanzado si ya existen 5 sucursales asociadas", async () => {
      // Mock useAuth return value with 5 restaurants
      vi.mocked(useAuth).mockReturnValue(authFixture({
        profile: { id: "user-123", role: "owner" },
        restaurant: { id: "rest-1", name: "Restaurante Pro 1", subscription_plan: "pro", status: "active", is_active: true },
        restaurants: [
          { id: "rest-1", name: "Restaurante Pro 1", subscription_plan: "pro", status: "active", is_active: true },
          { id: "rest-2", name: "Restaurante Pro 2", subscription_plan: "pro", status: "active", is_active: true },
          { id: "rest-3", name: "Restaurante Pro 3", subscription_plan: "pro", status: "active", is_active: true },
          { id: "rest-4", name: "Restaurante Pro 4", subscription_plan: "pro", status: "active", is_active: true },
          { id: "rest-5", name: "Restaurante Pro 5", subscription_plan: "pro", status: "active", is_active: true },
        ],
        switchRestaurant: vi.fn(),
      }));

      render(<RestaurantSwitcher />);

      const switcherButton = screen.getByRole("button", { name: /Restaurante Pro 1/i });
      fireEvent.click(switcherButton);

      const addBranchButton = screen.getByText("Agregar sucursal");
      fireEvent.click(addBranchButton);

      // Verify that the limit exceeded message is shown
      expect(screen.getByText(/Límite alcanzado: máximo 5 restaurantes por usuario/i)).toBeInTheDocument();
      expect(screen.queryByPlaceholderText("Ej. Bella Italia Poniente")).not.toBeInTheDocument();
    });
  });

  describe("Branch Switching Flow", () => {
    it("debe llamar a switchRestaurant al seleccionar otra sucursal", async () => {
      const mockSwitchRestaurant = vi.fn();
      vi.mocked(useAuth).mockReturnValue(authFixture({
        profile: { id: "user-123", role: "owner" },
        restaurant: { id: "rest-1", name: "Restaurante 1", subscription_plan: "pro", status: "active", is_active: true },
        restaurants: [
          { id: "rest-1", name: "Restaurante 1", subscription_plan: "pro", status: "active", is_active: true },
          { id: "rest-2", name: "Restaurante 2", subscription_plan: "pro", status: "active", is_active: true },
        ],
        switchRestaurant: mockSwitchRestaurant,
      }));

      render(<RestaurantSwitcher />);

      // Open dropdown
      const switcherButton = screen.getByRole("button", { name: /Restaurante 1/i });
      fireEvent.click(switcherButton);

      // Click on the other restaurant
      const otherRestaurantButton = screen.getByText("Restaurante 2");
      fireEvent.click(otherRestaurantButton);

      expect(mockSwitchRestaurant).toHaveBeenCalledWith("rest-2");
    });
  });
});
