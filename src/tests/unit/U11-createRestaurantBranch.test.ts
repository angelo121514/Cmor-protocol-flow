import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRestaurantBranch } from "../../services/restaurantService";
import { supabase } from "../../config/supabase";

// Mock the supabase client module
vi.mock("../../config/supabase", () => {
  const mockRpc = vi.fn();
  return {
    supabase: {
      rpc: mockRpc,
    },
  };
});

describe("U-11 · createRestaurantBranch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("crea exitosamente una sucursal y la asocia al perfil", async () => {
    const mockRpcResult = {
      data: "new-restaurant-id-abc",
      error: null, count: null, status: 200, statusText: "OK",
    };

    // Set up mock implementation
    const mockRpc = vi.mocked(supabase.rpc);
    mockRpc.mockResolvedValue(mockRpcResult);

    const result = await createRestaurantBranch(
      "profile-123",
      {
        subscription_plan: "pro",
        status: "active",
        is_active: true,
      },
      {
        name: "Bella Sucursal",
        email: "sample-19@example.test",
        phone: "+56900000000",
        city: "Santiago",
        address: "Av. Providencia 1245",
        restaurant_type: "Pizzería",
      }
    );

    // Verify result
    expect(result.data).toEqual({ id: "new-restaurant-id-abc" });
    expect(result.error).toBeNull();

    // Verify supabase.rpc was called with correct parameters
    expect(mockRpc).toHaveBeenCalledWith("create_restaurant_branch", {
      p_name: "Bella Sucursal",
      p_email: "sample-19@example.test",
      p_phone: "+56900000000",
      p_city: "Santiago",
      p_address: "Av. Providencia 1245",
      p_restaurant_type: "Pizzería",
      p_subscription_plan: "pro",
      p_status: "active",
      p_is_active: true,
    });
  });

  it("retorna un error si la inserción del restaurante falla", async () => {
    const mockInsertError = {name:"PostgrestError", message: "Insert failed", code: "42501", details: "", hint: ""};
    const mockRpcResult: {data:null; error:typeof mockInsertError; count:null; status:number; statusText:string} = {
      data: null,
      error: mockInsertError, count: null, status: 403, statusText: "Forbidden",
    };

    const mockRpc = vi.mocked(supabase.rpc);
    mockRpc.mockResolvedValue(mockRpcResult);

    const result = await createRestaurantBranch(
      "profile-123",
      {
        subscription_plan: "pro",
        status: "active",
        is_active: true,
      },
      {
        name: "Bella Sucursal",
        email: "sample-19@example.test",
        phone: "+56900000000",
      }
    );

    expect(result.data).toBeNull();
    expect(result.error).toEqual(mockInsertError);

    // Verify supabase.rpc was called with correct parameters
    expect(mockRpc).toHaveBeenCalledWith("create_restaurant_branch", {
      p_name: "Bella Sucursal",
      p_email: "sample-19@example.test",
      p_phone: "+56900000000",
      p_city: null,
      p_address: null,
      p_restaurant_type: null,
      p_subscription_plan: "pro",
      p_status: "active",
      p_is_active: true,
    });
  });
});
