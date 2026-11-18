const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message+' '+e.stack));
 await pg.goto('file:///home/user/pancadaria/index.html');await pg.waitForTimeout(600);
 const r=await pg.evaluate(()=>{
   const script={kind:'kb',label:'S',cur:blank(),prev:blank(),q:[],poll(){return this.q.shift()||blank();}};
   const dummy=new BotDevice(true);
   const setup=(leg,w)=>{startWorld([{device:script,legend:leg},{device:dummy,legend:1}],3,{mode:'train'},false);game.screen='fight';const [a,t]=game.players;a.inv=t.inv=0;a.weapon=w;return [a,t];};
   const run=n=>{for(let i=0;i<n;i++){script.prev=script.cur;script.cur=script.poll();dummy.prev=dummy.cur;dummy.cur=dummy.poll();game.tick++;for(const p of game.players){p.ox=p.x;p.oy=p.y;}for(const p of game.players)p.update();resolveHits();updateItems();fx.update();}};
   const tap=(o,gap)=>{script.q.push(Object.assign(blank(),o));for(let i=0;i<gap;i++)script.q.push(blank());};
   const out={};
   // sequência leve x3 com espada
   let [a,t]=setup(0,'sword');run(40);a.x=0;t.x=70;let maxN=0,keys=[];
   tap({light:true},5);tap({light:true},6);tap({light:true},30);
   for(let i=0;i<45;i++){run(1);maxN=Math.max(maxN,t.combo.n);if(a.atk&&keys[keys.length-1]!==a.atk.key)keys.push(a.atk.key);}
   out.swordString={keys,maxN,dmg:t.damage};
   // sequência no vazio: não continua
   [a,t]=setup(0,'sword');run(40);t.x=800;keys=[];tap({light:true},5);tap({light:true},40);
   for(let i=0;i<45;i++){run(1);if(a.atk&&keys[keys.length-1]!==a.atk.key)keys.push(a.atk.key);}
   out.whiffString=keys;
   // vários acertos: lado leve espada
   [a,t]=setup(0,'sword');run(40);a.x=0;t.x=80;tap({light:true,right:true},40);maxN=0;for(let i=0;i<40;i++){run(1);maxN=Math.max(maxN,t.combo.n);}out.flurry={hits:maxN,dmg:t.damage};
   // Iara redemoinho
   [a,t]=setup(2,null);run(40);a.x=0;t.x=30;tap({heavy:true},40);maxN=0;for(let i=0;i<50;i++){run(1);maxN=Math.max(maxN,t.combo.n);}out.whirlpool={hits:maxN,dmg:t.damage};
   // dash encadeado
   [a,t]=setup(1,null);run(40);a.x=-200;t.x=900;const xs=[];
   for(let k=0;k<6;k++){tap({dodge:true,right:true},9);}
   let dashes=0,prev=a.state;for(let i=0;i<70;i++){run(1);if(a.state==='Dashing'&&a.st===1)dashes++;}
   out.dash={dashes,dist:Math.round(a.x+200)};
   // dash dance (troca de lado)
   [a,t]=setup(1,null);run(40);a.x=0;tap({dodge:true,right:true},10);tap({dodge:true,left:true},10);tap({dodge:true,right:true},10);let flips=[];for(let i=0;i<34;i++){run(1);if(a.state==='Dashing'&&a.st===1)flips.push(a.facing);}out.dance=flips;
   return out;
 });
 console.log(JSON.stringify(r,null,1),errs);await b.close();
})();
