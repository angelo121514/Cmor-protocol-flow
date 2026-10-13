import "../_shared/local-network.ts";
import { privacyRuntime } from "../_shared/privacy-runtime.ts";
Deno.serve(privacyRuntime("verify"));
