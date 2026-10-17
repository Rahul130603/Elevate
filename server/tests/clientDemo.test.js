import test from 'node:test';
import assert from 'node:assert/strict';
import { createClientDemoGateway } from '../services/clientDemoGateway.js';

test('Client demo blocks workspace APIs and requires a server session',async()=>{
 let calls=0;
 const fetcher=async(url,options)=>{
  calls++;
  if(url.endsWith('/client-login')) return Response.json({success:true,client:{id:'test-client',name:'Demo Client',email:'demo@example.com'}});
  if(url.includes('/client-bookings')) {const query=new URL(url).searchParams;assert.equal(query.get('email'),'demo@example.com');assert.equal(query.has('name'),false);assert.equal(query.has('bookingIds'),false);return Response.json({bookings:[]});}
  return Response.json({success:true});
 };
 const server=createClientDemoGateway({fetcher}).listen(0,'127.0.0.1');
 await new Promise(resolve=>server.once('listening',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 try {
  for(const path of ['/api/admin/settings','/api/user/profile','/api/events','/api/bookings','/api/public/unlisted']) assert.equal((await fetch(base+path)).status,403);
  assert.equal((await fetch(base+'/api/public/client-bookings?email=other@example.com')).status,401);
  assert.equal(calls,0,'Blocked requests never reach the main server');
  assert.equal((await fetch(base+'/?portal=admin')).status,403);
  assert.equal((await fetch(base+'/admin-news/en/industry/finance')).status,404);
  assert.equal((await fetch(base+'/index.html')).status,404);
  assert.match(await(await fetch(base+'/')).text(),/__CLIENT_DEMO__=true/);
  const login=await fetch(base+'/api/public/client-login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'demo',password:'test'})});
  const cookie=login.headers.get('set-cookie').split(';')[0];
  assert.match(login.headers.get('set-cookie'),/HttpOnly/);
  const identity=await(await fetch(base+'/api/public/demo-session',{headers:{cookie}})).json();assert.equal(identity.client.email,'demo@example.com');
  assert.equal((await fetch(base+'/api/public/client-bookings?email=other@example.com&name=Other&bookingIds=1,2',{headers:{cookie}})).status,200);
  assert.equal((await fetch(base+'/api/public/cancel',{method:'POST',headers:{cookie,'content-type':'application/json'},body:JSON.stringify({bookingId:-999})})).status,403);
  assert.equal((await fetch(base+'/api/public/book',{method:'POST',headers:{cookie,origin:'https://attacker.example','content-type':'application/json'},body:'{}'})).status,403);
  await fetch(base+'/api/public/client-logout',{method:'POST',headers:{cookie}});
  assert.equal((await fetch(base+'/api/public/client-bookings',{headers:{cookie}})).status,401);
 } finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
