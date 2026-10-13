import { errorMessage } from "../../../shared/errors";
import React, { useEffect, useState } from "react";
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Calendar,
  Download,
  Package,
  Wallet,
  Users,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { Card, Button, Loading, Tabs, Alert } from "../../components/ui";
import type { TabItem } from "../../components/ui";
import { supabase } from "../../config/supabase";
import {readAllPages} from "../../services/pagination";
import { formatCurrency, getTaxLabel } from "../../utils/helpers";
import { logger } from "../../utils/logger";
import { useRestaurantId, useAuth } from "../../hooks/useAuth";

import {getSalesReport, type SalesReport} from "../../services/reportsService";

const Reports: React.FC = () => {
  const restaurantId = useRestaurantId();
  const { restaurant } = useAuth();
  // Etiqueta del impuesto según config del restaurante (multi-país)
  const taxLabel = getTaxLabel(restaurant?.country, restaurant?.tax_rate);
  // Formato con la moneda del restaurante (Fase 1 multi-país)
  const fmtR = (amount: number) => formatCurrency(amount, restaurant?.currency || "CLP");
  const [dateRange, setDateRange] = useState<"1" | "7" | "30" | "90">("30");
  const reportKey=`${restaurantId}:${dateRange}`;
  const [result,setResult]=useState<{key:string;data:SalesReport|null;error:string}>({key:"",data:null,error:""});
  const loading=Boolean(restaurantId)&&result.key!==reportKey;
  const reportData=result.key===reportKey?result.data:null;
  const loadError=result.key===reportKey?result.error:"";

  useEffect(() => {
    let active=true;
    if(!restaurantId)return;
    getSalesReport(restaurantId,Number(dateRange)).then(data=>{
      if(active)setResult({key:reportKey,error:"",data:{...data,dailyRevenue:data.dailyRevenue.map(d=>({...d,
        date:new Date(d.date+"T12:00:00Z").toLocaleDateString("es-CL",{day:"numeric",month:"short",timeZone:"UTC"})}))}});
    }).catch((error:unknown)=>{
      if(active){logger.error("Error al cargar reportes",{error:errorMessage(error)});setResult({key:reportKey,data:null,error:errorMessage(error)||"No se pudieron cargar los reportes"});}
    });
    return ()=>{active=false;};
  }, [dateRange, restaurantId, reportKey]);

  const exportReport = () => {
    if (!reportData) return;

    const csvContent = [
      ["Métrica", "Valor"],
      ["Ventas Netas (Neto)", fmtR(reportData.totalSubtotal)],
      [taxLabel ? `${taxLabel} Recaudado` : "Impuesto Recaudado", fmtR(reportData.totalTax)],
      ["Descuentos Aplicados", fmtR(reportData.totalDiscount)],
      ["Ventas Brutas (Total)", fmtR(reportData.totalRevenue)],
      ["Pedidos Totales", reportData.totalOrders.toString()],
      ["Ticket Promedio", fmtR(reportData.avgOrderValue)],
      [""],
      ["Platos Más Vendidos", "Cantidad", "Ingresos"],
      ...reportData.topItems.map((item) => [
        item.name,
        item.count.toString(),
        fmtR(item.revenue),
      ]),
    ]
      .map((row) => row.map(value => {
        const text=String(value);return '"'+(/^[\s]*[=+@-]/.test(text)?"'":"")+text.replace(/"/g,'""')+'"';
      }).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-ventas-${dateRange}-dias.csv`;
    a.click();
    setTimeout(()=>window.URL.revokeObjectURL(url),0);
  };

  if (loading) {
    return <Loading text="Cargando análisis e informes..." />;
  }

  if (loadError) {
    return (
      <Alert
        type="error"
        message={"Error al cargar los reportes: " + loadError}
        className="my-6"
      />
    );
  }

  if (!reportData) {
    return (
      <div className="text-center text-text-secondary py-12">No hay datos disponibles</div>
    );
  }

  const COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8"];

  // ---- Tabs de reportes ----
  const salesTab: TabItem = {
    key: "sales",
    label: "Ventas",
    content: (
      <div className="space-y-6">
        {reportData.historicalCurrencyCount>0&&<Alert type="warning" message={`${reportData.historicalCurrencyCount} pedidos históricos no conservan moneda. Se muestran con la moneda configurada; requieren conciliación.`} />}
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-text mb-2">
              Reportes e Informes de Ventas
            </h2>
            <p className="text-text-secondary">
              Monitorea el rendimiento de tu menú y tendencias de facturación
            </p>
          </div>
          <div className="flex gap-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as "1" | "7" | "30" | "90")}
              className="min-w-[190px] rounded-lg border border-border bg-bg px-3 py-2 text-sm font-medium text-text shadow-sm transition-colors hover:bg-bg-subtle focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              <option value="1">Hoy</option>
              <option value="7">Últimos 7 Días (Semana)</option>
              <option value="30">Últimos 30 Días (Mes)</option>
              <option value="90">Últimos 90 Días (3 Meses)</option>
            </select>
            <Button
              icon={<Download className="w-5 h-5" />}
              onClick={exportReport}
              variant="outline"
            >
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-success/10 rounded-lg">
                <DollarSign className="w-6 h-6 text-success" />
              </div>
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <div className="text-2xl font-bold text-text mb-1">
              {fmtR(reportData.totalRevenue)}
            </div>
            <p className="text-text-secondary text-sm">Ventas Totales</p>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-accent/10 rounded-lg">
                <ShoppingBag className="w-6 h-6 text-accent" />
              </div>
            </div>
            <div className="text-2xl font-bold text-text mb-1">
              {reportData.totalOrders}
            </div>
            <p className="text-text-secondary text-sm">Pedidos Pagados</p>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-accent-secondary/10 rounded-lg">
                <DollarSign className="w-6 h-6 text-accent-secondary" />
              </div>
            </div>
            <div className="text-2xl font-bold text-text mb-1">
              {fmtR(reportData.avgOrderValue)}
            </div>
            <p className="text-text-secondary text-sm">Ticket Promedio</p>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-warning/10 rounded-lg">
                <Calendar className="w-6 h-6 text-warning" />
              </div>
            </div>
            <div className="text-2xl font-bold text-text mb-1">
              {dateRange} Días
            </div>
            <p className="text-text-secondary text-sm">Período de Reporte</p>
          </Card>
        </div>

        {/* Detailed Financial Breakdown Card */}
        <Card className="!p-6">
          <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-accent" />
            Resumen Financiero Detallado (Desglose de IVA)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-xs font-bold text-text-secondary uppercase tracking-wider">
                  <th className="py-3">Concepto</th>
                  <th className="py-3 text-right">Monto</th>
                  <th className="py-3 text-right">Porcentaje / Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                <tr>
                  <td className="py-3.5 font-medium text-text">Ventas Netas (Base Imponible)</td>
                  <td className="py-3.5 text-right font-bold text-text">
                    {fmtR(reportData.totalSubtotal)}
                  </td>
                  <td className="py-3.5 text-right text-text-secondary text-xs">Neto sin impuestos</td>
                </tr>
                <tr>
                  <td className="py-3.5 font-medium text-text">{taxLabel ? `${taxLabel} Recaudado` : "Impuesto Recaudado"}</td>
                  <td className="py-3.5 text-right font-bold text-accent-secondary">
                    {fmtR(reportData.totalTax)}
                  </td>
                  <td className="py-3.5 text-right text-text-secondary text-xs">Impuesto al valor agregado</td>
                </tr>
                {reportData.totalDiscount > 0 && (
                  <tr>
                    <td className="py-3.5 font-medium text-success">Descuentos Aplicados</td>
                    <td className="py-3.5 text-right font-bold text-success">
                      -{fmtR(reportData.totalDiscount)}
                    </td>
                    <td className="py-3.5 text-right text-success text-xs">Rebajas y promociones</td>
                  </tr>
                )}
                <tr className="bg-bg-subtle font-bold text-base">
                  <td className="py-4 text-text pl-3 rounded-l-lg">Ventas Brutas (Total Facturado)</td>
                  <td className="py-4 text-right text-success font-black">
                    {fmtR(reportData.totalRevenue)}
                  </td>
                  <td className="py-4 text-right text-text-secondary text-xs pr-3 rounded-r-lg">Monto final recaudado (con IVA)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Revenue Trend */}
          <Card>
            <h3 className="text-lg font-bold text-text mb-4">Tendencia de Ingresos</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reportData.dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => fmtR(value)}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#FF6B6B"
                  strokeWidth={2}
                  name="Ventas ($)"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Order Type Distribution */}
          <Card>
            <h3 className="text-lg font-bold text-text mb-4">
              Distribución de Tipo de Pedido
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={reportData.orderTypeDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: {type?:string;percent?:number}) =>
                    `${entry.type}: ${((entry.percent || 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {reportData.orderTypeDistribution.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Top Items */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-text">Platos Más Vendidos (Top)</h3>
            <Package className="w-5 h-5 text-accent" />
          </div>

          {reportData.topItems.length === 0 ? (
            <p className="text-text-secondary text-center py-8">
              Aún no hay platos vendidos en este período
            </p>
          ) : (
            <div className="space-y-3">
              {reportData.topItems.map((item, index) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-4 bg-bg-subtle rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-10 h-10 bg-accent rounded-full text-white font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-text">{item.name}</div>
                      <div className="text-sm text-text-secondary">
                        {item.count} unidades
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-success">
                      {fmtR(item.revenue)}
                    </div>
                    <div className="text-xs text-text-secondary">Recaudado</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Daily Orders Chart */}
        <Card>
          <h3 className="text-lg font-bold text-text mb-4">Cantidad de Pedidos Diarios</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar dataKey="orders" fill="#4ECDC4" name="Pedidos" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    ),
  };

  const tipsTab: TabItem = {
    key: "tips",
    label: "Propinas",
    content: <TipsSummary />,
  };

  const inventoryTab: TabItem = {
    key: "inventory",
    label: "Inventario",
    content: <InventorySummary />,
  };

  const waitersTab: TabItem = {
    key: "waiters",
    label: "Meseros",
    content: <WaitersSummary />,
  };

  const cashTab: TabItem = {
    key: "cash",
    label: "Cierres de Caja",
    content: <CashSummary />,
  };

  return (
    <div className="space-y-6">
      <Tabs
        tabs={[salesTab, tipsTab, inventoryTab, waitersTab, cashTab]}
        defaultActiveKey="sales"
      />
    </div>
  );
};

// =========================================================================
// Componentes de resumen para tabs adicionales
// =========================================================================

/** Resumen de propinas: tabla de las últimas propinas del día. */
const TipsSummary: React.FC = () => {
  const restaurantId = useRestaurantId();
  const { restaurant } = useAuth();
  const fmtR = (amount: number) => formatCurrency(amount, restaurant?.currency || "CLP");
  const [tips, setTips] = React.useState<{ amount: number; created_at: string; waiter_id?: string }[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [queryError,setQueryError]=React.useState("");

  React.useEffect(() => {
    if (!restaurantId) { setLoading(false); return; }
    const fetchTips = async () => {
      const data=await readAllPages<{amount:number;created_at:string;waiter_id?:string}>((from,to)=>supabase.from("tips").select("amount, created_at, waiter_id").eq("restaurant_id",restaurantId).gte("created_at",new Date(new Date().setHours(0,0,0,0)).toISOString()).order("created_at").order("id").range(from,to));
      const rows = data ?? [];
      setTips(rows);
      setTotal(rows.reduce((s, t) => s + (t.amount || 0), 0));
      setLoading(false);
    };
    fetchTips().catch(()=>{setQueryError("No se pudo cargar el reporte.");setLoading(false);});
  }, [restaurantId]);

  if(queryError)return <Alert type="error" message={queryError}/>;
  if (loading) return <Loading text="Cargando propinas..." />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text mb-2">Resumen de Propinas</h2>
        <p className="text-text-secondary">Propinas recibidas hoy</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-success/10 rounded-lg">
              <Wallet className="w-6 h-6 text-success" />
            </div>
          </div>
          <div className="text-2xl font-bold text-text">{fmtR(total)}</div>
          <p className="text-text-secondary text-sm">Total Propinas Hoy</p>
        </Card>
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-accent/10 rounded-lg">
              <ShoppingBag className="w-6 h-6 text-accent" />
            </div>
          </div>
          <div className="text-2xl font-bold text-text">{tips.length}</div>
          <p className="text-text-secondary text-sm">Propinas Registradas</p>
        </Card>
      </div>
      {tips.length === 0 ? (
        <p className="text-text-secondary text-center py-8">Sin propinas registradas hoy</p>
      ) : (
        <Card>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-xs font-bold text-text-secondary uppercase tracking-wider">
                <th className="py-3">Hora</th>
                <th className="py-3 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {tips.map((t, i) => (
                <tr key={i}>
                  <td className="py-2.5 text-text">
                    {new Date(t.created_at).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="py-2.5 text-right font-semibold text-success">
                    {fmtR(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

/** Resumen de inventario: items bajo stock. */
const InventorySummary: React.FC = () => {
  const restaurantId = useRestaurantId();
  const [items, setItems] = React.useState<{ name: string; current_stock: number; min_stock: number; unit: string }[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [queryError,setQueryError]=React.useState("");

  React.useEffect(() => {
    if (!restaurantId) { setLoading(false); return; }
    const fetchItems = async () => {
      const data=await readAllPages<{name:string;current_stock:number;min_stock:number;unit:string}>((from,to)=>supabase.from("inventory_items").select("name, current_stock, min_stock, unit").eq("restaurant_id",restaurantId).order("current_stock").order("id").range(from,to));
      // Filtrar client-side: items donde current_stock <= min_stock (con stock),
      // mismo criterio que Inventory.tsx (min_stock > 0)
      const lowStock = (data ?? []).filter(
        (item) => item.min_stock > 0 && item.current_stock <= item.min_stock
      );
      setItems(lowStock);
      setLoading(false);
    };
    fetchItems().catch(()=>{setQueryError("No se pudo cargar el reporte.");setLoading(false);});
  }, [restaurantId]);

  if(queryError)return <Alert type="error" message={queryError}/>;
  if (loading) return <Loading text="Cargando inventario..." />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text mb-2">Alertas de Inventario</h2>
        <p className="text-text-secondary">Items que requieren reposición</p>
      </div>
      {items.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-success mx-auto mb-3" />
            <p className="text-text-secondary">Todo el inventario está en nivel óptimo</p>
          </div>
        </Card>
      ) : (
        <Card>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-xs font-bold text-text-secondary uppercase tracking-wider">
                <th className="py-3">Item</th>
                <th className="py-3 text-right">Stock Actual</th>
                <th className="py-3 text-right">Mínimo</th>
                <th className="py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {items.map((item, i) => {
                const isCritical = item.current_stock <= item.min_stock * 0.5;
                return (
                  <tr key={i}>
                    <td className="py-2.5 font-medium text-text">{item.name}</td>
                    <td className="py-2.5 text-right">{item.current_stock} {item.unit}</td>
                    <td className="py-2.5 text-right text-text-secondary">{item.min_stock} {item.unit}</td>
                    <td className="py-2.5">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        isCritical
                          ? "bg-error/10 text-error"
                          : "bg-warning/10 text-warning"
                      }`}>
                        {isCritical ? "Crítico" : "Bajo"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

/** Resumen de meseros: meseros activos y ranking de ventas. */
const WaitersSummary: React.FC = () => {
  const restaurantId = useRestaurantId();
  const [waiters, setWaiters] = React.useState<{ name: string; is_active: boolean }[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [queryError,setQueryError]=React.useState("");

  React.useEffect(() => {
    if (!restaurantId) { setLoading(false); return; }
    const fetchWaiters = async () => {
      const data=await readAllPages<{name:string;is_active:boolean}>((from,to)=>supabase.from("waiters").select("name, is_active").eq("restaurant_id",restaurantId).order("name").order("id").range(from,to));
      setWaiters(data ?? []);
      setLoading(false);
    };
    fetchWaiters().catch(()=>{setQueryError("No se pudo cargar el reporte.");setLoading(false);});
  }, [restaurantId]);

  if(queryError)return <Alert type="error" message={queryError}/>;
  if (loading) return <Loading text="Cargando meseros..." />;

  const activeCount = waiters.filter((w) => w.is_active).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text mb-2">Equipo de Meseros</h2>
        <p className="text-text-secondary">{activeCount} meseros activos de {waiters.length} totales</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-accent/10 rounded-lg">
              <Users className="w-6 h-6 text-accent" />
            </div>
          </div>
          <div className="text-2xl font-bold text-text">{activeCount}</div>
          <p className="text-text-secondary text-sm">Meseros Activos</p>
        </Card>
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-bg-subtle rounded-lg">
              <Users className="w-6 h-6 text-text-secondary" />
            </div>
          </div>
          <div className="text-2xl font-bold text-text">{waiters.length - activeCount}</div>
          <p className="text-text-secondary text-sm">Inactivos</p>
        </Card>
      </div>
      {waiters.length === 0 ? (
        <p className="text-text-secondary text-center py-8">Sin meseros registrados</p>
      ) : (
        <Card>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-xs font-bold text-text-secondary uppercase tracking-wider">
                <th className="py-3">Mesero</th>
                <th className="py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {waiters.map((w, i) => (
                <tr key={i}>
                  <td className="py-2.5 font-medium text-text">{w.name}</td>
                  <td className="py-2.5">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      w.is_active
                        ? "bg-success/10 text-success"
                        : "bg-bg-subtle text-text-secondary"
                    }`}>
                      {w.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

/** Resumen de cierres de caja: últimos cierres registrados. */
const CashSummary: React.FC = () => {
  const restaurantId = useRestaurantId();
  const { restaurant } = useAuth();
  const [shifts, setShifts] = React.useState<{
    opened_at: string; closed_at?: string; total_sales: number; cash_difference?: number; status: string;
    opening_cash?: number; expected_cash?: number; actual_cash?: number;
    cash_sales?: number; card_sales?: number; transfer_sales?: number; qr_sales?: number;
    total_tips?: number; orders_count?: number; responsible_waiter_id?: string;
  }[]>([]);
  const [waiters, setWaiters] = React.useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [queryError,setQueryError]=React.useState("");

  React.useEffect(() => {
    if (!restaurantId) { setLoading(false); return; }
    const fetchShifts = async () => {
      const [shiftRes, waitersRes] = await Promise.all([
        supabase
          .from("cash_shifts")
          .select("opened_at, closed_at, total_sales, cash_difference, status, opening_cash, expected_cash, actual_cash, cash_sales, card_sales, transfer_sales, qr_sales, total_tips, orders_count, responsible_waiter_id")
          .eq("restaurant_id", restaurantId)
          .order("opened_at", { ascending: false })
          .limit(20),
        supabase
          .from("waiters")
          .select("id, name")
          .eq("restaurant_id", restaurantId),
      ]);
      if(shiftRes.error||waitersRes.error)throw new Error("report_query_failed");
      setShifts(shiftRes.data ?? []);
      setWaiters(waitersRes.data ?? []);
      setLoading(false);
    };
    fetchShifts().catch(()=>{setQueryError("No se pudo cargar el reporte.");setLoading(false);});
  }, [restaurantId]);

  if(queryError)return <Alert type="error" message={queryError}/>;
  if (loading) return <Loading text="Cargando cierres..." />;

  const waiterName = (id?: string) =>
    id ? (waiters.find((w) => w.id === id)?.name ?? "—") : "—";

  const restaurantCurrency = restaurant?.currency || "CLP";
  const fmtR = (amount: number) => formatCurrency(amount, restaurantCurrency);
  const formatDiff = (diff?: number) => {
    if (diff == null) return "—";
    const abs = formatCurrency(Math.abs(diff), restaurantCurrency);
    if (diff > 0) return `+${abs} (sobrante)`;
    if (diff < 0) return `-${abs} (faltante)`;
    return formatCurrency(0, restaurantCurrency) + " (cuadrado)";
  };

  // KPIs del período
  const totalVentas = shifts.reduce((s, x) => s + (x.total_sales || 0), 0);
  const totalDiferencia = shifts.reduce((s, x) => s + (x.cash_difference || 0), 0);
  const totalPropinas = shifts.reduce((s, x) => s + (x.total_tips || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text mb-2">Cierres de Caja</h2>
        <p className="text-text-secondary">Historial de turnos (últimos 20)</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-accent/10 rounded-lg">
              <Wallet className="w-6 h-6 text-accent" />
            </div>
          </div>
          <div className="text-2xl font-bold text-text">{fmtR(totalVentas)}</div>
          <p className="text-text-secondary text-sm">Total vendido (últimos 20 turnos)</p>
        </Card>
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className={`p-3 rounded-lg ${totalDiferencia === 0 ? "bg-success/10" : "bg-warning/10"}`}>
              <TrendingUp className={`w-6 h-6 ${totalDiferencia === 0 ? "text-success" : "text-warning"}`} />
            </div>
          </div>
          <div className={`text-2xl font-bold ${totalDiferencia === 0 ? "text-success" : "text-warning"}`}>
            {totalDiferencia > 0 ? "+" : ""}{fmtR(totalDiferencia)}
          </div>
          <p className="text-text-secondary text-sm">Diferencia (últimos 20 turnos)</p>
        </Card>
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-success/10 rounded-lg">
              <Wallet className="w-6 h-6 text-success" />
            </div>
          </div>
          <div className="text-2xl font-bold text-text">{fmtR(totalPropinas)}</div>
          <p className="text-text-secondary text-sm">Propinas (últimos 20 turnos)</p>
        </Card>
      </div>

      {shifts.length === 0 ? (
        <p className="text-text-secondary text-center py-8">Sin cierres registrados</p>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-xs font-bold text-text-secondary uppercase tracking-wider">
                  <th className="py-3">Apertura</th>
                  <th className="py-3">Cierre</th>
                  <th className="py-3">Responsable</th>
                  <th className="py-3 text-right">Fondo</th>
                  <th className="py-3 text-right">Efectivo</th>
                  <th className="py-3 text-right">Tarjeta</th>
                  <th className="py-3 text-right">Transf.</th>
                  <th className="py-3 text-right">QR</th>
                  <th className="py-3 text-right">Propinas</th>
                  <th className="py-3 text-right">Pedidos</th>
                  <th className="py-3 text-right">Diferencia</th>
                  <th className="py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {shifts.map((s, i) => (
                  <tr key={i}>
                    <td className="py-2.5 text-text">
                      {new Date(s.opened_at).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-2.5 text-text-secondary">
                      {s.closed_at
                        ? new Date(s.closed_at).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </td>
                    <td className="py-2.5 text-text">{waiterName(s.responsible_waiter_id)}</td>
                    <td className="py-2.5 text-right text-text-secondary">{s.opening_cash != null ? fmtR(s.opening_cash) : "—"}</td>
                    <td className="py-2.5 text-right text-text">{s.cash_sales != null ? fmtR(s.cash_sales) : "—"}</td>
                    <td className="py-2.5 text-right text-text">{s.card_sales != null ? fmtR(s.card_sales) : "—"}</td>
                    <td className="py-2.5 text-right text-text">{s.transfer_sales != null ? fmtR(s.transfer_sales) : "—"}</td>
                    <td className="py-2.5 text-right text-text">{s.qr_sales != null ? fmtR(s.qr_sales) : "—"}</td>
                    <td className="py-2.5 text-right text-success font-medium">{s.total_tips != null ? fmtR(s.total_tips) : "—"}</td>
                    <td className="py-2.5 text-right text-text-secondary">{s.orders_count ?? "—"}</td>
                    <td className={`py-2.5 text-right font-semibold ${
                      s.cash_difference == null
                        ? "text-text-secondary"
                        : s.cash_difference === 0
                          ? "text-success"
                          : "text-warning"
                    }`}>
                      {formatDiff(s.cash_difference)}
                    </td>
                    <td className="py-2.5">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        s.status === "open"
                          ? "bg-success/10 text-success"
                          : "bg-bg-subtle text-text-secondary"
                      }`}>
                        {s.status === "open" ? "Abierto" : "Cerrado"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Reports;
