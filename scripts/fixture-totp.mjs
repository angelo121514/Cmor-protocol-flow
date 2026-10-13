import {createHmac} from 'node:crypto';
export function fixtureTotp(secret,now=Date.now()){
 const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits='';
 for(const char of secret.toUpperCase().replace(/=/g,'')){const n=alphabet.indexOf(char);if(n<0)throw new Error('Invalid fixture TOTP');bits+=n.toString(2).padStart(5,'0');}
 const bytes=[];for(let i=0;i+8<=bits.length;i+=8)bytes.push(parseInt(bits.slice(i,i+8),2));
 const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(now/30000)));
 const digest=createHmac('sha1',Buffer.from(bytes)).update(counter).digest(),offset=digest[19]&15;
 return String((digest.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0');
}
