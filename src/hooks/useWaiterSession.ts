import { useState, useCallback } from "react";
import { validatePin, endSession, type ActiveWaiter } from "../services/waiterService";

/**
 * Hook que maneja la sesión del mesero activo en el POS.
 * Si el restaurante tiene `pin_required = false`, el POS funciona sin PIN
 * (activeWaiter queda null y no se bloquea).
 *
 * El estado del mesero NO se persiste en localStorage (sesión efímera del POS);
 * la sesión real vive en la tabla waiter_sessions (creada por validatePin).
 */
export const useWaiterSession = () => {
  const [activeWaiter, setActiveWaiter] = useState<ActiveWaiter | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (restaurantId: string, pin: string) => {
    setLoading(true);
    setError(null);
    const { data, error } = await validatePin(restaurantId, pin);
    setLoading(false);
    if (error) {
      setError(error.message);
      throw error;
    }
    if (!data) {
      setError("PIN incorrecto");
      throw new Error("PIN incorrecto");
    }
    setActiveWaiter(data);
    return data;
  }, []);

  const logout = useCallback(async () => {
    if (activeWaiter?.session_id) {
      await endSession(activeWaiter.session_id);
    }
    setActiveWaiter(null);
    setError(null);
  }, [activeWaiter]);

  return {
    activeWaiter,
    loading,
    error,
    login,
    logout,
    setActiveWaiter,
  };
};
