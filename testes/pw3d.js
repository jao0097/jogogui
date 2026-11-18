// pré-carregado com node -r: toda página nova serve o Three.js local (a CDN é bloqueada no container)
const pw=require('playwright'),route=require('./route.js');
const L=pw.chromium.launch.bind(pw.chromium);
pw.chromium.launch=async(o={})=>{o=Object.assign({},o);delete o.executablePath;o.args=(o.args||[]).concat(['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']);
  const b=await L(o);const np=b.newPage.bind(b);b.newPage=async(...a)=>{const pg=await np(...a);await route(pg);await pg.addInitScript(()=>{window.__noAdapt=1;});return pg;};
  const nc=b.newContext.bind(b);b.newContext=async(...a)=>{const c=await nc(...a);const cp=c.newPage.bind(c);c.newPage=async()=>{const pg=await cp();await route(pg);return pg;};return c;};return b;};
