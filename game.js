(() => {
'use strict';
const cv=document.getElementById('game');const ctx=cv.getContext('2d',{alpha:false});ctx.imageSmoothingEnabled=false;
const W=960,H=540,MW=1920,MH=1200,T=48;
const ui={overlay:document.getElementById('overlay'),dialog:document.getElementById('dialog'),region:document.getElementById('regionName'),icon:document.getElementById('regionIcon'),score:document.getElementById('points'),mission:document.getElementById('missionText'),step:document.getElementById('stepText'),progress:document.getElementById('progressFill'),sorted:document.getElementById('sorted'),inventory:document.getElementById('inventory'),hint:document.getElementById('interactHint'),hintText:document.getElementById('hintText'),toast:document.getElementById('toast'),toastText:document.getElementById('toastText'),toastSymbol:document.getElementById('toastSymbol'),splash:document.getElementById('zoneSplash'),splashName:document.getElementById('zoneSplashName')};
const assets={};const assetPaths=[];
for(const x of ['grass','grass2','grass3','grass4','wild','dirt','dirt2','trail','stone','stone2','paver','paver2','road','road2','lab','lab2','water','water2','flowerbed'])assetPaths.push(['tile_'+x,`assets/tiles/${x}.png`]);
for(const x of ['tree','tree2','tree3','pine','bush','flowers','bench','lamp','planter','sign_schedule','sign_map','sign_guide','fountain','senai','house','house2','shop','lab','bin_papel','bin_plastico','bin_metal','bin_vidro','bin_pilhas','crate','bridge','machine_off','machine_on','rock','terminal','piece','monument','stepstone','guide','technician','workbench','supply_rack','conveyor','scanner','power_station','pipebank','flower_island','streetlamp_new','senai_atlas','lab_atlas','house_atlas','shops_atlas','apartments_atlas'])assetPaths.push([x,`assets/props/${x}.png`]);
for(const x of ['papel','plastico','metal','vidro','pilhas','eletronico'])assetPaths.push(['item_'+x,`assets/items/${x}.png`]);
for(let r=0;r<4;r++)for(let j=0;j<4;j++)assetPaths.push([`player_${r}${j}`,`assets/player/f${r}${j}.png`]);
for(const dir of ['down','up','left','right'])for(const move of ['idle','walk'])for(let f=0;f<(move==='idle'?1:2);f++){let key=move==='idle'?`dir_${dir}_idle`:`dir_${dir}_walk_${f}`;assetPaths.push([key,`assets/player/${move}_${dir}${move==='walk'?'_'+f:''}.png`]);}
const kinds={papel:{name:'Papel',color:'#459ad6',explain:'Papel limpo e seco vai no coletor de papel.'},plastico:{name:'Plástico',color:'#eb6a66',explain:'Garrafas e embalagens plásticas podem ser recicladas.'},metal:{name:'Metal',color:'#efc457',explain:'Latas de alumínio são materiais recicláveis.'},vidro:{name:'Vidro',color:'#66be80',explain:'Vidros devem ser separados com cuidado.'},pilhas:{name:'Pilhas',color:'#ae84d9',explain:'Pilhas e baterias exigem pontos de entrega específicos.'}};
const zones={lobby:{name:'PRAÇA CENTRAL',icon:'⌂',spawn:[710,680],desc:'A aventura começa aqui'},park:{name:'PARQUE ECOLÓGICO',icon:'♣',spawn:[160,515],desc:'Trilhas, lago e descobertas'},city:{name:'BAIRRO URBANO',icon:'▥',spawn:[170,540],desc:'Cuidando das ruas da cidade'},lab:{name:'OFICINA ECOLÓGICA',icon:'⚙',spawn:[180,535],desc:'A ciência dá nova vida aos materiais'},garden:{name:'HORTA COMUNITÁRIA',icon:'❀',spawn:[180,560],desc:'Um novo começo para o vale'}};
const GOAL=12, SAVE_KEY='ecoexploradores.vale.v4';
let saveTimer=0,lastSaved=0,showMinimap=true,storageAvailable=true;
const world={};let st=null;let currentModal='';let target=null;let toastTimeout=0;let splashTimeout=0;let tick=0;let last=performance.now();let cam={x:0,y:0};let sparks=[];let timeStart=0;const pressed={};
// Small synthesized sound effects, generated completely offline (no audio files or network).
let soundEnabled=true;let audioEngine=null;
function sfx(type){
 if(!soundEnabled)return;
 try{
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
  if(!audioEngine)audioEngine=new Audio();if(audioEngine.state==='suspended')audioEngine.resume().catch(()=>{});
  const patterns={collect:[[540,0,.07],[740,.07,.12]],sort:[[480,0,.08],[680,.08,.09],[920,.17,.13]],wrong:[[250,0,.12]],unlock:[[360,0,.09],[520,.1,.12],[790,.23,.2]],portal:[[390,0,.08],[480,.07,.11]],select:[[650,0,.06]]};
  for(let [pitch,delay,dur] of (patterns[type]||[])){
   let osc=audioEngine.createOscillator(),gain=audioEngine.createGain(),at=audioEngine.currentTime+delay;
   osc.type=type==='wrong'?'square':'triangle';osc.frequency.setValueAtTime(pitch,at);
   gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.045,at+.008);gain.gain.exponentialRampToValueAtTime(.0001,at+dur);
   osc.connect(gain);gain.connect(audioEngine.destination);osc.start(at);osc.stop(at+dur+.025);
  }
 }catch(e){/* Audio is optional; never block gameplay. */}
}
const $=s=>document.querySelector(s);const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));const rng=(x,y,z=0)=>{let n=Math.sin(x*127.17+y*311.79+z*72.13)*43758.54;return n-Math.floor(n)};
function img(name,x,y,w,h,ct=ctx){const a=assets[name];if(!a||!a.complete||!a.naturalWidth)return;const dw=w||a.width,dh=h||a.height;ct.drawImage(a,Math.round(x),Math.round(y),Math.round(dw),Math.round(dh));}
function centered(name,x,foot,scale=1,ct=ctx){let a=assets[name];if(!a)return;let w=a.width*scale,h=a.height*scale;img(name,x-w/2,foot-h,w,h,ct)}
function rect(ct,x,y,w,h,col){ct.fillStyle=col;ct.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
function ellipse(ct,x,y,rx,ry,col){ct.fillStyle=col;ct.beginPath();ct.ellipse(x,y,rx,ry,0,0,Math.PI*2);ct.fill()}
function line(ct,x1,y1,x2,y2,col,w=2){ct.strokeStyle=col;ct.lineWidth=w;ct.beginPath();ct.moveTo(x1,y1);ct.lineTo(x2,y2);ct.stroke()}
function addProp(z,name,x,y,scale=1,opts={}){world[z].props.push({name,x,y,scale,solid:opts.solid||0,box:opts.box||null,glow:!!opts.glow});}
function addInteract(z,kind,x,y,arg='',text='',opts={}){world[z].interact.push({kind,x,y,arg,text,...opts});}
function addItem(z,x,y,type){world[z].items.push({x,y,type,taken:false,id:`${z}_${world[z].items.length}`});}
function waterAt(x,y){
 const pond=((x-1025)/205)**2+((y-278)/132)**2<1;
 const stream=Math.abs(x-(1087+75*Math.sin(y/130)))<42&&y>335&&y<796;
 const bridge=y>=458&&y<=574&&x>=1000&&x<=1205;
 return (pond||stream)&&!bridge;
}
function tileAt(z,x,y){
 if(z==='garden'){
  if((Math.abs(y-558)<65&&x<1770)||(Math.abs(x-950)<60&&y>160&&y<1090)||(Math.abs(y-930)<46&&x>330&&x<1640))return 'trail';
  if(y>650&&y<810&&x>400&&x<1500)return 'dirt';
  return ['grass','grass2','grass3','grass4'][Math.floor(rng(x,y)*4)];
 }
 if(x>=1392||y>=888){
  if(z==='lab')return rng(x,y)>.7?'lab2':'lab';
  if((Math.abs(x-1536)<64&&y>360)||(Math.abs(y-1008)<60&&x>260)||(Math.abs(y-540)<62&&x>1300))return 'trail';
  return ['grass','grass2','grass3','grass4'][Math.floor(rng(x,y)*4)];
 }
 if(z==='lobby'){
  const plaza=x>265&&x<1200&&y>276&&y<836 && !(x<360&&y<348) && !(x>1096&&y<348);
  if(plaza)return rng(x,y)>0.57?'paver2':'paver';
  if((x>1150&&y>464&&y<624)||(x<330&&y>470&&y<645)||(x>638&&x<803&&y>760))return 'trail';
  return ['grass','grass2','grass3','grass4'][Math.floor(rng(x,y)*4)];
 }
 if(z==='park'){
  const pond=Math.pow((x-1025)/213,2)+Math.pow((y-278)/140,2)<1;
  const stream=Math.abs(x-(1087+75*Math.sin(y/130)))<48&&y>335&&y<796;
  const bridge=y>465&&y<577&&x>1000&&x<1195;
  if(waterAt(x,y))return 'grass2';
  const path1=Math.abs(y-(504+58*Math.sin(x/210)+35*Math.cos(x/100)))<67;
  const path2=Math.abs(x-(675+25*Math.sin(y/160)))<57&&y>190;
  const path3=Math.abs(x-335)<55&&y>100&&y<520;
  const path4=Math.abs(y-700)<41&&x>690;
  if(path1||path2||path3||path4)return 'trail';
  return ['grass','grass2','wild','grass3','grass4'][Math.floor(rng(x,y)*5)];
 }
 if(z==='city'){
  if((y>412&&y<594)||(x>708&&x<903))return rng(x,y)>.5?'road':'road2';
  if((y>323&&y<=412)||(y>=594&&y<690)||(x>637&&x<975))return rng(x,y)>.5?'stone':'stone2';
  if((x>105&&x<1332&&y>66&&y<327)||(x>75&&x<1370&&y>690&&y<870))return rng(x,y)>.5?'paver':'paver2';
  return ['grass','grass2','grass3'][Math.floor(rng(x,y)*3)];
 }
 if(z==='lab'){
  if(x>300&&x<1145&&y>245&&y<840)return rng(x,y)>.4?'lab':'lab2';
  if(x>75&&x<1350&&y>120&&y<800)return 'lab2';
  return 'lab';
 }
 return 'grass';
}
function BORDER(c,x,y,w,h,fill,outline){rect(c,x,y,w,h,outline);rect(c,x+3,y+3,w-6,h-6,fill);}
function buildGround(z){let canvas=document.createElement('canvas');canvas.width=MW;canvas.height=MH;let c=canvas.getContext('2d',{alpha:false});c.imageSmoothingEnabled=false;
  for(let y=0;y<MH;y+=T)for(let x=0;x<MW;x+=T){let name=tileAt(z,x+24,y+24);img('tile_'+name,x,y,48,48,c);}
  if(z!=='lab'){
    for(let y=0;y<MH;y+=T)for(let x=0;x<MW;x+=T){
      if(tileAt(z,x+24,y+24)!=='trail')continue;
      for(let [dx,dy] of [[0,-1],[0,1],[-1,0],[1,0]]){
        const adjacent=tileAt(z,x+24+dx*T,y+24+dy*T);
        if(!adjacent.startsWith('grass')&&adjacent!=='wild')continue;
        for(let j=0;j<7;j++){
          const offset=3+j*6,depth=3+Math.floor(rng(x+j,y,4)*6);
          let px=dx?x+(dx<0?0:T-depth):x+offset,py=dy?y+(dy<0?0:T-depth):y+offset;
          rect(c,px,py,dx?depth:3,dy?depth:3,j%2?'#7b9e55':'#91ad64');
        }
      }
    }
    // Quiet flower meadows give the new paths a more tended, inhabited feel.
    for(let j=0;j<175;j++){
      const x=90+rng(j,113)*1740,y=170+rng(j,227)*940;
      if(!(z==='garden'||x>1390||y>890)||!tileAt(z,x,y).startsWith('grass'))continue;
      for(let n=0;n<3;n++){
        const xx=x+n*5,yy=y+(n%2)*4;rect(c,xx,yy,2,5,'#668747');rect(c,xx-2,yy-2,3,2,j%3?'#e1d397':'#dba7a0');
      }
    }
    for(let [x,y] of (z==='garden'?[[280,330],[1660,330],[280,880],[1660,880]]:[[1430,700],[1750,960]])){
      for(let offset of [0,30,60]){rect(c,x+offset,y,5,25,'#886347');rect(c,x,y+offset,5,25,'#886347');}
      rect(c,x,y+7,65,4,'#c5a373');rect(c,x,y+17,65,4,'#c5a373');rect(c,x,y+7,4,70,'#ba986c');
    }
  }
  if(z==='lobby'){
    // stone inner rings around fountain and flowerbeds
    ellipse(c,730,505,150,107,'#b6aa8d');ellipse(c,730,505,141,99,'#d5ceb0');ellipse(c,730,505,107,82,'#6ba15b');
    for(let i=0;i<45;i++){let a=i*2.399;let r=110+9*Math.sin(i*4);rect(c,730+Math.cos(a)*r,505+Math.sin(a)*r*.72,4,5,i%3?'#f7d18d':'#f2a7ab');}
    // Garden islands and decorative paving avoid the empty checkerboard feel.
    for(let [x,y] of [[375,390],[1045,400],[380,695],[1101,721]]){
      ellipse(c,x,y,60,21,'#827d63');ellipse(c,x,y-3,55,18,'#4b8a51');
      for(let j=0;j<10;j++){let xx=x-42+rng(j,x)*86,yy=y-14+rng(j,y)*23;rect(c,xx,yy,6,6,j%2?'#ffd29e':'#e997ab');}
    }
    for(let x=356;x<1130;x+=34){if(Math.abs(x-730)<170)continue;rect(c,x,610,3,13,'#cfbea6');rect(c,x+7,621,19,2,'#fff2c9');}
    // plaza inlaid mosaic near entrance
    ellipse(c,729,718,63,17,'#b2b59a');ellipse(c,729,718,52,12,'#9da78e');
  }
  if(z==='park'){
    // The visible shoreline and collision share exactly the same water mask.
    for(let yy=140;yy<800;yy+=4)for(let xx=796;xx<1240;xx+=4){
      if(waterAt(xx,yy))rect(c,xx,yy,4,4,((xx+yy)%32===0)?'#a6d8ca':'#60a7ae');
    }
    // Stone borders and patches of wildflowers soften transitions between paths and grass.
    for(let j=0;j<80;j++){let x=70+rng(j,63)*1260,y=100+rng(j,85)*740;
      if(tileAt('park',x,y).startsWith('grass')){
        if(j%4===0){ellipse(c,x,y,8,4,'#2e8050');rect(c,x-1,y-7,2,9,'#509a53');rect(c,x-5,y-7,4,3,'#a4c36e');}
        else if(j%7===0){rect(c,x,y,4,4,'#f7e2ac');rect(c,x+4,y-3,3,3,'#eaa3bd');}
      }
    }
    for(let x=160;x<700;x+=90){let y=504+58*Math.sin(x/210)+35*Math.cos(x/100);rect(c,x,y-65,18,3,'#aa8e67');}
    // crossing bridge covers water
    for(let x=1010;x<1200;x+=12){rect(c,x,462,10,108,'#b47d50');rect(c,x,462,10,3,'#edc58c');}rect(c,1008,458,194,4,'#71503b');rect(c,1008,571,194,4,'#71503b');
    for(let x of [1031,1143])for(let y of [458,565])rect(c,x,y,9,15,'#604735');
  }
  if(z==='city'){
    for(let x=67;x<1400;x+=130){rect(c,x,499,70,6,'#d8d4ab');rect(c,x,501,56,3,'#faf0bf');}
    for(let y=60;y<875;y+=105){rect(c,801,y,7,57,'#f0e0b2');}
    for(let y of [397,597]){rect(c,0,y,MW,6,'#8a9c95');rect(c,0,y+7,MW,3,'#d7dcca');}
    for(let x of [273,1131])for(let y=422;y<578;y+=18)rect(c,x,y,95,11,'#f4eac5');
    // Front-door paths and grounds connect each façade to the main street.
    for(let [xx,from,to,width] of [[226,303,395,76],[515,310,395,79],[1114,295,397,93],[1250,330,402,75]]){
       rect(c,xx-width/2,from,width,to-from,'#b7b6a4');rect(c,xx-width/2+4,from+3,width-8,to-from-7,'#d5d0b6');
       for(let y=from+12;y<to;y+=28)line(c,xx-width/2+6,y,xx+width/2-6,y,'#a7a695',2);
       for(let t of [-1,1])rect(c,xx+t*(width/2+10)-4,to-24,8,26,'#667c61');
    }
    // Cycle lane detail, verge greenery and drainage covers.
    rect(c,0,606,MW,5,'#c3d4b9');
    for(let i=0;i<15;i++){let x=85+i*91;rect(c,x,609,28,3,'#77bd8e');}
    for(let x of [401,1020,1322]){rect(c,x,359,22,14,'#6c8183');for(let q=0;q<4;q++)rect(c,x+4+q*4,360,1,10,'#a7c1c0');}

  }
  if(z==='lab'){
    // Stronger industrial readability: equipment bays, power conduits, workflow arrows.
    rect(c,70,113,1300,155,'#31565a');rect(c,75,119,1290,10,'#88a9a6');
    for(let x=93;x<1345;x+=92){BORDER(c,x,144,78,84,'#3b7274','#28494f');rect(c,x+7,153,64,8,'#629395');rect(c,x+12,172,50,40,'#265155');for(let k=0;k<4;k++)rect(c,x+16+k*12,188,6,3,k%2?'#e4be70':'#8bd6ab');}
    rect(c,205,413,1020,10,'#40666b');rect(c,205,418,1020,3,'#96bbae');
    for(let x=450;x<1220;x+=150){rect(c,x,618,106,7,'#ccaa64');rect(c,x+7,620,91,2,'#ffde88');}
    // Industrial stations rest on dark floor islands with caution-strip edges.
    for(let [x,y,w,h] of [[600,465,280,140],[665,668,465,102],[1040,503,232,122]]){
      rect(c,x,y,w,h,'#2b5658');rect(c,x+6,y+6,w-12,h-12,'#497b79');
      for(let j=x+8;j<x+w-12;j+=22){rect(c,j,y,11,8,'#e9bb62');rect(c,j,y+h-8,11,8,'#e9bb62');}
    }
    // Multiple fine tile details break repetition but preserve navigation.
    for(let j=0;j<125;j++){let x=95+rng(j,35)*1235,y=285+rng(j,77)*510;if(j%4===0)rect(c,x,y,7,3,'#98ada5');else if(j%7===0)rect(c,x,y,3,8,'#3f7275');}
    for(let y=70;y<860;y+=172){rect(c,0,y,MW,5,'#758e90');for(let x=0;x<1440;x+=165)rect(c,x,y-8,7,18,'#78918e');}
    for(let x=130;x<1400;x+=225){rect(c,x,850,135,12,'#516967');rect(c,x+10,852,115,6,'#acc6b5');}
    rect(c,450,468,670,15,'#5c7c7d');rect(c,450,485,670,5,'#e4bf5e');
  }
  if(z==='garden'){
    for(let [x,y] of [[590,735],[950,735],[1310,735]]){
      rect(c,x-106,y-68,212,106,'#715138');rect(c,x-100,y-62,200,94,'#946340');
      for(let row=0;row<4;row++)rect(c,x-94,y-53+row*23,188,3,'#bb8555');
      for(let px=x-100;px<=x+100;px+=40){rect(c,px,y+35,5,20,'#916945');rect(c,px+1,y+35,2,5,'#dcc18b');}
    }
    // A low orchard fence and herb beds frame the shared garden.
    for(let xx=300;xx<1670;xx+=40){rect(c,xx,1068,5,24,'#956e4c');rect(c,xx,1074,40,4,'#c8a474');rect(c,xx,1084,40,4,'#c8a474');}
    for(let xx of [510,680,1220,1390]){ellipse(c,xx,380,70,25,'#8e7351');ellipse(c,xx,376,66,22,'#648a48');}
  }
  return canvas;
}
function createWorld(){for(let z of Object.keys(zones))world[z]={props:[],interact:[],items:[],background:null};
  // LOBBY -- playful garden surrounding a structured central plaza
  addProp('lobby','senai_atlas',720,442,1.22,{box:{w:210,h:52}});
  addProp('lobby','fountain',730,576,1.13,{solid:75});
  for(let x of [65,173,270,1198,1313,1390])for(let y of [230,350,475,605,755,885]){
    if((x===270||x===1198)&&y>330&&y<755)continue;
    addProp('lobby',['tree','tree2','tree3'][Math.floor(rng(x,y)*3)],x,y,1.07,{solid:26});
  }
  for(let [x,y] of [[320,351],[1090,355],[306,780],[1150,794],[580,300],[857,304]])addProp('lobby','planter',x,y,1.05,{solid:28});
  for(let [x,y] of [[375,565],[1084,575],[502,800],[1192,696]])addProp('lobby','bench',x,y,1.2,{solid:16});
  for(let [x,y] of [[315,483],[1158,480],[492,304],[949,303],[346,757],[1086,756]])addProp('lobby','lamp',x,y,1.09,{solid:10});
  addProp('lobby','monument',1100,404,.73,{solid:32});
  for(let [x,y,s] of [[476,442,.58],[1008,455,.55],[450,721,.6],[1180,756,.6]])addProp('lobby','flower_island',x,y,s);
  addProp('lobby','sign_schedule',425,410,.82,{solid:25});addInteract('lobby','schedule',425,415,'','Consultar coleta seletiva');
  addProp('lobby','sign_map',967,400,.78,{solid:22});addInteract('lobby','map',967,400,'','Abrir mapa do mundo');
  addProp('lobby','sign_guide',605,333,.6);addInteract('lobby','education',605,345,'','Conheça o caminho dos recicláveis');
  addInteract('lobby','guide',473,654,'','Conversar com o Guia Eco');
  for(let [k,x] of [['papel',644],['plastico',752],['metal',860],['vidro',968],['pilhas',1076]]){addProp('lobby','bin_'+k,x,754,.82);addInteract('lobby','bin',x,739,k,'Descartar '+k);}
  addInteract('lobby','portal',1322,555,'park','Seguir para o Parque Ecológico');addInteract('lobby','portal',125,555,'city','Seguir para o Bairro Urbano');
  for(let [x,y,k] of [[600,653,'papel'],[889,655,'plastico'],[533,522,'metal'],[1035,607,'vidro'],[960,741,'pilhas']])addItem('lobby',x,y,k);
  // PARK -- winding trails, water, bridge, secret
  for(let x=50;x<1350;x+=138)for(let y=145;y<885;y+=141){
    if((x>785&&x<1245&&y>120&&y<690)||(x>595&&x<790)||(Math.abs(y-(504+58*Math.sin(x/210)+35*Math.cos(x/100)))<105))continue;
    let ox=(rng(x,y,8)-.5)*64,oy=(rng(x,y,3)-.5)*47;
    addProp('park',rng(x,y)>0.8?'pine':['tree','tree2','tree3'][Math.floor(rng(x+7,y)*3)],x+ox,y+oy, .85+rng(x,y,7)*.25,{solid:24});
  }
  for(let j=0;j<45;j++){let x=76+rng(j,3)*1250,y=130+rng(j,7)*715;if(tileAt('park',x,y).startsWith('grass')||tileAt('park',x,y)==='wild')addProp('park',j%4===0?'flowers':'bush',x,y,.56+rng(j,4)*.24);}
  for(let [x,y] of [[765,405],[1320,682],[412,768]])addProp('park','bench',x,y,1.08,{solid:16});
  for(let [x,y] of [[602,665],[738,257],[1350,545]])addProp('park','lamp',x,y,1,{solid:9});
  // Continuous bridge is drawn with its shared collision mask. // bridge visual over stream
  for(let [x,y,s] of [[175,308,.56],[486,220,.66],[709,758,.72],[1270,754,.59]])addProp('park','flower_island',x,y,s);
  for(let [x,y] of [[364,384],[815,185],[1300,824]])addProp('park','rock',x,y,.57,{solid:12});
  for(let [x,y] of [[780,245],[1140,750],[140,780],[600,780]])addProp('park','rock',x,y,.75,{solid:20});
  addInteract('park','guide',750,650,'','Conversar com o Guia Eco');
  addInteract('park','secret',355,228,'','Investigar a árvore antiga');
  for(let [k,x] of [['papel',883],['plastico',974],['metal',1066],['vidro',1157],['pilhas',1250]]){addProp('park','bin_'+k,x,770,.84);addInteract('park','bin',x,758,k,'Descartar '+k);}
  addInteract('park','portal',120,520,'lobby','Voltar à Praça Central');addInteract('park','portal',1350,528,'city','Ir ao Bairro Urbano');
  for(let [x,y,k] of [[372,490,'papel'],[677,452,'plastico'],[1280,488,'metal'],[806,635,'vidro'],[307,740,'pilhas'],[618,302,'papel']])addItem('park',x,y,k);
  // CITY -- recognizable asphalt, storefronts and real sidewalks
  for(let [name,x,y,scale] of [['house_atlas',230,324,1.43],['apartments_atlas',518,324,1.39],['shops_atlas',1116,324,1.38],['apartments_atlas',1355,324,1.17],['house_atlas',252,851,1.36],['shops_atlas',1208,847,1.30]])addProp('city',name,x,y,scale,{box:{w:210*scale,h:66}});
  for(let [name,x,y,s] of [['tree',66,337,.83],['tree2',634,319,.83],['tree3',1370,702,.84],['tree2',1014,688,.78],['bush',103,725,1],['flowers',425,703,1]])addProp('city',name,x,y,s,{solid:name.startsWith('tree')?23:0});
  for(let [x,y] of [[380,396],[1070,391],[650,681],[1310,690]])addProp('city','lamp',x,y,.95,{solid:9});
  for(let [x,y] of [[385,683],[1123,681]])addProp('city','bench',x,y,1.1,{solid:17});
  for(let [x,y] of [[195,726],[1107,725],[481,324],[1330,350]])addProp('city','planter',x,y,.72);
  for(let [x,y] of [[145,378],[334,377],[581,380],[1009,375],[1268,380],[165,832],[445,831],[1030,835]])addProp('city','flower_island',x,y,.55);
  for(let [x,y] of [[728,391],[1215,400],[980,685]])addProp('city','streetlamp_new',x,y,.72,{solid:9});
  addInteract('city','guide',537,690,'','Conversar com o Guia Eco');
  addInteract('city','piece',1194,374,'','Pegar peça reaproveitável');
  addInteract('city','portal',114,515,'lobby','Voltar à Praça Central');addInteract('city','portal',1340,512,'lab','Entrar no Laboratório SENAI');
  for(let [k,x] of [['papel',495],['plastico',584],['metal',673],['vidro',762],['pilhas',851]]){addProp('city','bin_'+k,x,798,.82);addInteract('city','bin',x,786,k,'Descartar '+k);}
  for(let [x,y,k] of [[368,383,'papel'],[665,380,'plastico'],[998,407,'metal'],[1198,642,'vidro'],[329,745,'pilhas'],[1183,794,'plastico']])addItem('city',x,y,k);
  // LAB -- industrial space, machine and technology
  addProp('lab','lab_atlas',718,369,1.33,{box:{w:240,h:60}});
  addProp('lab','machine_off',945,591,1.07,{box:{w:220,h:58}});
  addProp('lab','terminal',356,479,1.15,{solid:25});addProp('lab','terminal',1180,412,1.15,{solid:26});
  for(let [x,y] of [[337,700],[1192,765],[1218,651],[514,380]])addProp('lab','crate',x,y,.87,{solid:17});
  addProp('lab','monument',1339,363,.68);addProp('lab','planter',717,365,1.1);addProp('lab','sign_map',660,471,.55);
  // Production line, research stations and industrial scenery, not an empty tiled hall.
  addProp('lab','pipebank',335,324,1.27);
  addProp('lab','pipebank',1134,315,1.2);
  addProp('lab','supply_rack',182,393,.94,{box:{w:50,h:24}});
  addProp('lab','workbench',715,568,1.00,{box:{w:145,h:27}});
  addProp('lab','conveyor',807,729,1.00,{box:{w:198,h:31}});
  addProp('lab','scanner',1050,737,.88,{box:{w:96,h:29}});
  addProp('lab','power_station',1202,568,1.0,{solid:22});
  addProp('lab','supply_rack',1280,784,.79,{box:{w:65,h:25}});
  addInteract('lab','machine',950,561,'','Acionar a máquina de triagem');addInteract('lab','guide',452,567,'','Conversar com a Técnica Eco');
  addInteract('lab','portal',130,550,'city','Retornar ao Bairro Urbano');
  for(let [k,x] of [['papel',470],['plastico',565],['metal',660],['vidro',755],['pilhas',850]]){addProp('lab','bin_'+k,x,805,.81);addInteract('lab','bin',x,792,k,'Descartar '+k);}
  for(let [x,y,k] of [[312,635,'metal'],[1142,618,'plastico'],[596,626,'papel']])addItem('lab',x,y,k);
  // Additional districts have their own routes, landmarks and resources.
  for(let z of ['lobby','park','city']){
    for(let [x,y] of [[1460,240],[1740,280],[1810,450],[1810,750],[1740,1050],[1450,1140],[1120,1130],[850,1130],[450,1130],[140,1010]]){
      addProp(z,x%3?'tree2':'tree3',x,y,.96,{solid:23});
      addProp(z,'bush',x-52,y+18,.7);
    }
    for(let [x,y] of [[1450,865],[1650,640],[1260,1090],[680,1060]])addProp(z,'flowers',x,y,.7);
    addProp(z,'bench',1700,900,1,{solid:18});addProp(z,'lamp',1630,920,.9,{solid:10});
    for(let [x,y,k] of [[1460,560,'papel'],[1540,790,'plastico'],[1670,1000,'metal'],[1050,1010,'vidro'],[650,985,'papel'],[380,1000,'pilhas']])addItem(z,x,y,k);
    for(let [k,x] of [['papel',1430],['plastico',1525],['metal',1620],['vidro',1715],['pilhas',1810]]){addProp(z,'bin_'+k,x,1140,.82);addInteract(z,'bin',x,1125,k,'Separar '+kinds[k].name);}
  }
  addProp('lobby','house2',1710,430,1.1,{box:{w:190,h:75}});
  addProp('lobby','sign_map',1490,955,.8);addInteract('lobby','map',1490,955,'','Consultar mapa do vale');
  addProp('park','tree3',1730,390,1.65,{solid:36});
  addInteract('park','discovery',1730,440,'nascente','Observar o refúgio das aves');
  addProp('city','shop',1730,430,1.1,{box:{w:180,h:70}});
  addProp('city','house2',610,940,.95,{box:{w:170,h:65}});
  addProp('city','house',1140,940,.95,{box:{w:170,h:65}});
  addProp('lab','supply_rack',1670,370,1.3,{box:{w:110,h:50}});
  addProp('lab','workbench',1570,790,1.1,{box:{w:155,h:35}});
  addProp('lab','conveyor',1570,1010,1.1,{box:{w:200,h:35}});
  addProp('lab','power_station',1780,660,1.2,{solid:24});
  addInteract('lab','education',1570,835,'','Conhecer a oficina de reaproveitamento');
  addItem('lab',1530,530,'metal');addItem('lab',1430,950,'papel');
  addInteract('lobby','portal',1536,1008,'garden','Visitar a Horta Comunitária');
  addInteract('park','portal',1536,1008,'garden','Seguir para a Horta Comunitária');
  addInteract('garden','portal',130,560,'lobby','Voltar à Praça Central');
  addInteract('garden','portal',1780,560,'park','Seguir para o Parque Ecológico');
  for(let xx=140;xx<1850;xx+=175)for(let yy of [260,1150])addProp('garden',xx%2?'tree2':'tree3',xx,yy,.9,{solid:22});
  for(let [x,y] of [[180,830],[1760,830],[380,440],[1570,440]])addProp('garden','tree',x,y,1.2,{solid:26});
  addProp('garden','house2',950,350,1.4,{box:{w:230,h:80}});
  addProp('garden','workbench',1280,390,.85,{box:{w:120,h:30}});
  addProp('garden','bench',370,980,1,{solid:18});addProp('garden','bench',1580,980,1,{solid:18});
  addProp('garden','guide',440,540,1);addInteract('garden','gardenGuide',440,555,'','Conversar com Lia, a jardineira');
  for(let [id,x] of [['ervas',590],['flores',950],['arvores',1310]])addInteract('garden','plant',x,780,id,'Restaurar canteiro');
  for(let [k,x] of [['papel',710],['plastico',810],['metal',910],['vidro',1010],['pilhas',1110]]){addProp('garden','bin_'+k,x,1010,.82);addInteract('garden','bin',x,995,k,'Separar '+kinds[k].name);}
  for(let [x,y,k] of [[350,590,'papel'],[730,510,'plastico'],[1280,590,'metal'],[1520,800,'vidro'],[1190,915,'papel'],[530,940,'pilhas']])addItem('garden',x,y,k);
  for(let [x,y] of [[510,380],[680,380],[1220,380],[1390,380],[400,880],[1470,880]])addProp('garden','flowers',x,y,.8);
  for(let z of Object.keys(zones))world[z].background=buildGround(z);
}
function initState(){st={zone:'lobby',player:{x:710,y:654,dir:'down',moving:false,anim:0},inventory:[],selected:0,collected:0,sorted:0,score:0,piece:false,machine:false,secret:false,explored:new Set(['lobby']),finished:false,guideSpoken:false,planted:[],discoveries:[],elapsed:0,started:false};for(let z of Object.keys(world))for(let it of world[z].items)it.taken=false;sparks=[];tick=0;cam.x=clamp(st.player.x-W/2,0,MW-W);cam.y=clamp(st.player.y-H*.60,0,MH-H);timeStart=performance.now();updateHud();}
function readSave(){try{const data=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(!data||data.version!==4||!zones[data.state?.zone])return null;const v=data.state;if(!v.player||!Number.isFinite(v.player.x)||!Number.isFinite(v.player.y)||!Array.isArray(v.inventory)||v.inventory.length>8||v.inventory.some(x=>!kinds[x])||!Array.isArray(v.explored)||!Array.isArray(v.planted)||!Array.isArray(v.discoveries)||!Array.isArray(data.taken))return null;for(const k of ['score','sorted','collected','elapsed'])if(!Number.isFinite(v[k])||v[k]<0)return null;return data;}catch(e){return null;}}
function saveGame(){clearTimeout(saveTimer);if(!st?.started)return;try{localStorage.setItem(SAVE_KEY,JSON.stringify({version:4,state:{...st,explored:[...st.explored]},taken:Object.values(world).flatMap(w=>w.items.filter(i=>i.taken).map(i=>i.id)),soundEnabled}));lastSaved=performance.now();storageAvailable=true;}catch(e){if(storageAvailable)toast('O navegador não permite salvar. Mantenha esta aba aberta.','!');storageAvailable=false;}}
function queueSave(){if(st?.started){clearTimeout(saveTimer);saveTimer=setTimeout(saveGame,350);}}
function continueGame(){const data=readSave();if(!data){toast('Não foi possível recuperar esta aventura. Inicie uma nova.','!');intro();return;}st={...st,...data.state,explored:new Set(data.state.explored),started:true};st.player={...st.player,x:clamp(st.player.x,45,MW-45),y:clamp(st.player.y,113,MH-46),moving:false};st.selected=clamp(Number.isInteger(st.selected)?st.selected:0,0,Math.max(0,st.inventory.length-1));for(const w of Object.values(world))for(const i of w.items)i.taken=data.taken.includes(i.id);if(collide(st.player.x,st.player.y)){[st.player.x,st.player.y]=zones[st.zone].spawn;}soundEnabled=data.soundEnabled!==false;cam.x=clamp(st.player.x-W/2,0,MW-W);cam.y=clamp(st.player.y-H*.60,0,MH-H);close();updateHud();toast('Bem-vindo de volta ao vale. Sua aventura continua.','❀');}
function checkFinish(){if(st.sorted>=GOAL&&st.machine&&st.planted.length>=3)finish();}
function updateHud(){
 if(!st)return;
 ui.region.textContent=zones[st.zone].name;ui.icon.textContent=zones[st.zone].icon;
 ui.score.textContent=String(st.score).padStart(4,'0');ui.sorted.textContent=st.sorted;
 let stage,mission,progress;
 if(st.finished){stage=4;mission='O vale floresceu. Continue explorando!';progress=100;}
 else if(st.sorted<GOAL){stage=1;mission=`Separe os recicláveis (${st.sorted}/${GOAL})`;progress=st.sorted/GOAL*45;}
 else if(!st.piece){stage=2;mission='Encontre a peça no Bairro Urbano';progress=55;}
 else if(!st.machine){stage=3;mission='Reative a oficina ecológica';progress=70;}
 else{stage=4;mission=`Restaure a horta (${st.planted.length}/3 canteiros)`;progress=75+st.planted.length/3*25;}
 ui.step.textContent=`${stage} / 4 ETAPAS`;ui.mission.textContent=mission;
 ui.progress.style.width=`${progress}%`;
 ui.inventory.innerHTML='';for(let i=0;i<8;i++){let div=document.createElement('button');div.type='button';div.setAttribute('aria-label',st.inventory[i]?`Selecionar ${kinds[st.inventory[i]].name}`:`Espaço ${i+1} vazio`);div.title=st.inventory[i]?kinds[st.inventory[i]].name:'Espaço vazio';div.onclick=()=>{if(st.inventory[i]){st.selected=i;updateHud();sfx('select');}};div.className='slot'+(st.inventory.length&&i===st.selected?' active':'');if(st.inventory[i]){let image=document.createElement('img');image.src=`assets/items/${st.inventory[i]}.png`;image.alt=kinds[st.inventory[i]].name;div.append(image);let numb=document.createElement('span');numb.className='slot-num';numb.textContent=String(i+1);div.append(numb);}else if(i===0&&!st.inventory.length){div.textContent='+';}ui.inventory.append(div);}
 const sb=document.getElementById('soundBtn');if(sb){sb.setAttribute('aria-pressed',String(soundEnabled));sb.title=soundEnabled?'Silenciar sons':'Ativar sons';}
 queueSave();
}

function toast(message,symbol='✦'){ui.toastText.textContent=message;ui.toastSymbol.textContent=symbol;ui.toast.classList.remove('hidden');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>ui.toast.classList.add('hidden'),3000);}
function zoneSplash(){ui.splashName.textContent=zones[st.zone].name;ui.splash.classList.remove('hidden');clearTimeout(splashTimeout);splashTimeout=setTimeout(()=>ui.splash.classList.add('hidden'),1550);}
let lastFocus=null;
function open(content,kind='dialog'){ui.overlay.dataset.modal=kind;lastFocus=document.activeElement;currentModal=kind;ui.dialog.innerHTML=`<div class="dialog-corner"></div><div class="dialog-body">${content}</div>`;ui.overlay.classList.add('open');for(let k in pressed)pressed[k]=false;ui.dialog.setAttribute('role','dialog');ui.dialog.setAttribute('aria-modal','true');ui.dialog.setAttribute('aria-label',kind==='intro'?'Boas-vindas ao vale':'Menu de EcoExploradores');setTimeout(()=>ui.dialog.querySelector('button,input,select')?.focus(),0);}
function close(){if(!st?.started){intro();return;}currentModal='';delete ui.overlay.dataset.modal;ui.overlay.classList.remove('open');if(lastFocus&&!ui.overlay.contains(lastFocus))lastFocus.focus?.();else{cv.tabIndex=0;cv.focus({preventScroll:true});}}

const btn=(label,action,primary=false)=>`<button type="button" class="${primary?'primary-btn':'secondary-btn'}" data-action="${action}">${label}</button>`;
function intro(){const saved=readSave();open(`<div class="dialog-intro"><div class="intro-art"><img alt="Explorador do vale" src="assets/player/idle_down.png"></div><div><span class="dialog-eyebrow">ECOEXPLORADORES · EDIÇÃO FLORESCER</span><h1 class="dialog-title">Um novo começo<br>para o vale.</h1><p class="dialog-sub">Caminhe sem pressa, descubra pequenos segredos e transforme materiais esquecidos em um lugar cheio de vida.</p></div></div><div class="feature-strip"><div class="feature"><span>♣</span> 5 lugares para descobrir</div><div class="feature"><span>❀</span> Uma horta para restaurar</div><div class="feature"><span>✦</span> Aventura salva no navegador</div></div><div class="dialog-row">${saved?btn('Continuar minha aventura','continue',true):btn('Começar a aventura','start',true)}${saved?btn('Nova aventura','reset'):''}${btn('Como jogar','help')}</div>`,'intro');}
function menu(){saveGame();open(`<span class="dialog-eyebrow">RESPIRA. O VALE ESPERA POR VOCÊ.</span><h2 class="dialog-title">Uma pequena pausa</h2><p class="dialog-sub">${storageAvailable?'Sua aventura é salva automaticamente neste navegador.':'O salvamento não está disponível neste navegador. Mantenha esta aba aberta.'}</p><div class="dialog-row">${btn('Continuar','close',true)}${btn('Diário de jornada','journal')}${btn('Mapa do vale','map')}${btn('Como jogar','help')}${btn(soundEnabled?'Silenciar sons':'Ativar sons','sound')}${btn('Nova aventura','reset')}</div>`,'pause');}
function help(){open(`<span class="dialog-eyebrow">SEU PRIMEIRO PASSEIO</span><h2 class="dialog-title">Cada pequeno gesto conta.</h2><p class="dialog-sub"><b>WASD / Setas</b> — caminhar. <b>Shift</b> — correr.<br><b>E / Espaço</b> — recolher, conversar, plantar ou separar.<br><b>Q / 1–8 / clique na mochila</b> — escolher o material.<br><b>M</b> — mapa. <b>J</b> — diário. <b>V</b> — som. <b>Esc</b> — pausa.</p><p class="dialog-sub">Os materiais brilham no chão. A mochila leva <b>8 itens</b>; confira o nome do coletor antes de separar. A oficina abre com 3 separações. Restaure o vale separando <b>12 materiais</b>, recuperando a peça do bairro, ligando a máquina e plantando <b>3 canteiros</b> na horta.</p><p class="tips">No celular, use as setas, o botão de ação, correr e trocar. O progresso fica neste navegador; limpar os dados do site apaga a aventura.</p><div class="dialog-row">${btn(st?.started?'Voltar ao jogo':'Voltar','close',true)}</div>`,'help');}
function map(){if(!st)return;open(`<span class="dialog-eyebrow">PELOS CAMINHOS DO VALE</span><h2 class="dialog-title">Um lugar para cada descoberta.</h2><div class="map-nodes">${Object.entries(zones).map(([id,z])=>`<span class="map-node ${st.zone===id?'current':''}">${z.icon} ${z.name}<small>${st.zone===id?'Você está aqui':st.explored.has(id)?'Visitado':'A descobrir'}</small></span>`).join('')}</div><p class="dialog-sub"><b>Praça</b> ↔ Bairro ↔ Oficina<br><b>Praça</b> ↔ Parque ↔ Bairro<br><b>Praça / Parque</b> ↔ Horta (caminho ao sudeste)</p><p class="tips">Os círculos no chão indicam as saídas. O minimapa mostra você (branco), materiais (dourado) e saídas (verde). A oficina abre depois de 3 separações.</p><div class="dialog-row">${btn('Voltar','close',true)}${btn(showMinimap?'Ocultar minimapa':'Mostrar minimapa','minimap')}</div>`,'map');}
function journal(){if(!st)return;open(`<span class="dialog-eyebrow">DIÁRIO DE JORNADA</span><h2 class="dialog-title">O vale volta a florescer.</h2><div class="quest-list"><p>${st.sorted>=GOAL?'✓':'○'} <b>Um bom começo</b> — Separe ${GOAL} materiais. <strong>${Math.min(GOAL,st.sorted)}/${GOAL}</strong></p><p>${st.piece?'✓':'○'} <b>Uma segunda chance</b> — Encontre a peça perto do mercado, no Bairro Urbano.</p><p>${st.machine?'✓':'○'} <b>De volta ao trabalho</b> — Use a peça na máquina da oficina.</p><p>${st.planted.length===3?'✓':'○'} <b>Raízes do futuro</b> — Restaure os canteiros da Horta Comunitária. <strong>${st.planted.length}/3</strong></p><p>${st.secret?'✓':'◇'} <b>Segredo opcional</b> — Visite a árvore antiga no noroeste do Parque.</p><p>${st.discoveries.includes('nascente')?'✓':'◇'} <b>Um instante de calma</b> — Observe as aves no leste do Parque.</p></div><div class="dialog-row">${btn('Continuar explorando','close',true)}${btn('Ver mapa','map')}</div>`,'journal');}
function education(){open(`<span class="dialog-eyebrow">APRENDER É TRANSFORMAR</span><h2 class="dialog-title">O caminho dos recicláveis</h2><p class="dialog-sub">♻ <b>1. Separação:</b> separamos corretamente os materiais em casa e nos espaços públicos.<br>🚚 <b>2. Coleta seletiva:</b> os materiais são recolhidos por um sistema apropriado.<br>⚙ <b>3. Triagem:</b> os resíduos são classificados e encaminhados.<br>🌱 <b>4. Destinação:</b> materiais adequados seguem para reciclagem; outros exigem tratamento ou destinação específica.</p><div class="dialog-notice">A reciclagem também depende de infraestrutura, triagem, logística e destinação correta. As situações do jogo são simplificações educativas.</div><div class="dialog-row">${btn('Continuar explorando','close',true)}</div>`,'education');}
function schedule(){open(`<span class="dialog-eyebrow">SERVIÇO DE UTILIDADE PÚBLICA</span><h2 class="dialog-title">Coleta Seletiva em Campo Mourão</h2><p class="dialog-sub">Pesquise o dia da semana ou um bairro. O cronograma fica salvo no jogo e funciona sem internet.</p><div class="schedule-controls"><select id="scheduleDay"><option value="">Todos os dias</option>${['Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'].map(x=>`<option>${x}</option>`).join('')}</select><input id="scheduleSearch" type="search" placeholder="Pesquisar bairro (ex.: Tropical)..." autocomplete="off"></div><div class="schedule-results" id="scheduleResults"></div><div class="dialog-notice">⚠ Programação inicial fornecida para o piloto. Os horários podem mudar: confirme com os canais oficiais do município antes da exposição pública. Horários não informados permanecem sem hora. Coleta seletiva não é a mesma coisa que coleta convencional.</div><div class="dialog-row">${btn('Voltar ao jogo','close',true)}</div>`,'schedule');$('#scheduleDay').onchange=renderSchedule;$('#scheduleSearch').oninput=renderSchedule;renderSchedule();}
function safeText(s){return String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function renderSchedule(){const d=$('#scheduleDay')?.value||'';const term=($('#scheduleSearch')?.value||'').trim().toLocaleLowerCase('pt-BR');const results=$('#scheduleResults');if(!results)return;
 const rows=(window.CRONOGRAMA||[]).flatMap(g=>g.dias.filter(day=>!d||day===d).flatMap(day=>g.rotas.map(([hour,place])=>({day,hour,place})))).filter(x=>x.place.toLocaleLowerCase('pt-BR').includes(term));
 results.innerHTML=rows.length?`<table><thead><tr><th>Dia</th><th>Horário</th><th>Bairro / roteiro</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${safeText(x.day)}</td><td class="${x.hour?'':'undefined-time'}">${x.hour?safeText(x.hour):'Não informado'}</td><td>${safeText(x.place)}</td></tr>`).join('')}</tbody></table>`:`<div class="empty">Nenhum bairro encontrado para esse filtro.</div>`;
}
function dialogue(title,body){open(`<span class="dialog-eyebrow">CONVERSA NA CIDADE</span><h2 class="dialog-title">${safeText(title)}</h2><p class="dialog-sub">${body}</p><div class="dialog-row">${btn('Continuar','close',true)}</div>`,'talk');}
function finish(){if(st.finished)return;st.finished=true;st.score+=180;updateHud();let seconds=Math.round(st.elapsed);saveGame();open(`<span class="dialog-eyebrow">MISSÃO REALIZADA • CAMPO MOURÃO</span><h2 class="dialog-title">O vale voltou a florescer! ❀</h2><p class="dialog-sub">Você recuperou materiais, reativou a oficina e devolveu vida aos três canteiros. A horta agora pertence a todos. Há mais caminhos e pequenas descobertas esperando por você.</p><div class="dialog-stats"><div class="stat"><strong>${st.collected}</strong><small>COLETADOS</small></div><div class="stat"><strong>${st.sorted}</strong><small>SEPARADOS</small></div><div class="stat"><strong>${st.explored.size}/5</strong><small>REGIÕES</small></div><div class="stat"><strong>${st.score}</strong><small>PONTOS</small></div></div><p class="dialog-sub">${st.secret?'🌳 Você encontrou o segredo da árvore antiga.':'🌳 Existe um segredo opcional esperando no Parque Ecológico.'} <span>Tempo de sessão: ${Math.floor(seconds/60)}min ${seconds%60}s.</span></p><div class="dialog-row">${btn('Continuar explorando','close',true)}${btn('Ver diário','journal')}</div>`,'end');}
function newGame(){initState();st.started=true;close();saveGame();toast('Seu primeiro passo: recolha o papel perto da fonte. E para agir.','❀');}
function transfer(where){if(where==='lab'&&st.sorted<3){toast('Separe pelo menos 3 materiais para acessar o laboratório!','🔒');return;}st.zone=where;st.explored.add(where);st.player.x=zones[where].spawn[0];st.player.y=zones[where].spawn[1];st.player.moving=false;cam.x=clamp(st.player.x-W/2,0,MW-W);cam.y=clamp(st.player.y-H*.60,0,MH-H);updateHud();zoneSplash();}
function nearest(){let p=st.player,selected=null,best=94;for(let a of world[st.zone].interact){if((a.kind==='piece'&&st.piece)||(a.kind==='secret'&&st.secret))continue;let d=Math.hypot(p.x-a.x,p.y-a.y);if(d<best){best=d;selected={type:'object',data:a};}}for(let a of world[st.zone].items){if(a.taken)continue;let d=Math.hypot(p.x-a.x,p.y-a.y);if(d<best){best=d;selected={type:'item',data:a};}}return selected;}
function hintText(t){if(!t)return '';if(t.type==='item')return `Recolher ${kinds[t.data.type].name.toLowerCase()}`;if(t.data.kind==='bin')return `Separar ${kinds[t.data.arg].name} · E`;if(t.data.kind==='plant')return st.planted.includes(t.data.arg)?'Canteiro florescendo':st.sorted<GOAL||!st.machine?'Restaure a oficina e separe 12 materiais':'Plantar e restaurar canteiro · E';return t.data.text;}
function addSpark(x,y,col,n=14){for(let i=0;i<n;i++){let a=i/n*Math.PI*2,spd=50+Math.random()*90;sparks.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd-30,life:.6+Math.random()*.4,color:col,size:2+Math.random()*3});}}
function interact(){if(currentModal||!st)return;const t=nearest();if(!t){toast('Aproxime-se de um objeto ou material para interagir.','✦');return;}const p=st.player;
 if(t.type==='item'){
  let it=t.data;if(st.inventory.length>=8){toast('Mochila cheia! Descarte algum material antes.','▣');return;}
  it.taken=true;st.inventory.push(it.type);st.collected++;st.score+=10;addSpark(it.x,it.y,'#fff2bd');toast(`+10 pontos • ${kinds[it.type].name} recolhido!`,'✦');sfx('collect');updateHud();return;
 }
 let {kind,arg,x,y}=t.data;
 if(kind==='bin'){
  if(!st.inventory.length){toast('Sua mochila está vazia. Procure resíduos pelo cenário!','▣');return;}
  let picked=st.inventory[st.selected]||st.inventory[0];if(picked!==arg){toast(`Coletor de ${kinds[arg].name}; item selecionado: ${kinds[picked].name}. Use Q para trocar.`,'!');sfx('wrong');return;}
  st.inventory.splice(st.selected,1);st.selected=clamp(st.selected,0,Math.max(0,st.inventory.length-1));st.sorted++;st.score+=30;addSpark(x,y,'#e8f2ac',22);toast(`+30 pontos! ${kinds[arg].name} separado corretamente.`,'♻');sfx('sort');updateHud();checkFinish();return;
 }
 if(kind==='portal'){let previous=st.zone;transfer(arg);if(st.zone!==previous)sfx('portal');return;}
 if(kind==='piece'){st.piece=true;st.score+=50;addSpark(x,y,'#ffe09a',20);toast('+50 pontos • Peça reaproveitável encontrada!','⚙');sfx('collect');updateHud();return;}
 if(kind==='machine'){
  if(st.machine){toast('A máquina já está funcionando!','✓');return;}
  if(!st.piece){toast('Falta uma peça! Procure no Bairro Urbano.','⚙');return;}
  st.machine=true;st.score+=120;addSpark(x,y-55,'#9ef5b8',40);toast('+120 pontos! Estação de triagem ativada!','⚙');sfx('unlock');updateHud();checkFinish();return;
 }
 if(kind==='secret'){st.secret=true;st.score+=65;addSpark(x,y-45,'#fff0b5',30);dialogue('Descoberta da árvore antiga','Você encontrou um pequeno espaço preservado! Árvores ajudam a refrescar a cidade, abrigam animais e protegem o solo. <b>+65 pontos por explorar!</b>');updateHud();return;}
 if(kind==='schedule'){schedule();return;}if(kind==='map'){map();return;}if(kind==='education'){education();return;}
 if(kind==='plant'){
  if(st.planted.includes(arg)){toast('Este canteiro já está florescendo. Obrigado por cuidar dele!','❀');return;}
  if(st.sorted<GOAL||!st.machine){dialogue('Cada coisa no seu tempo','Lia está preparando as mudas. Para restaurar a horta, primeiro separe <b>12 materiais</b> e reative a <b>oficina ecológica</b>. A bancada recuperada vai nos ajudar a preparar os canteiros.');return;}
  st.planted.push(arg);st.score+=90;addSpark(x,y-45,'#efcb80',36);sfx('unlock');toast('+90 pontos · Um novo canteiro cheio de vida!','❀');updateHud();checkFinish();return;
 }
 if(kind==='gardenGuide'){dialogue('Lia · Jardineira do vale','Que bom ter companhia! Aqui vamos plantar ervas, flores e pequenas árvores. Depois de separar <b>12 materiais</b> e consertar a oficina, aproxime-se de cada um dos <b>3 canteiros</b> e pressione E. Vamos usar ferramentas reaproveitadas para deixar este lugar mais vivo.');return;}
 if(kind==='discovery'){if(st.discoveries.includes(arg)){toast('As aves encontraram um lugar tranquilo por aqui.','♬');return;}st.discoveries.push(arg);st.score+=65;addSpark(x,y-60,'#f5dfab',20);dialogue('Um instante de calma','Escute o vale. Preservar árvores e recolher resíduos ajuda a manter espaços seguros para a vida silvestre. <b>+65 pontos por descobrir o refúgio das aves.</b>');updateHud();return;}
 if(kind==='guide'){
  const msgs={lobby:['Guia Eco','Boas-vindas a Campo Mourão! Use <b>WASD</b> para caminhar e <b>E</b> para recolher materiais. Pressione <b>Q</b> para selecionar o item que quer descartar. Visite o painel informativo da praça e explore os caminhos nas laterais.'],park:['Guia da Natureza','No parque, preste atenção perto da água e dos caminhos alternativos. Uma árvore ao noroeste guarda um segredo. Leve o lixo encontrado aos coletores corretos.'],city:['Morador do Bairro','Estamos cuidando das ruas! Existe uma peça reaproveitável perto dos comércios. Quando você separar três materiais, poderá acessar o laboratório do SENAI, pela saída à direita.'],lab:['Técnica do SENAI','A máquina de triagem precisa de uma peça reutilizável do bairro. Encontre-a, volte aqui e use <b>E</b> na máquina. Depois, visite a Horta Comunitária e ajude Lia a restaurar os três canteiros. Precisamos de doze separações corretas para concluir a limpeza do vale!']};dialogue(...msgs[st.zone]);return;
 }
}
function collide(x,y){if(x<45||x>MW-45||y<113||y>MH-46)return true;
  if(st.zone==='lobby'&&Math.hypot((x-730)/1.0,(y-518)/.76)<91)return true;
  if(st.zone==='park'){
    if(waterAt(x,y)||waterAt(x-7,y)||waterAt(x+7,y)||waterAt(x,y+7))return true;
  }
  for(let o of world[st.zone].props){
    if(o.box){if(Math.abs(x-o.x)<o.box.w/2+8&&y>o.y-o.box.h&&y<o.y+13)return true;}
    if(o.solid){let dy=(y-o.y)*1.12;if(Math.hypot(x-o.x,dy)<o.solid+9)return true;}
  }
  return false;
}
function drawGuide(x,y,tech=false){
 let name=tech?'technician':'guide';
 ellipse(ctx,x,y+2,21,6,'#183e4066');
 centered(name,x,y,1.08);
 ctx.fillStyle='#f6f0d0';ctx.font='900 11px Trebuchet MS, sans-serif';ctx.textAlign='center';ctx.shadowColor='#183f42';ctx.shadowBlur=4;ctx.fillText(tech?'TÉCNICA ECO':'GUIA ECO',x,y-87);ctx.shadowBlur=0;
}
function drawPlayer(){
 let p=st.player;ellipse(ctx,p.x,p.y+2,20,6,'#183e4066');
 let moving=p.moving&&p.anim>0;
 let step=Math.floor(p.anim*7)%2;
 let spriteName=moving?`dir_${p.dir}_walk_${step}`:`dir_${p.dir}_idle`;
 let im=assets[spriteName]&&assets[spriteName].naturalWidth?assets[spriteName]:assets['player_22'];
 if(!im)return;
 ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y));
 let bob=moving?Math.sin(p.anim*(pressed.sprint?19:14))*1.2:Math.sin(tick*.0025)*.4;
 ctx.drawImage(im,-37,-87+bob,74,91);
 // material being carried: small contextual icon visible while exploring
 if(st.inventory.length){let chosen=st.inventory[st.selected]||st.inventory[0],item=assets['item_'+chosen];if(item?.naturalWidth){ctx.drawImage(item,22,-48+bob,23,23);}}
 ctx.restore();
}
function drawWorld(){let w=world[st.zone];ctx.save();ctx.translate(-Math.round(cam.x),-Math.round(cam.y));ctx.drawImage(w.background,0,0);
 if(st.zone==='garden'){
  for(const a of w.interact.filter(a=>a.kind==='plant')){
   const planted=st.planted.includes(a.arg),names={ervas:'ERVAS AROMÁTICAS',flores:'JARDIM DE FLORES',arvores:'PEQUENO POMAR'};
   if(planted){for(let row=0;row<3;row++)for(let col=0;col<5;col++){let x=a.x-78+col*39,y=695+row*27;centered(a.arg==='arvores'?'tree2':a.arg==='ervas'?'bush':'flowers',x,y,a.arg==='arvores'?.25:.34);}}
   else {for(let col=0;col<5;col++)rect(ctx,a.x-80+col*40,710,3,4,'#d1a067');}
   ctx.textAlign='center';ctx.font='bold 10px Trebuchet MS,sans-serif';ctx.fillStyle='#533d31';ctx.fillRect(a.x-92,815,184,24);ctx.fillStyle='#f7e9c3';ctx.fillText((planted?'✓ ':'')+names[a.arg],a.x,831);
  }
 }
 // Each successful separation adds a small sign of recovery around the square.
 if(st.zone==='lobby')for(let n=0;n<Math.min(st.sorted,12);n++){let a=n/12*Math.PI*2;centered('flowers',730+Math.cos(a)*141,514+Math.sin(a)*103,.28);}

 // static decorative street geometry and living world details
 if(st.zone==='lobby'){
  
  for(let [x,y,text] of [[425,312,'COLETA SELETIVA'],[967,313,'MAPA'],[605,280,'APRENDER']]){ctx.font='bold 12px Trebuchet MS, sans-serif';ctx.strokeStyle='#16393d';ctx.lineWidth=4;ctx.strokeText(text,x,y);ctx.fillStyle='#fff3d1';ctx.fillText(text,x,y);}
 }
 if(st.zone==='park'){
  for(let j=0;j<8;j++){let x=906+j*47,y=247+Math.sin(j*1.7+tick*.014)*5;rect(ctx,x,y,18,2,'#c5efec');}
 }
 if(st.zone==='city'){
  for(let [x,y,text] of [[224,225,'LARANJEIRAS'],[1113,228,'MERCADO ECO']]){ctx.fillStyle='#fff3d9';ctx.font='900 11px Trebuchet MS,sans-serif';ctx.textAlign='center';if(x>500)ctx.fillText(text,x,231);}
 }
 if(st.zone==='lab'){
  
 }
 // overlay portal signage (immersive but readable)
 for(let a of w.interact)if(a.kind==='portal'){
  const lock=a.arg==='lab'&&st.sorted<3;let tx=a.x,ty=a.y;
  ellipse(ctx,tx,ty+14,65,15,lock?'#8e695490':'#3cbb8566');ctx.strokeStyle=lock?'#eeae74':'#e5eac2';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(tx,ty+13,58,12,0,0,Math.PI*2);ctx.stroke();
  ctx.font='900 12px Trebuchet MS,sans-serif';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#193d3e';const label=lock?'🔒 SENAI':zones[a.arg].name;ctx.strokeText(label,tx,ty-18);ctx.fillStyle='#fff8d9';ctx.fillText(label,tx,ty-18);
 }
 if(!st.piece&&st.zone==='city'){
   centered('piece',1194,391,1.02);}
 if(!st.secret&&st.zone==='park'){
   rect(ctx,349,170,13,16,'#ffe592');rect(ctx,351,168,8,8,'#fffad0');}
 let drawables=[];
 for(let o of w.props){if(st.zone==='lab'&&o.name==='machine_off'&&st.machine)o={...o,name:'machine_on'};drawables.push({y:o.y,draw:()=>centered(o.name,o.x,o.y,o.scale)});}
 for(let it of w.items)if(!it.taken){drawables.push({y:it.y+2,draw:()=>{
   let bob=Math.sin(tick*.004+it.x*.02)*3;ellipse(ctx,it.x,it.y+5,18,6,'#244d4a77');ellipse(ctx,it.x,it.y-11+bob,27+Math.sin(tick*.004)*2,27+Math.sin(tick*.004)*2,'#f3ecaa2a');centered('item_'+it.type,it.x,it.y+bob,1.0);
 }});}
 for(let a of w.interact)if(a.kind==='guide'){drawables.push({y:a.y,draw:()=>drawGuide(a.x,a.y,st.zone==='lab')});}
 drawables.push({y:st.player.y,draw:()=>drawPlayer()});drawables.sort((a,b)=>a.y-b.y);for(let d of drawables)d.draw();
 // high contrast category labels: no color-only identification
 for(let a of w.interact)if(a.kind==='bin'){
  ctx.textAlign='center';ctx.textBaseline='bottom';ctx.font='900 11px Trebuchet MS,sans-serif';
  ctx.strokeStyle='#183a3c';ctx.lineWidth=4;const label=kinds[a.arg].name.toUpperCase();ctx.strokeText(label,a.x,a.y-76);ctx.fillStyle='#fff5d2';ctx.fillText(label,a.x,a.y-76);
 }
 // Small, slow butterflies make restored outdoor spaces feel alive.
 if(st.zone!=='lab')for(let i=0;i<9;i++){let bx=220+i*174+Math.sin(tick*.0005+i)*25,by=350+(i%3)*280+Math.cos(tick*.0008+i)*17;rect(ctx,bx,by,2,3,'#725641');rect(ctx,bx-3,by+Math.sin(tick*.015+i)*2,3,2,i%2?'#f0d596':'#f0b4a1');rect(ctx,bx+2,by-Math.sin(tick*.015+i)*2,3,2,i%2?'#f0d596':'#f0b4a1');}
 // selection glow and key hint
 if(target){let a=target.data;if(!(target.type==='object'&&a.kind==='portal')){
   let y=a.y+12;ctx.strokeStyle='#fff5bd';ctx.lineWidth=2.5;ctx.setLineDash([7,5]);ctx.beginPath();ctx.ellipse(a.x,y,28+Math.sin(tick*.007)*2,11,0,0,2*Math.PI);ctx.stroke();ctx.setLineDash([]);
 }}
 for(let v of sparks){rect(ctx,v.x,v.y,v.size,v.size,v.color)}
 ctx.restore();
 // edge darkening and warmth
 let shade=ctx.createLinearGradient(0,0,0,H);shade.addColorStop(0,'#142e3910');shade.addColorStop(.65,'#ffffff00');shade.addColorStop(1,'#0d283121');rect(ctx,0,0,W,H,shade);
 if(showMinimap&&!currentModal)drawMinimap();
}

const minimapCache={};
function drawMinimap(){
 const x=778,y=112,mw=162,mh=101,sx=mw/MW,sy=mh/MH;
 ctx.save();rect(ctx,x-5,y-22,mw+10,mh+28,'#473c31');rect(ctx,x-3,y-20,mw+6,mh+24,'#d4b98a');
 if(!minimapCache[st.zone]){let map=document.createElement('canvas');map.width=mw;map.height=mh;let c=map.getContext('2d');c.imageSmoothingEnabled=true;c.drawImage(world[st.zone].background,0,0,mw,mh);for(const o of world[st.zone].props){let a=assets[o.name];if(a?.naturalWidth)c.drawImage(a,(o.x-a.width*o.scale/2)*sx,(o.y-a.height*o.scale)*sy,a.width*o.scale*sx,a.height*o.scale*sy);}minimapCache[st.zone]=map;}
 ctx.drawImage(minimapCache[st.zone],x,y);ctx.textAlign='left';ctx.font='bold 10px Trebuchet MS,sans-serif';ctx.fillStyle='#493c30';ctx.fillText('MAPA DO VALE  ·  M',x+4,y-6);
 for(let a of world[st.zone].interact){if(a.kind==='portal')rect(ctx,x+a.x*sx-2,y+a.y*sy-2,4,4,'#eff7b2');if(a.kind==='plant')rect(ctx,x+a.x*sx-2,y+a.y*sy-2,4,4,st.planted.includes(a.arg)?'#6ec886':'#e1b568');}
 for(let i of world[st.zone].items)if(!i.taken)rect(ctx,x+i.x*sx-1,y+i.y*sy-1,2,2,'#ffdf82');
 const px=x+st.player.x*sx,py=y+st.player.y*sy;rect(ctx,px-3,py-3,6,6,'#4d3e32');rect(ctx,px-2,py-2,4,4,'#fff9e6');
 ctx.strokeStyle='#fff9e655';ctx.lineWidth=1;ctx.strokeRect(x+cam.x*sx,y+cam.y*sy,W*sx,H*sy);ctx.restore();
}
function loop(now){let dt=Math.min(.044,(now-last)/1000);last=now;tick=now;ctx.clearRect(0,0,W,H);
 if(st&&currentModal===''&&st.started){st.elapsed+=dt;if(now-lastSaved>15000)saveGame();
   let dx=(pressed.right?1:0)-(pressed.left?1:0);let dy=(pressed.down?1:0)-(pressed.up?1:0);let p=st.player;p.moving=!!(dx||dy);
   if(p.moving){let l=Math.hypot(dx,dy);dx/=l;dy/=l;let speed=pressed.sprint?320:212;let nx=p.x+dx*speed*dt,ny=p.y+dy*speed*dt;
     if(!collide(nx,p.y))p.x=nx;if(!collide(p.x,ny))p.y=ny;
     p.dir=Math.abs(dx)>.14&&Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';p.anim+=dt;
   }
 }
 if(st){let px=clamp(st.player.x-W/2,0,MW-W),py=clamp(st.player.y-H*.60,0,MH-H);cam.x+=(px-cam.x)*Math.min(1,dt*7.8);cam.y+=(py-cam.y)*Math.min(1,dt*7.8);
   target=nearest();ui.hint.classList.toggle('hidden',!target||!!currentModal);if(target)ui.hintText.textContent=hintText(target);
   for(let v of sparks){v.x+=v.vx*dt;v.y+=v.vy*dt;v.vy+=75*dt;v.life-=dt;}sparks=sparks.filter(v=>v.life>0);
   drawWorld();
 }
 requestAnimationFrame(loop);
}
function toggleSound(){soundEnabled=!soundEnabled;if(soundEnabled)sfx('select');updateHud();toast(soundEnabled?'Sons ativados':'Sons silenciados','♫');}
function cycleInventory(){if(!st?.inventory.length)return;st.selected=(st.selected+1)%st.inventory.length;sfx('select');updateHud();}
function confirmReset(){if(!st.started&&!readSave()){newGame();return;}open(`<span class="dialog-eyebrow">UMA NOVA HISTÓRIA</span><h2 class="dialog-title">Recomeçar a aventura?</h2><p class="dialog-sub">Seu progresso salvo será substituído. Você começa novamente na praça, com a mochila vazia.</p><div class="dialog-row">${btn('Manter minha aventura',st.started?'close':'intro',true)}${btn('Sim, recomeçar','confirm-reset')}</div>`,'confirm');}
function handleAction(name){switch(name){case 'start':newGame();break;case 'continue':continueGame();break;case 'intro':intro();break;case 'close':close();break;case 'pause':menu();break;case 'help':help();break;case 'schedule':schedule();break;case 'map':map();break;case 'journal':journal();break;case 'sound':toggleSound();if(currentModal==='pause')menu();break;case 'minimap':showMinimap=!showMinimap;map();break;case 'education':education();break;case 'reset':confirmReset();break;case 'confirm-reset':newGame();break;}}
ui.dialog.addEventListener('click',e=>{const btn=e.target.closest('[data-action]');if(btn)handleAction(btn.dataset.action);});
document.getElementById('menuBtn').addEventListener('click',()=>st?.started?menu():intro());
document.getElementById('soundBtn')?.addEventListener('click',toggleSound);
document.getElementById('mapBtn')?.addEventListener('click',map);
document.getElementById('journalBtn')?.addEventListener('click',journal);
document.getElementById('touchMenu')?.addEventListener('click',()=>st?.started?menu():intro());
document.getElementById('touchMap')?.addEventListener('click',map);
document.getElementById('touchSelect')?.addEventListener('click',cycleInventory);
const sprintButton=document.getElementById('touchSprint');if(sprintButton){sprintButton.addEventListener('pointerdown',e=>{pressed.sprint=true;sprintButton.setPointerCapture(e.pointerId);});for(const name of ['pointerup','pointercancel','lostpointercapture'])sprintButton.addEventListener(name,()=>pressed.sprint=false);}
document.getElementById('fullBtn').addEventListener('click',async()=>{const frame=document.getElementById('gameFrame');if(document.fullscreenElement){await document.exitFullscreen();}else if(frame.requestFullscreen){try{await frame.requestFullscreen();}catch(e){toast('Tela cheia indisponível neste navegador.','!');}}});
document.getElementById('touchAction').onclick=interact;
for(let b of document.querySelectorAll('[data-dir]')){let d=b.dataset.dir;b.addEventListener('pointerdown',e=>{pressed[d]=true;b.setPointerCapture(e.pointerId)});for(let ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>pressed[d]=false);}
function keyName(e){return ({ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right'})[e.key.toLowerCase?.()===undefined?e.key:e.key.toLowerCase()]||({ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'})[e.key]||'';}
window.addEventListener('keydown',e=>{
 const k=e.key.toLowerCase();
 if(currentModal&&k==='tab'){const focusable=[...ui.dialog.querySelectorAll('button,input,select')];const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){last?.focus();e.preventDefault();}else if(!e.shiftKey&&document.activeElement===last){first?.focus();e.preventDefault();}return;}
 if(currentModal&&['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)&&k!=='escape')return;
 if(['arrowup','arrowdown','arrowleft','arrowright',' ','escape','tab'].includes(k))if(k!=='tab')e.preventDefault();
 if(k==='escape'){if(currentModal==='intro')return;if(currentModal)close();else menu();return;}
 if(currentModal){return;}
 if((k==='e'||k===' ')&&!e.repeat){interact();return;}
 if(k==='v'&&!e.repeat){toggleSound();return;}
 if(k==='m'&&!e.repeat){map();return;}if(k==='j'&&!e.repeat){journal();return;}
 if(k==='shift')pressed.sprint=true;
 if(/^[1-8]$/.test(k)&&st.inventory[Number(k)-1]){st.selected=Number(k)-1;updateHud();return;}
 if(k==='q'&&!e.repeat){cycleInventory();return;}
 if(['w','arrowup'].includes(k))pressed.up=true;if(['s','arrowdown'].includes(k))pressed.down=true;if(['a','arrowleft'].includes(k))pressed.left=true;if(['d','arrowright'].includes(k))pressed.right=true;
});
window.addEventListener('keyup',e=>{let k=e.key.toLowerCase();if(k==='shift')pressed.sprint=false;if(['w','arrowup'].includes(k))pressed.up=false;if(['s','arrowdown'].includes(k))pressed.down=false;if(['a','arrowleft'].includes(k))pressed.left=false;if(['d','arrowright'].includes(k))pressed.right=false;});
window.addEventListener('blur',()=>{for(let k in pressed)pressed[k]=false;if(st?.started&&!currentModal)menu();});
window.addEventListener('pagehide',saveGame);
document.addEventListener('visibilitychange',()=>{if(document.hidden){saveGame();for(let k in pressed)pressed[k]=false;if(st?.started&&!currentModal)menu();}});
async function start(){await Promise.all(assetPaths.map(([key,url])=>new Promise(resolve=>{let im=new Image();assets[key]=im;im.onload=resolve;im.onerror=()=>{console.warn('Asset não carregado:',url);resolve();};im.src=url;})));
 createWorld();initState();intro();requestAnimationFrame(loop);
}
start().catch(e=>{console.error(e);ui.dialog.innerHTML=`<div class="dialog-body"><h2>Erro ao iniciar</h2><p>${safeText(e.message)}</p></div>`;});
if(new URLSearchParams(location.search).get('debug')==='1')window.__ecoDebug={zones,MW,MH,GOAL,SAVE_KEY,newGame,close,saveGame,continueGame,checkFinish,waterAt,handleAction,get state(){return st},world,transfer,interact,collide,finish,get target(){return target},get modal(){return currentModal},assets};
})();
