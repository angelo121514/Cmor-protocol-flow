import {authFixture} from '../helpers/auth-fixture';
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RestaurantSwitcher } from "../../components/RestaurantSwitcher";
import { useAuth } from "../../hooks/useAuth";
import { createRestaurantBranch } from "../../services/restaurantService";

vi.mock("../../hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../services/restaurantService", () => ({
  createRestaurantBranch: vi.fn(),
}));

describe("RestaurantSwitcher · Branch Creation and Subscription Gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks branch creation and displays message when plan is free_trial", async () => {
    vi.mocked(useAuth).mockReturnValue(authFixture({
      profile: { id: "profile-123" },
      restaurant: { id: "rest-1", name: "Bella Italia", subscription_plan: "free_trial", status: "active", is_active: true },
      restaurants: [{ id: "rest-1", name: "Bella Italia" }],
      switchRestaurant: vi.fn(),
    }));

    render(<RestaurantSwitcher />);

    // Open the dropdown
    const switcherButton = screen.getByRole("button", { name: /Bella Italia/i });
    fireEvent.click(switcherButton);

    // Click "Agregar sucursal"
    const addBranchButton = screen.getByTitle("Agregar nueva sucursal");
    fireEvent.click(addBranchButton);

    // Check that gating message is displayed
    expect(screen.getByText(/La creación de sucursales es una función exclusiva para el plan/i)).toBeInTheDocument();
    expect(screen.getByText(/free_trial/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Ej. Bella Italia Poniente")).not.toBeInTheDocument();
  });

  it("blocks branch creation and displays message when plan is starter", async () => {
    vi.mocked(useAuth).mockReturnValue(authFixture({
      profile: { id: "profile-123" },
      restaurant: { id: "rest-1", name: "Bella Italia", subscription_plan: "starter", status: "active", is_active: true },
      restaurants: [{ id: "rest-1", name: "Bella Italia" }],
      switchRestaurant: vi.fn(),
    }));

    render(<RestaurantSwitcher />);

    const switcherButton = screen.getByRole("button", { name: /Bella Italia/i });
    fireEvent.click(switcherButton);

    const addBranchButton = screen.getByTitle("Agregar nueva sucursal");
    fireEvent.click(addBranchButton);

    expect(screen.getByText(/La creación de sucursales es una función exclusiva para el plan/i)).toBeInTheDocument();
    expect(screen.getByText(/starter/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Ej. Bella Italia Poniente")).not.toBeInTheDocument();
  });

  it("blocks branch creation and displays limit reached message when user has 5 restaurants", async () => {
    vi.mocked(useAuth).mockReturnValue(authFixture({
      profile: { id: "profile-123" },
      restaurant: { id: "rest-1", name: "Bella Italia", subscription_plan: "pro", status: "active", is_active: true },
      restaurants: [
        { id: "rest-1", name: "Bella Italia" },
        { id: "rest-2", name: "Bella Italia 2" },
        { id: "rest-3", name: "Bella Italia 3" },
        { id: "rest-4", name: "Bella Italia 4" },
        { id: "rest-5", name: "Bella Italia 5" },
      ],
      switchRestaurant: vi.fn(),
    }));

    render(<RestaurantSwitcher />);

    const switcherButton = screen.getByRole("button", { name: /Bella Italia/i });
    fireEvent.click(switcherButton);

    const addBranchButton = screen.getByTitle("Agregar nueva sucursal");
    fireEvent.click(addBranchButton);

    expect(screen.getByText(/Límite alcanzado: máximo 5 restaurantes por usuario/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Ej. Bella Italia Poniente")).not.toBeInTheDocument();
  });

  it("allows branch creation and displays the form when plan is pro and restaurants < 5", async () => {
    const mockSwitchRestaurant = vi.fn();
    vi.mocked(useAuth).mockReturnValue(authFixture({
      profile: { id: "profile-123" },
      restaurant: { id: "rest-1", name: "Bella Italia", subscription_plan: "pro", status: "active", is_active: true },
      restaurants: [{ id: "rest-1", name: "Bella Italia" }],
      switchRestaurant: mockSwitchRestaurant,
    }));

    vi.mocked(createRestaurantBranch).mockResolvedValue({
      data: { id: "new-rest-id" },
      error: null,
    });

    render(<RestaurantSwitcher />);

    const switcherButton = screen.getByRole("button", { name: /Bella Italia/i });
    fireEvent.click(switcherButton);

    const addBranchButton = screen.getByTitle("Agregar nueva sucursal");
    fireEvent.click(addBranchButton);

    // Form inputs should be visible
    const nameInput = screen.getByPlaceholderText("Ej. Bella Italia Poniente");
    const emailInput = screen.getByPlaceholderText("Ej. sample-16@example.test");
    const phoneInput = screen.getByPlaceholderText("Ej. +56900000000");

    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toHaveAttribute("required");

    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute("required");
    expect(emailInput).toHaveAttribute("type", "email");

    expect(phoneInput).toBeInTheDocument();
    expect(phoneInput).toHaveAttribute("required");

    // Fill in values
    fireEvent.change(nameInput, { target: { value: "Bella Italia Poniente" } });
    fireEvent.change(emailInput, { target: { value: "sample-17@example.test" } });
    fireEvent.change(phoneInput, { target: { value: "+56900000000" } });

    // Submit form
    const submitButton = screen.getByRole("button", { name: /Crear Sucursal/i });
    fireEvent.click(submitButton);

    // Verify service was called with proper arguments
    expect(createRestaurantBranch).toHaveBeenCalledWith(
      "profile-123",
      { subscription_plan: "pro", status: "active", is_active: true },
      {
        name: "Bella Italia Poniente",
        email: "sample-17@example.test",
        phone: "+56900000000",
      }
    );
  });
});
