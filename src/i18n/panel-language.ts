import { createContext, useContext } from "react";

export type PanelLang = "es" | "pt";

export const STORAGE_KEY = "cmor-panel-lang";

/** Diccionario: clave = texto español canónico, valor pt = traducción.
 *  Claves ausentes caen al original (es) — traducción progresiva. */
export const PANEL_I18N: Record<string, string> = {
  // Navegación / layout
  "Dashboard": "Painel",
  "Resumen": "Resumo",
  "Pedidos": "Pedidos",
  "Menú": "Menu",
  "Mesas": "Mesas",
  "POS": "PDV",
  "Inventario": "Estoque",
  "Reportes": "Relatórios",
  "CRM": "CRM",
  "Garzones": "Garçons",
  "Configuración": "Configuração",
  "Suscripción": "Assinatura",
  "Caja": "Caixa",
  "Contabilidad": "Contabilidade",
  "Documentos": "Documentos",
  "Cerrar sesión": "Sair",
  // Comunes
  "Guardar": "Salvar",
  "Guardar cambios": "Salvar alterações",
  "Cancelar": "Cancelar",
  "Eliminar": "Excluir",
  "Editar": "Editar",
  "Buscar": "Buscar",
  "Buscar...": "Buscar...",
  "Cargando...": "Carregando...",
  "Cargando": "Carregando",
  "Confirmar": "Confirmar",
  "Cerrar": "Fechar",
  "Total": "Total",
  "Subtotal": "Subtotal",
  "Añadir": "Adicionar",
  "Nuevo": "Novo",
  "Nombre": "Nome",
  "Teléfono": "Telefone",
  "Email": "E-mail",
  "Ciudad": "Cidade",
  "Dirección": "Endereço",
  "Estado": "Estado",
  "Acciones": "Ações",
  "Fecha": "Data",
  "Ver todo": "Ver tudo",
  "Cargando restaurantes...": "Carregando restaurantes...",
  "Cargando dashboard...": "Carregando painel...",
  "Cargando pedidos...": "Carregando pedidos...",
  "Bienvenido": "Bem-vindo",
  "Volver": "Voltar",
  // Pagos / planes
  "Pagar con Flow": "Pagar com Mercado Pago",
  "Efectivo": "Dinheiro",
  "Transferencia": "Transferência",
  "Tarjeta": "Cartão",
  "Tarjeta (POS)": "Cartão (PDV)",
  "Otro": "Outro",
  // Propinas / caja
  "Propina": "Gorjeta",
  "Propinas": "Gorjetas",
  "Apertura de caja": "Abertura de caixa",
  "Cierre de caja": "Fechamento de caixa",
  "Diferencia": "Diferença",
  "Ventas totales": "Vendas totais",
  // Cocina
  "Cocina": "Cozinha",
  "KDS": "KDS",
  "Nuevos": "Novos",
  "Aceptados": "Aceitos",
  "En Preparación": "Em Preparo",
  "Listos": "Prontos",
  "Completado": "Concluído",
  "Completados": "Concluídos",
  "Cancelado": "Cancelado",
};

export interface PanelLangContextValue {
  lang: PanelLang;
  setLang: (l: PanelLang) => void;
  /** Traduce un texto del panel: pt si existe en el diccionario, si no es */
  t: (text: string) => string;
}

export const PanelLangContext = createContext<PanelLangContextValue | null>(null);

/** Hook del panel. Fuera del provider devuelve es/t identidad (legacy). */
export const usePanelLang = (): PanelLangContextValue => {
  const ctx = useContext(PanelLangContext);
  if (ctx) return ctx;
  return { lang: "es", setLang: () => {}, t: (x) => x };
};

/** Hook de conveniencia: lang inicial según el país del restaurante. */
export const panelLangForCountry = (country?: string | null): PanelLang =>
  country === "BR" ? "pt" : "es";