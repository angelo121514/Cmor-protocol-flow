import {useEffect,useState} from 'react';
import {supabase} from '../../config/supabase';
import {Alert,Button,Card,Input,Loading} from '../../components/ui';
import {readAllPages} from '../../services/pagination';
import {PLAN_PRICES} from '../../../shared/plan-prices';

type Config={security_owner:string;privacy_owner:string;payments_owner:string;accounting_owner:string;printer_label:string;catalog_approved:boolean;retention_policy_reference:string;request_retention_days:number|null;request_purge_enabled:boolean};
type Settings={revision:number;config:Config;printer_attested_at:string|null};
type Restaurant={id:string;name:string;country:string;report_timezone:string|null};
const owners=[['security_owner','Responsable de seguridad y recuperación MFA'],['privacy_owner','Responsable de privacidad'],['payments_owner','Responsable de conciliación de pagos'],['accounting_owner','Responsable de contabilidad y DTE']] as const;
export default function Operations(){
 const [settings,setSettings]=useState<Settings|null>(null),[restaurants,setRestaurants]=useState<Restaurant[]>([]),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[printed,setPrinted]=useState(false),[confirmed,setConfirmed]=useState(false),[restaurant,setRestaurant]=useState(''),[timezone,setTimezone]=useState(''),[environment,setEnvironment]=useState<Record<string,boolean>|null>(null);
 useEffect(()=>{let active=true;(async()=>{
  try{const result=await supabase.rpc('get_operational_settings');if(result.error)throw result.error;
   const rows=await readAllPages<Restaurant>((from,to)=>supabase.from('restaurants').select('id,name,country,report_timezone').order('id').range(from,to));
   if(active){setSettings(result.data as Settings);setRestaurants(rows);}
  }catch{if(active)setError('No se pudo cargar la configuración. Recarga la página.');}
  const readiness=await supabase.functions.invoke('operations-readiness',{method:'GET'});if(active&&!readiness.error)setEnvironment(readiness.data.configured);
 })();return()=>{active=false;};},[]);
 function change<K extends keyof Config>(key:K,value:Config[K]){setSettings(s=>s?{...s,config:{...s.config,[key]:value}}:s);setNotice('');if(key==='printer_label'){setPrinted(false);setConfirmed(false);}}
 async function save(){if(!settings)return;setBusy(true);setError('');setNotice('');
  const result=await supabase.rpc('save_operational_settings',{p_settings:{...settings.config,printer_test_confirmed:confirmed},p_revision:settings.revision});
  if(result.error)setError('No se pudo guardar. Verifica los campos o recarga si otro administrador realizó cambios.');else{setSettings(result.data as Settings);setConfirmed(false);setNotice('Configuración guardada.');}setBusy(false);
 }
 async function saveTimezone(){setBusy(true);setError('');const result=await supabase.rpc('set_restaurant_report_timezone',{p_restaurant_id:restaurant,p_timezone:timezone});
  if(result.error)setError('No se pudo guardar la zona horaria. Usa un nombre IANA válido.');else{setRestaurants(rows=>rows.map(r=>r.id===restaurant?{...r,report_timezone:timezone}:r));setNotice('Zona horaria guardada.');}setBusy(false);
 }
 if(!settings)return error?<Alert type="error" message={error}/>:<Loading text="Cargando configuración de operación..."/>;
 const missing=owners.filter(([key])=>!settings.config[key].trim()).map(([,label])=>label);
 return <div className="space-y-6"><h2 className="text-2xl font-bold">Configuración de operación</h2>
 <p>Completa esta configuración al instalar CMOR FLOW para un cliente. Guardarla no acredita pruebas con proveedores ni cumplimiento legal.</p>
 {error&&<Alert type="error" message={error}/>} {notice&&<Alert type="success" message={notice}/>}
 <Card className="p-6 space-y-4"><h3 className="text-lg font-bold">Responsables</h3><p>Asigna una persona o equipo y su canal interno de contacto. Estos campos no conceden permisos.</p>
 {owners.map(([key,label])=><Input key={key} label={label} value={settings.config[key]} maxLength={200} onChange={e=>change(key,e.target.value)}/>)}
 {missing.length>0&&<Alert type="warning" message={`Por configurar: ${missing.join('; ')}.`}/>}</Card>
 <Card className="p-6 space-y-4"><h3 className="text-lg font-bold">Catálogo comercial</h3>
 <table aria-label="Catálogo regional"><thead><tr><th>Plan</th><th>Chile (CLP)</th><th>Brasil (BRL)</th><th>Bolivia (BOB)</th><th>Perú (PEN)</th></tr></thead><tbody>{(['starter','pro','lifetime'] as const).map(plan=><tr key={plan}><th>{plan}</th>{(['CL','BR','BO','PE'] as const).map(country=><td key={country}>{PLAN_PRICES[plan][country].price}</td>)}</tr>)}</tbody></table>
 <p>Precios del catálogo actual. Los contratos existentes se conservan; no se convierte moneda automáticamente. Confirma métodos y monedas con cada proveedor antes de habilitar cobros.</p>
 <label className="flex gap-2"><input type="checkbox" checked={settings.config.catalog_approved} onChange={e=>change('catalog_approved',e.target.checked)}/>He revisado y aprobado el catálogo comercial para esta instalación.</label></Card>
 <Card className="p-6 space-y-4"><h3 className="text-lg font-bold">Impresora</h3><Input label="Nombre o ubicación de impresora" value={settings.config.printer_label} maxLength={200} onChange={e=>change('printer_label',e.target.value)}/>
 <p>La selección del dispositivo se realiza en el diálogo de impresión del sistema. Comprueba papel, márgenes y legibilidad. La aplicación no puede detectar si el papel salió correctamente.</p>
 <Button variant="outline" onClick={()=>{window.print();setPrinted(true);}}>Imprimir prueba</Button>
 <label className="flex gap-2"><input type="checkbox" disabled={!printed} checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>Confirmo que revisé la impresión física y fue correcta.</label>
 <p>{settings.printer_attested_at?`Última confirmación manual: ${new Date(settings.printer_attested_at).toLocaleString()}`:'Impresión física por verificar.'}</p></Card>
 <Card className="p-6 space-y-4"><h3 className="text-lg font-bold">Retención de privacidad</h3><p>Las exportaciones temporales vencen y se purgan a las 24 horas. La eliminación de solicitudes terminadas permanece desactivada hasta que el administrador registre una política aprobada. Las solicitudes con conservación legal no se eliminan.</p>
 <Input label="Referencia de política de retención aprobada" value={settings.config.retention_policy_reference} maxLength={200} onChange={e=>change('retention_policy_reference',e.target.value)}/>
 <Input label="Días de conservación de solicitudes terminadas" type="number" min={1} max={3650} value={settings.config.request_retention_days??''} onChange={e=>change('request_retention_days',e.target.value===''?null:Number(e.target.value))}/>
 <label className="flex gap-2"><input type="checkbox" checked={settings.config.request_purge_enabled} onChange={e=>change('request_purge_enabled',e.target.checked)}/>Activar eliminación irreversible de solicitudes terminadas conforme a la política registrada.</label></Card>
 <Button loading={busy} onClick={save}>Guardar configuración</Button>
 <Card className="p-6 space-y-4"><h3 className="text-lg font-bold">Zona horaria de reportes</h3>
 <label htmlFor="operations-restaurant">Restaurante</label><select id="operations-restaurant" className="input" value={restaurant} onChange={e=>{setRestaurant(e.target.value);setTimezone(restaurants.find(r=>r.id===e.target.value)?.report_timezone??'');}}><option value="">Selecciona un restaurante</option>{restaurants.map(r=><option key={r.id} value={r.id}>{r.name} ({r.report_timezone??'por configurar'})</option>)}</select>
 <Input label="Zona horaria IANA" placeholder="America/Santiago" value={timezone} onChange={e=>setTimezone(e.target.value)}/><Button loading={busy} disabled={!restaurant||!timezone} onClick={saveTimezone}>Guardar zona horaria</Button></Card>
 <Card className="p-6 space-y-4"><h3 className="text-lg font-bold">Proveedores y despliegue</h3><p>Configura credenciales exclusivamente en el servidor. La presencia de variables no equivale a integración verificada. El instalador debe completar pruebas de pago, correo y DTE antes de habilitar producción.</p>
 {environment?Object.entries(environment).map(([name,ready])=><p key={name}>{name}: {ready?'Variables presentes; prueba real pendiente':'Por configurar en servidor'}</p>):<p>No se pudo comprobar la configuración del servidor.</p>}
 </Card></div>;
}
