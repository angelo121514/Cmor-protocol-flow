export function detectImage(bytes: Uint8Array): 'image/jpeg'|'image/png'|'image/webp'|null {
 if(bytes.length<12 || bytes.length>2097152) return null;
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
 if([137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))return 'image/png';
 const ascii=(a:number,b:number)=>String.fromCharCode(...bytes.slice(a,b));
 if(ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP')return 'image/webp';
 return null;
}
