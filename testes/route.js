const path=require('path'),fs=require('fs');
const BASE=process.env.THREE_DIR||'/tmp/three/package/'; // pasta do pacote three@0.128.0 (npm pack three@0.128.0)
module.exports=async pg=>{
  await pg.route(/three(\.min)?\.js$|examples\/js\//,r=>{const u=r.request().url();let f;
    if(u.includes('three.min.js'))f=BASE+'build/three.min.js';else f=BASE+u.split('three@0.128.0/')[1];
    r.fulfill({body:fs.readFileSync(f),contentType:'application/javascript'});});
};
