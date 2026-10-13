import "../_shared/local-network.ts";
import { checkoutRuntime } from "../_shared/checkout-runtime.ts";
Deno.serve(checkoutRuntime("table"));
