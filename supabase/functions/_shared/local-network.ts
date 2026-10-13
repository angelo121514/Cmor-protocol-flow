// Test runs fail closed if any Edge code attempts an external request.
if(Deno.env.get('LOCAL_TEST_ONLY')==='true'){
 const original=globalThis.fetch;
 const providerOrigin=Deno.env.get('LOCAL_MOCK_PROVIDER_ORIGIN');
 const allowedProvider=providerOrigin?new URL(providerOrigin):null;
 const imageOrigin=Deno.env.get('IMAGE_INSPECTION_URL');
 const allowedImage=imageOrigin?new URL(imageOrigin):null;
 if(allowedImage&&!/^(localhost|127\.0\.0\.1|host\.docker\.internal|172\.(1[6-9]|2[0-9]|3[01])\.\d+\.\d+)$/.test(allowedImage.hostname))throw new Error('invalid_local_inspector');
 if(allowedProvider && !/^(localhost|127\.0\.0\.1|host\.docker\.internal|172\.(1[6-9]|2[0-9]|3[01])\.\d+\.\d+)$/.test(allowedProvider.hostname))throw new Error('invalid_local_provider');
 globalThis.fetch=(input,init)=>{
  const url=new URL(input instanceof Request?input.url:String(input));
  if(!['localhost','127.0.0.1','[::1]','kong','host.docker.internal'].includes(url.hostname) && url.origin!==allowedProvider?.origin&&url.origin!==allowedImage?.origin)throw new Error('external_network_forbidden');
  return original(input,init);
 };
}
export {};
