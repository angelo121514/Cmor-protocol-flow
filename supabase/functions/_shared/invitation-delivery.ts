import type {RpcDatabase, InvitationAuthPort} from './ports.ts';
export async function deliverInvitations(db:RpcDatabase & InvitationAuthPort,app:string,restaurant?:string){
 const claimed=await db.rpc('claim_invitations',{p_restaurant:restaurant??null});if(claimed.error)throw new Error('invitation_claim_failed');
 let sent=0,failed=0;
 for(const invitation of claimed.data??[]){
  let success=false;
  try{const redirect=new URL('/setup-password',app);redirect.searchParams.set('token',invitation.token);
   const result=await db.auth.admin.inviteUserByEmail(invitation.email,{redirectTo:redirect.toString()});success=!result.error;
  }catch{success=false;}
  const recorded=await db.rpc('finish_invitation_delivery',{p_id:invitation.id,p_claim:invitation.delivery_claim,p_sent:success});
  if(recorded.error)throw new Error('invitation_delivery_unknown');
  if(success)sent++;else failed++;
 }
 return {processed:sent,failed};
}
