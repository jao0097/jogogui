const {chromium}=require('playwright');require('./pw3d.js');
(async()=>{const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1280,height:800}});const errs=[];pg.on('pageerror',e=>errs.push(e.message+' @'+(e.stack||'').split('\n').slice(1,3).join('|')));pg.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,200))});
await pg.goto('file:///home/user/pancadaria/index.html');await pg.evaluate(()=>{localStorage.setItem('pc-torre',JSON.stringify({floor:8,frag:9000,perks:['gourd','iron']}));});await pg.reload();await pg.waitForTimeout(1200);
const r={};
r.migr=await pg.evaluate(()=>{upg();return [SAVE.frag,SAVE.perks.length];});
await pg.evaluate(()=>showScreen('evo'));await pg.waitForTimeout(500);
// compra: 2 níveis em cada atributo, todas as técnicas e a forja
for(let i=0;i<12;i++){await pg.evaluate(()=>{const b=[...document.querySelectorAll('#evoList button:not([disabled])')][0];if(b)b.click();});}
await pg.click('[data-tab="tech"]');for(let i=0;i<7;i++)await pg.evaluate(()=>{const b=document.querySelector('#evoList button:not([disabled])');if(b)b.click();});
await pg.click('[data-tab="blade"]');for(let i=0;i<3;i++)await pg.evaluate(()=>{const b=document.querySelector('#evoList button:not([disabled])');if(b)b.click();});
await pg.waitForTimeout(300);await pg.screenshot({path:'evo.png'});
r.up=await pg.evaluate(()=>[JSON.stringify(SAVE.up),SAVE.frag,guiLevel()]);
await pg.click('[data-tab="attr"]');await pg.waitForTimeout(200);await pg.screenshot({path:'evo2.png'});
r.fight=await pg.evaluate(()=>{startFight({boss:'kara',arena:'ceu',lvl:3,skipIntro:true});const fi=game.fight,P=fi.P,B=fi.B;const o={hp:P.hpMax,post:P.postMax,heals:P.heals,art:P.art,dm:P.dmgMul};
  const run=n=>{for(let i=0;i<n;i++){B.cool=999;step();}};P.x=0;P.z=300;B.x=0;B.z=0;run(5);
  EDGE.set('Space',game.tick+1);run(8);EDGE.set('Space',game.tick+1);run(8);EDGE.set('Space',game.tick+1);run(3);o.jumps=P.jumps;EDGE.set('ShiftLeft',game.tick+1);run(4);EDGE.set('ShiftLeft',game.tick+1);run(4);o.airDash=P.airDash;run(80);
  P.art=100;EDGE.set('KeyO',game.tick+1);run(3);o.awake=P.awakeT;run(40);
  P.ripT=20;P.x=0;P.z=120;B.set('idle');EDGE.set('KeyJ',game.tick+1);run(40);o.burn=B.burn;
  let ev=0;B.guardP=0;B.evadeP=1;for(let k=0;k<5;k++){B.set('idle');B.inv=0;P.set('idle');P.x=B.x;P.z=B.z+130;EDGE.set('KeyJ',game.tick+1);for(let i=0;i<25;i++){step();if(B.state==='dodge'){ev++;break;}}run(30);}o.evades=ev;
  return o;});
await pg.screenshot({path:'evo3.png'});
console.log(JSON.stringify(r));console.log(errs);await b.close();})();
