const {chromium}=require('playwright');require('./pw3d.js');
(async()=>{const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1280,height:800}});const errs=[];pg.on('pageerror',e=>errs.push(e.message+' @'+(e.stack||'').split('\n').slice(1,3).join('|')));pg.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,200))});
await pg.goto('file:///home/user/pancadaria/index.html');await pg.evaluate(()=>{localStorage.setItem('pc-torre',JSON.stringify({floor:16,frag:3000,selos:6}));});await pg.reload();await pg.waitForTimeout(1200);
const r={};
await pg.evaluate(()=>showScreen('tower'));await pg.waitForTimeout(700);await pg.screenshot({path:'q_tower.png'});
r.tower=await pg.evaluate(()=>[TOWER.length,document.querySelectorAll('.floor').length,document.querySelectorAll('.acth').length]);
await pg.evaluate(()=>showScreen('quests'));await pg.waitForTimeout(900);await pg.screenshot({path:'q_list.png'});
r.quests=await pg.evaluate(()=>[QUESTS.length,document.querySelectorAll('#questList button:not([disabled])').length]);
// missão: vencer sem dano (força vitória direta)
r.q=await pg.evaluate(()=>{startQuest(QUESTS[0]);const fi=game.fight;const a=[fi.cine&&fi.cine.type,fi.cine&&fi.cine.beats.length];
  for(let i=0;i<200;i++){if(i%5===0)EDGE.set('KeyJ',game.tick+1);step();if(!fi.cine)break;}
  const b=[fi.cine,fi.B.state];fi.B.lives=1;startExecution(fi.P,fi.B);for(let i=0;i<500&&!fi.done;i++){if(i%5===0)EDGE.set('KeyJ',game.tick+1);step();}
  return {a,b,scr:game.screen,unlock:$('#resUnlock').textContent,selos:SAVE.selos,qs:SAVE.quests};});
await pg.screenshot({path:'q_res.png'});
// missão com mods: sem cura e vida 40%
r.mods=await pg.evaluate(()=>{startQuest(QUESTS.find(q=>q.id==='t2'));const P=game.fight.P;return [P.hp,P.hpMax,P.heals];});
// eco visual e nome
r.echo=await pg.evaluate(()=>{startFight(Object.assign({floor:9},TOWER[9],{skipIntro:true}));const B=game.fight.B;return [B.info.name,B.echo,!!B.moveset.fury,B.id];});
await pg.waitForTimeout(800);await pg.screenshot({path:'q_echo.png'});
r.ara=await pg.evaluate(()=>{startFight(Object.assign({floor:15},TOWER[15]));return game.fight.cine&&game.fight.cine.type;});
await pg.waitForTimeout(400);for(let i=0;i<3;i++){await pg.keyboard.press('Enter');await pg.waitForTimeout(150);await pg.keyboard.press('Enter');await pg.waitForTimeout(300);}
await pg.waitForTimeout(600);await pg.screenshot({path:'q_ara.png'});
await pg.evaluate(()=>{startFight(Object.assign({floor:18},TOWER[18],{skipIntro:true}));});await pg.waitForTimeout(1200);await pg.screenshot({path:'q_eco.png'});
// evolução com selos
r.evo=await pg.evaluate(()=>{showScreen('evo');const u=upg();u.vit=5;SAVE.frag=5000;renderEvo();const btn=[...document.querySelectorAll('#evoList button')][0];const t=btn.textContent;btn.click();return [t,u.vit,SAVE.selos,SAVE.frag];});
console.log(JSON.stringify(r));console.log(errs);await b.close();})();
