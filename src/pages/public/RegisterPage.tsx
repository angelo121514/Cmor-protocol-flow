import { PUBLIC_CONTACTS } from "../../config/publicContacts";
import { errorMessage } from "../../../shared/errors";
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowLeft, 
  CheckCircle, 
  Sparkles, 
  Lock, 
  ShieldCheck, 
  Zap, 
  Check
} from "lucide-react";
import {
  Button,
  Input,
  Select,
  Textarea,
  Alert,
} from "../../components/ui";
import { APP_CONFIG, type PlanId } from "../../config/config";
import {
  COUNTRY_CODES,
  REGIONAL_CONFIG,
  getPlanPrices,
  getRegionalConfig,
  isFlowCountry,
  isMpCountry,
  type CountryCode,
} from "../../config/regional";
import { supabase } from "../../config/supabase";
import { isValidEmail, isValidPhone, formatCurrency } from "../../utils/helpers";
import { startMpSubscription } from "../../services/mpService";
import { CmorFlowLogo } from "../../components/CmorFlowLogo";
import { WhatsAppButton } from "../../components/WhatsAppButton";

interface FormData {
  restaurant_name: string;
  owner_name: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  restaurant_type: string;
  heard_from: string;
  notes: string;
}

const RegisterPage: React.FC = () => {
  const [step, setStep] = useState<"form" | "payment" | "success" | "mp_pending">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isGoogleSignUp, setIsGoogleSignUp] = useState(false);

  // PaÃ­s del restaurante (multi-paÃ­s): inicializado desde ?country= (landing)
  // o CL por defecto. El usuario puede cambiarlo en el formulario.
  const requestedCountry = new URLSearchParams(window.location.search).get("country");
  const initialCountry: CountryCode =
    requestedCountry === "BR" || requestedCountry === "BO" || requestedCountry === "PE"
      ? requestedCountry
      : "CL";
  const [country, setCountry] = useState<CountryCode>(initialCountry);

  // Pago Mercado Pago en curso (Fase 2): datos PIX/ticket
  const [mpPayment, setMpPayment] = useState<{
    pixQrBase64: string | null;
    pixQrCode: string | null;
    ticketUrl: string | null;
    paymentId: string | null;
  } | null>(null);
  // True cuando MP no estÃ¡ configurado y la activaciÃ³n quedÃ³ asistida
  const [mpAssisted, setMpAssisted] = useState(false);

  // Registration data
  const [createdRequestId, setCreatedRequestId] = useState("");
  const [formData, setFormData] = useState<FormData>({
    restaurant_name: "",
    owner_name: "",
    phone: "",
    email: "",
    city: "",
    address: "",
    restaurant_type: "",
    heard_from: "",
    notes: "",
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});

  // Payment states
  const requestedPlan = new URLSearchParams(window.location.search).get("plan");
  const initialPlan: PlanId = requestedPlan === "free_trial" || requestedPlan === "starter" || requestedPlan === "pro" || requestedPlan === "lifetime"
    ? requestedPlan
    : "free_trial";
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(initialPlan);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const selectedPlanDetails = APP_CONFIG.plans[selectedPlan];
  const selectedPlanOffer = "offer_label" in selectedPlanDetails
    ? selectedPlanDetails.offer_label
    : undefined;
  // Precios en la moneda del paÃ­s elegido (multi-paÃ­s)
  const countryPrices = getPlanPrices(country);
  const regional = getRegionalConfig(country);
  const price = (plan: PlanId, field: "price" | "original_price" = "price") =>
    formatCurrency(countryPrices[plan][field] ?? 0, regional.currency);


  useEffect(() => {
    const checkGoogleSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session;
        if (session?.user) {
          // Check if they already have a profile with a restaurant
          const { data: profile } = await supabase
            .from("profiles")
            .select("restaurant_id")
            .eq("id", session.user.id)
            .single();

          if (profile?.restaurant_id) {
            // Already registered and linked! Redirect to dashboard
            window.location.href = "/restaurant";
            return;
          }

          // Not linked to any restaurant yet. Pre-fill their profile info!
          setIsGoogleSignUp(true);
          setFormData((prev) => ({
            ...prev,
            email: session.user.email || "",
            owner_name: session.user.user_metadata?.full_name || prev.owner_name,
          }));
        }
      } catch (err) {
        console.error("Error checking Google session:", err);
      }
    };
    checkGoogleSession();
  }, []);

  const handleGoogleRegister = async () => {
    setError("");
    setLoading(true);
    try {
      const { error: oAuthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/register",
        },
      });

      if (oAuthError) {
        console.error("Google register error:", oAuthError);
        setError(`Error al iniciar registro con Google: ${oAuthError.message}`);
        setLoading(false);
      }
    } catch (err: unknown) {
      console.error("Catch Google register error:", err);
      setError(`Error al conectar con Google: ${errorMessage(err) || err}`);
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.restaurant_name.trim()) {
      newErrors.restaurant_name = "El nombre del restaurante es obligatorio";
    }

    if (!formData.owner_name.trim()) {
      newErrors.owner_name = "El nombre del dueÃ±o es obligatorio";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "El nÃºmero de telÃ©fono es obligatorio";
    } else if (!isValidPhone(formData.phone, country)) {
      newErrors.phone = "Por favor ingresa un nÃºmero de telÃ©fono vÃ¡lido";
    }

    if (!formData.email.trim()) {
      newErrors.email = "El correo electrÃ³nico es obligatorio";
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = "Por favor ingresa un correo electrÃ³nico vÃ¡lido";
    }

    if (!formData.city.trim()) {
      newErrors.city = "La ciudad es obligatoria";
    }

    if (!formData.restaurant_type) {
      newErrors.restaurant_type = "El tipo de restaurante es obligatorio";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const requestId = crypto.randomUUID();
      const { error: insertError } = await supabase
        .from("registration_requests")
        .insert([
          {
            id: requestId,
            restaurant_name: formData.restaurant_name.trim(),
            owner_name: formData.owner_name.trim(),
            phone: formData.phone.replace(/[\s\-()]/g, ""),
            email: formData.email.trim() || null,
            city: formData.city.trim(),
            address: formData.address.trim() || null,
            restaurant_type: formData.restaurant_type,
            heard_from: formData.heard_from || null,
            notes: formData.notes?.trim() || null,
            status: "pending",
            country,
          },
        ]);

      if (insertError) {
        throw insertError;
      }

      setCreatedRequestId(requestId);
      setStep("payment");
    } catch (err: unknown) {
      console.error("Error de registro:", err);
      setError(
        errorMessage(err) || "No se pudo enviar el registro. Por favor, intenta de nuevo."
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError("");
    setPaymentLoading(true);

    try {
      if (selectedPlan === "free_trial") {
        // La activaciÃ³n gratuita y el envÃ­o de invitaciÃ³n se resuelven en el
        // servidor. El navegador no recibe permisos ni una contraseÃ±a.
        const { data, error: activationError } = await supabase.functions.invoke("activate-trial-registration", {
          body: { registration_request_id: createdRequestId },
        });

        if (activationError || !data?.success) {
          throw new Error(data?.error || "No se pudo activar la prueba gratuita");
        }

        setStep("success");
      } else if (isMpCountry(country)) {
        // Mercado Pago (Fase 2): PIX en Brasil, tarjeta en PerÃº. El backend
        // responde 503 not_configured si el secret aÃºn no existe â†’ mensaje
        // de activaciÃ³n asistida.
        const result = await startMpSubscription(createdRequestId, selectedPlan);
        if (!result.success) {
          if (result.error?.includes("no estÃ¡ configurado")) {
            setMpAssisted(true);
            setStep("success");
            return;
          }
          throw new Error(result.error || "No se pudo iniciar el pago con Mercado Pago.");
        }
        setMpPayment({
          pixQrBase64: result.pix_qr_base64 || null,
          pixQrCode: result.pix_qr_code || null,
          ticketUrl: result.url || null,
          paymentId: result.payment_id || null,
        });
        setStep("mp_pending");
      } else if (!isFlowCountry(country)) {
        // Bolivia (sin pasarela online): la solicitud queda registrada y el
        // equipo coordina la activaciÃ³n manualmente.
        setStep("success");
      } else {
        // Flujo de pago (Starter, Pro o licencia de por vida): IntegraciÃ³n con Flow.cl
        console.log("Iniciando pago con Flow para el plan:", selectedPlan);
        const { data, error: funcError } = await supabase.functions.invoke("flow-checkout", {
          body: {
            registration_request_id: createdRequestId,
            plan: selectedPlan,
            origin: window.location.origin,
          },
        });

        if (funcError) {
          console.error("Error al invocar flow-checkout:", funcError);
          throw new Error("No se pudo iniciar la transacciÃ³n de pago con Flow. Por favor, intenta de nuevo.");
        }

        if (!data || !data.success) {
          console.error("Respuesta fallida de flow-checkout:", data);
          throw new Error(data?.error || "Error al generar la transacciÃ³n con Flow.");
        }

        // Redirigir al portal de Flow de forma segura vÃ­a POST
        console.log("Redirigiendo a Flow:", data.url);
        const form = document.createElement("form");
        form.method = "POST";
        form.action = data.url;

        const tokenInput = document.createElement("input");
        tokenInput.type = "hidden";
        tokenInput.name = "token";
        tokenInput.value = data.token;

        form.appendChild(tokenInput);
        document.body.appendChild(form);
        form.submit();
      }
    } catch (err: unknown) {
      console.error("Payment error:", err);
      setPaymentError(errorMessage(err) || "Error al procesar el pago. Por favor intenta de nuevo.");
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // ==========================================
  // STEP 2.5: MERCADO PAGO â€” PIX / ticket pendiente (BR/PE)
  // ==========================================
  if (step === "mp_pending" && mpPayment) {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center px-4 relative overflow-hidden font-sans">
        <div className="max-w-lg w-full text-center flex flex-col items-center bg-bg-subtle/90 backdrop-blur-md border border-border p-8 rounded-2xl shadow-2xl relative z-10 space-y-6">
          <h1 className="text-2xl font-extrabold text-text tracking-tight">
            Completa tu pago
          </h1>
          <p className="text-text-secondary text-sm text-center">
            Plan <strong className="text-text">{selectedPlanDetails.name}</strong> Â·{" "}
            {price(selectedPlan)} ({regional.currency})
          </p>

          {mpPayment.pixQrBase64 ? (
            <>
              <img
                src={`data:image/png;base64,${mpPayment.pixQrBase64}`}
                alt="QR de pago PIX"
                className="w-64 h-64 rounded-lg border border-border"
              />
              <p className="text-xs text-text-secondary text-center">
                Escanea con la app de tu banco (PIX). Tu cuenta se activa
                automÃ¡ticamente al confirmarse el pago.
              </p>
            </>
          ) : mpPayment.ticketUrl ? (
            <Button
              onClick={() => window.open(mpPayment.ticketUrl!, "_blank")}
              size="lg"
              className="bg-red-600 hover:bg-red-700 text-white font-bold border-0"
            >
              Ir a la pÃ¡gina de pago
            </Button>
          ) : null}

          <p className="text-xs text-text-secondary">
            Â¿Problemas para pagar? EscrÃ­benos a{" "}
            <a className="text-accent underline" href={`mailto:${PUBLIC_CONTACTS.salesEmail}`}>{PUBLIC_CONTACTS.salesEmail}</a>
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // STEP 3: SUCCESS SCREEN
  // ==========================================
  if (step === "success") {
    const isTrial = selectedPlan === "free_trial";
    // MP no configurado aÃºn: la solicitud queda pendiente de activaciÃ³n
    // asistida (no hubo pago); el mensaje debe reflejarlo.
    const assisted = mpAssisted;

    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center px-4 relative overflow-hidden font-sans transition-colors duration-200">
        <div className="absolute top-24 left-1/4 w-96 h-96 bg-red-600/10 rounded-full filter blur-[100px] pointer-events-none z-0" />
        <div className="absolute bottom-24 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full filter blur-[100px] pointer-events-none z-0" />

        <div className="max-w-lg w-full text-center flex flex-col items-center bg-bg-subtle/90 backdrop-blur-md border border-border p-8 rounded-2xl shadow-2xl relative z-10 space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/25 mb-2 animate-bounce">
            <CheckCircle className="w-12 h-12 text-emerald-500" />
          </div>
          
          <h1 className="text-2xl font-extrabold text-text tracking-tight">
            {isTrial ? "Â¡Prueba activada!" : assisted ? "Â¡Solicitud recibida!" : "Â¡Pago confirmado!"}
          </h1>
          
          <p className="text-text-secondary text-sm leading-relaxed">
            Tu restaurante <strong className="text-text">{formData.restaurant_name}</strong> ha sido registrado con Ã©xito.{" "}
            {isTrial
              ? " Tu perÃ­odo de prueba de 14 dÃ­as ha comenzado. "
              : assisted
              ? " Coordinaremos el pago y la activaciÃ³n de tu plan contigo por correo. "
              : " Tu pago fue procesado correctamente. "}
            Te enviaremos un enlace seguro a <strong className="text-text">{formData.email.toLowerCase()}</strong> para crear tu contraseÃ±a.
          </p>

          <div className="w-full bg-red-500/5 border border-red-500/10 rounded-xl p-4 text-xs text-text-secondary leading-relaxed text-left">
            Por seguridad no generamos, mostramos ni enviamos contraseÃ±as. Revisa tambiÃ©n la carpeta de correo no deseado si no ves la invitaciÃ³n en unos minutos.
          </div>

          <div className="w-full pt-2">
            <Button 
              onClick={() => { window.location.href = "/"; }}
              fullWidth
              size="lg"
              className="bg-red-600 hover:bg-red-700 text-white font-bold transition-all border-0 shadow-lg flex items-center justify-center gap-2"
            >
              <span>Volver al inicio</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // STEP 2: SELECT PLAN & ONLINE CHECKOUT
  // ==========================================
  if (step === "payment") {
    const activePlan = APP_CONFIG.plans[selectedPlan as keyof typeof APP_CONFIG.plans];

    return (
      <div className="min-h-screen bg-bg text-text py-12 px-4 relative overflow-hidden font-sans transition-colors duration-200">
        <div className="absolute top-24 left-1/4 w-96 h-96 bg-red-600/10 rounded-full filter blur-[100px] pointer-events-none z-0" />
        <div className="absolute top-1/2 right-1/4 w-[500px] h-[500px] bg-amber-500/5 rounded-full filter blur-[120px] pointer-events-none z-0" />

        <div className="max-w-3xl mx-auto relative z-10 space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <CmorFlowLogo size="md" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-text tracking-tight">
              Paso 2: Activa tu Plan de SuscripciÃ³n
            </h1>
            <p className="text-text-secondary text-sm max-w-lg mx-auto">
              EstÃ¡s registrando <strong className="text-text">{formData.restaurant_name}</strong>. Elige el plan que mejor se adapte a tu local y activa tu cuenta de forma instantÃ¡nea.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Plan selector cards */}
            {/* Free Trial */}
            <div 
              onClick={() => setSelectedPlan("free_trial")}
              className={`border cursor-pointer rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 ${
                selectedPlan === "free_trial" 
                  ? "bg-bg-subtle border-red-600 shadow-lg scale-[1.02]" 
                  : "bg-bg-subtle/40 border-border opacity-80 hover:opacity-100 hover:border-text-secondary"
              }`}
            >
              <div>
                <h3 className="font-bold text-lg text-text">Prueba gratuita</h3>
                <p className="text-xs text-text-secondary mt-1">14 dÃ­as para conocer la plataforma</p>
                <div className="my-4">
                  <span className="text-2xl font-black text-text">{price("free_trial")}</span>
                  <span className="text-xs text-text-secondary font-medium"> por 14 dÃ­as</span>
                </div>
                <ul className="text-xs text-text-secondary space-y-2 border-t border-border/50 pt-3">
                  <li className="flex items-center"><Check className="w-3 h-3 text-red-500 mr-1.5" /> 50 pedidos/mes</li>
                  <li className="flex items-center"><Check className="w-3 h-3 text-red-500 mr-1.5" /> MenÃº QR bÃ¡sico</li>
                </ul>
              </div>
              <div className="mt-4 flex items-center justify-center">
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedPlan === "free_trial" ? "border-red-600" : "border-border"}`}>
                  {selectedPlan === "free_trial" && <div className="w-2.5 h-2.5 rounded-full bg-red-600" />}
                </div>
              </div>
            </div>

            {/* BÃ¡sico */}
            <div 
              onClick={() => setSelectedPlan("starter")}
              className={`border cursor-pointer rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 ${
                selectedPlan === "starter" 
                  ? "bg-bg-subtle border-red-600 shadow-lg scale-[1.02]" 
                  : "bg-bg-subtle/40 border-border opacity-80 hover:opacity-100 hover:border-text-secondary"
              }`}
            >
              <div>
                <h3 className="font-bold text-lg text-text">BÃ¡sico</h3>
                <p className="text-xs text-text-secondary mt-1">Esencial para locales</p>
                <div className="my-4">
                  {APP_CONFIG.plans.starter.original_price && (
                    <span className="text-xs text-text-secondary line-through block opacity-60">
                      {price("starter", "original_price")}
                    </span>
                  )}
                  <span className="text-2xl font-black text-text">{price("starter")}</span>
                  <span className="text-xs text-text-secondary font-medium"> / mes</span>
                  {APP_CONFIG.plans.starter.offer_label && (
                    <span className="text-[10px] text-red-500 font-extrabold block mt-1 animate-pulse uppercase tracking-wider">
                      {APP_CONFIG.plans.starter.offer_label}
                    </span>
                  )}
                </div>
                <ul className="text-xs text-text-secondary space-y-2 border-t border-border/50 pt-3">
                  <li className="flex items-center"><Check className="w-3 h-3 text-red-500 mr-1.5" /> Pedidos ilimitados</li>
                  <li className="flex items-center"><Check className="w-3 h-3 text-red-500 mr-1.5" /> MenÃº digital QR</li>
                  <li className="flex items-center"><Check className="w-3 h-3 text-red-500 mr-1.5" /> Soporte WhatsApp</li>
                </ul>
              </div>
              <div className="mt-4 flex items-center justify-center">
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedPlan === "starter" ? "border-red-600" : "border-border"}`}>
                  {selectedPlan === "starter" && <div className="w-2.5 h-2.5 rounded-full bg-red-600" />}
                </div>
              </div>
            </div>

            {/* Pro */}
            <div 
              onClick={() => setSelectedPlan("pro")}
              className={`border cursor-pointer rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 relative ${
                selectedPlan === "pro" 
                  ? "bg-bg-subtle border-red-600 shadow-xl scale-[1.04]" 
                  : "bg-bg-subtle/40 border-border opacity-85 hover:opacity-100 hover:border-text-secondary"
              }`}
            >
              <div className="absolute -top-3 right-4 bg-amber-500 text-bg text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider shadow">
                Recomendado
              </div>
              <div>
                <h3 className="font-bold text-lg text-text flex items-center gap-1.5">
                  Pro <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                </h3>
                <p className="text-xs text-text-secondary mt-1">Multi-sucursal e IA</p>
                <div className="my-4">
                  {APP_CONFIG.plans.pro.original_price && (
                    <span className="text-xs text-text-secondary line-through block opacity-60">
                      {price("pro", "original_price")}
                    </span>
                  )}
                  <span className="text-2xl font-black text-text">{price("pro")}</span>
                  <span className="text-xs text-text-secondary font-medium"> / mes</span>
                  {APP_CONFIG.plans.pro.offer_label && (
                    <span className="text-[10px] text-red-500 font-extrabold block mt-1 animate-pulse uppercase tracking-wider">
                      {APP_CONFIG.plans.pro.offer_label}
                    </span>
                  )}
                </div>
                <ul className="text-xs text-text-secondary space-y-2 border-t border-border/50 pt-3">
                  <li className="flex items-center"><Check className="w-3 h-3 text-red-500 mr-1.5" /> Todo lo del plan BÃ¡sico</li>
                  <li className="flex items-center"><Check className="w-3 h-3 text-red-500 mr-1.5" /> Web con SEO en Google</li>
                  <li className="flex items-center"><Check className="w-3 h-3 text-red-500 mr-1.5" /> Recomendaciones IA</li>
                </ul>
              </div>
              <div className="mt-4 flex items-center justify-center">
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedPlan === "pro" ? "border-red-600" : "border-border"}`}>
                  {selectedPlan === "pro" && <div className="w-2.5 h-2.5 rounded-full bg-red-600" />}
                </div>
              </div>
            </div>

            {/* De por vida */}
            <div
              onClick={() => setSelectedPlan("lifetime")}
              className={`border cursor-pointer rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 relative ${
                selectedPlan === "lifetime"
                  ? "bg-red-950/20 border-red-500 shadow-xl scale-[1.02]"
                  : "bg-bg-subtle/40 border-red-500/40 hover:border-red-500"
              }`}
            >
              <div>
                <h3 className="font-bold text-lg text-text">De por vida</h3>
                <p className="text-xs text-text-secondary mt-1">Una compra. Acceso para siempre.</p>
                <div className="my-4">
                  <span className="text-2xl font-black text-red-500">
                    {price("lifetime")}
                  </span>
                  <span className="text-xs text-text-secondary font-medium"> pago Ãºnico</span>
                </div>
                <ul className="text-xs text-text-secondary space-y-2 border-t border-border/50 pt-3">
                  <li className="flex items-center"><Check className="w-3 h-3 text-red-500 mr-1.5" /> Todo lo del plan Pro</li>
                  <li className="flex items-center"><Check className="w-3 h-3 text-red-500 mr-1.5" /> Actualizaciones incluidas</li>
                  <li className="flex items-center"><Check className="w-3 h-3 text-red-500 mr-1.5" /> Sin mensualidades</li>
                </ul>
              </div>
              <div className="mt-4 flex items-center justify-center">
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedPlan === "lifetime" ? "border-red-600" : "border-border"}`}>
                  {selectedPlan === "lifetime" && <div className="w-2.5 h-2.5 rounded-full bg-red-600" />}
                </div>
              </div>
            </div>
          </div>

          {/* Payment execution area */}
          <div className="bg-bg-subtle border border-border rounded-2xl p-6 sm:p-8 shadow-xl">
            {paymentError && (
              <Alert type="error" message={paymentError} className="mb-6 bg-red-950/40 border-red-800/50 text-red-200" />
            )}

            <form onSubmit={handlePaymentSubmit} className="space-y-6">
              {selectedPlan === "free_trial" ? (
                // Free Trial execution UI
                <div className="space-y-4 text-center py-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 text-red-500 mb-2">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-text text-lg">ActivaciÃ³n de Prueba Gratuita</h3>
                  <p className="text-text-secondary text-sm max-w-md mx-auto">
                    TendrÃ¡s acceso completo al sistema durante 14 dÃ­as para evaluar la plataforma en tu local. No se requiere tarjeta de crÃ©dito.
                  </p>
                  <Button 
                    type="submit" 
                    loading={paymentLoading} 
                    fullWidth 
                    size="lg"
                    className="bg-red-600 hover:bg-red-700 text-white font-bold transition-all border-0 shadow-lg max-w-sm mx-auto"
                  >
                    Activar mi Cuenta Demo
                  </Button>
                </div>
              ) : !isFlowCountry(country) ? (
                // Sin pasarela online fuera de Chile (Fase 1): activaciÃ³n manual
                <div className="space-y-4 text-center py-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 mb-2">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-text text-lg">ActivaciÃ³n asistida</h3>
                  <p className="text-text-secondary text-sm max-w-md mx-auto">
                    En {regional.label} todavÃ­a no ofrecemos pago en lÃ­nea con tarjeta.
                    Al confirmar, tu solicitud queda registrada y coordinaremos la
                    activaciÃ³n del plan <strong className="text-text">{selectedPlanDetails.name}</strong> contigo por correo.
                    Total a pagar: <strong className="text-text">{price(selectedPlan)}</strong>.
                  </p>
                  <Button
                    type="submit"
                    loading={paymentLoading}
                    fullWidth
                    size="lg"
                    className="bg-red-600 hover:bg-red-700 text-white font-bold transition-all border-0 shadow-lg max-w-sm mx-auto"
                  >
                    Enviar solicitud
                  </Button>
                </div>
              ) : (
                // Flow.cl Checkout simulation/redirection UI
                <div className="space-y-6">
                  <div className="border-b border-border pb-3 flex justify-between items-center">
                    <h2 className="text-base font-bold text-text flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                      <span className="text-red-650 font-extrabold tracking-wide">Flow.cl (Webpay, Tarjetas, Servipag)</span>
                    </h2>
                    <span className="text-xs text-text-secondary bg-bg px-2.5 py-1 border border-border rounded-full flex items-center">
                      <Lock className="w-3 h-3 text-emerald-500 mr-1" /> Pasarela Segura Flow
                    </span>
                  </div>

                  <div className="bg-bg border border-border rounded-xl p-5 space-y-4">
                    <div className="flex justify-between items-center text-sm border-b border-border pb-3">
                      <span className="text-text-secondary">Comercio:</span>
                      <strong className="text-text font-bold">Cmor Flow SaaS</strong>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b border-border pb-3">
                      <span className="text-text-secondary">Plan Solicitado:</span>
                      <strong className="text-text uppercase font-semibold">{activePlan?.name}</strong>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b border-border pb-3">
                      <span className="text-text-secondary">Orden de Compra:</span>
                      <span className="font-mono text-text text-xs">{createdRequestId.substring(0, 8).toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between items-center text-lg pt-1">
                      <span className="text-text font-semibold">Total a Pagar:</span>
                      <strong className="text-red-500 font-black text-xl">
                        {price(selectedPlan)}
                      </strong>
                    </div>
                  </div>

                  <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 text-xs text-text-secondary leading-relaxed">
                    {selectedPlan === "lifetime"
                      ? "Este es un pago Ãºnico: no se crearÃ¡n cobros recurrentes ni se te pedirÃ¡ vincular una tarjeta despuÃ©s de la compra."
                      : "SerÃ¡s redirigido a la pasarela de pagos de Flow.cl para realizar la transacciÃ³n de forma segura utilizando Webpay, tarjetas bancarias o Servipag."}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      type="submit"
                      loading={paymentLoading}
                      fullWidth
                      size="lg"
                      className="bg-red-600 hover:bg-red-700 text-white font-bold transition-all border-0 shadow-lg"
                    >
                      Pagar con Flow.cl
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setStep("form");
                      }}
                      variant="outline"
                      fullWidth
                      size="lg"
                      className="border-border hover:bg-bg-subtle text-text"
                    >
                      Volver / Cambiar Plan
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // STEP 1: FORM REGISTER
  // ==========================================
  return (
    <div className="min-h-screen bg-bg text-text py-12 px-4 relative overflow-hidden font-sans transition-colors duration-200">
      {/* Background Blobs */}
      <div className="absolute top-24 left-1/4 w-96 h-96 bg-red-600/10 rounded-full filter blur-[100px] pointer-events-none z-0" />
      <div className="absolute top-1/2 right-1/4 w-[500px] h-[500px] bg-amber-500/5 rounded-full filter blur-[120px] pointer-events-none z-0" />

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center text-text-secondary hover:text-text transition-colors mb-6 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al Inicio
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <CmorFlowLogo size="sm" showText={true} layout="row" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-text tracking-tight">
                Registra tu Restaurante
              </h1>
              <p className="text-text-secondary text-sm mt-1">
                Comienza tu camino digital hoy mismo
              </p>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-bg-subtle/90 backdrop-blur-md border border-border rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 [&_label]:!text-text-secondary [&_input]:!bg-bg [&_input]:!border-border [&_input]:!text-text [&_input]:placeholder-text-secondary focus-within:[&_input]:!ring-red-600 [&_select]:!bg-bg [&_select]:!border-border [&_select]:!text-text focus-within:[&_select]:!ring-red-650 [&_textarea]:!bg-bg [&_textarea]:!border-border [&_textarea]:!text-text focus-within:[&_textarea]:!ring-red-650 transition-colors duration-200">
          {error && <Alert type="error" message={error} className="bg-red-950/40 border-red-800/50 text-red-200" />}

          {isGoogleSignUp ? (
            <div className="bg-emerald-950/40 border border-emerald-800/50 text-emerald-200 rounded-xl p-4 text-sm flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
              <span>
                Autenticado con Google: <strong>{formData.email}</strong>. Completa los datos de tu local para finalizar el registro.
              </span>
            </div>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                fullWidth
                size="lg"
                onClick={handleGoogleRegister}
                loading={loading}
                className="border border-border text-text hover:bg-bg-subtle font-bold flex items-center justify-center transition-all duration-200 bg-bg"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21.35 11.1H12v2.7h5.38c-0.24 1.28-0.96 2.37-2.04 3.1v2.6h3.28c1.92-1.77 3.03-4.37 3.03-7.4 0-.74-.07-1.4-.32-2z" fill="#4285F4" />
                  <path d="M12 20.5c2.3 0 4.23-.76 5.64-2.08l-3.28-2.6c-.9.6-2.06.98-3.36.98-2.58 0-4.78-1.74-5.56-4.07H2.07v2.7c1.45 2.88 4.41 4.87 7.93 4.87z" fill="#34A853" />
                  <path d="M6.44 12.73c-.2-.6-.31-1.24-.31-1.9s.11-1.3.31-1.9V6.23H2.07c-.66 1.32-1.07 2.81-1.07 4.6 0 1.79.41 3.28 1.07 4.6l3.37-2.7z" fill="#FBBC05" />
                  <path d="M12 4.73c1.25 0 2.37.43 3.25 1.27l2.43-2.43C16.22 2.2 14.28 1.5 12 1.5c-3.52 0-6.48 1.99-7.93 4.87l4.37 2.7c.78-2.33 2.98-4.07 5.56-4.07z" fill="#EA4335" />
                </svg>
                <span>Registrarse con Google</span>
              </Button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-border"></div>
                <span className="flex-shrink mx-4 text-xs text-text-secondary uppercase tracking-wider font-bold">
                  o completa el formulario
                </span>
                <div className="flex-grow border-t border-border"></div>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div
              className={`rounded-xl border p-4 text-sm ${
                selectedPlan === "lifetime"
                  ? "border-red-500/60 bg-red-950/20"
                  : "border-border bg-bg"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-text">
                    Plan seleccionado: {selectedPlanDetails.name}
                  </p>
                  <p className="mt-0.5 text-text-secondary">
                    {selectedPlan === "free_trial"
                      ? "Comienza sin costo durante 14 dÃ­as."
                      : `${selectedPlan === "lifetime" ? "Pago Ãºnico" : "Precio mensual"}: ${price(selectedPlan)} ${regional.currency}`}
                  </p>
                </div>
                {selectedPlanOffer && (
                  <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
                    {selectedPlanOffer}
                  </span>
                )}
              </div>
              <Link to="/" className="mt-3 inline-block text-xs font-semibold text-red-500 hover:underline">
                Cambiar plan
              </Link>
            </div>

            {/* Restaurant Details */}
            <div className="space-y-4">
              <h2 className="text-base font-bold text-text border-b border-border pb-2 flex items-center space-x-2">
                <span className="w-1.5 h-3 bg-red-500 rounded-full" />
                <span>Detalles del Restaurante</span>
              </h2>
              <div className="space-y-4">
                <Select
                  label="PaÃ­s"
                  name="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value as CountryCode)}
                  options={COUNTRY_CODES.map((c) => ({
                    value: c,
                    label: REGIONAL_CONFIG[c].label,
                  }))}
                  required
                />

                <Input
                  label="Nombre del Restaurante"
                  name="restaurant_name"
                  value={formData.restaurant_name}
                  onChange={handleChange}
                  error={errors.restaurant_name}
                  placeholder="Ej: PizzerÃ­a Don Mario"
                  required
                />

                <Select
                  label="Tipo de Restaurante"
                  name="restaurant_type"
                  value={formData.restaurant_type}
                  onChange={handleChange}
                  error={errors.restaurant_type}
                  options={APP_CONFIG.restaurantTypes.map((type) => ({
                    value: type,
                    label: type,
                  }))}
                  required
                />

                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="Ciudad"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    error={errors.city}
                    placeholder="Ej: Santiago"
                    required
                  />

                  <Input
                    label="DirecciÃ³n (Opcional)"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Ej: Av. Vitacura 3400"
                  />
                </div>
              </div>
            </div>

            {/* Owner Details */}
            <div className="space-y-4 pt-2">
              <h2 className="text-base font-bold text-text border-b border-border pb-2 flex items-center space-x-2">
                <span className="w-1.5 h-3 bg-red-500 rounded-full" />
                <span>Detalles del Propietario</span>
              </h2>
              <div className="space-y-4">
                <Input
                  label="Nombre del DueÃ±o"
                  name="owner_name"
                  value={formData.owner_name}
                  onChange={handleChange}
                  error={errors.owner_name}
                  placeholder="Tu nombre completo"
                  required
                />

                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="NÃºmero de TelÃ©fono"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    error={errors.phone}
                    placeholder="Ej: +56900000000"
                    required
                  />

                  <Input
                    label="Correo ElectrÃ³nico"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    error={errors.email}
                    placeholder="sample-15@example.test"
                    required
                    readOnly={isGoogleSignUp}
                    className={isGoogleSignUp ? "opacity-75 bg-bg-subtle cursor-not-allowed" : ""}
                  />

                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="space-y-4 pt-2">
              <h2 className="text-base font-bold text-text border-b border-border pb-2 flex items-center space-x-2">
                <span className="w-1.5 h-3 bg-red-500 rounded-full" />
                <span>InformaciÃ³n Adicional</span>
              </h2>
              <div className="space-y-4">
                <Select
                  label="Â¿CÃ³mo te enteraste de nosotros?"
                  name="heard_from"
                  value={formData.heard_from}
                  onChange={handleChange}
                  options={APP_CONFIG.heardFromOptions.map((option) => ({
                    value: option,
                    label: option,
                  }))}
                />

                <Textarea
                  label="Notas Adicionales (Opcional)"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Cualquier requerimiento especial o consulta..."
                  rows={3}
                />
              </div>
            </div>

            {/* Terms */}
            <div className="bg-bg border border-border rounded-xl p-4 text-xs text-text-secondary leading-relaxed transition-colors">
              Al enviar este formulario, aceptas nuestros{" "}
              <Link to="/legal/terminos" target="_blank" className="text-accent underline hover:text-accent-secondary">
                TÃ©rminos de Servicio
              </Link>{" "}
              y nuestra{" "}
              <Link to="/legal/privacidad" target="_blank" className="text-accent underline hover:text-accent-secondary">
                PolÃ­tica de Privacidad
              </Link>
              . Nuestro equipo se pondrÃ¡ en contacto contigo a la brevedad.
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              loading={loading} 
              fullWidth 
              size="lg"
              className="bg-red-600 hover:bg-red-700 text-white font-bold transition-all border-0 shadow-lg shadow-red-900/20 active:scale-[0.98]"
            >
              Continuar al Pago y ActivaciÃ³n
            </Button>

            {/* Login Link */}
            <p className="text-center text-sm text-text-secondary">
              Â¿Ya tienes una cuenta?{" "}
              <Link
                to="/login"
                className="text-red-500 font-semibold hover:text-red-600 transition-colors hover:underline"
              >
                Inicia sesiÃ³n aquÃ­
              </Link>
            </p>
          </form>
        </div>
      </div>
      <WhatsAppButton phoneNumber="+56900000000" />
    </div>
  );
};

export default RegisterPage;
