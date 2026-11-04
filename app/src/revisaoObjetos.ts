import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { descartarCena } from './recursos3D.ts';

const metal='#899AA0', madeira='#AA8057', escuro='#34464A', tecido='#B49AA9';
function ferramentas(g:THREE.Object3D) {
 const m=(geo:THREE.BufferGeometry,c:string,x:number,y:number,z:number)=>{const o=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:c,roughness:.72}));o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o;};
 const caixa=(x:number,y:number,z:number,w:number,h:number,d:number,c:string,r=.025)=>m(new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/4,h/4,d/4)),c,x,y+h/2,z);
 const haste=(a:number[],b:number[],r:number,c=metal)=>{const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),v=q.clone().sub(p);const o=m(new THREE.CylinderGeometry(r,r,v.length(),8),c,...p.add(q).multiplyScalar(.5).toArray() as [number,number,number]);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o;};
 const aro=(x:number,y:number,z:number,r:number,t:number,c:string)=>m(new THREE.TorusGeometry(r,t,6,20),c,x,y,z);
 return {m,caixa,haste,aro};
}

export function revisarObjeto(id:string,g:THREE.Group) {
 const {m,caixa,haste,aro}=ferramentas(g);
 const limpar=()=>{descartarCena(g);g.clear();};
 if(id==='banco') {
  limpar();
  for(const x of [4.92,6.08]) {
   for(const z of [-3.04,-2.72]) caixa(x,0,z,.055,.4,.055,escuro,.01);
   haste([x,.38,-3.04],[x,.89,-3.12],.025,escuro);
   haste([x,.35,-3.04],[x,.35,-2.7],.025,escuro);
  }
  for(let i=0;i<4;i++) caixa(5.5,.39,-3.04+i*.105,1.4,.05,.088,madeira,.012);
  for(let i=0;i<3;i++) caixa(5.5,.52+i*.125,-3.1,1.4,.095,.045,madeira,.012);
 }
 if(id==='almofada') {
  limpar();caixa(4,0,1.55,.8,.16,.8,tecido,.075);caixa(4,.155,1.55,.67,.012,.67,'#D6BBC5',.025);
  for(const dx of [-.19,.19]) for(const dz of [-.19,.19]) m(new THREE.SphereGeometry(.023,8,6),'#947C90',4+dx,.166,1.55+dz);
 }
 if(id==='aquario') {
  for(const y of [.6,1.04]) caixa(.6,y,4.875,.8,.035,.45,escuro,.01);
  for(const x of [.245,.955]) haste([x,.62,4.7],[x,1.04,4.7],.012,escuro);
  for(let i=0;i<5;i++) m(new THREE.IcosahedronGeometry(.035,0),'#BCA989',.34+i*.12,.68,4.82+(i%2)*.08);
  for(let i=0;i<3;i++) haste([.85,.66,4.9],[.82+i*.025,.85+(i%2)*.09,4.89],.012,'#63835E');
  caixa(.6,.05,4.642,.62,.49,.025,madeira);caixa(.6,.28,4.62,.22,.025,.025,metal);
 }
 if(id==='espelho') {
  for(const y of [.12,.45]) {caixa(7.38,y,2.6,.025,.26,.66,'#C8ACB5');haste([7.35,y+.14,2.48],[7.35,y+.14,2.72],.013,metal);}
  haste([7.8,.98,2.6],[7.59,.98,2.6],.022);m(new THREE.CylinderGeometry(.055,.055,.075,12),'#D8E4D7',7.52,.91,2.9);
 }
 if(id==='banheira') {
  for(const z of [.2,1]) caixa(6.1,.55,z,1.88,.06,.13,'#F4EFE6',.035);
  for(const x of [5.25,6.95]) caixa(x,.55,.6,.13,.06,.78,'#F4EFE6',.035);
  haste([5.32,.81,.55],[5.52,.81,.55],.025);haste([5.52,.81,.55],[5.52,.73,.55],.025);
 }
 if(id==='guarda-roupa') {for(const z of [3.18,3.84]) {caixa(.765,.24,z,.02,.6,.5,'#C2A47F');caixa(.765,1.12,z,.02,.66,.5,'#C2A47F');}}
 if(id==='bancada_oficina') {
  limpar();for(const x of [-4.55,-3.05]) for(const z of [9.45,9.85]) caixa(x,0,z,.11,.82,.11,escuro);
  caixa(-3.8,.2,9.66,1.7,.08,.5,madeira);caixa(-3.8,.82,9.66,1.9,.08,.68,madeira);
  for(const x of [-4.23,-3.37]) {caixa(x,.52,9.66,.78,.27,.55,'#876747');haste([x-.12,.66,9.95],[x+.12,.66,9.95],.018);}
  caixa(-4.35,.9,9.62,.3,.16,.23,'#777D7D');caixa(-4.35,1.02,9.62,.36,.04,.16,metal);
  haste([-4.35,.95,9.77],[-4.35,.95,10],.022);haste([-4.48,.95,9.99],[-4.22,.95,9.99],.014);
  caixa(-3.5,.9,9.6,.52,.04,.18,'#C7A575');haste([-3.15,.91,9.54],[-3.38,.91,9.74],.025,'#79553C');caixa(-3.13,.92,9.53,.17,.09,.08,metal);
 }
 if(id==='bicicleta_passeio') {
  limpar();for(const z of [10.22,10.98]) {const roda=aro(-1.1,.27,z,.24,.027,escuro);roda.rotation.y=Math.PI/2;for(let i=0;i<8;i++){const a=i*Math.PI/4;haste([-1.1,.27,z],[-1.1,.27+Math.sin(a)*.21,z+Math.cos(a)*.21],.006,metal);}}
  const a=[-1.1,.27,10.22],b=[-1.1,.27,10.98],c=[-1.1,.32,10.62],d=[-1.1,.61,10.7],e=[-1.1,.62,10.3];
  for(const [p,q] of [[a,e],[e,d],[d,c],[c,a],[d,b],[b,c]])haste(p,q,.025,'#4C8C9B');
  caixa(-1.1,.61,10.7,.19,.045,.23,'#79553C');haste(e,[-1.1,.72,10.25],.018);haste([-1.29,.72,10.25],[-.91,.72,10.25],.018,escuro);
  haste([-1.24,.32,10.62],[-.96,.32,10.62],.015);caixa(-1.25,.29,10.62,.1,.025,.13,escuro);
 }
 if(id==='bicicleta') {
  haste([14.4,.11,5.92],[14.4,.57,5.5],.035);haste([14.4,.12,5.4],[14.4,.58,5.92],.035);
  haste([14.2,.3,5.65],[14.6,.3,5.65],.02);for(const x of [14.18,14.62])caixa(x,.28,5.65,.13,.04,.18,escuro);
  caixa(14.4,.98,5.25,.26,.08,.14,escuro);caixa(14.4,1.06,5.25,.17,.01,.09,'#8EC4BE');
 }
 if(id==='teclado-estudio') {
  caixa(14.75,.78,.45,1.22,.12,.14,escuro);caixa(14.75,.905,.45,.2,.012,.07,'#7BB9B9');
  for(let i=0;i<21;i++)caixa(14.22+i*.052,.86,.7,.002,.015,.14,'#566368',.0004);
  haste([14.3,0,.6],[15.15,.77,.6],.025,escuro);haste([15.15,0,.6],[14.3,.77,.6],.025,escuro);
 }
 if(id==='bateria') {
  for(const [x,z,y,r] of [[16.6,1.6,.62,.16],[17.65,1.6,.45,.17],[16.92,1.18,.76,.12],[17.28,1.18,.76,.12]]) {const a=aro(x,y,z,r,.012,metal);a.rotation.x=Math.PI/2;}
  for(const x of [16.45,17.8]) for(let i=0;i<3;i++){const a=i*Math.PI*2/3;haste([x,.2,.9],[x+Math.cos(a)*.19,.025,.9+Math.sin(a)*.19],.012);}
 }
 if(id==='treino'||id==='colchonete') {
  const x=id==='treino'?5.1:15.55,z=id==='treino'?7.85:8.1;
  if(id==='colchonete'){limpar();caixa(x,.005,z,1.9,.035,.8,'#8EA898',.03);}
  for(const dx of [-.66,.66]) caixa(x+dx,.041,z,.015,.003,.61,'#CEDAC9',.001);
 }
 if(id==='cafeteira_varanda') {
  caixa(11.64,.92,-1.54,.27,.33,.3,escuro);caixa(11.48,1.05,-1.54,.04,.12,.18,metal);caixa(11.46,.94,-1.54,.14,.025,.28,metal);
  const alca=aro(11.48,1.01,-1.39,.035,.009,'#E4D6C4');alca.rotation.y=Math.PI/2;
 }
 if(id==='ducha_piscina') {caixa(-1,.06,1.6,.48,.035,.55,'#BA9A70');for(let i=0;i<4;i++)caixa(-1,.097,1.39+i*.13,.44,.005,.009,'#80694E',.001);}
}

export function vasoSanitario() {
 const g=new THREE.Group(),{m,caixa,aro}=ferramentas(g);
 caixa(7.55,0,.25,.48,.65,.23,'#ECEAE2',.07);
 m(new THREE.SphereGeometry(1,16,10),'#ECEAE2',7.55,.27,.58).scale.set(.22,.25,.28);
 const assento=aro(7.55,.43,.57,.17,.045,'#F7F4ED');assento.rotation.x=Math.PI/2;assento.scale.y=1.24;
 caixa(7.55,.65,.25,.5,.035,.25,'#F7F4ED');caixa(7.55,.686,.25,.09,.01,.045,metal);
 return g;
}
