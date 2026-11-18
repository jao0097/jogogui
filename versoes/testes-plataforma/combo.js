const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1300,height:860}});
 const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto('file:///home/user/pancadaria/index.html'); await pg.waitForTimeout(800);
 const r=await pg.evaluate(()=>{
   const script={kind:'kb',label:'Script',cur:blank(),prev:blank(),q:[],poll(){return this.q.shift()||blank();}};
   const dummy=new BotDevice(true);
   startWorld([{device:script,legend:2},{device:dummy,legend:1}],3,{mode:'train'},false);game.screen='fight';
   const [a,t]=game.players; a.inv=0;t.inv=0; a.x=0;t.x=60;a.y=t.y=0;
   const run=n=>{for(let i=0;i<n;i++){script.prev=script.cur;script.cur=script.poll();dummy.prev=dummy.cur;dummy.cur=dummy.poll();game.tick++;for(const p of game.players){p.ox=p.x;p.oy=p.y;}for(const p of game.players)p.update();resolveHits();fx.update();}};
   const press=(o,hold=1)=>{for(let i=0;i<hold;i++)script.q.push(Object.assign(blank(),o));};
   const log=[];
   for(let i=0;i<40;i++)run(1);
   // combo: nlight, (hit) jump-cancel, nair, sair...
   const seq=[{light:true},{},{},{},{},{},{},{},{jump:true,right:true},{right:true},{right:true},{right:true},{right:true},{light:true,right:true},{right:true},{right:true},{right:true},{},{},{},{},{},{},{},{},{},{},{},{dodge:true,right:true},{right:true},{right:true},{light:true},{},{},{},{},{},{},{}];
   for(const s of seq){press(s);run(1);log.push(t.combo.n+":"+t.state[0]+t.stun+":"+a.state[0]+(a.atk?a.atk.key:"")+":"+Math.round(a.y)+":"+t.damage);}
   run(20);
   const maxN=Math.max(...log);
   // short hop vs full hop
   startWorld([{device:script,legend:0},{device:dummy,legend:1}],3,{mode:'train'},false);run(60);
   const p=game.players[0];let top=0;press({jump:true},2);for(let i=0;i<50;i++){run(1);top=Math.min(top,p.y);}const short=top;
   run(40);top=0;press({jump:true},30);for(let i=0;i<50;i++){run(1);top=Math.min(top,p.y);}
   return {maxN,log:log.join(','),dmg:t.damage,short,full:top};
 });
 console.log(JSON.stringify(r)); console.log(errs);
 await b.close();
})();
