import {
  createElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
  type PropsWithChildren,
} from "react";
import { supabase } from "../config/authClient";
import type { AuthState, Profile } from "../config/authClient";
import type { Restaurant } from "../config/supabase";
import { RESTAURANT_COLUMNS } from "../config/supabase";

/**
 * Hook central de autenticación.
 *
 * Sustituye a la lectura directa de `localStorage("user"|"admin")`. La
 * fuente de verdad es la sesión JWT de Supabase; al cambiar, se resuelve
 * el `profile` (rol, restaurant_id) y, si aplica, la fila de `restaurants`.
 *
 * El cliente activo siempre es Supabase Auth. Los mocks se inyectan sólo en pruebas.
 */

const initialState: AuthState = {
  user: null,
  profile: null,
  restaurant: null,
  restaurants: [],
  loading: true,
};

export type AuthController = AuthState & {
  refresh: () => Promise<void>;
  switchRestaurant: (restaurantId: string) => Promise<void>;
};

const AuthContext = createContext<AuthController | null>(null);

function useAuthState(): AuthController {
  const [state, setState] = useState<AuthState>(initialState);
  const generation = useRef(0);

  // Resuelve profile + restaurante a partir de un userId.
  const resolveProfile = useCallback(
    async (userId: string, email: string) => {
      const current = ++generation.current;
      // Profile por RLS (el propio usuario puede leer el suyo).
      const { data: profile } = (await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single()) as { data: Profile | null };

      let restaurant: Restaurant | null = null;
      let restaurants: Restaurant[] = [];

      // Fetch all restaurants associated with this profile
      const { data: prData } = await supabase
        .from("profile_restaurants")
        .select("restaurant_id, is_primary")
        .eq("profile_id", userId);

      if (prData && prData.length > 0) {
        const restaurantIds = prData.map((pr) => pr.restaurant_id);
        const { data: rests } = (await supabase
          .from("restaurants")
          .select(RESTAURANT_COLUMNS)
          .in("id", restaurantIds)) as { data: Restaurant[] | null };

        if (rests) {
          restaurants = rests;
        }
      }

      if (profile?.restaurant_id) {
        // Find the active restaurant in the array to avoid extra fetch, or fetch if not found
        restaurant = restaurants.find(r => r.id === profile.restaurant_id) || null;

        if (!restaurant) {
          const { data: rest } = (await supabase
            .from("restaurants")
            .select(RESTAURANT_COLUMNS)
            .eq("id", profile.restaurant_id)
            .single()) as { data: Restaurant | null };
          restaurant = rest;
        }
      }

      if (current !== generation.current) return;
      setState({
        user: { id: userId, email },
        profile,
        restaurant,
        restaurants,
        loading: false,
      });
    },
    []
  );

  const refresh = useCallback(async () => {
    const current = generation.current;
    const { data, error } = await supabase.auth.getSession();
    if (current !== generation.current) return;
    const session = data?.session;
    if (!error && session?.user.id && session.user.email) {
      await resolveProfile(session.user.id, session.user.email);
    } else {
      generation.current++;
      setState({ ...initialState, loading: false });
    }
  }, [resolveProfile]);

  const invalidateProfile = useCallback(() => {generation.current++;}, []);

  useEffect(() => {
    const current = generation.current;
    void supabase.auth.getSession().then(({data,error}) => {
      if(current !== generation.current) return;
      if(!error && data.session?.user.email) void resolveProfile(data.session.user.id,data.session.user.email);
      else setState({...initialState,loading:false});
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user.id && session.user.email) {
        void resolveProfile(session.user.id, session.user.email);
      } else {
        generation.current++;
        setState({ ...initialState, loading: false });
      }
    });
    return () => { invalidateProfile(); data.subscription.unsubscribe(); };
  }, [refresh, resolveProfile, invalidateProfile]);

  const switchRestaurant = useCallback(async (restaurantId: string) => {
    if (!state.profile?.id) return;
    
    // Update the active restaurant in the DB
    const { error } = await supabase.rpc("switch_restaurant", { p_restaurant_id: restaurantId });
      
    if (error) {
      throw new Error("No se pudo cambiar de sucursal. Verifica tus permisos e intenta nuevamente.");
    }

    // Refresh the state
    await refresh();
  }, [state.profile?.id, refresh]);

  return { ...state, refresh, switchRestaurant };
}

/**
 * Shares one resolved auth/profile/restaurant state across the route guard,
 * dashboard shell and each child screen. This prevents direct loads of an
 * internal route from racing several independent profile fetches.
 */
export function AuthProvider({ children }: PropsWithChildren) {
  const value = useAuthState();
  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthController {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe utilizarse dentro de AuthProvider");
  }
  return context;
}

/** Convenience: el restaurant_id del owner actual (o null). */
export function useRestaurantId(): string | null {
  const { profile } = useAuth();
  return profile?.restaurant_id ?? null;
}
