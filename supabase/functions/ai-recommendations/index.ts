import "../_shared/local-network.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
Deno.serve((req: Request) => handleOptions(req) || jsonResponse(req, { success: false, error: "ai_disabled", message: "La IA externa está desactivada." }, 503));
