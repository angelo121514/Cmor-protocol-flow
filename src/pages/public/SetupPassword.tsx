import type {Session} from "@supabase/supabase-js";
import { errorMessage } from "../../../shared/errors";
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock, CheckCircle, AlertCircle, Mail } from "lucide-react";
import { Button, Input, Alert, Loading } from "../../components/ui";
import { supabase } from "../../config/authClient";
import { CmorFlowLogo } from "../../components/CmorFlowLogo";

/**
 * Página de definición de contraseña, accesible únicamente desde una sesión
 * autenticada por el enlace de invitación de Supabase.
 *
 * Flujo:
 *  1. Supabase verifica el enlace enviado al correo y crea la sesión.
 *  2. La invitación vincula esa sesión con el restaurante del pago.
 *  3. El usuario define su contraseña y entra al panel.
 */
const SetupPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Parámetros de invitación
  const inviteToken = searchParams.get("token");
  const pendingInvitation = searchParams.get("pending") === "1";

  const [checkingSession, setCheckingSession] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // Verificar la sesión de Supabase y, si existe, consumir la invitación.
  useEffect(() => {
    let active = true;
    let invitationCheck: Promise<boolean> | null = null;

    const consumeInvitation = async (): Promise<boolean> => {
      if (!inviteToken) return true;
      if (!invitationCheck) {
        // Promise.resolve: PostgrestBuilder.then() devuelve PromiseLike.
        invitationCheck = Promise.resolve(
          supabase
            .rpc("consume_invitation", { p_token: inviteToken })
            .then(({ data, error: invitationError }) => {
              const invitation = Array.isArray(data) ? data[0] : data;
              return !invitationError && Boolean(invitation?.success);
            })
        );
      }
      return invitationCheck;
    };

    const processSession = async (session: Session | null) => {
      if (!session?.user?.email) return false;
      if (!(await consumeInvitation())) {
        if (active) {
          setError("La invitación no es válida, ya fue utilizada o no corresponde a este correo.");
          setCheckingSession(false);
        }
        return false;
      }
      if (active) {
        setAuthorized(true);
        setInvitedEmail(session.user.email);
        setCheckingSession(false);
      }
      return true;
    };

    // Verificar sesión inicial
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) {
        processSession(data.session);
      }
    });

    // Escuchar cambios de auth (cuando se procesa el hash del magic link)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session) {
          await processSession(session);
        }
      }
    );

    // Timeout de fallback para dejar de verificar si no hay sesión
    const timeout = setTimeout(() => {
      if (active) {
        setCheckingSession(false);
      }
    }, 2500);

    return () => {
      active = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [inviteToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();

      if (sessionData?.session) {
        // Flujo 1: El usuario ya está autenticado (magic link), actualiza su contraseña
        const { error: updateError } = await supabase.auth.updateUser({
          password,
        });
        if (updateError) {
          setError(updateError.message || "No se pudo actualizar la contraseña.");
          setLoading(false);
          return;
        }
      } else {
        setError("No se encontró una sesión de invitación válida.");
        setLoading(false);
        return;
      }

      setDone(true);
      // Navegación automática al dashboard después de crear la contraseña
      setTimeout(() => navigate("/restaurant"), 1500);
    } catch (err: unknown) {
      setError(errorMessage(err) || "Error inesperado al configurar la cuenta.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return <Loading text="Verificando activación de cuenta…" />;
  }

  // Sin sesión de invitación: enlace inválido/expirado.
  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-4">
        <div className="max-w-md w-full text-center space-y-4">
          {pendingInvitation ? <Mail className="w-12 h-12 text-primary mx-auto" /> : <AlertCircle className="w-12 h-12 text-warning mx-auto" />}
          <h1 className="text-xl font-bold text-text">
            {pendingInvitation ? "Revisa tu correo" : "Enlace inválido o expirado"}
          </h1>
          <p className="text-text-secondary text-sm">
            {pendingInvitation
              ? "Tu pago fue confirmado. Enviamos un enlace seguro para que crees tu contraseña y actives el acceso al restaurante."
              : "El enlace de invitación no es válido, ha expirado o ya fue utilizado para activar tu restaurante."}
          </p>
          <Button onClick={() => navigate("/login")} variant="outline">
            Ir al inicio de sesión
          </Button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <CheckCircle className="w-12 h-12 text-success mx-auto" />
          <h1 className="text-xl font-bold text-text">¡Cuenta Activada!</h1>
          <p className="text-text-secondary text-sm">
            Tu contraseña se ha configurado correctamente. Redirigiéndote a tu panel…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4 py-12 relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-24 left-1/4 w-96 h-96 bg-emerald-600/5 rounded-full filter blur-[100px] pointer-events-none z-0" />
      <div className="absolute bottom-24 right-1/4 w-96 h-96 bg-primary/5 rounded-full filter blur-[100px] pointer-events-none z-0" />

      <div className="max-w-md w-full space-y-6 relative z-10">
        <div className="text-center space-y-3">
          <CmorFlowLogo size="lg" />
          <div>
            <h1 className="text-2xl font-black text-text tracking-tight">Activa tu Cuenta</h1>
            <p className="text-text-secondary text-xs mt-1">
              Completa el registro de tu restaurante en CMOR FLOW definiendo tu contraseña.
            </p>
          </div>
        </div>

        {error && <Alert type="error" message={error} />}

        <div className="bg-bg-subtle/20 border border-border rounded-2xl p-5 shadow-sm">
          {invitedEmail && (
            <div className="mb-4 text-center">
              <span className="text-xs text-text-secondary">Usuario:</span>
              <p className="text-sm font-bold text-text flex items-center justify-center gap-1.5 mt-0.5">
                <Mail className="w-4 h-4 text-primary" /> {invitedEmail}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              icon={<Lock className="w-4 h-4" />}
              required
            />
            <Input
              label="Confirmar contraseña"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repite tu contraseña"
              icon={<Lock className="w-4 h-4" />}
              required
            />
            <Button
              type="submit"
              fullWidth
              loading={loading}
              disabled={loading}
            >
              Establecer contraseña y Entrar
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SetupPassword;
