import CryptoJS from "crypto-js";

// Legacy UI simulator; never used as authentication or SQL authorization evidence.
type MockRow = Record<string, unknown>;
type QueryResult = { data: MockRow[]; error: {message: string}|null; count: number | null };
type RealtimePayload = {new?: MockRow};

// =====================================================================
// LOCAL STORAGE MOCK SUPABASE CLIENT
// =====================================================================
export class MockSupabaseClient {
  private channelBroadcast = typeof window !== 'undefined' ? new BroadcastChannel('mock-supabase-realtime') : null;

  constructor() {
    this.getStore("users");
    this.getStore("admin_users");
    this.getStore("restaurants");
    this.getStore("menu_items");
    this.getStore("registration_requests");
    this.getStore("restaurant_customers");
    this.getStore("orders");
    this.getStore("profiles");
    this.getStore("profile_restaurants");

    if (this.channelBroadcast) {
      this.channelBroadcast.onmessage = (event) => {
        const { table, newRow } = event.data;
        console.log("[MOCK SUPABASE BROADCAST RECEIVED] table:", table, "payload:", newRow);
        this.listeners.forEach((listener) => {
          if (listener.table === table) {
            try {
              console.log("[MOCK SUPABASE BROADCAST MATCH] Triggering listener callback for table:", table);
              listener.callback({ new: newRow });
            } catch (e) {
              console.error("Error in mock realtime callback:", e);
            }
          }
        });
      };
    }
  }

  auth = {
    getSession: async () => {
      const sessionStr = localStorage.getItem("mock_supabase_session");
      if (sessionStr) {
        return { data: { session: JSON.parse(sessionStr) }, error: null };
      }
      return { data: { session: null }, error: null };
    },
    signInWithOAuth: async (params: { provider: string; options?: { redirectTo?: string } }) => {
      console.log("Mock signInWithOAuth called with:", params);
      const mockSession = {
        user: {
          id: "mock-google-user-1",
          email: "sample-13@example.test",
          user_metadata: {
            full_name: "Usuario Google Demo",
            avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
          },
        },
        access_token: "mock-google-access-token",
      };
      localStorage.setItem("mock_supabase_session", JSON.stringify(mockSession));
      const redirectTo = params.options?.redirectTo || (window.location.origin + "/login");
      setTimeout(() => {
        window.location.href = redirectTo;
      }, 500);
      return { data: { provider: params.provider, url: redirectTo }, error: null };
    },
    signOut: async () => {
      localStorage.removeItem("mock_supabase_session");
      localStorage.removeItem("user");
      localStorage.removeItem("admin");
      return { error: null };
    },
    resetPasswordForEmail: async (email: string, options?: { redirectTo?: string }) => {
      console.log("Mock resetPasswordForEmail called with:", email, options);
      const usersStore = JSON.parse(localStorage.getItem("mock_db_users") || "[]");
      const dbUser = usersStore.find((u: MockRow) => String(u.email).toLowerCase() === email.toLowerCase());
      if (!dbUser) {
        return { data: null, error: { message: "El correo electrónico no está registrado." } };
      }
      
      const mockSession = {
        user: {
          id: dbUser.id,
          email: dbUser.email,
          user_metadata: { role: dbUser.role, restaurant_id: dbUser.restaurant_id },
        },
        access_token: "mock-reset-token",
      };
      localStorage.setItem("mock_supabase_session", JSON.stringify(mockSession));
      
      return { data: {}, error: null };
    },
    signInWithPassword: async (params: { email: string; password?: string }) => {
      console.log("Mock signInWithPassword called with:", params.email);
      const usersStore = JSON.parse(localStorage.getItem("mock_db_users") || "[]");
      const adminUsersStore = JSON.parse(localStorage.getItem("mock_db_admin_users") || "[]");
      const profilesStore = JSON.parse(localStorage.getItem("mock_db_profiles") || "[]");
      
      const admin = adminUsersStore.find(
        (au: MockRow) => String(au.email).toLowerCase() === String(params.email).toLowerCase()
      );
      if (admin) {
        const mockSession = {
          user: {
            id: admin.id,
            email: admin.email,
            user_metadata: { full_name: admin.name, role: "admin" },
          },
          access_token: "mock-admin-token",
        };
        localStorage.setItem("mock_supabase_session", JSON.stringify(mockSession));

        const legacyAdminBlob = {
          id: admin.id,
          email: admin.email,
          role: "admin",
          __exp: Date.now() + 1000 * 60 * 60 * 8, // 8 hours
        };
        localStorage.setItem("admin", JSON.stringify(legacyAdminBlob));

        return { data: { user: mockSession.user, session: mockSession }, error: null };
      }

      const dbUser = usersStore.find((u: MockRow) => String(u.email).toLowerCase() === String(params.email).toLowerCase());
      if (dbUser) {
        const profile = profilesStore.find((p: MockRow) => p.id === dbUser.id);
        const mockSession = {
          user: {
            id: dbUser.id,
            email: dbUser.email,
            user_metadata: { 
              full_name: profile?.display_name || dbUser.email.split("@")[0], 
              role: dbUser.role,
              restaurant_id: dbUser.restaurant_id
            },
          },
          access_token: "mock-user-token",
        };
        localStorage.setItem("mock_supabase_session", JSON.stringify(mockSession));

        const restaurantStore = JSON.parse(localStorage.getItem("mock_db_restaurants") || "[]");
        const restaurant = restaurantStore.find((r: MockRow) => r.id === dbUser.restaurant_id);
        const legacyUserBlob = {
          id: dbUser.id,
          email: dbUser.email,
          role: dbUser.role || "owner",
          restaurant_id: dbUser.restaurant_id || null,
          restaurant: restaurant ? {
            name: restaurant.name,
            slug: restaurant.slug,
            is_active: restaurant.is_active,
          } : null,
          __exp: Date.now() + 1000 * 60 * 60 * 8, // 8 hours
        };
        localStorage.setItem("user", JSON.stringify(legacyUserBlob));

        return { data: { user: mockSession.user, session: mockSession }, error: null };
      }

      return { data: { user: null, session: null }, error: { message: "Invalid login credentials in mock mode" } };
    },
    signUp: async (params: { email: string; password?: string; options?: { data?: MockRow } }) => {
      console.log("Mock signUp called with:", params.email);
      const newUserId = "user-" + Math.random().toString(36).substring(2, 9);
      const email = params.email;
      const metadata = params.options?.data || {};
      
      const usersStore = JSON.parse(localStorage.getItem("mock_db_users") || "[]");
      const updatedUsers = [
        ...usersStore,
        {
          id: newUserId,
          restaurant_id: metadata.restaurant_id || null,
          email: email,
          password_hash: params.password || "default-hash",
          role: metadata.role || "owner",
          created_at: new Date().toISOString(),
        }
      ];
      localStorage.setItem("mock_db_users", JSON.stringify(updatedUsers));

      const profilesStore = JSON.parse(localStorage.getItem("mock_db_profiles") || "[]");
      const updatedProfiles = [
        ...profilesStore,
        {
          id: newUserId,
          restaurant_id: metadata.restaurant_id || null,
          role: metadata.role || "owner",
          display_name: metadata.full_name || email.split("@")[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      ];
      localStorage.setItem("mock_db_profiles", JSON.stringify(updatedProfiles));

      const mockSession = {
        user: {
          id: newUserId,
          email: email,
          user_metadata: {
            full_name: metadata.full_name || email.split("@")[0],
            role: metadata.role || "owner",
            restaurant_id: metadata.restaurant_id || null,
          }
        },
        access_token: "mock-signup-token"
      };
      
      localStorage.setItem("mock_supabase_session", JSON.stringify(mockSession));

      const key = (metadata.role || "owner") === "admin" ? "admin" : "user";
      const restaurantStore = JSON.parse(localStorage.getItem("mock_db_restaurants") || "[]");
      const restaurant = restaurantStore.find((r: MockRow) => r.id === metadata.restaurant_id);
      const legacyUserBlob = {
        id: newUserId,
        email: email,
        role: metadata.role || "owner",
        restaurant_id: metadata.restaurant_id || null,
        restaurant: restaurant ? {
          name: restaurant.name,
          slug: restaurant.slug,
          is_active: restaurant.is_active,
        } : null,
        __exp: Date.now() + 1000 * 60 * 60 * 8, // 8 hours
      };
      localStorage.setItem(key, JSON.stringify(legacyUserBlob));

      return { data: { user: mockSession.user, session: mockSession }, error: null };
    },
    updateUser: async (attributes: { password?: string; data?: MockRow }) => {
      console.log("Mock updateUser called with:", attributes);
      const sessionStr = localStorage.getItem("mock_supabase_session");
      if (!sessionStr) {
        return { data: { user: null }, error: { message: "No active session in mock mode" } };
      }
      const session = JSON.parse(sessionStr);
      const userId = session.user?.id;
      const userEmail = session.user?.email;

      if (attributes.password) {
        const usersStore = JSON.parse(localStorage.getItem("mock_db_users") || "[]");
        const adminUsersStore = JSON.parse(localStorage.getItem("mock_db_admin_users") || "[]");
        
        let userUpdated = false;
        const updatedUsers = usersStore.map((u: MockRow) => {
          if (u.id === userId || String(u.email).toLowerCase() === userEmail?.toLowerCase()) {
            userUpdated = true;
            return { ...u, password_hash: attributes.password };
          }
          return u;
        });

        const updatedAdminUsers = adminUsersStore.map((au: MockRow) => {
          if (au.id === userId || String(au.email).toLowerCase() === userEmail?.toLowerCase()) {
            userUpdated = true;
            return { ...au, password: attributes.password };
          }
          return au;
        });

        if (userUpdated) {
          localStorage.setItem("mock_db_users", JSON.stringify(updatedUsers));
          localStorage.setItem("mock_db_admin_users", JSON.stringify(updatedAdminUsers));
          
          // Write legacy user or admin blob to localStorage to keep them logged in
          const restaurantStore = JSON.parse(localStorage.getItem("mock_db_restaurants") || "[]");
          const restaurant = restaurantStore.find((r: MockRow) => r.id === session.user?.user_metadata?.restaurant_id);
          
          if (session.user?.user_metadata?.role === "admin") {
            const legacyAdminBlob = {
              id: userId,
              email: userEmail,
              role: "admin",
              __exp: Date.now() + 1000 * 60 * 60 * 8, // 8 hours
            };
            localStorage.setItem("admin", JSON.stringify(legacyAdminBlob));
          } else {
            const legacyUserBlob = {
              id: userId,
              email: userEmail,
              role: session.user?.user_metadata?.role || "owner",
              restaurant_id: session.user?.user_metadata?.restaurant_id || null,
              restaurant: restaurant ? {
                name: restaurant.name,
                slug: restaurant.slug,
                is_active: restaurant.is_active,
              } : null,
              __exp: Date.now() + 1000 * 60 * 60 * 8, // 8 hours
            };
            localStorage.setItem("user", JSON.stringify(legacyUserBlob));
          }
        } else {
          return { data: { user: null }, error: { message: "User not found in mock store to update password" } };
        }
      }

      if (attributes.data) {
        session.user.user_metadata = {
          ...session.user.user_metadata,
          ...attributes.data,
        };
        localStorage.setItem("mock_supabase_session", JSON.stringify(session));
      }

      return { data: { user: session.user }, error: null };
    },
  };

  private getStore(table: string): MockRow[] {
    const key = `mock_db_${table}`;
    const data = localStorage.getItem(key);
    if (!data) {
      const defaults = this.getDefaults(table);
      localStorage.setItem(key, JSON.stringify(defaults));
      return defaults;
    }
    return JSON.parse(data);
  }
  private setStore(table: string, data: MockRow[]) {
    localStorage.setItem(`mock_db_${table}`, JSON.stringify(data));
    
    // Simulate orders_events database trigger in mock mode
    if (table === "orders") {
      const newOrder = data[0];
      if (newOrder) {
        const eventsKey = `mock_db_orders_events`;
        const rawEvents = localStorage.getItem(eventsKey);
        const events = rawEvents ? JSON.parse(rawEvents) : [];
        const mockEvent = {
          id: "evt-" + Math.random().toString(36).substring(2, 9),
          event_type: "INSERT",
          order_id: newOrder.id,
          restaurant_id: newOrder.restaurant_id,
          order_data: newOrder,
          created_at: new Date().toISOString(),
        };
        const updatedEvents = [mockEvent, ...events];
        localStorage.setItem(eventsKey, JSON.stringify(updatedEvents));
        
        this.notify("orders", newOrder);
        this.notify("orders_events", mockEvent);
        return;
      }
    }

    this.notify(table, data[0]);
  }

  private listeners: { table: string; callback: (payload?: RealtimePayload) => void }[] = [];

  private notify(table: string, newRow?: MockRow) {
    console.log("[MOCK SUPABASE NOTIFY] table:", table, "listeners count:", this.listeners.length);
    if (this.channelBroadcast) {
      console.log("[MOCK SUPABASE NOTIFY] broadcasting message to BroadcastChannel...");
      this.channelBroadcast.postMessage({ table, newRow });
    }

    this.listeners.forEach((listener) => {
      if (listener.table === table) {
        try {
          console.log("[MOCK SUPABASE NOTIFY MATCH] Triggering local callback for table:", table);
          listener.callback({ new: newRow });
        } catch (e) {
          console.error("Error in mock realtime callback:", e);
        }
      }
    });
  }
  private getDefaults(table: string): MockRow[] {
    // Generate some default passwords
    const adminPasswordHash = CryptoJS.SHA256("admin123").toString(CryptoJS.enc.Hex);
    const demoRestaurantPasswordHash = CryptoJS.SHA256("ATVSW679").toString(CryptoJS.enc.Hex);

    switch (table) {
      case "admin_users":
        return [
          {
            id: "admin-uuid-1",
            email: "sample-19@example.test",
            password_hash: adminPasswordHash,
            name: "Super Admin",
            created_at: new Date().toISOString(),
          },
        ];
      case "restaurants":
        return [
          {
            id: "demo-restaurant-id",
            registration_request_id: "request-uuid-1",
            name: "Restaurante de Prueba",
            slug: "demo-restaurant",
            owner_name: "Juan Pérez",
            phone: "987654321",
            email: "sample-13@example.test",
            city: "Santiago",
            address: "Av. Providencia 1245",
            restaurant_type: "Cafetería",
            subscription_plan: "pro", // Set to Pro to show new Pro features by default
            status: "active",
            is_active: true,
            created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
            updated_at: new Date().toISOString(),
            currency: "CLP",
            usd_exchange_rate: 950,
            default_language: "es",
            default_prep_time: 15,
          },
          {
            id: "demo-restaurant-id-2",
            registration_request_id: "request-uuid-1",
            name: "Bella Italia (Sucursal Poniente)",
            slug: "bella-italia-poniente",
            owner_name: "Juan Pérez",
            phone: "987654321",
            email: "sample-13@example.test",
            city: "Santiago",
            address: "Av. Vitacura 2345",
            restaurant_type: "Pizzería",
            subscription_plan: "free_trial",
            status: "trial",
            is_active: true,
            created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
            trial_ends_at: new Date(Date.now() + 86400000 * 8).toISOString(), // 8 days remaining
            updated_at: new Date().toISOString(),
            currency: "CLP",
            usd_exchange_rate: 950,
            default_language: "es",
            default_prep_time: 15,
          },
          {
            id: "sushi-restaurant-id",
            registration_request_id: "request-uuid-2",
            name: "Sushi House",
            slug: "sushi-house",
            owner_name: "Kenji Sato",
            phone: "911223344",
            email: "sample-8@example.test",
            city: "Viña del Mar",
            address: "Av. Libertad 450",
            restaurant_type: "Sushi",
            subscription_plan: "starter",
            status: "active",
            is_active: true,
            created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
            updated_at: new Date().toISOString(),
            currency: "CLP",
            usd_exchange_rate: 950,
            default_language: "es",
            default_prep_time: 15,
          }
        ];
      case "users":
        return [
          {
            id: "user-uuid-1",
            restaurant_id: "demo-restaurant-id",
            email: "sample-13@example.test",
            password_hash: demoRestaurantPasswordHash,
            temp_password: true,
            role: "owner",
            created_at: new Date().toISOString(),
          },
        ];
      case "profiles":
        return [
          {
            id: "user-uuid-1",
            restaurant_id: "demo-restaurant-id",
            role: "owner",
            display_name: "Juan Pérez",
            created_at: new Date().toISOString(),
          },
        ];
      case "menu_items":
        return [
          {
            id: "menu-item-1",
            restaurant_id: "demo-restaurant-id",
            name: "Pizza Margherita",
            description: "Salsa de tomate pomodoro, queso mozzarella y hojas de albahaca fresca.",
            base_price: 8500,
            category: "Pizzas",
            image_url: "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=500",
            image_urls: [
              "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=500",
              "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500",
              "https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=500"
            ],
            is_available: true,
            sizes: [
              { name: "Individual", price: 6500 },
              { name: "Mediana", price: 8500 },
              { name: "Familiar", price: 11500 },
            ],
            addons: [
              { name: "Doble Queso", price: 1500 },
              { name: "Champiñones", price: 1000 },
            ],
            created_at: new Date().toISOString(),
          },
          {
            id: "menu-item-2",
            restaurant_id: "demo-restaurant-id",
            name: "Hamburguesa Vegana Crujiente",
            description: "Medallón de legumbres crujiente con lechuga, tomate y salsa especial del chef.",
            base_price: 5900,
            category: "Snacks / Sándwiches",
            image_url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500",
            image_urls: [
              "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500",
              "https://images.unsplash.com/photo-1550547660-d9450f859349?w=500"
            ],
            is_available: true,
            sizes: [],
            addons: [{ name: "Lámina de Queso Vegano", price: 800 }],
            created_at: new Date().toISOString(),
          },
          {
            id: "menu-item-3",
            restaurant_id: "demo-restaurant-id",
            name: "Bastones de Pan de Ajo",
            description: "Bastones horneados untados con mantequilla de ajo y finas hierbas.",
            base_price: 3900,
            category: "Entradas",
            image_url: "https://images.unsplash.com/photo-1544982503-9f984c14501a?w=500",
            image_urls: ["https://images.unsplash.com/photo-1544982503-9f984c14501a?w=500"],
            is_available: true,
            created_at: new Date().toISOString(),
          },
          {
            id: "menu-item-4",
            restaurant_id: "demo-restaurant-id",
            name: "Macchiato de Caramelo Helado",
            description: "Café espresso combinado con jarabe de vainilla, leche fría y salsa de caramelo.",
            base_price: 4500,
            category: "Bebidas",
            image_url: "https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?w=500",
            image_urls: ["https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?w=500"],
            is_available: true,
            created_at: new Date().toISOString(),
          },
        ];
      case "registration_requests":
        return [
          {
            id: "request-uuid-1",
            restaurant_name: "Restaurante de Prueba",
            owner_name: "Juan Pérez",
            phone: "987654321",
            email: "sample-13@example.test",
            city: "Santiago",
            address: "Av. Providencia 1245",
            restaurant_type: "Cafetería",
            heard_from: "Búsqueda en Google",
            notes: "Por favor aprobar este restaurante de demostración",
            status: "verified",
            created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
          },
          {
            id: "request-uuid-2",
            restaurant_name: "Bella Italia",
            owner_name: "Mario Rossi",
            phone: "998877665",
            email: "sample-9@example.test",
            city: "Viña del Mar",
            address: "Calle Valparaíso 450",
            restaurant_type: "Restaurante",
            heard_from: "Recomendación de un Amigo",
            notes: "Espero comenzar pronto con el plan Pro.",
            status: "pending",
            created_at: new Date().toISOString(),
          },
        ];
      case "restaurant_customers":
        return [
          {
            id: "cust-1",
            restaurant_id: "demo-restaurant-id",
            name: "Tomás Silva",
            phone: "+56900000000",
            email: "sample-10@example.test",
            notes: "Prefiere salsa extra y masa delgada. Cliente muy recurrente de los fines de semana.",
            created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "cust-2",
            restaurant_id: "demo-restaurant-id",
            name: "Camila Gómez",
            phone: "+56900000000",
            email: "sample-11@example.test",
            notes: "Vegetariana estricta. Alérgica a las nueces.",
            created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "cust-3",
            restaurant_id: "demo-restaurant-id",
            name: "Andrés Muñoz",
            phone: "+56900000000",
            email: "sample-12@example.test",
            notes: "Suele venir a trabajar por las tardes. Siempre pide mesa cerca de un enchufe.",
            created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "cust-4",
            restaurant_id: "demo-restaurant-id",
            name: "Sofía Rojas",
            phone: "+56900000000",
            notes: "Pide principalmente para llevar.",
            created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
      case "orders":
        return [
          {
            id: "order-uuid-1",
            restaurant_id: "demo-restaurant-id",
            customer_id: "cust-3",
            order_number: "PED8765432",
            order_type: "qr",
            table_number: "Mesa 4",
            customer_name: "Andrés Muñoz",
            customer_phone: "+56900000000",
            items: [
              {
                menu_item_id: "menu-item-1",
                name: "Pizza Margherita (Mediana)",
                quantity: 1,
                base_price: 8500,
                selected_size: { name: "Mediana", price: 8500 },
                selected_addons: [{ name: "Doble Queso", price: 1500 }],
                item_total: 10000,
              },
              {
                menu_item_id: "menu-item-4",
                name: "Macchiato de Caramelo Helado",
                quantity: 2,
                base_price: 4500,
                item_total: 9000,
              },
            ],
            subtotal: 19000,
            tax: 3610,
            total: 22610,
            status: "completed",
            payment_method: "cash",
            payment_status: "paid",
            created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
          },
          {
            id: "order-uuid-2",
            restaurant_id: "demo-restaurant-id",
            customer_id: "cust-2",
            order_number: "PED8765431",
            order_type: "qr",
            table_number: "Mesa 1",
            customer_name: "Camila Gómez",
            customer_phone: "+56900000000",
            items: [
              {
                menu_item_id: "menu-item-2",
                name: "Hamburguesa Vegana Crujiente",
                quantity: 2,
                base_price: 5900,
                selected_addons: [{ name: "Lámina de Queso Vegano", price: 800 }],
                item_total: 13400,
              },
            ],
            subtotal: 13400,
            tax: 2546,
            total: 15946,
            status: "completed",
            payment_method: "card",
            payment_status: "paid",
            created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
          },
        ];
      case "profile_restaurants":
        return [
          {
            id: "pr-1",
            profile_id: "user-uuid-1",
            restaurant_id: "demo-restaurant-id",
            is_primary: true,
            created_at: new Date().toISOString(),
          },
        ];
      default:
        return [];
    }
  }

  from(table: string) {
    const store = this.getStore(table);

    const query = {
      data: [...store] as MockRow[],
      error: null as {message: string}|null,
      count: null as number | null,

      select: (columns: string, options?: { count?: string; head?: boolean }) => {
        if (options?.count) {
          query.count = query.data.length;
        }
        if (options?.head) {
          query.data = [];
        }
        return query;
      },

      eq: (column: string, value: unknown) => {
        query.data = query.data.filter((row) => row[column] === value);
        return query;
      },

      gte: (column: string, value: unknown) => {
        query.data = query.data.filter((row) => row[column] >= value);
        return query;
      },

      in: (column: string, values: unknown[]) => {
        query.data = query.data.filter((row) => values.includes(row[column]));
        return query;
      },

      order: (column: string, options?: { ascending: boolean }) => {
        query.data.sort((a, b) => {
          const valA = a[column];
          const valB = b[column];
          if (valA < valB) return options?.ascending ? -1 : 1;
          if (valA > valB) return options?.ascending ? 1 : -1;
          return 0;
        });
        return query;
      },

      single: () => {
        return {
          data: query.data[0] || null,
          error: query.data.length === 0 ? { message: "Not found" } : null,
        };
      },

      limit: (count: number) => {
        query.data = query.data.slice(0, count);
        return query;
      },

      maybeSingle: () => {
        return {
          data: query.data[0] || null,
          error: null,
        };
      },

      insert: (rows: MockRow[]) => {
        if (table === "profile_restaurants") {
          for (const row of rows) {
            const profileId = row.profile_id;
            if (profileId) {
              const currentCount = store.filter((item: MockRow) => item.profile_id === profileId).length;
              if (currentCount >= 5) {
                query.error = { message: "Límite alcanzado: máximo 5 restaurantes por usuario" };
                query.data = [];
                return query;
              }
            }
          }
        }

        if (table === "menu_items") {
          const restaurants = this.getStore("restaurants");
          for (const row of rows) {
            const restId = row.restaurant_id;
            const restaurant = restaurants.find((r: MockRow) => r.id === restId);
            if (restaurant && restaurant.subscription_plan === "free_trial") {
              const currentCount = store.filter((item: MockRow) => item.restaurant_id === restId).length;
              if (currentCount + rows.length > 30) {
                query.error = { message: "Límite de platos excedido. El plan de prueba gratuito está limitado a un máximo de 30 platos. Por favor, actualiza tu plan en Configuración para agregar más platos." };
                query.data = [];
                return query;
              }
            }
          }
        }

        const newRows = rows.map((row) => ({
          id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
          created_at: new Date().toISOString(),
          ...row,
        }));
        const updatedStore = [...newRows, ...store];
        this.setStore(table, updatedStore);
        query.data = newRows;
        return query;
      },

      update: (updates: MockRow) => {
        const selectedIds = query.data.map((r) => r.id);
        const updatedStore = store.map((row) => {
          if (selectedIds.includes(row.id)) {
            return { ...row, ...updates, updated_at: new Date().toISOString() };
          }
          return row;
        });
        this.setStore(table, updatedStore);
        query.data = query.data.map((r) => ({ ...r, ...updates }));
        return query;
      },

      delete: () => {
        const selectedIds = query.data.map((r) => r.id);
        const updatedStore = store.filter((row) => !selectedIds.includes(row.id));
        this.setStore(table, updatedStore);
        return query;
      },

      then: <TResult1 = QueryResult, TResult2 = never>(
        onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
      ): Promise<TResult1 | TResult2> => {
        const result = { data: query.data, error: query.error, count: query.count };
        return Promise.resolve(result).then(onfulfilled, onrejected);
      },
    };

    return query;
  }

  rpc(fnName: string, params: Record<string, unknown>) {
    const adminUsers = this.getStore("admin_users");
    const users = this.getStore("users");
    const restaurants = this.getStore("restaurants");
    const requests = this.getStore("registration_requests");

    if (fnName === "create_restaurant_branch") {
      const sessionStr = localStorage.getItem("mock_supabase_session");
      if (!sessionStr) {
        return Promise.resolve({ data: null, error: { message: "Not authenticated" } });
      }
      const session = JSON.parse(sessionStr);
      const user = session?.user;
      if (!user) {
        return Promise.resolve({ data: null, error: { message: "Not authenticated" } });
      }

      const profiles = this.getStore("profiles");
      const profile = profiles.find((p) => p.id === user.id);
      if (!profile) {
        return Promise.resolve({ data: null, error: { message: "Profile not found" } });
      }

      const parentRestaurantId = profile.restaurant_id;
      if (!parentRestaurantId) {
        return Promise.resolve({ data: null, error: { message: "No active restaurant found" } });
      }

      const parentRestaurant = restaurants.find((r) => r.id === parentRestaurantId);
      if (!parentRestaurant) {
        return Promise.resolve({ data: null, error: { message: "Active restaurant details not found" } });
      }

      const plan = parentRestaurant.subscription_plan;
      if (plan !== "pro" && plan !== "enterprise") {
        return Promise.resolve({
          data: null,
          error: { message: "Plan upgrade required: branch creation only allowed on pro or enterprise plans" },
        });
      }

      const profileRestaurants = this.getStore("profile_restaurants");
      const userBranches = profileRestaurants.filter((pr) => pr.profile_id === user.id);
      if (userBranches.length >= 5) {
        return Promise.resolve({
          data: null,
          error: { message: "Branch limit reached: maximum of 5 restaurants allowed" },
        });
      }

      const emailExists = restaurants.some(
        (r) => r.email && params?.p_email && String(r.email).toLowerCase() === String(params.p_email).toLowerCase()
      );
      if (emailExists) {
        return Promise.resolve({ data: null, error: { message: "Restaurant email already in use" } });
      }

      let baseSlug = params?.p_name ? String(params.p_name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : "";
      if (!baseSlug) baseSlug = "branch";
      let slug = baseSlug;
      let counter = 1;
      while (restaurants.some((r) => r.slug === slug)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      const newRestaurantId = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : "rest-" + Math.random().toString(36).substring(2, 9);
      const newRestaurant = {
        id: newRestaurantId,
        name: params?.p_name,
        slug: slug,
        email: params?.p_email,
        phone: params?.p_phone,
        city: params?.p_city || null,
        address: params?.p_address || null,
        restaurant_type: params?.p_restaurant_type || "branch",
        subscription_plan: parentRestaurant.subscription_plan,
        status: parentRestaurant.status,
        is_active: parentRestaurant.is_active,
        owner_name: parentRestaurant.owner_name || null,
        trial_ends_at: parentRestaurant.trial_ends_at || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        currency: "CLP",
        usd_exchange_rate: 950,
        default_language: "es",
        default_prep_time: 15,
      };

      const updatedRestaurants = [...restaurants, newRestaurant];
      this.setStore("restaurants", updatedRestaurants);

      const newRelation = {
        id: "pr-" + Math.random().toString(36).substring(2, 9),
        profile_id: user.id,
        restaurant_id: newRestaurantId,
        is_primary: false,
        added_at: new Date().toISOString(),
      };
      const updatedProfileRestaurants = [...profileRestaurants, newRelation];
      this.setStore("profile_restaurants", updatedProfileRestaurants);

      const updatedProfiles = profiles.map((p) => {
        if (p.id === user.id) {
          return { ...p, restaurant_id: newRestaurantId };
        }
        return p;
      });
      this.setStore("profiles", updatedProfiles);

      if (session.user?.user_metadata) {
        session.user.user_metadata.restaurant_id = newRestaurantId;
        localStorage.setItem("mock_supabase_session", JSON.stringify(session));
      }

      return Promise.resolve({ data: newRestaurantId, error: null });
    }

    if (fnName === "admin_login") {
      const admin = adminUsers.find(
        (au) =>
          String(au.email).toLowerCase() === String(params.p_email).toLowerCase() &&
          au.password_hash === params.p_password_hash
      );
      if (admin) {
        return Promise.resolve({
          data: [{ id: admin.id, email: admin.email, name: admin.name }],
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: { message: "Invalid credentials" } });
    }

    if (fnName === "restaurant_login") {
      const user = users.find(
        (u) =>
          String(u.email).toLowerCase() === String(params.p_email).toLowerCase() &&
          u.password_hash === params.p_password_hash
      );
      if (user) {
        const restaurant = restaurants.find((r) => r.id === user.restaurant_id);
        return Promise.resolve({
          data: [
            {
              id: user.id,
              email: user.email,
              role: user.role,
              restaurant_id: user.restaurant_id,
              temp_password: user.temp_password,
              restaurant_name: restaurant?.name || "Mock Restaurant",
              restaurant_slug: restaurant?.slug || "mock-restaurant",
              restaurant_is_active: restaurant ? restaurant.is_active : true,
            },
          ],
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: { message: "Invalid credentials" } });
    }

    if (fnName === "admin_create_restaurant") {
      const newRestaurantId = "rest-" + Math.random().toString(36).substring(2, 9);
      const newUserId = "user-" + Math.random().toString(36).substring(2, 9);
      const isTrialPlan = params.p_subscription_plan === "free_trial";

      const updatedRestaurants = [
        ...restaurants,
        {
          id: newRestaurantId,
          registration_request_id: params.p_request_id,
          name: params.p_restaurant_name,
          slug: params.p_slug,
          owner_name: params.p_owner_name,
          phone: params.p_phone,
          email: params.p_email,
          city: params.p_city,
          address: params.p_address,
          subscription_plan: params.p_subscription_plan,
          status: isTrialPlan ? "trial" : "active",
          is_active: true,
          trial_ends_at: isTrialPlan 
            ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
            : undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          currency: "CLP",
          usd_exchange_rate: 950,
          default_language: "es",
          default_prep_time: 15,
        },
      ];
      this.setStore("restaurants", updatedRestaurants);

      const updatedUsers = [
        ...users,
        {
          id: newUserId,
          restaurant_id: newRestaurantId,
          email: params.p_email,
          password_hash: params.p_password_hash,
          temp_password: true,
          role: "owner",
          created_at: new Date().toISOString(),
        },
      ];
      this.setStore("users", updatedUsers);

      const updatedRequests = requests.map((req) => {
        if (req.id === params.p_request_id) {
          return {
            ...req,
            status: "verified",
            contacted_at: new Date().toISOString(),
            internal_notes: params.p_internal_notes,
          };
        }
        return req;
      });
      this.setStore("registration_requests", updatedRequests);

      return Promise.resolve({
        data: [{ restaurant_id: newRestaurantId, user_id: newUserId, success: true, message: "Created" }],
        error: null,
      });
    }

    if (fnName === "admin_reject_request") {
      const updatedRequests = requests.map((req) => {
        if (req.id === params.p_request_id) {
          return {
            ...req,
            status: "rejected",
            rejection_reason: params.p_rejection_reason,
            contacted_at: new Date().toISOString(),
          };
        }
        return req;
      });
      this.setStore("registration_requests", updatedRequests);
      return Promise.resolve({ data: true, error: null });
    }

    if (fnName === "auto_approve_registration_v2") {
      const req = requests.find((r) => r.id === params.p_request_id);
      if (!req) {
        return Promise.resolve({ data: null, error: { message: "Solicitud no encontrada" } });
      }

      const newRestaurantId = "rest-" + Math.random().toString(36).substring(2, 9);
      const isTrialPlan = params.p_plan === "free_trial";
      
      const updatedRequests = requests.map((r) => {
        if (r.id === params.p_request_id) {
          return {
            ...r,
            status: "verified",
            contacted_at: new Date().toISOString(),
            internal_notes: `Aprobado automáticamente via plan ${params.p_plan} (Mock)`,
          };
        }
        return r;
      });
      this.setStore("registration_requests", updatedRequests);

      const updatedRestaurants = [
        ...restaurants,
        {
          id: newRestaurantId,
          registration_request_id: params.p_request_id,
          name: req.restaurant_name,
          slug: String(req.restaurant_name).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          owner_name: req.owner_name,
          phone: req.phone,
          email: req.email,
          city: req.city,
          address: req.address,
          subscription_plan: params.p_plan,
          status: isTrialPlan ? "trial" : "active",
          is_active: true,
          trial_ends_at: isTrialPlan 
            ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
            : undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          currency: "CLP",
          usd_exchange_rate: 950,
          default_language: "es",
          default_prep_time: 15,
        },
      ];
      this.setStore("restaurants", updatedRestaurants);

      return Promise.resolve({
        data: [{ restaurant_id: newRestaurantId, success: true, message: "Restaurante activado con éxito" }],
        error: null,
      });
    }

    if (fnName === "admin_toggle_restaurant_status") {
      const updatedRestaurants = restaurants.map((r) => {
        if (r.id === params.p_restaurant_id) {
          return {
            ...r,
            is_active: params.p_is_active,
            status: params.p_is_active ? "active" : "blocked",
            block_reason: params.p_block_reason,
          };
        }
        return r;
      });
      this.setStore("restaurants", updatedRestaurants);
      return Promise.resolve({ data: true, error: null });
    }

    return Promise.resolve({ data: null, error: { message: `Function ${fnName} not implemented in mock` } });
  }

  channel(name: string) {
    const channelBuilder = {
      on: (event: string, filter: {table: string}, callback: (payload?: RealtimePayload) => void) => {
        console.log("[MOCK SUPABASE SUBSCRIBE] table:", filter.table);
        this.listeners.push({
          table: filter.table,
          callback,
        });
        return channelBuilder;
      },
      subscribe: () => {
        console.log("[MOCK SUPABASE CHANNEL SUBSCRIBE] name:", name);
        return {
          unsubscribe: () => {},
        };
      },
    };
    return channelBuilder;
  }
}
