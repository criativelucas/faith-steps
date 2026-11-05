import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// Peças leves, compartilhadas pela vitrine e pela casa.
const madeira='#AD7952', tecido='#C58B58', metal='#35484A', creme='#F3E8D4';
function peca(g:THREE.Group, geo:THREE.BufferGeometry, cor:string, x:number,y:number,z:number) {
 const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:cor,roughness:.78}));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;
}
const box=(g:THREE.Group,x:number,y:number,z:number,w:number,h:number,d:number,c=madeira)=>peca(g,new THREE.BoxGeometry(w,h,d),c,x,y+h/2,z);
const cil=(g:THREE.Group,x:number,y:number,z:number,r:number,h:number,c=madeira)=>peca(g,new THREE.CylinderGeometry(r,r,h,12),c,x,y+h/2,z);
function pes(g:THREE.Group,w:number,d:number,h:number){for(const x of [-w/2,w/2])for(const z of [-d/2,d/2])box(g,x,0,z,.05,h,.05,metal);}
function livro(g:THREE.Group,x:number,y:number,z:number,c:string){box(g,x,y,z,.055,.19,.15,c);box(g,x+.029,y+.015,z,.005,.16,.12,creme);}
export const COLECAO_MODELOS:Record<string,(g:THREE.Group)=>void>={
 mesaCentro:g=>{pes(g,.8,.45,.35);box(g,0,.35,0,1,.06,.62);box(g,-.12,.41,0,.32,.04,.22,'#527C84');box(g,-.1,.45,0,.28,.035,.19,creme);cil(g,.27,.41,.08,.07,.1,creme);},
 sapateira:g=>{for(const x of [-.43,.43])box(g,x,0,0,.05,.72,.35);for(const y of [.04,.34,.67])box(g,0,y,0,.9,.04,.38);for(const y of [.08,.38])for(const x of [-.25,-.1,.13,.28]){box(g,x,y,0,.1,.07,.23,metal);box(g,x,y+.07,-.07,.1,.05,.09,'#A06F54');}},
 aparador:g=>{pes(g,.85,.3,.18);box(g,0,.18,0,1,.5,.42);box(g,0,.68,0,1.06,.05,.46);for(const x of [-.25,.25])for(const y of [.23,.44]){box(g,x,y,.22,.46,.18,.025,'#CEAA79');box(g,x,y+.08,.25,.12,.025,.025,metal);}},
 bancoJardim:g=>{pes(g,.85,.34,.4);for(let i=0;i<5;i++)box(g,0,.4,-.2+i*.1,1.1,.045,.075);for(const x of [-.48,.48])box(g,x,.4,-.23,.04,.48,.04,metal);for(let i=0;i<3;i++)box(g,0,.53+i*.13,-.23,1.1,.09,.035);},
 floreira:g=>{box(g,0,0,0,.8,.25,.3,'#B66D51');box(g,0,.25,0,.85,.035,.34,'#D89370');box(g,0,.28,0,.72,.01,.23,'#493A2D');for(let i=0;i<7;i++){const x=-.3+i*.1;cil(g,x,.29,0,.009,.3,'#4E804F');for(let j=0;j<3;j++)peca(g,new THREE.IcosahedronGeometry(.035,0),'#9974BE',x,.5+j*.045,0);}},
 arranhador:g=>{box(g,0,0,0,.65,.07,.55,creme);cil(g,-.15,.07,0,.07,.72,'#C8AA7D');for(let i=0;i<12;i++)cil(g,-.15,.1+i*.05,0,.075,.018,'#A88B63');box(g,-.1,.8,0,.48,.06,.44,'#779B93');box(g,.2,.07,0,.28,.22,.3,'#779B93');cil(g,.09,.65,.15,.004,.14,metal);peca(g,new THREE.IcosahedronGeometry(.045,1),tecido,.09,.62,.15);},
 camaPet:g=>{cil(g,0,0,0,.36,.08,'#749A91');const aro=peca(g,new THREE.TorusGeometry(.29,.075,6,20),'#749A91',0,.11,0);aro.rotation.x=Math.PI/2;cil(g,0,.07,0,.25,.04,creme);},
 carrinhoCha:g=>{for(const x of [-.31,.31])for(const z of [-.18,.18]){cil(g,x,.06,z,.018,.7,metal);const roda=cil(g,0,0,0,.045,.03,metal);roda.rotation.z=Math.PI/2;roda.position.set(x,.045,z);}for(const y of [.18,.63])box(g,0,y,0,.7,.04,.44);cil(g,-.12,.67,0,.09,.13,creme);const tampa=cil(g,-.12,.8,0,.1,.025,metal);tampa.name='tampa_bule';const bico=cil(g,-.24,.72,0,.025,.14,creme);bico.rotation.z=.65;const alca=peca(g,new THREE.TorusGeometry(.065,.012,6,12),creme,-.02,.75,0);alca.rotation.y=Math.PI/2;for(const x of [.12,.25])cil(g,x,.67,.05,.04,.07,creme);},
 lustreNordico:g=>{box(g,0,.43,0,.1,.18,.035,metal);box(g,0,.55,.13,.035,.035,.26,metal);cil(g,0,.15,.25,.008,.4,metal);peca(g,new THREE.CylinderGeometry(.06,.22,.14,12),metal,0,.12,.25);const lamp=peca(g,new THREE.IcosahedronGeometry(.045,1),'#FFE6AC',0,.05,.25);(lamp.material as THREE.MeshStandardMaterial).emissive.set('#FFD685');(lamp.material as THREE.MeshStandardMaterial).emissiveIntensity=.8;},
 plantasVivas:g=>{for(const [x,z,h] of [[-.18,0,.27],[.19,.04,.19]]){cil(g,x,0,z,.13,h,'#BE795D');cil(g,x,h,z,.115,.01,'#493A2D');for(let i=0;i<4;i++){const ang=i*Math.PI/2;cil(g,x,h,z,.009,.2+i*.04,'#477D51');const folha=new THREE.Shape();folha.moveTo(0,-.13);folha.bezierCurveTo(-.17,-.04,-.18,.17,0,.2);folha.bezierCurveTo(.18,.17,.17,-.04,0,-.13);for(const lado of [-1,1])for(let j=0;j<3;j++){const furo=new THREE.Path();furo.absellipse(lado*.065,-.015+j*.05,.025,.009,0,Math.PI*2,false,.4*lado);folha.holes.push(furo);}const m=peca(g,new THREE.ShapeGeometry(folha,5),i%2?'#568D53':'#34704C',x+Math.sin(ang)*.12,h+.2+i*.04,z+Math.cos(ang)*.12);m.rotation.set(-.45,ang,0);(m.material as THREE.MeshStandardMaterial).side=THREE.DoubleSide;}}},
 poltronaCostela:g=>{pes(g,.48,.42,.28);for(let i=0;i<7;i++){const x=-.3+i*.1;box(g,x,.27,0,.065,.055,.58);const r=box(g,x,.3,-.22,.065,.5,.045);r.rotation.x=-.18;}peca(g,new RoundedBoxGeometry(.55,.12,.46,2,.035),tecido,0,.39,.02);const enc=peca(g,new RoundedBoxGeometry(.55,.32,.11,2,.03),tecido,0,.61,-.17);enc.rotation.x=-.18;},
 estanteArvore:g=>{box(g,0,0,0,.65,.06,.38);box(g,0,.06,0,.07,1.18,.25);for(let i=0;i<4;i++){const lado=i%2?1:-1;const ramo=new THREE.Group();ramo.position.set(lado*.13,.22+i*.24,0);ramo.rotation.z=-lado*.55;g.add(ramo);box(ramo,0,0,0,.37,.035,.25);for(let j=0;j<3;j++)livro(ramo,-.12+j*.08,.035,0,['#547F88','#A86465','#D9B668'][j]);}},
 poteGratidao:g=>{const vidro=cil(g,0,0,0,.19,.4,'#CEE5DF');(vidro.material as THREE.MeshStandardMaterial).transparent=true;(vidro.material as THREE.MeshStandardMaterial).opacity=.3;cil(g,0,.4,0,.2,.035,madeira);for(let i=0;i<6;i++){const papel=box(g,Math.sin(i*2)*.09,.05+i*.045,Math.cos(i*2)*.07,.12,.025,.06,creme);papel.rotation.y=i;}for(let i=0;i<8;i++){const luz=peca(g,new THREE.IcosahedronGeometry(.014,0),'#FFE4A3',Math.cos(i)*.17,.06+i*.04,Math.sin(i)*.17);(luz.material as THREE.MeshStandardMaterial).emissive.set('#FFCB69');(luz.material as THREE.MeshStandardMaterial).emissiveIntensity=1;}},
};

const miniaturas=new Map<string,string>();
/** Projeta a mesma geometria da casa para as miniaturas SVG do editor. */
export function miniaturaColecao(id:string):string {
 const cache=miniaturas.get(id);if(cache)return cache;
 const grupo=new THREE.Group();COLECAO_MODELOS[id]?.(grupo);grupo.updateMatrixWorld(true);
 const faces:{p:number[][];z:number;cor:string;op:number}[]=[];
 grupo.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const geo=o.geometry, a=geo.getAttribute('position'),idx=geo.index,mt=o.material as THREE.MeshStandardMaterial;
 for(let i=0;i<(idx?.count??a.count);i+=3){const pontos=[];let profundidade=0;for(let k=0;k<3;k++){const v=new THREE.Vector3().fromBufferAttribute(a,idx?idx.getX(i+k):i+k).applyMatrix4(o.matrixWorld);pontos.push([(v.x-v.z)*.866,-v.y+(v.x+v.z)*.35]);profundidade+=v.x+v.z+v.y*.5;}faces.push({p:pontos,z:profundidade,cor:'#'+mt.color.getHexString(),op:mt.opacity});}
 geo.dispose();mt.dispose();});
 const pontos=faces.flatMap(f=>f.p),xs=pontos.map(p=>p[0]),ys=pontos.map(p=>p[1]);
 const minX=Math.min(...xs),minY=Math.min(...ys),w=Math.max(...xs)-minX,h=Math.max(...ys)-minY,escala=100/Math.max(w,h);
 const svg=faces.sort((a,b)=>a.z-b.z).map(f=>`<polygon points="${f.p.map(([x,y])=>`${(60+(x-minX-w/2)*escala).toFixed(2)},${(60+(y-minY-h/2)*escala).toFixed(2)}`).join(' ')}" fill="${f.cor}" fill-opacity="${f.op}" stroke="#382A24" stroke-opacity="0.12" stroke-width="0.3"/>`).join('');
 miniaturas.set(id,svg);return svg;
}
