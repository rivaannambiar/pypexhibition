import { firebaseConfigured, auth, db, rtdb } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';
import { ref as rtdbRef, get as rtdbGet, set as rtdbSet, update as rtdbUpdate, remove as rtdbRemove, push as rtdbPush, onValue, serverTimestamp as rtdbServerTimestamp, onDisconnect } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js';

// A small document/list adapter keeps page code tidy; every record and live update lives in Realtime Database.
// Paths are mapped to separate top-level RTDB branches so reading workspace metadata never exposes DMs.
function mapPath(parts) {
  const p = parts.filter(x => x !== undefined && x !== null && String(x) !== '').map(String);
  if (p[0] === 'workspaces' && p.length === 2) return ['workspaceInfo', p[1]];
  if (p[0] === 'workspaces' && p.length >= 3) {
    const wid = p[1], bucket = p[2], rest = p.slice(3);
    const aliases = { members:'members', project:'projects', messages:'messages', files:'files', fileContents:'fileContents', folders:'folders', roughbook:'roughbook', bookmarks:'bookmarks', history:'history', activity:'activity', invitations:'workspaceInvitations', chats:'chats', chatAccess:'chatAccess' };
    return [aliases[bucket] || bucket, wid, ...rest];
  }
  if (p[0] === 'users' && p.length === 2) return ['profiles', p[1]];
  return p;
}
const pathString = parts => mapPath(parts).join('/');
const makeRef = (path, kind='doc', constraints=[]) => ({ __rtdbRef:true, path, kind, constraints });
export function collection(_db,...parts) { if (parts[0]?.__rtdbRef) return makeRef(`${parts[0].path}/${parts.slice(1).join('/')}`,'collection'); return makeRef(pathString(parts),'collection'); }
export function doc(_db,...parts) {
  if (parts[0]?.__rtdbRef) return makeRef([parts[0].path,...parts.slice(1).map(String)].join('/'),'doc');
  return makeRef(pathString(parts),'doc');
}
export function where(field,op,value) { return {type:'where',field,op,value}; }
export function orderBy(field,direction='asc') { return {type:'orderBy',field,direction}; }
export function limit(count) { return {type:'limit',count:Math.max(0,Number(count)||0)}; }
export function query(target,...constraints) { return makeRef(target.path,target.kind,[...(target.constraints||[]),...constraints]); }
export const serverTimestamp = () => rtdbServerTimestamp();
function dataSnapshot(path,snapshot) {
  const value=snapshot.val();
  return { id:path.split('/').filter(Boolean).at(-1)||'', ref:makeRef(path,'doc'), exists:()=>snapshot.exists(), data:()=>value, val:()=>value };
}
function childSnapshot(path,id,value) {
  const val=value && typeof value==='object' ? value : value;
  return { id, ref:makeRef(`${path}/${id}`,'doc'), exists:()=>val!==null && val!==undefined, data:()=>val, val:()=>val };
}
function shapeQuery(path,value,constraints=[]) {
  let entries=Object.entries(value && typeof value==='object' ? value : {}).map(([id,v])=>childSnapshot(path,id,v));
  for(const c of constraints){
    if(c.type==='where') entries=entries.filter(s=>{const value=s.data()?.[c.field];return c.op==='=='?value===c.value:c.op==='!='?value!==c.value:c.op==='in'&&Array.isArray(c.value)?c.value.includes(value):true});
    if(c.type==='orderBy') entries.sort((a,b)=>{const av=a.data()?.[c.field],bv=b.data()?.[c.field];const cmp=av===bv?0:av==null? -1:bv==null?1:av>bv?1:-1;return c.direction==='desc'?-cmp:cmp});
    if(c.type==='limit') entries=entries.slice(0,c.count);
  }
  return { docs:entries, empty:entries.length===0, size:entries.length, forEach(fn){entries.forEach(fn)} };
}
export async function getDoc(reference) { const s=await rtdbGet(rtdbRef(db,reference.path)); return dataSnapshot(reference.path,s); }
export async function getDocs(reference) { const s=await rtdbGet(rtdbRef(db,reference.path)); return shapeQuery(reference.path,s.val(),reference.constraints); }
export async function setDoc(reference,value,options={}) {
  const target=rtdbRef(db,reference.path);
  if(options?.merge){await rtdbUpdate(target,value)}else await rtdbSet(target,value);
}
export async function addDoc(reference,value) { const target=rtdbPush(rtdbRef(db,reference.path)); await rtdbSet(target,value); return {id:target.key,path:`${reference.path}/${target.key}`}; }
export async function updateDoc(reference,value) { await rtdbUpdate(rtdbRef(db,reference.path),value); }
export async function deleteDoc(reference) { await rtdbRemove(rtdbRef(db,reference.path)); }
export function onSnapshot(reference,next,error) {
  return onValue(rtdbRef(db,reference.path),snap=>{
    if(reference.kind==='collection') next(shapeQuery(reference.path,snap.val(),reference.constraints));
    else next(dataSnapshot(reference.path,snap));
  },error);
}
export {
  firebaseConfigured,
  auth,
  db,
  rtdb,
  rtdbRef as ref,
  rtdbGet as get,
  rtdbSet as set,
  rtdbUpdate as update,
  rtdbRemove as remove,
  rtdbPush as push,
  onValue,
  onDisconnect,
  rtdbServerTimestamp,
  signOut
};
export const demoMode = () => !firebaseConfigured || localStorage.getItem('exw_demo_mode') === 'true';
export function toast(message, type='') {
  let region=document.querySelector('.toast-region');
  if(!region){region=document.createElement('div');region.className='toast-region';region.setAttribute('aria-live','polite');document.body.append(region)}
  const item=document.createElement('div');item.className=`toast ${type}`;item.textContent=message;region.append(item);
  window.setTimeout(()=>{item.style.opacity='0';item.style.transform='translateY(6px)';window.setTimeout(()=>item.remove(),220)},3300);
}
export function escapeHtml(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
export function initials(name='Member'){return name.trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase()||'M'}
export function safeColor(value,fallback='#a9f06a'){const color=String(value||'');return /^#[0-9a-f]{6}$/i.test(color)?color:fallback}
export function formatDate(value){let d=value?.toDate?value.toDate():new Date(value||Date.now());if(Number.isNaN(d.getTime()))return 'Just now';return d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:d.getFullYear()!==new Date().getFullYear()?'numeric':undefined})}
export function timeAgo(value){let d=value?.toDate?value.toDate():new Date(value||Date.now()),s=Math.max(0,(Date.now()-d.getTime())/1000);if(s<60)return 'just now';if(s<3600)return `${Math.floor(s/60)}m ago`;if(s<86400)return `${Math.floor(s/3600)}h ago`;if(s<604800)return `${Math.floor(s/86400)}d ago`;return formatDate(d)}
export function readDemo(key,fallback=[]){try{const v=JSON.parse(localStorage.getItem('exw_demo_'+key));return v??fallback}catch{return fallback}}
export function writeDemo(key,value){localStorage.setItem('exw_demo_'+key,JSON.stringify(value));return value}
export function demoUser(){let user=readDemo('user',null);if(!user){user={uid:'demo-rivaan',displayName:'Rivaan',email:'you@example.com',color:'#a9f06a',role:'owner'};writeDemo('user',user)}return user}
export function seedDemo(){if(!localStorage.getItem('exw_demo_seeded')){
 const user=demoUser();
 writeDemo('members',[{uid:user.uid,displayName:user.displayName,email:user.email,color:'#a9f06a',role:'owner',joinedAt:Date.now()},{uid:'demo-member-1',displayName:'Aarav Shah',email:'aarav@example.com',color:'#a99bff',role:'member',joinedAt:Date.now()},{uid:'demo-member-2',displayName:'Mira Patel',email:'mira@example.com',color:'#75e5d1',role:'member',joinedAt:Date.now()},{uid:'demo-member-3',displayName:'Kabir Rao',email:'kabir@example.com',color:'#ff9cc9',role:'member',joinedAt:Date.now()}]);
 writeDemo('project',{name:'PYP Exhibition',centralIdea:'Our central idea goes here — replace this with your group’s inquiry.',theme:'Sharing the planet',lines:['What is the issue and why does it matter?','What causes it, and who is affected?','What actions can create meaningful change?'],keyConcepts:['Causation','Connection','Responsibility'],learnerProfile:['Inquirers','Thinkers','Communicators'],sdg:'',padletEmbed:'',padletUrl:'',actionPlan:'',weeklyGoal:'Review research and agree on the next step.',updatedAt:Date.now()});
 writeDemo('messages',[{id:'demo-msg-1',threadId:'group',uid:'demo-member-1',name:'Aarav Shah',color:'#a99bff',text:'I found a source that might connect to our second line of inquiry. Adding it to the research browser now.',createdAt:Date.now()-7200000},{id:'demo-msg-2',threadId:'group',uid:'demo-member-2',name:'Mira Patel',color:'#75e5d1',text:'Nice! Let’s compare it with the interview notes this weekend.',createdAt:Date.now()-6800000},{id:'demo-msg-3',threadId:'dm-demo-member-1',uid:user.uid,name:user.displayName,color:user.color,text:'I’ll bring the updated notes to our next session.',createdAt:Date.now()-3600000}]);
 writeDemo('folders',[{id:'root-research',name:'Research',parentId:null,createdAt:Date.now()},{id:'root-interviews',name:'Interviews',parentId:null,createdAt:Date.now()},{id:'root-presentation',name:'Presentation',parentId:null,createdAt:Date.now()},{id:'root-images',name:'Images & media',parentId:null,createdAt:Date.now()}]);writeDemo('files',[]);writeDemo('roughbook',[{id:'rough-demo-1',title:'A question to follow up',text:'What would count as strong evidence for this claim?\n\nFind another source that disagrees, too.',sourceTitle:'Personal note',sourceUrl:'',createdAt:Date.now()-86400000,updatedAt:Date.now()-86400000,uid:user.uid}]);writeDemo('bookmarks',[]);writeDemo('history',[]);writeDemo('events',[{id:'event-1',text:'Workspace demo is ready to explore',actor:'Workspace',createdAt:Date.now()-1800000}]);writeDemo('invites',[]);writeDemo('presence',{});localStorage.setItem('exw_demo_seeded','true');}}
export function currentDemoContext(){seedDemo();const u=demoUser();const members=readDemo('members',[]);return {demo:true,user:u,workspaceId:'demo-workspace',workspace:{name:'PYP Exhibition',ownerUid:u.uid},members,member:members.find(m=>m.uid===u.uid)||u}}
let authResolver;
export const authReady=new Promise(resolve=>authResolver=resolve);
if(firebaseConfigured){onAuthStateChanged(auth,user=>authResolver({user,unverified:false}))}else authResolver({user:null,unverified:false});
export async function getWorkspaceContext(){if(demoMode())return currentDemoContext();const state=await authReady;if(!state.user)return {demo:false,user:null,workspaceId:null,members:[]};const uid=state.user.uid;try{const links=await getDocs(collection(db,'users',uid,'workspaces'));if(links.empty)return {demo:false,user:state.user,workspaceId:null,members:[]};let picked=null;for(const link of links.docs){const w=await getDoc(doc(db,'workspaces',link.id));if(w.exists()){picked={id:w.id,...w.data()};break}}if(!picked)return {demo:false,user:state.user,workspaceId:null,members:[]};const memberDocs=await getDocs(collection(db,'workspaces',picked.id,'members'));const members=memberDocs.docs.map(d=>({uid:d.id,...d.data()}));return {demo:false,user:state.user,workspaceId:picked.id,workspace:picked,members,member:members.find(m=>m.uid===uid)}}catch(error){console.error(error);return {demo:false,user:state.user,workspaceId:null,members:[],error}}}
export async function logActivity(ctx,text,kind='update'){const event={text,kind,actor:ctx.member?.displayName||ctx.user?.displayName||'A member',uid:ctx.user?.uid||'demo',color:ctx.member?.color||'#75e5d1',createdAt:Date.now()};if(ctx.demo){const events=readDemo('events',[]);events.unshift({id:crypto.randomUUID(),...event});writeDemo('events',events.slice(0,80));return}try{await addDoc(collection(db,'workspaces',ctx.workspaceId,'activity'),{...event,createdAt:serverTimestamp()})}catch(e){console.warn('Activity event not saved',e)}}
export async function startCollaboration(ctx){if(ctx.demo||!rtdb||!ctx.workspaceId||!ctx.user)return ()=>{};const uid=ctx.user.uid,wid=ctx.workspaceId;const connected=rtdbRef(rtdb,'.info/connected');let cursorRef;const unsub=onValue(connected,async snap=>{if(!snap.val())return;const session=rtdbPush(rtdbRef(rtdb,`presence/${wid}/${uid}`));await onDisconnect(session).remove();await rtdbSet(session,{name:ctx.member?.displayName||ctx.user.displayName||'Member',color:safeColor(ctx.member?.color,'#a9f06a'),state:'online',lastActive:rtdbServerTimestamp()});cursorRef=rtdbRef(rtdb,`cursors/${wid}/${uid}`);await onDisconnect(cursorRef).remove();await rtdbSet(cursorRef,{x:0,y:0,name:ctx.member?.displayName||ctx.user.displayName||'Member',color:safeColor(ctx.member?.color,'#a9f06a'),active:false,updatedAt:rtdbServerTimestamp()});});let lastCursorWrite=0;const shareCursor=localStorage.getItem('exw_presence')!=='false';const onMove=e=>{if(!cursorRef||!shareCursor)return;const now=Date.now();if(now-lastCursorWrite<80)return;lastCursorWrite=now;rtdbSet(cursorRef,{x:e.clientX,y:e.clientY,name:ctx.member?.displayName||ctx.user.displayName||'Member',color:safeColor(ctx.member?.color,'#a9f06a'),active:true,updatedAt:rtdbServerTimestamp()}).catch(()=>{})};const onLeave=()=>cursorRef&&rtdbSet(cursorRef,{x:0,y:0,name:ctx.member?.displayName||ctx.user.displayName||'Member',color:safeColor(ctx.member?.color,'#a9f06a'),active:false,updatedAt:rtdbServerTimestamp()}).catch(()=>{});if(shareCursor)window.addEventListener('pointermove',onMove,{passive:true});window.addEventListener('blur',onLeave);const cursorLayer=document.createElement('div');cursorLayer.className='cursor-layer';cursorLayer.setAttribute('aria-hidden','true');document.body.append(cursorLayer);const cursorUnsubs=[];const presenceUnsubs=[];for(const member of ctx.members){if(member.uid===uid)continue;const pr=rtdbRef(rtdb,`presence/${wid}/${member.uid}`);presenceUnsubs.push(onValue(pr,snap=>{const value=snap.val();const online=!!(value&&Object.keys(value).length);document.querySelectorAll(`[data-online-uid="${CSS.escape(member.uid)}"]`).forEach(el=>{el.classList.toggle('is-online',online);const label=el.querySelector('.tiny');if(label)label.textContent=online?'Online':'Offline';el.querySelector('.online-dot')?.classList.toggle('hidden',!online)});}));const cr=rtdbRef(rtdb,`cursors/${wid}/${member.uid}`);cursorUnsubs.push(onValue(cr,snap=>{let el=cursorLayer.querySelector(`[data-uid="${CSS.escape(member.uid)}"]`);const v=snap.val();if(!v||!v.active){el?.remove();return}if(!el){el=document.createElement('div');el.className='remote-cursor';el.dataset.uid=member.uid;el.innerHTML='<svg viewBox="0 0 20 24" aria-hidden="true"><path d="M2 1 L2 20 L7 15 L11 23 L15 21 L11 13 L18 13 Z" fill="var(--cursor-color)" stroke="#080a0f" stroke-width="1.2"/></svg><span></span>';cursorLayer.append(el)}el.style.setProperty('--cursor-color',safeColor(v.color||member.color,'#a9f06a'));el.style.transform=`translate(${Math.max(0,Math.min(innerWidth-30,v.x))}px,${Math.max(0,Math.min(innerHeight-30,v.y))}px)`;el.querySelector('span').textContent=v.name||member.displayName||'Member';}));}return ()=>{unsub();cursorUnsubs.forEach(f=>f());presenceUnsubs.forEach(f=>f());window.removeEventListener('pointermove',onMove);window.removeEventListener('blur',onLeave);cursorLayer.remove();if(cursorRef)rtdbRemove(cursorRef).catch(()=>{})}}
