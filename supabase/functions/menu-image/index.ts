import "../_shared/local-network.ts";
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.86.0';
import {requireRestaurantOwner} from '../_shared/authorization.ts';
import {detectImage} from '../../../shared/image-validation.ts';
import {inspectImage,ImageInspectionError,readImageUpload} from '../_shared/image-inspection.ts';
import {handleOptions,jsonResponse} from '../_shared/cors.ts';
const base=Deno.env.get('SUPABASE_URL')!;
const publicBase=(Deno.env.get('PUBLIC_SUPABASE_URL')||base).replace(/\/$/,'');
const db=createClient(base,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SERVICE_ROLE')!,{auth:{persistSession:false}});
Deno.serve(async req=>{
 const options=handleOptions(req);if(options)return options;
 try {
  if(req.method==='POST') {
   const input=await readImageUpload(req);
   const form=await new Request(req.url,{method:'POST',headers:{'content-type':req.headers.get('content-type')??''},body:input}).formData(),restaurant=String(form.get('restaurant_id')??''),file=form.get('file');
   if(!(file instanceof File)||file.size>2097152)return jsonResponse(req,{error:'invalid_file'},400);
   const auth=await requireRestaurantOwner(db,req,restaurant);if(!auth.authorized)return jsonResponse(req,{error:'unauthorized'},403);
   const bytes=new Uint8Array(await file.arrayBuffer()),type=detectImage(bytes);
   if(!type||type!==file.type)return jsonResponse(req,{error:'invalid_image_content'},400);
   const canonical=await inspectImage(bytes,type,{url:Deno.env.get('IMAGE_INSPECTION_URL')??'',secret:Deno.env.get('IMAGE_INSPECTION_SECRET')??'',local:Deno.env.get('LOCAL_TEST_ONLY')==='true'});
   const path=`${restaurant}/${crypto.randomUUID()}.png`;
   const {error}=await db.storage.from('menu-images').upload(path,canonical,{contentType:'image/png',upsert:false});
   if(error)throw error;
   return jsonResponse(req,{url:`${publicBase}/functions/v1/menu-image?path=${encodeURIComponent(path)}`});
  }
  if(req.method==='GET') {
   const path=new URL(req.url).searchParams.get('path');
   if(!path||!/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(path))return jsonResponse(req,{error:'invalid_path'},400);
   const canonical=`${publicBase}/functions/v1/menu-image?path=${encodeURIComponent(path)}`;
   const {data,error}=await db.from('menu_items').select('restaurant_id,restaurants(is_active,status,trial_ends_at)').eq('restaurant_id',path.split('/')[0]).eq('image_url',canonical).eq('is_available',true).limit(1).maybeSingle();
   if(error||!data)return jsonResponse(req,{error:'image_not_published'},404);
   const rest=Array.isArray(data.restaurants)?data.restaurants[0]:data.restaurants;
   if(!rest?.is_active||!['active','trial'].includes(rest.status)||(rest.status==='trial'&&(!rest.trial_ends_at||Date.parse(rest.trial_ends_at)<=Date.now())))return jsonResponse(req,{error:'image_not_published'},404);
   const signed=await db.storage.from('menu-images').createSignedUrl(path,300);
   if(signed.error||!signed.data)throw new Error('sign_failed');
   const signedUrl=new URL(signed.data.signedUrl);
   if(signedUrl.origin!==new URL(base).origin)throw new Error('invalid_storage_origin');
   return Response.redirect(new URL(signedUrl.pathname+signedUrl.search,publicBase).href,302);
  }
  return jsonResponse(req,{error:'method_not_allowed'},405);
 } catch(error) {return error instanceof ImageInspectionError?jsonResponse(req,{error:error.message},error.status):jsonResponse(req,{error:'image_operation_failed'},503);}
});
