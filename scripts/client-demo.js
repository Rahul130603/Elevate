import { loadEnvFile } from 'node:process';
try {loadEnvFile();} catch(error) {if (error.code!=='ENOENT') throw error;}
import { createClientDemoGateway } from '../server/services/clientDemoGateway.js';
const localOnly=process.argv.includes('--local-only');
if (!localOnly && !process.env.NGROK_AUTHTOKEN?.trim()) {
 console.error('Missing NGROK_AUTHTOKEN. Add your ngrok account token to .env, then run npm run demo:client.');
 process.exit(1);
}
try {const response=await fetch('http://127.0.0.1:3000/api/health');if(!response.ok)throw new Error();} catch(_) {
 console.error('Start the project with npm run server before starting the demo.');process.exit(1);
}
const server=createClientDemoGateway().listen(3001,'127.0.0.1');
await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});
console.log('Client-only gateway: http://localhost:3001/');
let listener,ngrok;
const stop=async()=>{await listener?.close();server.close();process.exit(0);};
process.on('SIGINT',stop);process.on('SIGTERM',stop);
if (!localOnly) {
 try {
  ngrok=(await import('@ngrok/ngrok')).default;
  listener=await ngrok.forward({addr:'http://127.0.0.1:3001',authtoken:process.env.NGROK_AUTHTOKEN,...(process.env.NGROK_DOMAIN?.trim()?{domain:process.env.NGROK_DOMAIN.trim()}:{})});
  console.log(`Client demo link: ${listener.url()}/?mode=book`);
  console.log(`Add ${listener.url()} to Google OAuth Authorized JavaScript origins.`);
  if (!process.env.GOOGLE_CLIENT_ID?.trim()) console.log('Google sign-in still needs GOOGLE_CLIENT_ID in .env.');
 } catch(error) {console.error(`ngrok tunnel failed (${error.error_code || 'connection error'}). Check your ngrok account token and domain.`);server.close();process.exitCode=1;}
}
