const {chromium}=require('playwright');require('./pw3d.js');
(async()=>{const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1280,height:800}});const errs=[];pg.on('pageerror',e=>errs.push(e.message+' @'+(e.stack||'').split('\n').slice(1,3).join('|')));pg.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,200))});
await pg.goto('file:///home/user/pancadaria/index.html');await pg.evaluate(()=>localStorage.clear());await pg.reload();await pg.waitForTimeout(1200);
const fl=+(process.argv[2]||1);
await pg.evaluate(fl=>{SAVE.floor=fl;startFight(Object.assign({floor:fl},TOWER[fl]));},fl);
const tapE=async()=>{await pg.keyboard.press('Enter');await pg.waitForTimeout(80);};
await pg.waitForTimeout(1500);await pg.screenshot({path:'st1.png'});
for(let i=0;i<4;i++){await tapE();await tapE();await pg.waitForTimeout(250);}
await pg.waitForTimeout(1500);await pg.screenshot({path:'st2.png'});
const s1=await pg.evaluate(()=>{const c=game.fight.cine;return c&&[c.type,c.i,c.beats&&c.beats.length];});
await pg.keyboard.press('Escape');await pg.waitForTimeout(400);
const s2=await pg.evaluate(()=>game.fight.cine&&game.fight.cine.type);
await pg.evaluate(()=>{const fi=game.fight;fi.cine=null;fi.B.lives=1;startExecution(fi.P,fi.B);});
await pg.waitForTimeout(6500);
const s3=await pg.evaluate(()=>{const c=game.fight.cine;return c&&[c.type,c.i,c.then];});
await pg.waitForTimeout(1200);await pg.screenshot({path:'st3.png'});
for(let i=0;i<30;i++){await tapE();await tapE();}
await pg.waitForTimeout(1500);
const s4=await pg.evaluate(()=>[game.screen,SAVE.floor]);
console.log(JSON.stringify({s1,s2,s3,s4}));console.log(errs);await b.close();})();
