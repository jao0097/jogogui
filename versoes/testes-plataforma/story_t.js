const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1300,height:860}});const errs=[];pg.on('pageerror',e=>errs.push(e.message+' @'+(e.stack||'').split('\n')[1]));
 await pg.goto('file:///home/user/pancadaria/index.html');await pg.evaluate(()=>localStorage.clear());await pg.reload();await pg.waitForTimeout(1200);
 const out={};
 await pg.click('[data-go="story"]');await pg.waitForTimeout(300);
 out.s1=await pg.evaluate(()=>game.screen);
 await pg.waitForTimeout(700);await pg.screenshot({path:'c1.png'});
 // avança até a fala do Varek com ゴゴゴ (beat 5)
 for(let i=0;i<10;i++){await pg.keyboard.press('KeyJ');await pg.waitForTimeout(60);}
 await pg.evaluate(()=>{CUT.i=5;beatStart();});await pg.waitForTimeout(900);await pg.screenshot({path:'c2.png'});
 await pg.evaluate(()=>{CUT.i=7;beatStart();});await pg.waitForTimeout(500);await pg.screenshot({path:'c3.png'});
 await pg.keyboard.press('Escape');await pg.waitForTimeout(300);
 out.s2=await pg.evaluate(()=>({scr:game.screen,p:game.players.map(p=>[p.legend.id,p.stocks,p.device.kind,p.weapon])}));
 await pg.waitForTimeout(1500);await pg.screenshot({path:'c4.png'});
 // vence: derruba Varek
 await pg.evaluate(()=>{game.players[1].x=5000;});await pg.waitForTimeout(4500);
 out.s3=await pg.evaluate(()=>({scr:game.screen,title:$('#seTitle').textContent}));
 await pg.click('#seNext');await pg.waitForTimeout(300);await pg.keyboard.press('Escape');await pg.waitForTimeout(400);
 out.s4=await pg.evaluate(()=>({scr:game.screen,save:SAVE,mapsUnlocked:MAPS.filter(m=>!m.locked).map(m=>m.id)}));
 await pg.screenshot({path:'c5.png'});
 // pula para o final
 await pg.evaluate(()=>{SAVE.done=['prologo','aeris','nordheim','arena','docas','shirayuki','lunaria'];SAVE.lore=Object.keys(LORE);saveGame();renderStory();});
 await pg.screenshot({path:'c6.png'});
 await pg.evaluate(()=>startNode(NODES.find(n=>n.id==='fenda')));await pg.waitForTimeout(200);await pg.keyboard.press('Escape');await pg.waitForTimeout(400);
 out.s5=await pg.evaluate(()=>({scr:game.screen,p:game.players.map(p=>[p.legend.id,p.stocks,p.weapon])}));
 await pg.evaluate(()=>{game.players[1].x=5000;});await pg.waitForTimeout(2200);
 out.s6=await pg.evaluate(()=>({scr:game.screen,phase2:game.story&&game.story.phase2,mid:CUT.mid}));
 await pg.screenshot({path:'c7.png'});
 await pg.keyboard.press('Escape');await pg.waitForTimeout(3500);
 out.s7=await pg.evaluate(()=>({scr:game.screen,v:game.players[1]&&[game.players[1].phase2,game.players[1].legend.speed,game.players[1].stocks],hz:game.story&&game.story.hz.length}));
 await pg.screenshot({path:'c8.png'});
 await pg.evaluate(()=>{game.players[1].x=5000;});await pg.waitForTimeout(4500);
 out.s8=await pg.evaluate(()=>({scr:game.screen,title:$('#seTitle').textContent}));
 await pg.click('#seNext');await pg.waitForTimeout(200);await pg.keyboard.press('Escape');await pg.waitForTimeout(400);
 out.s9=await pg.evaluate(()=>({scr:game.screen,legends:LEGENDS.map(l=>l.id),maps:availMaps().map(i=>MAPS[i].id),tiles:document.querySelectorAll('.tile').length}));
 await pg.evaluate(()=>showScreen('lore'));await pg.waitForTimeout(200);await pg.screenshot({path:'c9.png'});
 console.log(JSON.stringify(out,null,1));console.log(errs);await b.close();
})();
