import {networkInterfaces} from 'node:os';
import {port as defaultPort} from './config.mjs';
export function privateIPv4(ip){const p=String(ip).split('.').map(Number);return p.length===4&&p.every(n=>Number.isInteger(n)&&n>=0&&n<=255)&&(p[0]===10||p[0]===192&&p[1]===168||p[0]===172&&p[1]>=16&&p[1]<=31);}
export function networkPolicy(argv=process.argv,interfaces,port=defaultPort){
 const phone=argv.includes('--phone');if(phone&&!argv.includes('--sample'))throw Error('Phone preview requires sample mode. Use npm run phone.');
 if(phone&&!interfaces){try{interfaces=networkInterfaces();}catch{throw Error('Could not read local network addresses. Use npm start for PC-only mode.');}}
 const addresses=phone?[...new Set(Object.values(interfaces).flat().filter(i=>i&&!i.internal&&i.family==='IPv4'&&privateIPv4(i.address)).map(i=>i.address))]:[];
 const hosts=new Set(['localhost:'+port,'127.0.0.1:'+port,...addresses.map(ip=>ip+':'+port)]);
 return {phone,addresses,bind:phone?'0.0.0.0':'127.0.0.1',hostAllowed:h=>hosts.has(h),originAllowed:req=>!req.headers.origin||req.headers.origin==='http://'+req.headers.host,peerAllowed:ip=>{const plain=String(ip||'').replace(/^::ffff:/,'');return plain==='127.0.0.1'||plain==='::1'||phone&&privateIPv4(plain);}};
}
