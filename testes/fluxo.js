const {chromium}=require('playwright');require('./pw3d.js'); // carrega o Three.js local
(async()=>{
 const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1280,height:800}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message+' @'+(e.stack||'').split('\n').slice(1,3).join('|')));pg.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
 await pg.goto('file:///home/user/pancadaria/index.html');await pg.evaluate(()=>localStorage.clear());await pg.reload();await pg.waitForTimeout(1500);
 await pg.screenshot({path:'shot_title.png'});
 await pg.click('[data-go="tower"]');await pg.waitForTimeout(600);await pg.screenshot({path:'shot_tower.png'});
 await pg.click('#towerGo');
 for(const t of [700,1500,2600,5600,7400]){await pg.waitForTimeout(t-(t>700?[700,1500,2600,5600,7400][[700,1500,2600,5600,7400].indexOf(t)-1]:0));await pg.screenshot({path:'shot_intro_'+t+'.png'});}
 await pg.waitForTimeout(1500);
 const tap=async(k,h=60)=>{await pg.keyboard.down(k);await pg.waitForTimeout(h);await pg.keyboard.up(k);};
 await pg.keyboard.down('KeyW');await pg.waitForTimeout(900);await pg.keyboard.up('KeyW');
 for(let i=0;i<10;i++){await tap('KeyJ');await pg.waitForTimeout(120);}
 await pg.screenshot({path:'shot_fight1.png'});
 await pg.keyboard.down('KeyL');await pg.waitForTimeout(1500);await pg.screenshot({path:'shot_fight2.png'});await pg.keyboard.up('KeyL');
 console.log(await pg.evaluate(()=>{const f=game.fight;return {scr:game.screen,cine:f.cine&&f.cine.type,P:[f.P.state,f.P.hp|0,f.P.post|0],B:[f.B.state,f.B.hp|0,f.B.post|0],st:f.stats,q:QUAL,ema:perf.ema}}));
 console.log(errs.slice(0,8));await b.close();
})();
