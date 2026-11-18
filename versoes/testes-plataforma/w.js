const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1300,height:860}});const errs=[];pg.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n')[1]));
 await pg.goto('file:///home/user/pancadaria/index.html');await pg.waitForTimeout(700);
 const r=await pg.evaluate(()=>{
   const script={kind:'kb',label:'S',cur:blank(),prev:blank(),q:[],poll(){return this.q.shift()||blank();}};
   const dummy=new BotDevice(true);const out={};
   const setup=(leg)=>{startWorld([{device:script,legend:leg},{device:dummy,legend:1}],3,{mode:'train'},false);game.screen='fight';const [a,t]=game.players;a.inv=t.inv=0;return [a,t];};
   const run=n=>{for(let i=0;i<n;i++){script.prev=script.cur;script.cur=script.poll();dummy.prev=dummy.cur;dummy.cur=dummy.poll();game.tick++;for(const p of game.players){p.ox=p.x;p.oy=p.y;}for(const p of game.players)p.update();resolveHits();updateItems();updateShots();fx.update();}};
   const tap=(o,g)=>{script.q.push(Object.assign(blank(),o));for(let i=0;i<g;i++)script.q.push(blank());};
   // rotação do orbe: Iara pega 3 orbes
   let [a,t]=setup(2);run(30);const got=[];
   for(let k=0;k<3;k++){game.pickups.push({x:a.x,y:a.y,vx:0,vy:0,weapon:null,orb:true,landed:true,life:900});tap({throw:true},6);run(8);got.push(a.weapon);tap({throw:true},6);run(30);}
   out.iaraRotation=got;
   // arco: flecha acerta à distância
   [a,t]=setup(2);run(30);a.weapon='bow';a.x=-200;t.x=150;tap({light:true},40);run(45);out.bowHit=t.damage;
   // Kael: espinhos (baixo pesado) e meia-lua (lateral + pesado de novo)
   [a,t]=setup(4);run(30);a.weapon='sword';a.x=0;t.x=160;tap({heavy:true,down:true},50);let n=0;for(let i=0;i<50;i++){run(1);n=Math.max(n,t.combo.n);}out.kaelSpikes={hits:n,dmg:t.damage};
   [a,t]=setup(4);run(30);a.weapon='sword';a.x=0;t.x=70;tap({heavy:true,right:true},4);tap({heavy:true,right:true},60);let keys=[],waves=0;for(let i=0;i<60;i++){run(1);if(a.atk&&keys[keys.length-1]!==a.atk.key)keys.push(a.atk.key);waves=Math.max(waves,game.shots.filter(s=>s.kind==='wave').length);}out.kaelDash={keys,waves,dmg:t.damage};
   // golpe em cheio da lança
   [a,t]=setup(5);run(30);a.weapon='spear';a.x=0;t.x=100;const d0=t.damage;tap({light:true},30);run(30);out.spearTip=t.damage-d0;
   // todas as figuras
   const c=document.createElement('canvas');c.width=1400;c.height=560;ctx=c.getContext('2d');ctx.fillStyle='#3a4a7a';ctx.fillRect(0,0,1400,560);
   LEGENDS.forEach((L,i)=>{[null,...L.weapons].forEach((w,j)=>{ctx.save();ctx.translate(90+i*225+j*0,0);ctx.restore();});});
   LEGENDS.forEach((L,i)=>{const ws=[null,...L.weapons];ws.forEach((w,j)=>{ctx.save();ctx.translate(70+i*225+(j%2)*100,170+Math.floor(j/2)*230+(j===2?0:0));ctx.scale(1.7,1.7);drawFigure(L,L.base,{t:30,weapon:w,sash:SLOT_COLORS[i%4],pose:j===2?{aF:-0.3,eF:0,wF:-0.3}:{}});ctx.restore();});
     ctx.fillStyle='#fff';ctx.font='16px sans-serif';ctx.fillText(L.name+': '+L.weapons.join('+'),20+i*225,540);});
   ctx=mainCtx;out.img=c.toDataURL();
   return out;});
 require('fs').writeFileSync('legs.png',Buffer.from(r.img.split(',')[1],'base64'));delete r.img;
 // cena: Kael soltando espinhos
 await pg.evaluate(()=>{const d=new BotDevice(true);const s={kind:'script',label:'S',cur:blank(),prev:blank(),q:[],poll(){return this.q.shift()||blank();}};window.__s=s;startWorld([{device:s,legend:4},{device:d,legend:5}],1,{mode:'stock',stocks:3},false);showScreen('fight');game.players[0].weapon='scythe';game.players[1].weapon='spear';});
 await pg.waitForTimeout(1500);await pg.evaluate(()=>{__s.q.push(Object.assign(blank(),{heavy:true,down:true}));});await pg.waitForTimeout(330);await pg.screenshot({path:'kael.png'});
 await pg.evaluate(()=>{__s.q.push(Object.assign(blank(),{heavy:true,right:true}));});await pg.waitForTimeout(240);await pg.evaluate(()=>{__s.q.push(Object.assign(blank(),{heavy:true,right:true}));});await pg.waitForTimeout(350);await pg.screenshot({path:'kael2.png'});
 console.log(JSON.stringify(r,null,1),errs);await b.close();
})();
