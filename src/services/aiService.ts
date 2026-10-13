

// ---------------------------------------------------------------------------
// IA Service — Recomendaciones reales con OpenRouter (vía Edge Function)
// ---------------------------------------------------------------------------

export interface AiRecommendation {
  title: string;
  type: "price" | "menu" | "promo" | "inventory";
  impact: string;
  difficulty: "Fácil" | "Media" | "Compleja";
  description: string;
  suggestion: string;
}

export interface AiMetrics {
  ticketPromedio: number;
  totalVentas: number;
  numPedidos: number;
  topProductos: { name: string; quantity: number; revenue: number }[];
  totalPropinas: number;
  stockBajo: string[];
}

export interface AiResult {
  recommendations: AiRecommendation[];
  metrics: AiMetrics;
  message?: string;
}

export interface AiError {
  error: string;
}

/**
 * Obtiene recomendaciones de IA basadas en datos reales del restaurant.
 * Invoca la Edge Function `ai-recommendations` que recolecta ventas, menú,
 * inventario y propinas, y los envía a OpenRouter.
 */
export async function getAiRecommendations(
  restaurantId: string
): Promise<AiResult | AiError> {
  void restaurantId;
  return { error: "La IA externa está desactivada." };
}
