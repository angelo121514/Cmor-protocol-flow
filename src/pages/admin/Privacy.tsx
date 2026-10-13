import React, { useEffect, useState } from "react";
import {supabase} from "../../config/supabase";
import { Inbox } from "lucide-react";
import { Card, Badge, Loading, Select, Button } from "../../components/ui";
import {
  listAllDsars,
  updateDsarStatus,
} from "../../services/privacyService";
import type { DataSubjectRequest, DsarStatus } from "../../config/supabase";

const STATUS_OPTIONS: { value: DsarStatus; label: string }[] = [
  { value: "pending", label: "Pendiente" },
  { value: "verified", label: "Verificado" },
  { value: "in_progress", label: "En progreso" },
  { value: "fulfilled", label: "Cumplido" },
  { value: "rejected", label: "Rechazado" },
  { value: "cancelled", label: "Cancelado" },
];

const AdminPrivacyPage: React.FC = () => {
  const [dsars, setDsars] = useState<DataSubjectRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,setError]=useState("");

  const load = async () => {
    let data: DataSubjectRequest[];
    try {data=await listAllDsars();} catch {setError("No se pudo consultar la bandeja.");setLoading(false);return;}
    setDsars(data);
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    listAllDsars().then(data => { if (active) { setDsars(data); setLoading(false); } })
      .catch(() => { if (active) { setError("No se pudo consultar la bandeja."); setLoading(false); } });
    return () => { active = false; };
  }, []);

  const handleStatusChange = async (
    id: string,
    status: DsarStatus
  ) => {
    const ok = await updateDsarStatus(id, status);
    if (ok) {setError("");setLoading(true);await load();} else setError("La transición fue rechazada. Revisa identidad, estado y permisos MFA.");
  };

  const badgeVariant = (status: DsarStatus) =>
    status === "fulfilled"
      ? "success"
      : status === "rejected" || status === "cancelled"
      ? "error"
      : "warning";

  const [viewTime]=useState(()=>Date.now());
  const isOverdue = (d: DataSubjectRequest) =>
    ["pending", "verified", "in_progress"].includes(d.status) &&
    new Date(d.sla_due_at).getTime() < viewTime;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Inbox className="w-6 h-6 text-accent" />
        <h2 className="text-2xl font-bold text-text">
          Bandeja DPO — Solicitudes de derechos
        </h2>
      </div>

      {error && <p role="alert">{error}</p>}
      <Card className="p-6">
        {loading ? (
          <Loading text="Cargando bandeja…" />
        ) : dsars.length === 0 ? (
          <p className="text-text-secondary">No hay solicitudes.</p>
        ) : (
          <div className="space-y-3">
            {dsars.map((d) => (
              <div
                key={d.id}
                className="p-4 border border-border rounded-lg space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-text">
                      <span className="capitalize">{d.request_type}</span>
                      {d.request_type === "contact" && " (DPO)"}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {d.subject_email} ·{" "}
                      {new Date(d.created_at).toLocaleString("es-CL")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isOverdue(d) && (
                      <Badge variant="error">Fuera de SLA</Badge>
                    )}
                    <Badge variant={badgeVariant(d.status)}>
                      {d.status}
                    </Badge>
                  </div>
                </div>

                <Button size="sm" variant="outline" onClick={async()=>{
                  if(d.retention_hold&&!window.confirm('¿Retirar conservación legal? La solicitud podrá eliminarse según la política configurada.'))return;
                  const result=await supabase.rpc('set_dsar_retention_hold',{p_id:d.id,p_hold:!d.retention_hold});
                  if(result.error)setError('No se pudo actualizar la conservación legal.');else{setError('');setLoading(true);await load();}
                }}>{d.retention_hold?'Retirar conservación legal':'Conservar por obligación legal'}</Button>

                {d.payload && (
                  <pre className="text-xs bg-bg-subtle p-2 rounded overflow-x-auto text-text-secondary">
                    {JSON.stringify(d.payload, null, 2)}
                  </pre>
                )}

                {d.result_metadata && (
                  <pre className="text-xs bg-bg-subtle p-2 rounded overflow-x-auto text-text-secondary">
                    {JSON.stringify(d.result_metadata, null, 2)}
                  </pre>
                )}

                {(d.request_type==="contact" || (d.request_type==="rectify" && d.verified_at && d.status==="pending")) && <div className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary">
                    Revisar solicitud:
                  </span>
                  <Select
                    value={d.status}
                    onChange={(e) =>
                      handleStatusChange(d.id, e.target.value as DsarStatus)
                    }
                    options={STATUS_OPTIONS.filter(o=>o.value===d.status || (d.request_type==="rectify"?["fulfilled","rejected"].includes(o.value):["in_progress","fulfilled","rejected","cancelled"].includes(o.value)))}
                    className="max-w-xs"
                  />
                </div>}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="font-bold text-text mb-2">Recordatorio de SLA</h3>
        <ul className="text-sm text-text-secondary list-disc pl-5 space-y-1">
          <li>El plazo operativo se registra en sla_due_at. El responsable de privacidad debe validar los plazos legales y la retención aplicable.</li>
        </ul>
      </Card>
    </div>
  );
};

export default AdminPrivacyPage;
