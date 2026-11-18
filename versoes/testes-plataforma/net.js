const {chromium}=require('playwright');const fs=require('fs');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1300,height:860}});
 const mock=fs.readFileSync('mock.js','utf8');
 const mk=async uid=>{const pg=await ctx.newPage();await pg.addInitScript(`window.__UID=${JSON.stringify(uid)};`+mock);const errs=[];pg.on('pageerror',e=>errs.push(uid+': '+e.message));pg.errs=errs;await pg.goto('file:///home/user/pancadaria/index.html');await pg.waitForTimeout(500);return pg;};
 const A=await mk('u_alice');await A.evaluate(()=>localStorage.clear());
 const B=await mk('u_bob');
 // A cria torneio
 await A.evaluate(()=>openTour());await A.waitForTimeout(300);
 await A.click('#tNew');await A.fill('#tName','Copa Teste');await A.selectOption('#tMax','6');await A.click('#tCreate button[type=submit]');await A.waitForTimeout(400);
 await A.fill('#tNick','Alice');await A.click('#tJoin button[type=submit]');await A.waitForTimeout(300);
 // B entra
 await B.evaluate(()=>openTour());await B.waitForTimeout(400);await B.click('.tcard');await B.waitForTimeout(200);
 await B.fill('#tNick','Bob');await B.selectOption('#tLeg','3');await B.click('#tJoin button[type=submit]');await B.waitForTimeout(300);
 // mais 3 inscritos falsos
 await A.evaluate(async()=>{const t=T.list[0];for(const [u,n] of [['u_c','Caio'],['u_d','Duda'],['u_e','Edu']])await tref(t.id).update({entries:{[u]:{nick:n,legend:1,at:Date.now()}}});});
 await A.waitForTimeout(300);
 await A.screenshot({path:'tour1.png'});
 await A.click('#tStart');await A.waitForTimeout(400);
 // força Alice x Bob na primeira partida
 const info=await A.evaluate(async()=>{const t=T.list[0];const M=JSON.parse(JSON.stringify(t.matches));
   const all=['u_alice','u_bob','u_c','u_d','u_e'];M.r0m0.a='u_alice';M.r0m0.b='u_bob';M.r0m0.w=null;
   // refaz demais da rodada 1
   M.r0m1={...M.r0m1,a:'u_c',b:'u_d',w:null};M.r0m2={...M.r0m2,a:'u_e',b:null,w:'u_e'};M.r0m3={...M.r0m3,a:null,b:null,w:null};
   M.r1m0={...M.r1m0,a:null,b:null};M.r1m1={...M.r1m1,a:'u_e',b:null};
   const s=JSON.parse(localStorage.getItem('mockdb'));s['torneios/'+t.id].matches=M;localStorage.setItem('mockdb',JSON.stringify(s));new BroadcastChannel('mockdb').postMessage(1);
   return {id:t.id,rounds:t.rounds,size:t.size,status:t.status};});
 await A.waitForTimeout(400);await A.evaluate(()=>{listenersKick=1;});
 await A.evaluate(()=>{renderTour();});await B.evaluate(()=>{renderTour();});
 await A.screenshot({path:'tour2.png'});
 // os dois clicam jogar online
 await A.click('[data-online="r0m0"]');await B.click('[data-online="r0m0"]');
 await A.waitForTimeout(1500);
 const s1=await Promise.all([A,B].map(p=>p.evaluate(()=>({screen:game.screen,net:game.net&&game.net.role,players:game.players.map(p=>[p.legend.id,Math.round(p.x),p.state])}))));
 // B anda para a direita e ataca
 await B.keyboard.down('KeyD');await B.waitForTimeout(250);console.log('HOLD',JSON.stringify(await A.evaluate(()=>({dev:game.players[1].device.cur.right,inp:netPeerField('b','inp')}))),JSON.stringify(await B.evaluate(()=>({loc:game.net.local.cur.right,kb:devices.kbA.cur.right,keys:[...keys]}))));await B.waitForTimeout(250);await B.keyboard.up('KeyD');
 await B.keyboard.press('KeyJ');await B.waitForTimeout(300);
 const s2=await Promise.all([A,B].map(p=>p.evaluate(()=>game.players.map(p=>[Math.round(p.x),p.state,p.atk&&p.atk.key]))));
 await B.screenshot({path:'net_b.png'});
 // fim: host derruba o Bob até acabar
 await A.evaluate(()=>{const p=game.players[1];p.stocks=1;p.x=5000;});
 await A.waitForTimeout(6000);
 const s3=await Promise.all([A,B].map(p=>p.evaluate(()=>({screen:game.screen,title:document.querySelector('#winTitle').textContent}))));
 await B.screenshot({path:'net_over.png'});
 await A.waitForTimeout(500);
 const db=await A.evaluate(()=>{const s=JSON.parse(localStorage.getItem('mockdb'));const t=Object.values(s)[0];return {r0m0:t.matches.r0m0,r1m0:t.matches.r1m0};});
 // volta ao torneio
 await A.waitForFunction(()=>game.screen==='over',null,{timeout:20000}).catch(()=>{});console.log('A screen',await A.evaluate(()=>game.screen));await A.click('#scrOver [data-act="tour"]');await A.waitForTimeout(400);await A.screenshot({path:'tour3.png'});
 console.log(JSON.stringify({info,s1,s2,s3,db},null,1));console.log(A.errs,B.errs);
 await b.close();
})();
