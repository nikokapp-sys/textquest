'use strict';
(() => {
const canvas=document.getElementById('world'),ctx=canvas.getContext('2d'),W=1200,H=760;
const rooms=[{x:60,y:76,w:450,h:280,door:390,side:'bottom',zone:0,label:'KLASSENZIMMER 10b',sub:'Herr Kapp · Sachtexte',floor:'#e6dfc5',accent:'#6e8c64'},
{x:734,y:76,w:406,h:280,door:854,side:'bottom',zone:1,label:'SCHULSOZIALARBEIT',sub:'Sprachwerkstatt · Rechtschreibung',floor:'#e4dfc9',accent:'#b47a57'},
{x:734,y:464,w:406,h:250,door:854,side:'top',zone:2,label:'LEHRERZIMMER',sub:'Satzwerkstatt · Kommasetzung',floor:'#dbe4d3',accent:'#668b96'},
{x:60,y:464,w:450,h:250,door:390,side:'top',zone:3,label:'SCHULBIBLIOTHEK',sub:'Das versiegelte Wissensarchiv',floor:'#e4ddc2',accent:'#97865b'}];
const stations=[{x:280,y:166,z:0},{x:1008,y:223,z:1},{x:1020,y:603,z:2},{x:194,y:587,z:3}];
const obstacles=[];
// Furniture is part of the walkable world, not merely a background image.
for(const x of [105,235,365])for(const y of [235,295])obstacles.push({x,y,w:76,h:27,type:'desk'});
obstacles.push({x:111,y:139,w:83,h:36,type:'teacher'}, {x:1090,y:137,w:28,h:116,type:'shelf'}, {x:764,y:118,w:130,h:42,type:'sofa'}, {x:778,y:222,w:105,h:43,type:'table'}, {x:779,y:559,w:150,h:60,type:'stafftable'}, {x:1060,y:661,w:57,h:30,type:'cabinet'}, {x:88,y:492,w:28,h:177,type:'shelf'},{x:154,y:492,w:194,h:28,type:'shelf'},{x:450,y:493,w:28,h:177,type:'shelf'},{x:283,y:605,w:113,h:48,type:'librarytable'});
let player={x:state.player?.x||600,y:state.player?.y||410},keys={},route=[],last=0,nearest=null,moving=false,saveAt=0,face=1;
let reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
window.toggleMotion=()=>{reduce=!reduce;toast(reduce?'Animationen reduziert.':'Animationen aktiviert.')};
const terrain=document.createElement('canvas');terrain.width=W;terrain.height=H;const g=terrain.getContext('2d');
function rect(c,x,y,w,h,cx=ctx){cx.fillStyle=c;cx.fillRect(Math.round(x),Math.round(y),w,h)}
function rounded(cx,x,y,w,h,r,c){cx.fillStyle=c;cx.beginPath();cx.roundRect(x,y,w,h,r);cx.fill()}
function text(cx,s,x,y,size=12,color='#3a5746',align='center',bold=false){cx.fillStyle=color;cx.font=(bold?'bold ':'')+size+'px ui-sans-serif,system-ui';cx.textAlign=align;cx.fillText(s,x,y)}
function plant(x,y,cx=g){rect('#455d4222',x-13,y+7,28,9,cx);rect('#b88e65',x-8,y-3,17,17,cx);rect('#51764d',x-15,y-15,30,17,cx);rect('#6c9159',x-10,y-24,20,17,cx);rect('#92a96a',x-3,y-28,9,18,cx)}
function chair(x,y,color='#71866a',cx=g){rect('#36483c18',x-1,y+5,22,18,cx);rect('#535b48',x+2,y+10,3,13,cx);rect('#535b48',x+15,y+10,3,13,cx);rect(color,x,y,21,14,cx);rect(color,x,y+13,21,5,cx)}
function desk(o,cx=g){rect('#4b543e25',o.x+4,o.y+5,o.w,o.h,cx);rect('#ae946b',o.x,o.y,o.w,o.h,cx);rect('#d6be8e',o.x+2,o.y+2,o.w-4,o.h-5,cx);rect('#ead6ac',o.x+4,o.y+3,o.w-8,3,cx)}
function initTerrain(){rect('#819778',0,0,W,H,g);rect('#647d66',34,45,1132,690,g);rect('#bdc8ac',42,53,1116,674,g);rect('#e2e4d3',50,364,1100,92,g);rect('#d3dbc4',518,61,208,661,g);
// Central hallway tilework and guiding line.
for(let x=50;x<1150;x+=40)for(let y=365;y<455;y+=40){rect('#d4d9c5',x,y,39,1,g);rect('#d4d9c5',x,y,1,39,g)}
rect('#9eb18e',52,404,1096,4,g);rect('#c7d0b8',576,62,88,658,g);
for(const r of rooms){rect('#586f57',r.x-8,r.y-8,r.w+16,r.h+16,g);rect(r.floor,r.x,r.y,r.w,r.h,g);for(let y=r.y;y<r.y+r.h;y+=26){rect('#c6bea122',r.x,y,r.w,1,g);for(let x=r.x+((y%52)?0:48);x<r.x+r.w;x+=96)rect('#c6bea122',x,y,1,26,g)}
// Door thresholds are genuine gaps in the collision walls.
const dy=r.side==='bottom'?r.y+r.h-2:r.y-8;rect('#e2e4d3',r.door-41,dy,82,13,g);rect('#b4a67e',r.door-40,dy+4,80,4,g);
// Windows on outside walls.
if(r.side==='bottom'){for(let x=r.x+46;x<r.x+r.w-20;x+=122){rect('#829e94',x,r.y-10,68,12,g);rect('#c0d7c0',x+3,r.y-7,29,6,g);rect('#c0d7c0',x+36,r.y-7,29,6,g)}}else{for(let x=r.x+46;x<r.x+r.w-20;x+=122){rect('#829e94',x,r.y+r.h-2,68,12,g);rect('#c0d7c0',x+3,r.y+r.h+1,29,6,g);rect('#c0d7c0',x+36,r.y+r.h+1,29,6,g)}}
const ly=r.zone<2?r.y+29:r.y+r.h-23;rounded(g,r.x+14,ly-17,r.w-28,25,3,'#f8f4e5');text(g,r.label,r.x+r.w/2,ly,13,'#385541','center',true)}
// Classroom whiteboard, ledge and today's lesson.
rect('#b3aa82',206,106,206,31,g);rect('#f3f4df',210,109,198,23,g);text(g,'SACHTEXTE · BELEGE · STRATEGIEN',309,124,9,'#4d6752');rect('#917958',204,135,210,4,g);
// Classroom display: identifies the teacher explicitly inside the room.
text(g,'DEUTSCH · KLASSE 10b',112,199,9,'#617259','left',true);
for(const o of obstacles){if(['desk','teacher','table','stafftable','librarytable'].includes(o.type)){desk(o,g);if(o.type==='desk'){chair(o.x+6,o.y+31,'#7a8b65',g);chair(o.x+48,o.y+31,'#7a8b65',g);rect('#f8f1d6',o.x+10,o.y+6,19,12,g);rect('#73866b',o.x+43,o.y+5,18,14,g)}else if(o.type==='teacher'){rect('#315b4c',o.x+14,o.y+4,27,18,g);rect('#e9e3bc',o.x+47,o.y+6,23,14,g)}else{rect('#f5edcf',o.x+15,o.y+8,24,18,g);rect('#718b70',o.x+51,o.y+12,26,16,g)}}
else if(o.type==='shelf'){rect('#6f7351',o.x,o.y,o.w,o.h,g);rect('#a38c60',o.x+3,o.y+3,o.w-6,o.h-6,g);if(o.w>o.h){for(let x=o.x+7;x<o.x+o.w-6;x+=9)rect(['#6c8974','#bd9867','#b67357','#ccc49c'][Math.floor(x)%4],x,o.y+7,6,o.h-12,g)}else{for(let y=o.y+6;y<o.y+o.h-8;y+=12)rect(['#6c8974','#bd9867','#b67357','#ccc49c'][Math.floor(y)%4],o.x+6,y,o.w-12,9,g)}}
else if(o.type==='sofa'){rounded(g,o.x,o.y,o.w,o.h,5,'#ba8863');rect('#d4aa7d',o.x+6,o.y+7,o.w-12,o.h-14,g);rect('#ac795a',o.x+o.w/2,o.y+7,3,o.h-14,g)}else if(o.type==='cabinet'){rect('#a8936b',o.x,o.y,o.w,o.h,g);rect('#d5be8e',o.x+3,o.y+3,o.w-6,o.h-6,g)}}
// Calm meeting area and staff room details.
chair(797,270,'#b98f66',g);chair(850,270,'#b98f66',g);chair(800,533,'#718c8b',g);chair(850,533,'#718c8b',g);chair(800,626,'#718c8b',g);chair(850,626,'#718c8b',g);
rect('#d2c4a0',954,491,155,53,g);rect('#f2ead0',958,495,147,45,g);text(g,'SATZWERKSTATT',1031,516,10,'#536e63','center',true);text(g,'Wo endet dein Nebensatz?',1031,532,9,'#6a7b69');
[[916,122],[705,93],[548,694],[1110,327],[90,329],[1097,626],[140,671]].forEach(([x,y])=>plant(x,y,g));
// Hallway noticeboard, bench, entrance and central school emblem.
rect('#937d59',549,112,141,67,g);rect('#cabd8f',554,117,131,57,g);rect('#f3ebcd',564,126,48,31,g);rect('#dbe7c1',625,131,46,28,g);text(g,'DEIN SCHULABENTEUER',620,207,10,'#5e7559','center',true);
rect('#9e9069',561,255,120,16,g);rect('#c4b58a',561,250,120,8,g);rect('#798468',571,271,7,10,g);rect('#798468',663,271,7,10,g);
rounded(g,568,559,105,65,5,'#b1bea0');text(g,'TEXTQUEST',620,588,13,'#4b6c50','center',true);text(g,'10 M',620,608,11,'#65835b');
text(g,'SCHULFLUR',620,383,10,'#698062','center',true);text(g,'EINGANG',620,696,10,'#698062','center',true);
}
function blocked(x,y){if(x<51||x>1149||y<61||y>721)return true;
for(const r of rooms){const wall=9;const inOuter=x>r.x-wall&&x<r.x+r.w+wall&&y>r.y-wall&&y<r.y+r.h+wall;const inside=x>r.x+8&&x<r.x+r.w-8&&y>r.y+8&&y<r.y+r.h-8;if(inOuter&&!inside){const throughDoor=Math.abs(x-r.door)<32&&(r.side==='bottom'?y>r.y+r.h-12&&y<r.y+r.h+wall:y>r.y-wall&&y<r.y+12);if(!throughDoor)return true;if(r.zone===3&&!unlocked())return true}}
return obstacles.some(o=>x>o.x-7&&x<o.x+o.w+7&&y>o.y-7&&y<o.y+o.h+7)}
function findRoute(tx,ty){const size=20,cols=W/size,rows=H/size,start=[Math.floor(player.x/size),Math.floor(player.y/size)],goal=[Math.floor(tx/size),Math.floor(ty/size)],code=(x,y)=>y*cols+x,sk=code(...start),gk=code(...goal),queue=[start],seen=new Set([sk]),parent={};let reached=false;
for(let q=0;q<queue.length;q++){const [x,y]=queue[q],k=code(x,y);if(k===gk){reached=true;break}for(const [dx,dy]of [[0,1],[1,0],[0,-1],[-1,0]]){const nx=x+dx,ny=y+dy,nk=code(nx,ny);if(nx<0||nx>=cols||ny<0||ny>=rows||seen.has(nk)||blocked(nx*size+10,ny*size+10))continue;seen.add(nk);parent[nk]=k;queue.push([nx,ny])}}
if(!reached){toast('Tippe auf einen freien Bodenbereich. Betritt Räume durch die Tür; die Bibliothek braucht alle drei Schlüssel.');return}const r=[];let p=gk;while(p!==sk){r.push({x:(p%cols)*size+10,y:Math.floor(p/cols)*size+10});p=parent[p];if(p===undefined)return}route=r.reverse()}
function person(x,y,z,isPlayer,time){const colors=isPlayer?['#4d513b','#3f695c']:z===0?['#594e42','#365d66']:z===1?['#7d5844','#bd855c']:['#625649','#7a8b78'];rect('#283d3428',x-11,y+13,25,8);const step=isPlayer&&moving&&!reduce?Math.sin(time/95)*3:0;rect('#424f42',x-7,y+9,6,11+step);rect('#424f42',x+3,y+9,6,11-step);rect(colors[1],x-8,y-7,18,20);rect('#ecc39c',x-7,y-23,15,16);rect(colors[0],x-8,y-26,18,8);rect('#ecc39c',x-12,y-3,4,11);rect('#ecc39c',x+10,y-3,4,11);rect('#314537',x+(isPlayer&&face<0?-4:3),y-16,2,2);if(z===0&&!isPlayer){rect('#dce4c9',x-2,y-5,4,17);rect('#f4ecd3',x+10,y+3,11,10)}if(isPlayer){rect('#b39965',x-11,y-5,6,15)}}
function label(x,y,s,sub,active){ctx.font='bold 11px ui-sans-serif,system-ui';const width=Math.max(ctx.measureText(s).width+24,95);rounded(ctx,x-width/2,y,width,27,4,active?'#1d493e':'#fff9e3f2');text(ctx,s,x,y+18,11,active?'#f0f2d3':'#3e5947','center',true);if(sub)text(ctx,sub,x,y+42,9,'#405944')}
function setNearest(){const inside=rooms.find(r=>player.x>r.x&&player.x<r.x+r.w&&player.y>r.y&&player.y<r.y+r.h);nearest=stations.map(s=>({...s,d:Math.hypot(player.x-s.x,player.y-s.y)})).sort((a,b)=>a.d-b.d)[0];const close=nearest.d<95&&inside?.zone===nearest.z;$('#interact').textContent=close?'E · '+['Herrn Kapp ansprechen','Schulsozialarbeit ansprechen','Lehrkraft ansprechen','Archiv öffnen'][nearest.z]:'E · Umgebung erkunden';$('#location').textContent=inside?ZONES[inside.zone].name.toUpperCase():'SCHULFLUR';nearest.active=close}
function interact(){if($('#modal').open||$('#welcome').open)return;if(nearest?.active){openZone(nearest.z);return}toast('Gehe durch die Tür zu Herrn Kapp in die 10b, zur Schulsozialarbeit oder ins Lehrerzimmer. Die Raumkarten sind ein direkter Zugang.')}
function clearMovement(){keys={};route=[]}window.clearMovement=clearMovement;window.resetPlayer=()=>{player={x:600,y:410};clearMovement()};
window.addEventListener('keydown',e=>{if($('#modal').open||$('#welcome').open)return;const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d','e',' '].includes(k)){e.preventDefault();if(k==='e'||k===' '){if(!e.repeat)interact()}else{keys[k]=true;route=[]}}});window.addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);window.addEventListener('blur',clearMovement);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearMovement()});
canvas.addEventListener('pointerdown',e=>{if($('#modal').open||$('#welcome').open)return;canvas.focus();const b=canvas.getBoundingClientRect(),x=(e.clientX-b.left)/b.width*W,y=(e.clientY-b.top)/b.height*H,s=stations.find(s=>Math.hypot(x-s.x,y-s.y)<38);if(s&&nearest?.z===s.z&&nearest.active){openZone(s.z);return}findRoute(s?s.x:x,s?s.y:y)});
document.querySelectorAll('[data-dir]').forEach(b=>{const k=b.dataset.dir.toLowerCase();b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys[k]=true;route=[]};b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>keys[k]=false});$('#interact').onclick=interact;
function draw(time){ctx.clearRect(0,0,W,H);ctx.drawImage(terrain,0,0);
// Door markers and room completion pennants.
for(const r of rooms){const y=r.side==='bottom'?r.y+r.h+2:r.y-5;rect(r.accent,r.door-27,y,54,6);if(r.zone<3&&count(r.zone)===6){rounded(ctx,r.x+r.w-36,r.y+38,22,22,4,'#d4df95');text(ctx,'✓',r.x+r.w-25,r.y+54,14,'#4b6847','center',true)}if(r.zone===3&&!unlocked()){rect('#766647',r.door-36,r.y-5,72,6);rect('#c2a56a',r.door-9,r.y-10,18,18);text(ctx,'3 SCHLÜSSEL',r.door,r.y+35,9,'#796e4e','center',true)}}
const sprites=stations.filter(s=>s.z<3).map(s=>({y:s.y,draw:()=>person(s.x,s.y,s.z,false,time)}));sprites.push({y:player.y,draw:()=>person(Math.round(player.x),Math.round(player.y),-1,true,time)});sprites.sort((a,b)=>a.y-b.y).forEach(s=>s.draw());
for(const s of stations){const active=nearest?.z===s.z&&nearest.active,name=s.z===3?(finished()?'ARCHIV GERETTET':unlocked()?'WISSENSARCHIV':'WISSENSARCHIV'):['Herr Kapp','Schulsozialarbeit','Lehrkraft'][s.z];label(s.x,s.y+30,name,active?'[ E ] '+(s.z<3?'ansprechen':'öffnen'):'',active);if(s.z<3&&count(s.z)<6)text(ctx,'!',s.x,s.y-37+(reduce?0:Math.sin(time/450+s.z)*3),20,'#b18538','center',true)}
if(!unlocked())label(390,434,'BIBLIOTHEK VERSIEGELT','',false);
}
function loop(time){const dt=Math.min((time-last)/1000,.04)||.016;last=time;moving=false;if(!$('#modal').open&&!$('#welcome').open){let dx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),dy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);if(!dx&&!dy&&route.length){const p=route[0],dist=Math.hypot(p.x-player.x,p.y-player.y);if(dist<5)route.shift();else{dx=(p.x-player.x)/dist;dy=(p.y-player.y)/dist}}const len=Math.hypot(dx,dy);if(len){dx=dx/len*148*dt;dy=dy/len*148*dt;if(!blocked(player.x+dx,player.y))player.x+=dx;if(!blocked(player.x,player.y+dy))player.y+=dy;if(dx)face=dx>0?1:-1;moving=true}if(time-saveAt>2200){state.player={x:player.x,y:player.y};save();saveAt=time}}setNearest();draw(time);requestAnimationFrame(loop)}
initTerrain();if(blocked(player.x,player.y))player={x:600,y:410};requestAnimationFrame(loop);
})();
