const {chromium}=require('playwright');require('./pw3d.js');
(async()=>{const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1280,height:800}});const errs=[];pg.on('pageerror',e=>errs.push(e.message+' @'+(e.stack||'').split('\n').slice(1,3).join('|')));pg.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,300))});
await pg.goto('file:///home/user/pancadaria/index.html');await pg.evaluate(()=>localStorage.clear());await pg.reload();await pg.waitForTimeout(1200);
const floors=(process.argv[2]||'1').split(',').map(Number);
for(const fl of floors){
const r=await pg.evaluate(fl=>{
  SAVE.floor=Math.max(SAVE.floor,fl);startFight(Object.assign({floor:fl,skipIntro:true},TOWER[fl]));
  const fi=game.fight,P=fi.P,B=fi.B;const tap=k=>{EDGE.set(k,game.tick+1);};
  let guardHeld=false,log=[];
  for(let i=0;i<60*240&&!fi.done;i++){
    // robô: apara pelo tempo, ataca em aberturas, esquiva de agarrões, pula rasteiras
    KEYS.delete('KeyL');KEYS.delete('KeyW');
    const a=B.atk;
    if(B.state==='broken'&&P.dist(B)<250)tap('KeyJ');
    else if(B.state==='broken'){KEYS.add('KeyW');}
    else if(a&&B.state==='atk'){const T1=a.W+a.delay,left=T1-a.f;
      if(a.m.kind==='grab'||(a.m.kind==='sweep'&&false)){if(left===8)tap('ShiftLeft');}
      else if(a.m.kind==='sweep'){if(left===6)tap('Space');}
      else if(a.m.dmg||a.m.proj){KEYS.add('KeyL');if(left===3||(a.m.hits>1&&a.f>T1&&(a.f-T1)%Math.max(1,Math.round(a.m.act/a.m.hits))===0))tap('KeyL');}
      if(a.m.proj||a.m.aoe)KEYS.add('KeyL');}
    else if(fi.proj.length||fi.waves.length){KEYS.add('KeyL');if(fi.proj.some(p=>Math.hypot(p.x-P.x,p.z-P.z)<p.sp*3+40))tap('KeyL');}
    else{const d=P.dist(B);if(d>200)KEYS.add('KeyW');else if(P.state==='idle'||P.state==='atk')tap('KeyJ');}
    if(fi.death&&fi.death.t>35)tap('KeyJ');
    if(fi.cine&&fi.cine.type==='story'&&game.tick%4===0)tap('KeyJ');
    step();
  }
  KEYS.clear();
  return {cine:fi.cine&&[fi.cine.type,fi.cine.t],paused:game.paused,death:fi.death,ps:[P.state,P.st,B.state,B.st],fl,done:fi.done,t:fi.stats.t,stats:fi.stats,P:[P.state,P.hp|0,P.res],B:[B.id,B.state,B.hp|0,B.lives],scr:game.screen,rank:$('#resRank').textContent,save:{floor:SAVE.floor,frag:SAVE.frag,chars:SAVE.chars}};
},fl);
console.log(JSON.stringify(r));}
console.log(errs.slice(0,6));await b.close();})();
