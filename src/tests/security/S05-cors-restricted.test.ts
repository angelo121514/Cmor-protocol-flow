import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {fixture} from '../integration/fixtures';
import {getCorsHeaders} from '../../../supabase/functions/_shared/cors';

describe('S-05 actual Edge origin rejection and declared frontend headers',()=>{
 it('rejects foreign origins before DSAR execution, even when Kong replaces CORS headers',async()=>{
  const response=await fetch(`${fixture.url}/functions/v1/privacy-erase`,{method:'POST',headers:{'content-type':'application/json',apikey:fixture.anon,origin:'https://evil.example.test'},body:JSON.stringify({email:'cors@fixture.example.test'})});
  expect(response.status).toBe(403);expect(await response.json()).toMatchObject({error:'origin_denied'});
  expect(getCorsHeaders(new Request('http://localhost',{headers:{origin:'https://evil.example.test'}}))['Access-Control-Allow-Origin']).toBe('null');
 });
 it('allows the declared local browser origin to start verification',async()=>{
  const response=await fetch(`${fixture.url}/functions/v1/privacy-erase`,{method:'POST',headers:{'content-type':'application/json',apikey:fixture.anon,origin:'http://localhost:5173'},body:JSON.stringify({email:`cors-${crypto.randomUUID()}@fixture.example.test`})});
  expect(response.status).toBe(200);expect(await response.json()).toMatchObject({status:'pending_verification'});
  expect(getCorsHeaders(new Request('http://localhost',{headers:{origin:'http://localhost:5173'}}))['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
 });
 it('declares CSP, HSTS and framing protection locally; deployed headers remain operator validation',()=>{
  const config=JSON.parse(readFileSync('vercel.json','utf8'));
  const headers=new Map<string,string>(config.headers.flatMap((r:{headers:{key:string;value:string}[]})=>r.headers.map(h=>[h.key.toLowerCase(),h.value] as [string,string])));
  expect(headers.get('content-security-policy')).toContain("default-src 'self'");
  expect(headers.get('strict-transport-security')).toContain('max-age=63072000');
  expect(headers.get('x-frame-options')).toBe('DENY');
 });
});
