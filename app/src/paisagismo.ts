import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// A geometria colorida de cada objeto é reunida em uma única malha.
function construtor(nome: string) {
  const partes: THREE.BufferGeometry[]=[];
  const add=(geo:THREE.BufferGeometry,cor:string,x:number,y:number,z:number,sx=1,sy=1,sz=1,rot=0)=>{
    const g=geo.index?geo.toNonIndexed():geo;
    if(g!==geo) geo.dispose();
    g.deleteAttribute('uv');g.scale(sx,sy,sz);g.rotateY(rot);g.translate(x,y,z);
    const c=new THREE.Color(cor),cores=new Float32Array(g.getAttribute('position').count*3);
    for(let i=0;i<cores.length;i+=3){cores[i]=c.r;cores[i+1]=c.g;cores[i+2]=c.b;}
    g.setAttribute('color',new THREE.BufferAttribute(cores,3));partes.push(g);
  };
  const box=(x:number,y:number,z:number,w:number,h:number,d:number,c:string)=>add(new THREE.BoxGeometry(w,h,d),c,x,y+h/2,z);
  const fim=()=>{
    const geo=mergeGeometries(partes);partes.forEach(g=>g.dispose());
    const pos=geo.getAttribute('position');
    for(let i=0;i<pos.count;i++) if(pos.getY(i)<0) pos.setY(i,0);
    geo.computeVertexNormals();
    const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9}));
    mesh.name=nome;mesh.castShadow=mesh.receiveShadow=true;return mesh;
  };
  return {add,box,fim};
}

export function arvoreDetalhada(variante=0) {
  const b=construtor('Árvore ramificada');
  b.add(new THREE.CylinderGeometry(.075,.16,1.8,7),'#79533C',0,.9,0);
  for(let i=0;i<5;i++) {
    const a=i*Math.PI*2/5+variante*.7;
    const ramo=new THREE.CylinderGeometry(.025,.065,.95,5);
    ramo.rotateZ(-.65);ramo.rotateY(-a);
    b.add(ramo,'#8C6547',Math.cos(a)*.23,1.65,Math.sin(a)*.23);
    const raiz=new THREE.ConeGeometry(.12,.48,5);raiz.rotateZ(-1);
    b.add(raiz,'#79533C',Math.cos(a)*.13,.13,Math.sin(a)*.13,1,1,1,-a);
  }
  const cores=variante%3===2?['#4E7653','#678B58','#7FA363']:['#48784C','#61934E','#82A85C'];
  for(let i=0;i<11;i++) {
    const a=i*2.399+variante, r=i<7?.62:.34;
    b.add(new THREE.IcosahedronGeometry(1,1),cores[i%3],Math.cos(a)*r,2.03+(i%3)*.31,Math.sin(a)*r,.57,.62,.53,a);
  }
  b.add(new THREE.IcosahedronGeometry(.57,1),cores[2],.05,2.96,0,1,.86,1);
  return b.fim();
}

export function arbustoDetalhado(variante=0) {
  const b=construtor('Arbusto com folhas e flores');
  for(let i=0;i<7;i++) {
    const a=i*2.399;
    b.add(new THREE.IcosahedronGeometry(1,1),['#467B4C','#65924E','#7FA65A'][i%3],Math.cos(a)*.19,.2+(i%3)*.065,Math.sin(a)*.17,.25,.25,.23,a);
  }
  for(let i=0;i<5;i++) {
    const a=i*2.399+variante,x=Math.cos(a)*.24,z=Math.sin(a)*.22,y=.4+(i%2)*.07;
    for(let j=0;j<5;j++) {
      const p=j*Math.PI*2/5;
      b.add(new THREE.IcosahedronGeometry(.036,0),variante%2?'#F4D8AC':'#D99BB2',x+Math.cos(p)*.039,y,z+Math.sin(p)*.039,1,.55,1);
    }
    b.add(new THREE.IcosahedronGeometry(.025,0),'#F0C365',x,y+.012,z);
  }
  return b.fim();
}

export function igrejaDetalhada() {
  const b=construtor('Igreja da vizinhança');
  const parede='#EFE4CF',pedra='#C5B69C',madeira='#695348',telha='#667F7E';
  b.box(2.5,.02,2,6.5,.12,5.8,pedra);
  b.box(2.5,.14,1.8,5,3.65,3.6,parede);
  // Frontão voltado para a casa e telhado em duas águas.
  const perfil=new THREE.Shape();perfil.moveTo(-.25,0);perfil.lineTo(2.5,1.5);perfil.lineTo(5.25,0);perfil.closePath();
  b.add(new THREE.ExtrudeGeometry(perfil,{depth:4,bevelEnabled:false}),telha,0,3.79,-.2);
  for(const x of [.12,1.1,3.9,4.88]) b.box(x,.14,3.66,.18,3.55,.18,pedra);
  b.box(2.5,.14,3.64,1.4,2.1,.14,madeira);
  for(const x of [2.12,2.88]) { b.box(x,.4,3.73,.56,1.6,.035,'#8D6C4A');b.box(x,1.05,3.77,.045,.08,.03,'#D8B66A'); }
  b.box(2.5,2.23,3.7,1.65,.15,.22,pedra);
  for(let i=0;i<3;i++) b.box(2.5,.02+i*.04,4.12-i*.17,2.15,.04,.38,pedra);
  for(const x of [.65,4.35]) {
    b.box(x,1.35,3.67,.62,1.35,.1,pedra);
    b.box(x,1.44,3.74,.44,1.16,.03,'#7DA5AC');
    b.box(x,1.44,3.77,.045,1.16,.02,parede);b.box(x,1.98,3.77,.44,.05,.02,parede);
  }
  const rosa=new THREE.CylinderGeometry(.47,.47,.1,16);rosa.rotateX(Math.PI/2);
  b.add(rosa,pedra,2.5,3.12,3.72);
  const vidro=new THREE.CylinderGeometry(.37,.37,.03,16);vidro.rotateX(Math.PI/2);
  b.add(vidro,'#799DAF',2.5,3.12,3.79);
  b.box(2.5,2.75,3.82,.045,.74,.02,parede);b.box(2.5,3.1,3.82,.74,.045,.02,parede);
  // Campanário aberto: o sino fica visível entre os pilares.
  b.box(5.65,.14,2.75,1.3,4.4,1.3,parede);
  b.box(5.65,4.54,2.75,1.5,.16,1.5,pedra);
  for(const x of [5.08,6.22]) for(const z of [2.18,3.32]) b.box(x,4.7,z,.16,1.05,.16,parede);
  b.box(5.65,5.75,2.75,1.5,.15,1.5,pedra);
  b.add(new THREE.CylinderGeometry(.14,.27,.35,10),'#C69B4C',5.65,5.17,2.75);
  b.box(5.65,5.36,2.75,.05,.35,.05,madeira);
  b.add(new THREE.ConeGeometry(1.12,1.25,4),telha,5.65,6.5,2.75,1,1,1,Math.PI/4);
  b.box(5.65,7.03,2.75,.09,.7,.09,'#D8B66A');b.box(5.65,7.44,2.75,.42,.09,.09,'#D8B66A');
  return b.fim();
}

/** Uma textura e dois triângulos para toda a cidade distante. */
export function mapaVizinhanca() {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
  const ctx=canvas.getContext('2d')!;
  const px=(v:number)=> (v+90)/180*1024;
  ctx.strokeStyle='#A7B29A';ctx.fillStyle='rgba(170,185,155,.24)';ctx.lineWidth=2;
  for(let x=-86;x<86;x+=10) for(let z=-86;z<86;z+=10) {
    ctx.fillRect(px(x+1),px(z+1),px(6)-px(0),px(6)-px(0));
    ctx.strokeRect(px(x+1),px(z+1),px(6)-px(0),px(6)-px(0));
  }
  ctx.strokeStyle='#6D7C70';ctx.lineWidth=25;
  for(const v of [-74,-54,-34,-18,16,36,56,76]) {
    ctx.beginPath();ctx.moveTo(0,px(v));ctx.lineTo(1024,px(v));ctx.stroke();
  }
  for(const v of [-59,-39,-23,29,49,69]) {
    ctx.beginPath();ctx.moveTo(px(v),0);ctx.lineTo(px(v),1024);ctx.stroke();
  }
  // Transparência por distância, com uma abertura para as duas quadras reais.
  const img=ctx.getImageData(0,0,1024,1024);
  for(let y=0;y<1024;y++) for(let x=0;x<1024;x++) {
    const wx=x/1024*180-90,wz=y/1024*180-90;
    const d=Math.max(Math.abs(wx-4)/34,Math.abs(wz-4)/32);
    const alpha=Math.min(1,Math.max(0,(d-.88)/.16))*Math.max(0,1-(d-1)/1.35);
    img.data[(y*1024+x)*4+3]*=alpha*.72;
  }
  ctx.putImageData(img,0,0);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.MeshStandardMaterial({map:texture,transparent:true,depthWrite:false,roughness:1}));
  mesh.rotation.x=-Math.PI/2;mesh.position.y=.005;mesh.name='Mapa distante com desvanecimento';mesh.raycast=()=>{};
  return mesh;
}
