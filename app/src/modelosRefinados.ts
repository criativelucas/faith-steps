import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const madeira='#9B704D', ouro='#C5A361', metal='#34454B', creme='#F4EEE2';
const material=(color:string)=>new THREE.MeshStandardMaterial({color,roughness:.72});
function bloco(g:THREE.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,cor:string,r=.012){
 const m=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/5,h/5,d/5)),material(cor));m.position.set(x,y+h/2,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;
}
function haste(g:THREE.Object3D,a:number[],b:number[],raio:number,cor:string){
 const inicio=new THREE.Vector3(...a),fim=new THREE.Vector3(...b),delta=fim.clone().sub(inicio);
 const m=new THREE.Mesh(new THREE.CylinderGeometry(raio,raio,delta.length(),12),material(cor));m.position.copy(inicio).add(fim).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());g.add(m);return m;
}
function esfera(g:THREE.Object3D,x:number,y:number,z:number,r:number,cor:string){const m=new THREE.Mesh(new THREE.SphereGeometry(r,16,12),material(cor));m.position.set(x,y,z);g.add(m);return m;}
function arte(g:THREE.Object3D,w:number,h:number,desenhar:(c:CanvasRenderingContext2D)=>void){
 if(typeof document==='undefined')return;
 const cv=document.createElement('canvas');cv.width=768;cv.height=576;const c=cv.getContext('2d');if(!c)return;desenhar(c);
 const tx=new THREE.CanvasTexture(cv);tx.colorSpace=THREE.SRGBColorSpace;
 const mt=new THREE.MeshStandardMaterial({map:tx,roughness:.9});mt.userData.texturaLoja=true;
 const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mt);m.position.z=.061;g.add(m);
}
export function quadroRefinado(g:THREE.Group,id:string){
 const w=id==='paisagem'||id==='mapaPaulo'?1.04:.86,h=.7;
 bloco(g,0,-h/2, .015,w,h,.045,'#5F4736');
 bloco(g,0,-h/2+.027,.041,w-.054,h-.054,.018,creme);
 for(const x of [-w/2+.022,w/2-.022])bloco(g,x,-h/2,.032,.044,h,.064,madeira);
 for(const y of [-h/2,h/2-.044])bloco(g,0,y,.032,w-.088,.044,.064,madeira);
 arte(g,w-.12,h-.12,c=>{
  c.fillStyle=creme;c.fillRect(0,0,768,576);c.textAlign='center';c.fillStyle='#38554A';
  if(id==='paisagem'||id==='quadroSalmo23'){
   const ceu=c.createLinearGradient(0,0,0,576);ceu.addColorStop(0,'#B4D6DA');ceu.addColorStop(1,'#EDF0DC');c.fillStyle=ceu;c.fillRect(0,0,768,576);
   c.fillStyle='#F6E2AD';c.beginPath();c.arc(580,125,52,0,Math.PI*2);c.fill();
   for(const [y,cor] of [[330,'#8BAB92'],[410,'#597D67'],[490,'#38594A']] as const){c.fillStyle=cor;c.beginPath();c.moveTo(0,576);c.lineTo(0,y);c.bezierCurveTo(240,y-170,420,y+95,768,y-35);c.lineTo(768,576);c.fill();}
   if(id==='quadroSalmo23'){c.fillStyle='#FFFDF3';c.font='italic 44px Georgia';c.fillText('O Senhor é meu pastor',384,180);c.font='24px Georgia';c.fillText('SALMO 23',384,230);}return;
  }
  if(id==='painelBotanico'){
   for(let j=0;j<3;j++){const x=150+j*234;c.strokeStyle='#6B7952';c.lineWidth=7;c.beginPath();c.moveTo(x,440);c.bezierCurveTo(x-30,330,x+20,230,x,130);c.stroke();for(let k=0;k<7;k++){const y=180+k*33;c.fillStyle=k%2?'#7C9469':'#4F7254';c.beginPath();c.ellipse(x+(k%2?30:-30),y,38,15,k%2?-.6:.6,0,Math.PI*2);c.fill();}c.font='22px Georgia';c.fillText(['OLIVEIRA','CEDRO','VIDEIRA'][j],x,505);}return;
  }
  if(id==='mapaPaulo'){
   c.fillStyle='#CEE0DF';c.fillRect(0,0,768,576);c.fillStyle='#E8DCC0';c.beginPath();c.moveTo(40,50);c.lineTo(620,40);c.lineTo(690,240);c.lineTo(480,310);c.lineTo(340,240);c.lineTo(70,200);c.fill();c.beginPath();c.moveTo(0,390);c.lineTo(470,350);c.lineTo(768,440);c.lineTo(768,576);c.lineTo(0,576);c.fill();
   const cidades=[[180,160,'Roma'],[355,200,'Corinto'],[490,230,'Éfeso'],[650,355,'Jerusalém']] as const;c.strokeStyle='#A55E45';c.lineWidth=4;c.setLineDash([10,8]);c.beginPath();cidades.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();c.setLineDash([]);c.font='23px Georgia';for(const [x,y,nome] of cidades){c.fillStyle='#80513C';c.beginPath();c.arc(x,y,7,0,Math.PI*2);c.fill();c.fillText(nome,x,y-18);}c.font='28px Georgia';c.fillText('VIAGENS DE PAULO',384,510);return;
  }
  if(id==='pomba'){
   c.fillStyle='#D9E8E4';c.fillRect(0,0,768,576);c.fillStyle='#FFFDF6';c.beginPath();c.moveTo(200,330);c.bezierCurveTo(110,60,340,90,400,270);c.bezierCurveTo(580,80,690,180,500,340);c.bezierCurveTo(430,440,310,430,200,330);c.fill();c.fillStyle='#355A49';c.font='42px Georgia';c.fillText('PAZ',384,495);return;
  }
  const linhas=id==='quadroJosue'?['Eu e a minha casa','serviremos ao Senhor']:id==='poster'?['Tudo o que tem vida','louve ao Senhor']:id==='quadro'?['Fé']:['A tua palavra é luz','para o meu caminho'];
  c.strokeStyle='#B8A37A';c.lineWidth=2;c.strokeRect(28,28,712,520);c.font='italic 48px Georgia';linhas.forEach((l,i)=>c.fillText(l,384,240+i*68));c.font='22px Georgia';c.fillText(id==='quadroJosue'?'JOSUÉ 24:15':id==='poster'?'SALMO 150:6':id==='quadro'?'HEBREUS 11:1':'SALMO 119:105',384,440);
 });
}
export function cruzRefinada(g:THREE.Group){
 // Single extruded silhouette: no coincident faces at the joint.
 const pontos=[[-.07,-.5],[.07,-.5],[.07,.09],[.29,.09],[.29,.23],[.07,.23],[.07,.5],[-.07,.5],[-.07,.23],[-.29,.23],[-.29,.09],[-.07,.09]];
 const shape=new THREE.Shape();pontos.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
 const m=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.07,bevelEnabled:true,bevelSize:.009,bevelThickness:.009,bevelSegments:3,steps:1}),material('#92613F'));g.add(m);
 for(const x of [-.032,.021])haste(g,[x,-.45,.081],[x,.45,.081],.0015,'#B48B61');
}
export function bibliaRefinada(g:THREE.Group,aberta=true){
 if(!aberta){
  bloco(g,0,0,0,.52,.018,.7,'#593B39');bloco(g,0,.018,0,.49,.075,.66,'#F0E5CD');bloco(g,0,.093,0,.52,.018,.7,'#593B39');
  bloco(g,-.248,.014,0,.025,.085,.68,'#69433D');
  bloco(g,0,.112,-.03,.025,.004,.22,ouro);bloco(g,0,.112,-.075,.13,.004,.025,ouro);
  for(const z of [-.25,.25])bloco(g,-.262,.03,z,.007,.05,.022,ouro);
  return;
 }
 bloco(g,0,0,0,.9,.024,.62,'#654442');
 for(const lado of [-1,1]){
  const folha=new THREE.Group();folha.position.set(lado*.222,.058,0);folha.rotation.z=lado*.12;g.add(folha);
  bloco(folha,0,-.02,0,.43,.05,.57,'#E8DDC7');
  for(let i=0;i<4;i++)bloco(folha,0,.031+i*.002,0,.425,.001,.565,'#FFF9EB',.0001);
  for(let linha=0;linha<15;linha++)for(const col of [-1,1])bloco(folha,col*.095,.042,-.22+linha*.029,.15-(linha%5===0?.03:0),.001,.003,'#A79A83',.0001);
 }
 bloco(g,0,.058,.08,.018,.006,.55,'#9D5D54');
}
export const MOVEIS_REFINADOS:Record<string,(g:THREE.Group)=>void>=Object.fromEntries(['quadro','versiculo','poster','paisagem','pomba','quadroJosue','quadroSalmo23','mapaPaulo','painelBotanico'].map(id=>[id,(g:THREE.Group)=>quadroRefinado(g,id)]));
MOVEIS_REFINADOS.cruz=cruzRefinada;

function baseArea(g:THREE.Group,interior=false){
 bloco(g,0,0,0,2,.1,1.55,'#D4CABA');bloco(g,0,.1,0,1.92,.025,1.47,interior?'#CBAE8A':'#D6D5BE');
 if(interior){bloco(g,0,.125,-.72,1.92,.86,.06,'#E2E6DD');bloco(g,-.93,.125,0,.06,.45,1.47,'#E2E6DD');}
}
function vaso(g:THREE.Group,x:number,z:number,escala=1){const p=new THREE.Group();p.position.set(x,.125,z);p.scale.setScalar(escala);g.add(p);bloco(p,0,0,0,.16,.19,.16,'#BA7E60');for(const [dx,y,dz] of [[-.04,.26,0],[.05,.33,.03],[0,.41,-.03]])esfera(p,dx,y,dz,.09,'#698A5F');}
function cadeira(g:THREE.Group,x:number,z:number){for(const dx of [-.12,.12])for(const dz of [-.1,.1])haste(g,[x+dx,.13,z+dz],[x+dx,.37,z+dz],.013,madeira);bloco(g,x,.37,z,.3,.04,.26,creme);bloco(g,x,.41,z-.12,.3,.25,.035,madeira);}
export function areaRefinada(g:THREE.Group,id:string){
 const interior=['garagem','academia','estudio'].includes(id);baseArea(g,interior);
 if(id==='piscina'){
  bloco(g,-.21,.13,-.05,1.18,.07,1.12,'#FCF7E9');bloco(g,-.21,.2,-.05,1.04,.015,.98,'#6CC8CF');
  for(let i=0;i<8;i++)bloco(g,-.21,.216,-.46+i*.12,.95,.001,.006,i%2?'#90D9DA':'#AFE6E2',.0001);
  for(const z of [-.26,.29]){bloco(g,.65,.17,z,.3,.04,.43,madeira);const enc=bloco(g,.65,.21,z-.14,.3,.19,.035,creme);enc.rotation.x=-.3;}
  haste(g,[.67,.13,.56],[.67,.86,.56],.012,metal);const guarda=new THREE.Mesh(new THREE.ConeGeometry(.3,.13,24),material('#E7C794'));guarda.position.set(.67,.89,.56);g.add(guarda);
  for(const z of [-.25,-.02]){haste(g,[-.78,.15,z],[-.78,.36,z],.012,'#C4CDD0');haste(g,[-.78,.36,z],[-.61,.25,z],.012,'#C4CDD0');}
 }else if(id==='jardim'||id==='varanda'){
  if(id==='jardim'){
   for(const z of [-.4,.12]){bloco(g,-.53,.13,z,.58,.12,.35,madeira);bloco(g,-.53,.25,z,.51,.015,.28,'#66513D');for(const x of [-.69,-.52,-.35])esfera(g,x,.3,z,.06,'#72964F');}
   const fonte=new THREE.Mesh(new THREE.CylinderGeometry(.23,.25,.1,32),material('#B7B4A1'));fonte.position.set(.51,.18,.26);g.add(fonte);const agua=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,.012,32),material('#91C9CB'));agua.position.set(.51,.235,.26);g.add(agua);haste(g,[.51,.24,.26],[.51,.44,.26],.035,'#AAA895');
  }else{bloco(g,.12,.43,.02,.72,.055,.42,madeira);for(const x of [-.17,.41])for(const z of [-.13,.17])haste(g,[x,.13,z],[x,.43,z],.018,metal);cadeira(g,-.12,.42);cadeira(g,.32,-.36);bloco(g,-.65,.13,-.35,.4,.4,.38,'#6D7773');bloco(g,-.65,.53,-.35,.44,.025,.4,'#C4BBB0');}
  for(const x of [-.78,.78])haste(g,[x,.13,-.58],[x,1.04,-.58],.024,madeira);
  for(const x of [-.8,-.4,0,.4,.8])bloco(g,x,1.04,-.44,.045,.045,.5,madeira);
  bloco(g,0,1.015,-.65,1.7,.055,.045,madeira);bloco(g,0,1.015,-.21,1.7,.055,.045,madeira);vaso(g,.78,.5,.8);
 }else if(id==='garagem'){
  bloco(g,-.45,.47,-.43,.83,.06,.4,madeira);for(const x of [-.8,-.1])for(const z of [-.58,-.28])haste(g,[x,.13,z],[x,.47,z],.018,metal);
  bloco(g,-.45,.59,-.675,.8,.3,.025,'#B29870');for(let i=0;i<5;i++)haste(g,[-.74+i*.14,.65,-.65],[-.74+i*.14,.82,-.65],.008,metal);
  const bike=new THREE.Group();bike.position.set(.4,.13,.23);g.add(bike);
  for(const x of [-.25,.25]){const r=new THREE.Mesh(new THREE.TorusGeometry(.18,.017,8,32),material('#344447'));r.position.set(x,.18,0);bike.add(r);for(let i=0;i<8;i++){const a=i*Math.PI/4;haste(bike,[x,.18,0],[x+Math.cos(a)*.17,.18+Math.sin(a)*.17,0],.002,'#BAC3C2');}}
  const a=[-.25,.18,0],b=[-.08,.41,0],c=[.03,.18,0],d=[.17,.4,0],e=[.25,.18,0];for(const [p,q] of [[a,b],[b,c],[c,a],[b,d],[d,c],[d,e]])haste(bike,p,q,.012,'#5A8F91');bloco(bike,-.08,.42,0,.12,.025,.06,'#674C39');haste(bike,d,[.18,.49,0],.01,metal);haste(bike,[.18,.49,-.07],[.18,.49,.07],.009,metal);
 }else if(id==='academia'){
  bloco(g,-.43,.14,.06,.5,.09,.85,metal);bloco(g,-.43,.23,.08,.4,.014,.69,'#59605A');for(const x of [-.64,-.22])haste(g,[x,.2,-.28],[x,.72,-.28],.015,'#AAB7B5');bloco(g,-.43,.68,-.3,.46,.12,.07,metal);bloco(g,-.43,.72,-.258,.22,.05,.004,'#A2D2C7');
  bloco(g,.47,.13,.1,.42,.017,.85,'#839E91');for(const z of [-.2,.24]){haste(g,[.34,.19,z],[.59,.19,z],.015,metal);for(const x of [.34,.59])esfera(g,x,.19,z,.055,'#59686A');}vaso(g,.78,-.52,.7);
 }else if(id==='estudio'){
  for(let i=0;i<5;i++)bloco(g,-.68+i*.34,.38,-.674,.22,.45,.035,i%2?'#627B75':'#929C89');
  bloco(g,-.25,.52,-.19,.9,.065,.28,metal);for(let i=0;i<18;i++)bloco(g,-.66+i*.047,.585,-.12,.043,.008,.13,creme,.001);for(const x of [-.56,.06])haste(g,[x,.13,-.16],[x,.52,-.16],.018,metal);
  cadeira(g,-.25,.24);haste(g,[.58,.13,.2],[.58,.77,.2],.012,metal);haste(g,[.58,.77,.2],[.44,.81,.2],.018,metal);esfera(g,.43,.81,.2,.025,'#A6B4AF');for(let i=0;i<3;i++){const a=i*Math.PI*2/3;haste(g,[.58,.16,.2],[.58+Math.cos(a)*.15,.13,.2+Math.sin(a)*.15],.008,metal);}
 }
}
export const AREAS_REFINADAS=Object.fromEntries(['jardim','varanda','piscina','garagem','academia','estudio'].map(id=>[id,(g:THREE.Group)=>areaRefinada(g,id)]));

export function animalRefinado(g:THREE.Group,tipo:'gato'|'cachorro'){
 const gato=tipo==='gato',pelo=gato?'#C58E59':'#B37D4F',claro='#F5E8D6',escuro=gato?'#8D603F':'#634332';
 const oval=(pai:THREE.Object3D,x:number,y:number,z:number,rx:number,ry:number,rz:number,cor:string)=>{const m=esfera(pai,x,y,z,1,cor);m.scale.set(rx,ry,rz);return m;};
 oval(g,0,.255,0,.12,.13,.22,pelo);oval(g,0,.29,.13,.095,.14,.105,claro);
 oval(g,0,.435,.19,.115,.105,.11,pelo);
 for(const lado of [-1,1]){
  oval(g,lado*.044,.409,.285,.042,.035,.03,claro);
  oval(g,lado*.05,.465,.282,.022,.026,.012,'#392D27');
  oval(g,lado*.05,.466,.293,.013,.018,.006,gato?'#A1AB63':'#725136');
  oval(g,lado*.05,.467,.298,gato?.004:.009,.013,.004,'#191F20');
  oval(g,lado*.05-.004,.476,.302,.004,.005,.002,'#FFFFFF');
  if(gato){
   const ear=new THREE.Mesh(new THREE.ConeGeometry(.048,.105,3),material(pelo));ear.position.set(lado*.077,.537,.16);ear.rotation.z=-lado*.17;g.add(ear);
   const inner=new THREE.Mesh(new THREE.ConeGeometry(.027,.063,3),material('#D5A694'));inner.position.set(lado*.077,.54,.182);inner.rotation.z=-lado*.17;g.add(inner);
   for(let k=0;k<3;k++)haste(g,[lado*.055,.42,.307],[lado*.14,.413+k*.013,.30],.0012,'#D1BC9C');
   for(let k=0;k<3;k++)oval(g,lado*.095,.29,-.12+k*.08,.009,.043,.014,escuro);
  }else{const ear=oval(g,lado*.114,.422,.146,.042,.108,.055,escuro);ear.rotation.z=lado*.22;}
 }
 oval(g,0,.425,.32,.018,.013,.012,gato?'#B77B73':'#302B28');
 haste(g,[0,.411,.316],[0,.397,.314],.0025,escuro);
 const rabo=new THREE.Group();rabo.position.set(0,.3,-.19);g.add(rabo);
 const curva=new THREE.CatmullRomCurve3(gato?[new THREE.Vector3(0,0,0),new THREE.Vector3(.02,.1,-.08),new THREE.Vector3(.04,.27,-.1),new THREE.Vector3(.01,.31,-.06)]:[new THREE.Vector3(0,0,0),new THREE.Vector3(0,.06,-.1),new THREE.Vector3(.02,.13,-.14)]);
 rabo.add(new THREE.Mesh(new THREE.TubeGeometry(curva,16,gato?.018:.026,8,false),material(pelo)));
 const ponta=curva.getPoint(1);esfera(rabo,ponta.x,ponta.y,ponta.z,gato?.018:.026,pelo);
 const pernas:THREE.Object3D[]=[];
 for(const x of [-.075,.075])for(const z of [-.13,.13]){
  const perna=new THREE.Group();perna.position.set(x,.20,z);g.add(perna);pernas.push(perna);
  oval(perna,0,-.07,0,.034,.10,.038,pelo);oval(perna,0,-.176,.017,.041,.026,.055,claro);
  for(const dx of [-.012,.012])haste(perna,[dx,-.179,.052],[dx,-.164,.057],.0015,'#B6A28A');
 }
 const coleira=new THREE.Mesh(new THREE.TorusGeometry(.09,.012,8,32),material(gato?'#6A8C7D':'#648C9B'));coleira.rotation.x=Math.PI/2;coleira.position.set(0,.345,.15);g.add(coleira);oval(g,0,.33,.25,.018,.022,.006,ouro);
 return {rabo,pernas};
}
export function atividadeRefinada(g:THREE.Group,tipo:'jejum'|'evangelismo'){
 // Open table construction instead of a solid block concealing the objects.
 bloco(g,0,.35,0,.94,.045,.64,madeira);
 for(const x of [-.38,.38])for(const z of [-.24,.24])bloco(g,x,0,z,.045,.35,.045,'#77573E');
 if(tipo==='jejum'){
  bloco(g,0,.396,0,.36,.003,.61,'#E4D9BF');
  const livro=new THREE.Group();bibliaRefinada(livro);livro.scale.setScalar(.5);livro.position.set(.13,.401,.04);g.add(livro);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.075,.085,.018,32),material(ouro));base.position.set(-.3,.405,-.14);g.add(base);
  const vela=new THREE.Mesh(new THREE.CylinderGeometry(.035,.037,.17,24),material('#F5EAD3'));vela.position.set(-.3,.497,-.14);g.add(vela);
  haste(g,[-.3,.582,-.14],[-.3,.6,-.14],.002,'#4A372C');const chama=esfera(g,-.3,.614,-.14,.015,'#EABC6B');chama.scale.set(.7,1.7,.7);
 }else{
  const globo=new THREE.Group();globo.position.set(-.18,.4,0);g.add(globo);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.15,.17,.027,32),material(madeira));base.position.y=.014;globo.add(base);haste(globo,[0,.025,0],[0,.16,0],.018,ouro);
  const mundo=esfera(globo,0,.32,0,.18,'#7FAEB4');
  if(typeof document!=='undefined'){
   const cv=document.createElement('canvas');cv.width=768;cv.height=384;const c=cv.getContext('2d')!;c.fillStyle='#7FAEB4';c.fillRect(0,0,768,384);c.strokeStyle='#A7C6C6';c.lineWidth=1;for(let x=0;x<768;x+=64){c.beginPath();c.moveTo(x,0);c.lineTo(x,384);c.stroke();}for(let y=0;y<384;y+=48){c.beginPath();c.moveTo(0,y);c.lineTo(768,y);c.stroke();}
   c.fillStyle='#D4CD9C';for(const pol of [[[85,75],[190,48],[245,82],[215,142],[167,166],[145,130],[100,137]],[[211,163],[265,185],[277,232],[239,320],[215,281],[202,207]],[[353,115],[396,108],[437,142],[430,204],[402,261],[379,227],[350,168]],[[363,94],[418,56],[545,52],[658,103],[611,154],[539,138],[498,185],[455,145],[422,105]],[[594,244],[656,228],[687,262],[647,283],[610,273]]]){c.beginPath();pol.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
   const tx=new THREE.CanvasTexture(cv);tx.colorSpace=THREE.SRGBColorSpace;const mt=mundo.material as THREE.MeshStandardMaterial;mt.color.set('#FFFFFF');mt.map=tx;mt.userData.texturaLoja=true;
  }
  const arco=new THREE.Mesh(new THREE.TorusGeometry(.205,.008,8,48,Math.PI*1.45),material(ouro));arco.position.y=.32;arco.rotation.z=-.6;globo.add(arco);
  const livro=new THREE.Group();bibliaRefinada(livro,false);livro.scale.setScalar(.43);livro.position.set(.29,.397,.05);livro.rotation.y=-.2;g.add(livro);
 }
}
