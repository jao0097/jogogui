(()=>{
const UID=window.__UID;
const bc=new BroadcastChannel('mockdb');const listeners=new Set();
const load=()=>JSON.parse(localStorage.getItem('mockdb')||'{}');
const save=s=>{localStorage.setItem('mockdb',JSON.stringify(s));bc.postMessage(1);listeners.forEach(f=>f());};
bc.onmessage=()=>listeners.forEach(f=>f());
const merge=(a,b)=>{const o=Object.assign({},a);for(const k in b){const v=b[k];o[k]=(v&&typeof v==='object'&&!Array.isArray(v)&&o[k]&&typeof o[k]==='object')?merge(o[k],v):v;}return o;};
const snapDoc=(path)=>{const d=load()[path];return {id:path.split('/').pop(),exists:!!d,data:()=>d,metadata:{}};};
const db={
 doc(path){return {id:path.split('/').pop(),path,
  get:async()=>snapDoc(path),
  set:async d=>{const s=load();s[path]=JSON.parse(JSON.stringify(d));save(s);},
  update:async d=>{const s=load();if(!s[path])throw {code:'invalid_argument'};s[path]=merge(s[path],JSON.parse(JSON.stringify(d)));save(s);},
  delete:async()=>{const s=load();delete s[path];save(s);},
  onSnapshot(n){const f=()=>n(snapDoc(path));listeners.add(f);setTimeout(f,0);return ()=>listeners.delete(f);}};},
 collection(path){const q={orderBy:()=>q,limit:()=>q,where:()=>q,
   get:async()=>run(),onSnapshot(n){const f=()=>n(run());listeners.add(f);setTimeout(f,0);return ()=>listeners.delete(f);}};
   const run=()=>{const s=load();const docs=Object.keys(s).filter(k=>k.startsWith(path+'/')&&k.split('/').length===path.split('/').length+1).map(snapDoc).sort((a,b)=>(b.data().created||0)-(a.data().created||0));return {docs,size:docs.length,empty:!docs.length,docChanges:()=>[],metadata:{}};};
   return q;}
};
const user={id:async()=>UID,isOwner:async()=>false,canEdit:async()=>false,can:async()=>true,me:async()=>({id:UID})};
const peerId=Math.random().toString(36).slice(2,8);
const room={join:async name=>{
  const ch=new BroadcastChannel('room-'+name);let me={};const others=new Map();const subs=new Set();let snap=[];
  const rebuild=()=>{snap=Object.freeze([{peer:peerId,isMe:true,sameTab:true,presence:me},...[...others].map(([p,pr])=>({peer:p,isMe:false,sameTab:false,presence:pr}))]);subs.forEach(f=>f({peers:snap,joined:[],left:[],updated:[]}));};
  ch.onmessage=e=>{const m=e.data;if(m.t==='p'){others.set(m.peer,m.presence);rebuild();}else if(m.t==='hello'){ch.postMessage({t:'p',peer:peerId,presence:me});}else if(m.t==='bye'){others.delete(m.peer);rebuild();}};
  ch.postMessage({t:'hello'});
  return {name,presence:async patch=>{me=Object.assign({},me,patch);ch.postMessage({t:'p',peer:peerId,presence:me});rebuild();},
    peers:()=>snap,onPeers(f){subs.add(f);setTimeout(()=>f({peers:snap,joined:snap,left:[],updated:[]}),0);return ()=>subs.delete(f);},
    leave:async()=>{ch.postMessage({t:'bye',peer:peerId});ch.close();},connected:()=>true,emit:async()=>{},on:()=>()=>{}};
}};
window.claude={use:async n=>({db,user,room})[n]||null};
})();
