const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1300,height:860}});
 const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
 await pg.goto('file:///home/user/pancadaria/index.html'); await pg.waitForTimeout(1500);
 await pg.screenshot({path:'t1.png'});
 const tap=async k=>{await pg.keyboard.down(k);await pg.waitForTimeout(50);await pg.keyboard.up(k);await pg.waitForTimeout(50);};
 await tap('KeyS'); await tap('KeyJ'); // Versus local
 await tap('KeyJ'); // join P1
 await tap('KeyD'); await tap('KeyD'); await tap('KeyJ'); // lock Iara
 await tap('Numpad1'); // join P2
 await pg.click('#btnCpu');
 await pg.waitForTimeout(300);
 await pg.screenshot({path:'t2.png'});
 await tap('Numpad1'); // lock P2
 await tap('Enter');
 await pg.waitForTimeout(300);
 await tap('KeyD'); await tap('KeyD'); await tap('KeyD');  // neon card
 await pg.waitForTimeout(800);
 await pg.screenshot({path:'t3.png'});
 await tap('KeyJ');
 await pg.waitForTimeout(500);
 for(let i=0;i<25;i++){for(const k of ['KeyD','KeyJ','Space','KeyK','KeyL','KeyA']){await tap(k);}}
 await pg.screenshot({path:'t4.png'});
 console.log(await pg.evaluate(()=>({screen:game.screen,map:STAGE.id,ps:game.players.map(p=>[p.legend.id,p.device.label,Math.round(p.damage),p.stocks])})));
 for(const i of [0,1]){await pg.evaluate(i=>{startWorld([{device:demoBots[0],legend:0},{device:demoBots[1],legend:3}],i,{mode:'stock',stocks:3},false);},i);await pg.waitForTimeout(2500);await pg.screenshot({path:'m'+i+'.png'});}
 console.log('errors',errs); await b.close();
})();
