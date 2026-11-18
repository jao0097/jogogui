const {chromium}=require('playwright');require('./pw3d.js');
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const pg=await b.newPage({viewport:{width:1280,height:800}});const errs=[];pg.on('pageerror',e=>errs.push(e.message+' @'+(e.stack||'').split('\n').slice(1,3).join('|')));pg.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,200))});
await pg.goto('file:///home/user/pancadaria/index.html');await pg.evaluate(()=>localStorage.clear());await pg.reload();await pg.waitForTimeout(1200);
await pg.click('#ascGo');await pg.waitForTimeout(1500);
const r=await pg.evaluate(()=>{const o={};o.music=MUSIC.on;const fi=game.fight;o.f0=[fi.cfg.boss,fi.cfg.endless.n,fi.B.hpMax];
  fi.cine=null;for(let i=0;i<30;i++)step();finishFight(true);const f1=game.fight;o.f1=[f1.cfg.boss,f1.cfg.endless.n,f1.cfg.lvl,f1.B.hpMax,f1.P.hp];
  for(let i=0;i<20;i++)step();killPlayer(f1.P);for(let i=0;i<420;i++)step();o.end=[game.screen,$('#deadInfo').textContent,SAVE.ascBest];return o;});
await pg.screenshot({path:'end.png'});
console.log(JSON.stringify(r));console.log(errs);await b.close();})();
