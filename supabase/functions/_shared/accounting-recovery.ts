import {TaxApiError} from './tax-client.ts';
import type {TaxApiRequestState} from './tax-types.ts';
import type {EdgeDatabase} from './ports.ts';
export async function updateAccountingDocument(db:EdgeDatabase,id:string,changes:Record<string,unknown>){
 const saved=await db.from('accounting_documents').update({...changes,updated_at:new Date().toISOString()}).eq('id',id).select('id').single();
 if(saved.error||!saved.data)throw new Error('accounting_persistence_failed');
}
export async function applyAccountingState(db:EdgeDatabase,id:string,state:TaxApiRequestState){
 const changes:Record<string,unknown>={status:state.status};
 if(state.requestId)changes.request_id=state.requestId;
 if(state.dte){changes.dte_id=state.dte.dteId??null;changes.folio=state.dte.folio??null;changes.sii_status=state.dte.siiStatus??null;changes.track_id=state.dte.trackId??null;if(state.dte.amount!=null)changes.amount=state.dte.amount;}
 if(state.error)changes.last_error=state.error.code||'provider_error';
 if(['accepted','observed','rejected','failed','cancelled'].includes(state.status))changes.accepted_at=state.finalizedAt??new Date().toISOString();
 await updateAccountingDocument(db,id,changes);
}
export async function reconcileAccountingDocument(db:EdgeDatabase,client:{findByExternalReference(reference:string):Promise<TaxApiRequestState>},doc:{id:string;external_reference:string},emit:()=>Promise<unknown>){
 try{const state=await client.findByExternalReference(doc.external_reference);await applyAccountingState(db,doc.id,state);return 'adopted' as const;}
 catch(error){
  if(error instanceof TaxApiError&&error.code==='NOT_FOUND'){await emit();return 'emitted' as const;}
  await updateAccountingDocument(db,doc.id,{last_error:'reconciliation_required'});return 'error' as const;
 }
}
