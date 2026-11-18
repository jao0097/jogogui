const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const pg=await b.newPage({viewport:{width:1300,height:860},deviceScaleFactor:2});
 await pg.goto('file:///home/user/pancadaria/index.html');await pg.waitForTimeout(800);
 const r=await pg.evaluate(()=>{
   const out={};const flush=()=>mainCtx.getImageData(0,0,1,1);
   for(let m=0;m<MAPS.length;m++){
     const d=[new BotDevice(),new BotDevice(),new BotDevice(),new BotDevice()];
     startWorld(d.map((x,i)=>({device:x,legend:i})),m,{mode:'stock',stocks:3},false);game.screen='fight';
     for(let i=0;i<120;i++)step();render();flush();
     const k=CW/VW;const T=(fn,n=20)=>{flush();const t=performance.now();for(let i=0;i<n;i++){fn();flush();}return +((performance.now()-t)/n).toFixed(1);};
     const W=()=>{ctx=mainCtx;ctx.save();ctx.translate(CW/2,CH/2);ctx.scale(k*cam.z,k*cam.z);ctx.translate(-cam.x,-cam.y);};
     out[MAPS[m].id]={total:T(render),bg:T(()=>{ctx=mainCtx;ctx.setTransform(1,0,0,1,0,0);STAGE.bg(k,CW,CH);}),
       stage:T(()=>{W();STAGE.stage();ctx.restore();}),fg:T(()=>{ctx=mainCtx;STAGE.fg&&STAGE.fg(k,CW,CH);}),
       players:T(()=>{W();for(const p of game.players)drawPlayer(p);ctx.restore();}),vig:T(()=>{ctx=mainCtx;vignette(CW,CH);}),hud:T(()=>drawHud(k)),cw:CW};
   }
   return out;});
 console.log(JSON.stringify(r));await b.close();
})();
