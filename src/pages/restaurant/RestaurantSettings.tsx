import { PUBLIC_CONTACTS } from "../../config/publicContacts";
import { errorMessage } from "../../../shared/errors";
import React, { useState, useEffect } from "react";
import { Download, QrCode as QrCodeIcon, ExternalLink, LifeBuoy, Copy, Check, Lock, CreditCard, Globe, Hourglass, ChefHat } from "lucide-react";
import { Card, Button, Loading, Alert, Input } from "../../components/ui";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../../config/supabase";
import type { Restaurant } from "../../config/supabase";
import { RESTAURANT_COLUMNS } from "../../config/supabase";
import { useAuth, useRestaurantId } from "../../hooks/useAuth";
import { useFlowSubscription } from "../../hooks/useFlowSubscription";
import { APP_CONFIG } from "../../config/config";
import type { PlanId } from "../../config/config";
import { COUNTRY_CODES, REGIONAL_CONFIG, getPlanPrices, getRegionalConfig, isFlowCountry, isMpCountry, type CountryCode } from "../../config/regional";
import { setKitchenPin as saveKitchenPinRpc } from "../../services/kdsService";
import { formatCurrency } from "../../utils/helpers";
import { getTrialDaysLeft } from "../../utils/helpers";
import { useNavigate } from "react-router-dom";


const RestaurantSettings: React.FC = () => {
  const { user, profile, refresh, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const restaurantId = useRestaurantId();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState(false);

  // Password state
  const [passwordStatus, setPasswordStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Local settings state
  const [configData, setConfigData] = useState({
    country: "CL" as string,
    currency: "CLP",
    usdExchangeRate: 950,
    defaultLanguage: "es",
    defaultPrepTime: 15,
    taxRate: 19, // porcentaje entero en la UI (0.19 en BD)
  });
  // Propinas (Fase 3)
  const [tipsEnabled, setTipsEnabled] = useState(false);
  const [tipsDefaultPct, setTipsDefaultPct] = useState(10);
  const [tipsSuggestedPcts, setTipsSuggestedPcts] = useState<number[]>([10, 15, 20]);
  const [configLoading, setConfigLoading] = useState(false);
  const [configStatus, setConfigStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // PIN de cocina (Fase 6 — KDS público)
  const [kitchenPin, setKitchenPin] = useState("");
  const [kitchenPinSaved, setKitchenPinSaved] = useState(false);
  const [kitchenPinLoading, setKitchenPinLoading] = useState(false);

  // Billing state
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const { subscribe, loading: billingLoading, error: billingError } = useFlowSubscription();
  const [billingStatus, setBillingStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Checkout real vía Flow.cl: la suscripción y el cobro se gestionan en
  // flow-subscription (server-side); el cliente nunca activa planes.
  const handleSubscribeToPlan = async (planId: string) => {
    if (planId !== "starter" && planId !== "pro") return;
    setBillingStatus(null);
    await subscribe(planId);
  };

  const handleCopyId = async () => {
    if (!restaurant) return;
    try {
      await navigator.clipboard.writeText(restaurant.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);
    setPasswordLoading(true);

    try {
      const userEmail = user?.email;
      if (!userEmail) {
        setPasswordStatus({
          type: "error",
          message: "No se encontró el correo electrónico registrado.",
        });
        setPasswordLoading(false);
        return;
      }

      // Detectar si estamos en producción (auth real) o desarrollo (mock)
      const isRealAuth = typeof (supabase).auth?.onAuthStateChange === "function";
      if (isRealAuth) {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(userEmail, {
          redirectTo: window.location.origin + "/setup-password",
        });

        if (resetError) {
          setPasswordStatus({
            type: "error",
            message: resetError.message || "Error al enviar el correo de validación.",
          });
        } else {
          setPasswordStatus({
            type: "success",
            message: `¡Enlace de validación enviado! Hemos enviado un correo a ${userEmail} para completar el cambio de contraseña.`,
          });
        }
      } else {
        setPasswordStatus({
          type: "success",
          message: "Modo demo: Redirigiendo para definir tu nueva contraseña...",
        });
        setTimeout(() => {
          navigate("/setup-password");
        }, 1500);
      }
    } catch (err: unknown) {
      setPasswordStatus({
        type: "error",
        message: errorMessage(err) || "Ocurrió un error inesperado.",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;

    const fetchRestaurant = async () => {
      try {
        setError("");
        if (profile?.role === "admin") {
          setLoading(false);
          return;
        }

        if (!restaurantId) {
          setError("ID del restaurante no encontrado");
          setLoading(false);
          return;
        }

        const { data, error: fetchError } = await supabase
          .from("restaurants")
          .select(RESTAURANT_COLUMNS)
          .eq("id", restaurantId)
          .single();

        if (fetchError) throw fetchError;
        setRestaurant(data as unknown as Restaurant);

        // El hash del PIN ya no es legible por el cliente (hardening por
        // columna); el estado "PIN configurado" llega vía RPC.
        const { data: pinSet } = await supabase.rpc("kitchen_pin_is_set", {
          p_restaurant_id: restaurantId,
        });
        setKitchenPinSaved(Boolean(pinSet));
      } catch (err: unknown) {
        setError(errorMessage(err) || "Error al cargar los detalles del restaurante");
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, [restaurantId, profile, authLoading]);

  useEffect(() => {
    if (restaurant) {
      const country = restaurant.country || "CL";
      const regional = getRegionalConfig(country);
      setConfigData({
        country,
        currency: restaurant.currency || regional.currency,
        usdExchangeRate: restaurant.usd_exchange_rate || 950,
        defaultLanguage: restaurant.default_language || (country === "BR" ? "pt" : "es"),
        defaultPrepTime: restaurant.default_prep_time || 15,
        taxRate:
          restaurant.tax_rate !== undefined && restaurant.tax_rate !== null
            ? Math.round(restaurant.tax_rate * 100)
            : Math.round((regional.suggestedTaxRate ?? 0.19) * 100),
      });
      // Propinas (Fase 3)
      setTipsEnabled(restaurant.tips_enabled ?? false);
      setTipsDefaultPct(restaurant.tips_default_pct ?? 10);
      setTipsSuggestedPcts(restaurant.tips_suggested_pcts ?? [10, 15, 20]);
      // PIN de cocina: el estado "configurado" se resuelve vía RPC al
      // cargar (kitchen_pin_is_set); aquí sólo se refresca tras guardar.
    }
  }, [restaurant]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigStatus(null);
    setConfigLoading(true);

    try {
      const { error: updateError } = await supabase
        .from("restaurants")
        .update({
          country: configData.country,
          currency: configData.currency,
          usd_exchange_rate: Number(configData.usdExchangeRate),
          default_language: configData.defaultLanguage,
          default_prep_time: Number(configData.defaultPrepTime),
          tax_rate: Number(configData.taxRate) / 100,
          tips_enabled: tipsEnabled,
          tips_default_pct: Number(tipsDefaultPct),
          tips_suggested_pcts: tipsSuggestedPcts,
        })
        .eq("id", restaurantId);

      if (updateError) {
        setConfigStatus({
          type: "error",
          message: updateError.message || "Error al guardar la configuración.",
        });
      } else {
        setConfigStatus({
          type: "success",
          message: "¡Configuración de local guardada exitosamente!",
        });
        if (refresh) await refresh();
      }
    } catch (err: unknown) {
      setConfigStatus({
        type: "error",
        message: errorMessage(err) || "Ocurrió un error inesperado al guardar.",
      });
    } finally {
      setConfigLoading(false);
    }
  };

  // Fase 6: guardar/regenerar PIN de cocina vía RPC (hashea server-side).
  const handleSaveKitchenPin = async () => {
    if (!restaurantId) return;
    if (kitchenPin.length < 4) {
      setConfigStatus({
        type: "error",
        message: "El PIN de cocina debe tener al menos 4 caracteres.",
      });
      return;
    }
    setKitchenPinLoading(true);
    const { error } = await saveKitchenPinRpc(restaurantId, kitchenPin);
    setKitchenPinLoading(false);
    if (error) {
      setConfigStatus({ type: "error", message: error.message });
      return;
    }
    setKitchenPinSaved(true);
    setKitchenPin("");
    setConfigStatus({
      type: "success",
      message: "PIN de cocina guardado. Ya puedes usar el monitor público en /kds/" +
        restaurant?.slug,
    });
  };

  const downloadQRCode = () => {
    if (!restaurant) return;

    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");

      const downloadLink = document.createElement("a");
      downloadLink.download = `codigo-qr-${restaurant.slug}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  if (loading) {
    return <Loading text="Cargando configuración..." />;
  }

  if (profile?.role !== "admin" && (error || !restaurant)) {
    return <Alert type="error" message={error || "Restaurante no encontrado"} />;
  }

  const menuUrl = restaurant ? `${window.location.origin}/menu/${restaurant.slug}` : "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-text mb-2">Configuración</h2>
        <p className="text-text-secondary">
          Administra tu perfil, código QR de menú digital y seguridad
        </p>
      </div>

      {/* QR Code Section */}
      {profile?.role === "admin" ? (
        <Card>
          <div className="flex items-start space-x-3">
            <QrCodeIcon className="w-6 h-6 text-zinc-500" />
            <div>
              <h3 className="text-xl font-bold text-text">Cuenta de Administrador Global</h3>
              <p className="text-text-secondary text-sm mt-1">
                Has iniciado sesión como administrador SaaS global de la plataforma CMOR FLOW. Las configuraciones de local, códigos QR de mesas y menú de clientes no aplican a tu tipo de cuenta.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        restaurant && (
          <Card>
            <div className="flex items-start space-x-3 mb-4">
              <QrCodeIcon className="w-6 h-6 text-accent" />
              <div>
                <h3 className="text-xl font-bold text-text">Código QR del Menú</h3>
                <p className="text-text-secondary text-sm">
                  Tus clientes pueden escanear este código con su teléfono para ver tu menú en tiempo real
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* QR Code Display */}
              <div className="flex flex-col items-center space-y-4">
                <div className="bg-white p-6 rounded-lg shadow-md border border-border">
                  <QRCodeSVG
                    id="qr-code-svg"
                    value={menuUrl}
                    size={256}
                    level="H"
                    includeMargin={true}
                  />
                </div>

                <Button
                  icon={<Download className="w-5 h-5" />}
                  onClick={downloadQRCode}
                  fullWidth
                >
                  Descargar Código QR (PNG)
                </Button>
              </div>

              {/* QR Code Info */}
              <div className="space-y-4">
                <div>
                  <label className="label mb-2">ID del Restaurante</label>
                  <div className="p-3 bg-bg-subtle rounded-lg flex items-center justify-between text-text font-mono text-sm border border-border">
                    <span className="truncate select-all">{restaurant.id}</span>
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className="text-accent hover:text-accent-secondary p-1 rounded hover:bg-bg-subtle transition-colors ml-2"
                      title="Copiar ID"
                    >
                      {copiedId ? (
                        <Check className="w-4 h-4 text-success animate-pulse" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="label mb-2">Nombre del Local</label>
                  <div className="p-3 bg-bg-subtle rounded-lg text-text font-medium">
                    {restaurant.name}
                  </div>
                </div>

                <div>
                  <label className="label mb-2">Enlace Directo del Menú</label>
                  <div className="p-3 bg-bg-subtle rounded-lg break-all text-text-secondary text-sm">
                    {menuUrl}
                  </div>
                  <a
                    href={menuUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 text-accent hover:text-accent-secondary mt-2 text-sm font-semibold"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Abrir menú digital</span>
                  </a>
                </div>

                <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
                  <h4 className="font-semibold text-text mb-2">¿Cómo utilizarlo?:</h4>
                  <ol className="space-y-2 text-text-secondary text-sm">
                    <li>1. Descarga la imagen de tu código QR.</li>
                    <li>2. Imprímelo y colócalo en las mesas, barras o en la entrada de tu local.</li>
                    <li>3. Los comensales lo escanean directamente con la cámara de sus celulares.</li>
                    <li>4. Podrán pedir de forma instantánea sin descargar aplicaciones.</li>
                  </ol>
                </div>

                <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                  <p className="text-success text-sm">
                    ✓ Cualquier cambio en los platos del menú se actualiza al instante.
                  </p>
                  <p className="text-success text-sm">
                    ✓ No requiere descargas ni registros para tus clientes.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )
      )}

      {/* Change Password Card */}
      <Card>
        <div className="flex items-start space-x-3 mb-4">
          <Lock className="w-6 h-6 text-accent" />
          <div>
            <h3 className="text-xl font-bold text-text">Cambiar Contraseña</h3>
            <p className="text-text-secondary text-sm">
              Actualiza la contraseña de tu cuenta para mantener tu acceso seguro
            </p>
          </div>
        </div>

        {passwordStatus && (
          <Alert
            type={passwordStatus.type}
            message={passwordStatus.message}
            className={
              passwordStatus.type === "success"
                ? "bg-emerald-950/40 border-emerald-800/50 text-emerald-200 mb-4"
                : "bg-red-950/40 border-red-800/50 text-red-200 mb-4"
            }
          />
        )}

        <form onSubmit={handleRequestPasswordReset} className="space-y-4 max-w-md">
          <div className="p-3.5 bg-bg-subtle border border-border rounded-xl text-sm text-text-secondary">
            <span className="font-semibold text-text">Correo de la cuenta:</span>{" "}
            <span className="font-mono text-xs">{user?.email || "Cargando..."}</span>
          </div>

          <Button
            type="submit"
            loading={passwordLoading}
            className="bg-red-650 hover:bg-red-750 text-white font-bold border-0 shadow-lg shadow-red-900/20 active:scale-[0.98]"
          >
            Enviar Enlace de Validación al Correo
          </Button>
        </form>
      </Card>

      {/* Soporte Tecnico (Pro Plan) */}
      <Card>
        <div className="flex items-start space-x-3 mb-4">
          <LifeBuoy className="w-6 h-6 text-accent" />
          <div>
            <h3 className="text-xl font-bold text-text">Soporte Técnico Especializado</h3>
            <p className="text-text-secondary text-sm">
              Tu suscripción incluye soporte de primera línea con el equipo de **CMOR FLOW**.
            </p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <a href={`mailto:${PUBLIC_CONTACTS.supportEmail}`} className="block w-full">
            <Button variant="outline" fullWidth>
              Enviar Email a Soporte
            </Button>
          </a>
          {PUBLIC_CONTACTS.supportWhatsApp && <a href={`https://wa.me/${PUBLIC_CONTACTS.supportWhatsApp}`} target="_blank" rel="noopener noreferrer" className="block w-full">
            <Button variant="secondary" fullWidth>
              WhatsApp Soporte (24/7)
            </Button>
          </a>}
        </div>
      </Card>

      {/* Configuración de Local */}
      {profile?.role !== "admin" && restaurant && (
        <Card>
          <div className="flex items-start space-x-3 mb-4">
            <Globe className="w-6 h-6 text-accent" />
            <div>
              <h3 className="text-xl font-bold text-text">Configuración del Local</h3>
              <p className="text-text-secondary text-sm">
                Ajusta las preferencias de moneda, idioma de la carta y tiempos límites de cocina.
              </p>
            </div>
          </div>

          {configStatus && (
            <Alert
              type={configStatus.type}
              message={configStatus.message}
              className={
                configStatus.type === "success"
                  ? "bg-emerald-950/40 border-emerald-800/50 text-emerald-200 mb-4"
                  : "bg-red-950/40 border-red-800/50 text-red-200 mb-4"
              }
            />
          )}

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label mb-2">País</label>
                <select
                  value={configData.country}
                  onChange={(e) => {
                    const country = e.target.value as CountryCode;
                    const regional = getRegionalConfig(country);
                    // El país es la fuente de verdad: re-siembra moneda,
                    // tasa sugerida e idioma de la carta. El dueño puede
                    // ajustar la tasa/idioma después (config efectiva en BD).
                    setConfigData((prev) => ({
                      ...prev,
                      country,
                      currency: regional.currency,
                      taxRate: regional.suggestedTaxRate !== null ? Math.round(regional.suggestedTaxRate * 100) : prev.taxRate,
                      defaultLanguage: country === "BR" ? "pt" : "es",
                    }));
                  }}
                  className="input w-full bg-bg border border-border text-text rounded-lg p-2.5"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c} value={c}>
                      {REGIONAL_CONFIG[c].label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-text-secondary mt-1">
                  Define la moneda, el impuesto sugerido y los idiomas de la carta.
                </p>
              </div>

              <div>
                <label className="label mb-2">Moneda Principal</label>
                <select
                  value={configData.currency}
                  onChange={(e) => setConfigData({ ...configData, currency: e.target.value })}
                  className="input w-full bg-bg border border-border text-text rounded-lg p-2.5"
                >
                  {configData.country === "CL" ? (
                    <>
                      <option value="CLP">Pesos Chilenos (CLP)</option>
                      <option value="USD">Dólares Americanos (USD)</option>
                    </>
                  ) : (
                    <option value={getRegionalConfig(configData.country).currency}>
                      {getRegionalConfig(configData.country).currency} ({getRegionalConfig(configData.country).currencySymbol})
                    </option>
                  )}
                </select>
                {configData.country !== "CL" && (
                  <p className="text-xs text-text-secondary mt-1">
                    La moneda está determinada por el país.
                  </p>
                )}
              </div>

              {configData.country === "CL" && (
                <div>
                  <Input
                    label="Tipo de Cambio (1 USD a CLP)"
                    type="number"
                    placeholder="950"
                    value={configData.usdExchangeRate}
                    onChange={(e) => setConfigData({ ...configData, usdExchangeRate: parseFloat(e.target.value) || 0 })}
                    required
                    disabled={configData.currency !== "USD"}
                  />
                </div>
              )}

              <div>
                <label className="label mb-2">Tasa de Impuesto (%)</label>
                <Input
                  type="number"
                  placeholder="19"
                  value={configData.taxRate}
                  onChange={(e) => setConfigData({ ...configData, taxRate: parseFloat(e.target.value) || 0 })}
                  required
                  min={0}
                  max={100}
                />
                <p className="text-xs text-text-secondary mt-1">
                  {(() => {
                    const regional = getRegionalConfig(configData.country);
                    if (regional.suggestedTaxRate === null) {
                      return "Sin valor sugerido para este país. 0 = no desglosar impuesto; configura el % de tu régimen (p.ej. ISS/ICMS) si lo necesitas.";
                    }
                    return `Valor sugerido para ${regional.label}: ${Math.round(regional.suggestedTaxRate * 100)}% (${regional.taxName}). Ajustable a tu régimen — es configuración inicial, no legislación.`;
                  })()}
                </p>
              </div>

              <div>
                <label className="label mb-2">Idioma Predeterminado de la Carta</label>
                <select
                  value={configData.defaultLanguage}
                  onChange={(e) => setConfigData({ ...configData, defaultLanguage: e.target.value })}
                  className="input w-full bg-bg border border-border text-text rounded-lg p-2.5"
                >
                  {getRegionalConfig(configData.country).languages.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang === "es" ? "Español (ES)" : lang === "en" ? "Inglés (EN)" : "Portugués (PT)"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Input
                  label="Tiempo Límite de Cocina por Defecto (Minutos)"
                  type="number"
                  placeholder="15"
                  value={configData.defaultPrepTime}
                  onChange={(e) => setConfigData({ ...configData, defaultPrepTime: parseInt(e.target.value) || 0 })}
                  required
                  min={1}
                />
              </div>
            </div>

            {/* Propinas (Fase 3) */}
            <div className="pt-4 border-t border-border space-y-3">
              <h4 className="font-semibold text-text">Propinas</h4>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tipsEnabled}
                  onChange={(e) => setTipsEnabled(e.target.checked)}
                  className="w-5 h-5 rounded border-border accent-accent"
                />
                <span className="text-sm text-text">
                  Activar propinas en el flujo de cobro del POS
                </span>
              </label>
              {tipsEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-8">
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">
                      Porcentaje default (%)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={tipsDefaultPct}
                      onChange={(e) => setTipsDefaultPct(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">
                      Porcentajes sugeridos (separados por coma)
                    </label>
                    <Input
                      value={tipsSuggestedPcts.join(", ")}
                      onChange={(e) =>
                        setTipsSuggestedPcts(
                          e.target.value
                            .split(",")
                            .map((s) => Number(s.trim()))
                            .filter((n) => !isNaN(n) && n >= 0 && n <= 100)
                        )
                      }
                      placeholder="10, 15, 20"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Cocina / KDS público (Fase 6) */}
            <div className="pt-4 border-t border-border space-y-3">
              <h4 className="font-semibold text-text flex items-center gap-2">
                <ChefHat className="w-4 h-4 text-accent" /> Monitor de Cocina (KDS)
              </h4>
              <p className="text-sm text-text-secondary">
                Configura un PIN para que la cocina use el monitor público en una
                pantalla dedicada (
                <a
                  href={`/kds/${restaurant?.slug || ""}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent underline"
                >
                  /kds/{restaurant?.slug}
                </a>
                ). El PIN se guarda hasheado y nunca se almacena en claro.
              </p>

              {kitchenPinSaved && (
                <Alert
                  type="success"
                  message="PIN de cocina configurado. Puedes regenerarlo cuando quieras."
                />
              )}

              <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-text mb-1">
                    {kitchenPinSaved ? "Nuevo PIN de cocina" : "PIN de cocina"}
                  </label>
                  <Input
                    type="password"
                    value={kitchenPin}
                    onChange={(e) => setKitchenPin(e.target.value)}
                    placeholder="Mínimo 4 dígitos"
                    autoComplete="new-password"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleSaveKitchenPin}
                  loading={kitchenPinLoading}
                  disabled={kitchenPin.length < 4}
                >
                  {kitchenPinSaved ? "Regenerar PIN" : "Guardar PIN"}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              loading={configLoading}
              className="bg-accent hover:bg-accent/90 text-white font-bold px-6 border-0 shadow-md transition-all active:scale-[0.98]"
            >
              Guardar Configuración
            </Button>
          </form>
        </Card>
      )}

      {/* Suscripción y Facturación */}
      {profile?.role !== "admin" && restaurant && (
        <Card>
          <div className="flex items-start space-x-3 mb-4">
            <CreditCard className="w-6 h-6 text-accent" />
            <div>
              <h3 className="text-xl font-bold text-text">Suscripción y Facturación</h3>
              <p className="text-text-secondary text-sm">
                Gestiona tu plan actual, revisa el estado de tu período de prueba y sube de plan.
              </p>
            </div>
          </div>

          {billingStatus && (
            <Alert
              type={billingStatus.type}
              message={billingStatus.message}
              className={
                billingStatus.type === "success"
                  ? "bg-emerald-950/40 border-emerald-800/50 text-emerald-200 mb-4"
                  : "bg-red-950/40 border-red-800/50 text-red-200 mb-4"
              }
            />
          )}

          {/* Estado del plan actual */}
          <div className="p-4 rounded-xl border border-border bg-bg-subtle mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary font-medium">Plan actual:</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border uppercase ${
                  restaurant.subscription_plan === "free_trial"
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    : "bg-success/10 text-success border-success/20"
                }`}>
                  {restaurant.subscription_plan === "free_trial" ? "Prueba Gratuita" : restaurant.subscription_plan}
                </span>
              </div>
              {restaurant.subscription_plan === "free_trial" && (
                <div className="flex items-center gap-1 text-sm text-text-secondary mt-1">
                  <Hourglass className="w-4 h-4 text-amber-500" />
                  <span>
                    Te quedan{" "}
                    <strong className="text-text font-bold">
                      {getTrialDaysLeft(restaurant.trial_ends_at)} días
                    </strong>{" "}
                    de prueba.
                  </span>
                </div>
              )}
            </div>
            
            {restaurant.subscription_plan === "free_trial" && getTrialDaysLeft(restaurant.trial_ends_at) === 0 && (
              <div className="bg-error/10 border border-error/20 rounded-lg p-3 text-error text-xs max-w-md">
                ⚠️ **Prueba Expirada:** Tu período de prueba ha terminado. El POS de ventas y el Menú digital se encuentran bloqueados para pedidos de clientes. Contrata un plan a continuación.
              </div>
            )}
          </div>

          {/* Selector de Planes de Pago */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h4 className="font-semibold text-text text-md">Planes de Suscripción Disponibles:</h4>
              
              {/* Toggle Mensual/Anual */}
              <div className="flex items-center gap-3 bg-bg-subtle p-1.5 rounded-lg border border-border">
                <span className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${billingPeriod === "monthly" ? "bg-red-500 text-white" : "text-text-secondary"}`}>
                  Mensual
                </span>
                <button
                  type="button"
                  onClick={() => setBillingPeriod(billingPeriod === "monthly" ? "annual" : "monthly")}
                  className="relative w-10 h-6 bg-zinc-800 border border-border rounded-full p-1 flex items-center transition-colors"
                  aria-label="Alternar facturación"
                >
                  <div className={`w-4 h-4 rounded-full transition-all duration-300 transform ${billingPeriod === "annual" ? "translate-x-4 bg-amber-500" : "translate-x-0 bg-red-500"}`} />
                </button>
                <span className={`text-xs font-semibold px-2 py-1 rounded flex items-center gap-1 transition-colors ${billingPeriod === "annual" ? "bg-amber-500/10 text-amber-500" : "text-text-secondary"}`}>
                  Anual
                  <span className="text-[10px] bg-amber-500/20 text-amber-500 px-1 py-0.5 rounded font-black">
                    -15%
                  </span>
                </span>
              </div>
            </div>

             <div className="grid md:grid-cols-2 gap-4">
              {Object.entries(APP_CONFIG.plans)
                .filter(([key]) => key !== "free_trial" && key !== "test_plan")
                .map(([key, p]) => {
                  const isSelected = selectedPlan === key;
                  const isCurrent = restaurant.subscription_plan === key;

                  // Precios según el país (CL = valores exactos de config.ts).
                  const countryPrices = getPlanPrices(configData.country)[key as PlanId];

                  // Calcular precios dinámicos según el periodo seleccionado.
                  // Las ofertas de pago único no deben mostrarse como
                  // mensuales ni intentar leer un precio anual inexistente.
                  const isOneTime = p.billing_type === "one_time";
                  let displayPriceCLP = countryPrices.price;
                  let displayPriceUSD = ("price_usd" in p ? p.price_usd : 0) || 0;
                  let billingLabel = isOneTime ? ` ${p.duration || "pago único"}` : " / mes";
                  let yearlyTotalLabel = "";

                  if (!isOneTime && billingPeriod === "annual" && typeof countryPrices.price_annual === "number") {
                    displayPriceCLP = Math.round(countryPrices.price_annual / 12);
                    displayPriceUSD = (("price_annual_usd" in p ? p.price_annual_usd : 0) || 0) / 12;
                    billingLabel = " / mes (eq.)";
                    yearlyTotalLabel = `Facturado anualmente: ${formatCurrency(countryPrices.price_annual, configData.currency)} / año`;
                  }

                  const priceCLP = `${formatCurrency(displayPriceCLP, configData.currency)}${billingLabel}`;
                  const priceUSD = `$${displayPriceUSD.toFixed(2)}${billingLabel}`;

                  return (
                    <div
                      key={key}
                      onClick={() => !isCurrent && setSelectedPlan(key)}
                      className={`border-2 rounded-xl p-4 flex flex-col justify-between cursor-pointer transition-all duration-200 ${
                        isCurrent
                          ? "border-success bg-success/5 cursor-default"
                          : isSelected
                          ? "border-accent bg-accent/5 shadow-md shadow-accent/5"
                          : "border-border hover:border-accent/40"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-text">{p.name}</span>
                          {isCurrent && (
                            <span className="text-[10px] bg-success text-white px-2 py-0.5 rounded-full font-bold">
                              Activo
                            </span>
                          )}
                        </div>
                        <div className="text-xl font-extrabold text-accent">
                          {configData.currency === "USD" ? priceUSD : priceCLP}
                        </div>
                        {yearlyTotalLabel && (
                          <div className="text-[10px] text-amber-500 font-semibold mt-1">
                            {yearlyTotalLabel}
                          </div>
                        )}
                        <ul className="space-y-1.5 text-xs text-text-secondary mt-3">
                          {p.features.map((f, i) => (
                            <li key={i} className="flex items-center gap-1">
                              ✓ {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Checkout real vía Flow.cl para el plan seleccionado.
                Fuera de Chile aún no hay pasarela online (Fase 1): la
                activación se coordina manualmente con el equipo. */}
            {selectedPlan && isFlowCountry(configData.country) && (
              <div className="bg-bg-subtle p-6 rounded-xl border border-border mt-6 space-y-4 max-w-md animate-fadeIn">
                <div className="flex items-center gap-2 mb-2 border-b border-border pb-3">
                  <CreditCard className="w-5 h-5 text-accent" />
                  <h5 className="font-bold text-text">
                    {selectedPlan === "lifetime"
                      ? "Plan Vitalicio — pago único"
                      : "Suscripción con tarjeta vía Flow"}
                  </h5>
                </div>
                {selectedPlan === "lifetime" ? (
                  <p className="text-sm text-text-secondary">
                    El plan Vitalicio se contrata con pago único. Te contactaremos para coordinar
                    el pago, o escríbenos a{" "}
                    <a className="text-accent underline" href={`mailto:${PUBLIC_CONTACTS.salesEmail}`}>
                      {PUBLIC_CONTACTS.salesEmail}
                    </a>
                    .
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-text-secondary">
                      Serás redirigido a Flow.cl para vincular tu tarjeta de forma segura. El cobro
                      es {billingPeriod === "annual" ? "anual" : "mensual"} y puedes cancelarlo
                      cuando quieras desde la página de Suscripción.
                    </p>
                    {(billingError || billingStatus?.type === "error") && (
                      <Alert
                        type="error"
                        message={billingError || billingStatus?.message}
                      />
                    )}
                    <div className="pt-2 flex gap-3">
                      <Button
                        type="button"
                        loading={billingLoading}
                        onClick={() => handleSubscribeToPlan(selectedPlan)}
                        className="bg-success hover:bg-success-dark text-white font-bold border-0 shadow-lg active:scale-[0.98]"
                      >
                        Suscribirme con tarjeta
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setSelectedPlan(null);
                          setBillingStatus(null);
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {selectedPlan && !isFlowCountry(configData.country) && (
              <div className="bg-bg-subtle p-6 rounded-xl border border-border mt-6 space-y-4 max-w-md animate-fadeIn">
                <div className="flex items-center gap-2 mb-2 border-b border-border pb-3">
                  <CreditCard className="w-5 h-5 text-accent" />
                  <h5 className="font-bold text-text">
                    {isMpCountry(configData.country)
                      ? "Pago con Mercado Pago"
                      : "Activación asistida"}
                  </h5>
                </div>
                {isMpCountry(configData.country) ? (
                  <p className="text-sm text-text-secondary">
                    El pago del plan{" "}
                    <span className="font-semibold text-text">{APP_CONFIG.plans[selectedPlan as PlanId]?.name}</span>{" "}
                    con Mercado Pago (PIX/tarjeta) se coordina contigo en tu primer
                    pago: escríbenos a{" "}
                    <a className="text-accent underline" href={`mailto:${PUBLIC_CONTACTS.salesEmail}`}>{PUBLIC_CONTACTS.salesEmail}</a>{" "}
                    y te enviamos el link de cobro en tu moneda local.
                  </p>
                ) : (
                  <p className="text-sm text-text-secondary">
                    En {getRegionalConfig(configData.country).label} todavía no ofrecemos pago
                    en línea con tarjeta. Coordinaremos la activación del plan{" "}
                    <span className="font-semibold text-text">{APP_CONFIG.plans[selectedPlan as PlanId]?.name}</span>{" "}
                    contigo: escríbenos a{" "}
                    <a className="text-accent underline" href={`mailto:${PUBLIC_CONTACTS.salesEmail}`}>
                      {PUBLIC_CONTACTS.salesEmail}
                    </a>{" "}
                    o al WhatsApp de soporte y lo activamos manualmente.
                  </p>
                )}
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSelectedPlan(null);
                      setBillingStatus(null);
                    }}
                  >
                    Cerrar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default RestaurantSettings;
