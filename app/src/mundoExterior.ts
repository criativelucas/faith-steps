import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export const RAIO_RODA = 0.235;
// One closed silhouette for the body and inset glass on the cabin, with no intersecting planes.
export function modeloCarro(cor: string, modelo: 'sedan' | 'taxi' | 'suv' | 'esporte') {
  const grupo = new THREE.Group();
  const pintura = new THREE.MeshStandardMaterial({ color: cor, roughness: .32, metalness: .28 });
  const vidro = new THREE.MeshStandardMaterial({ color: '#294858', roughness: .18, metalness: .25 });
  const preto = new THREE.MeshStandardMaterial({ color: '#252d32', roughness: .72 });
  const metal = new THREE.MeshStandardMaterial({ color: '#bfc9cc', roughness: .32, metalness: .65 });
  const adicionar = (geo: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(geo, material); m.position.set(x,y,z); m.castShadow = true; m.receiveShadow = true; grupo.add(m); return m;
  };
  const caixa = (w: number, h: number, d: number, x: number, y: number, z: number, material = pintura, r = .025) => adicionar(new RoundedBoxGeometry(w,h,d,2,r), material,x,y,z);
  // Wheel wells are genuine cut-outs, rather than panels placed over the tires.
  const perfil = new THREE.Shape();
  perfil.moveTo(-1.25,.22); perfil.lineTo(-1.25,.51); perfil.quadraticCurveTo(-1.23,.6,-1.05,.61);
  perfil.lineTo(.75,.61); perfil.lineTo(1.18,.53); perfil.quadraticCurveTo(1.29,.5,1.29,.42); perfil.lineTo(1.29,.22);
  perfil.lineTo(1.08,.22); perfil.absarc(.79,.22,.29,0,Math.PI,false);
  perfil.lineTo(-.5,.22); perfil.absarc(-.79,.22,.29,0,Math.PI,false); perfil.lineTo(-1.25,.22);
  const geo = new THREE.ExtrudeGeometry(perfil,{ depth:1.02, bevelEnabled:true, bevelSegments:2, steps:1, bevelSize:.025, bevelThickness:.025, curveSegments:16 });
  adicionar(geo,pintura,0,0,-.51);
  caixa(1.95,.09,.84,0,.22,0,preto);
  const teto = modelo === 'suv' ? 1.06 : modelo === 'esporte' ? .87 : .98;
  const cabine = new THREE.Shape(); cabine.moveTo(-.85,.60); cabine.lineTo(-.54,teto); cabine.lineTo(.29,teto); cabine.lineTo(.67,.60); cabine.closePath();
  const cabineGeo = new THREE.ExtrudeGeometry(cabine,{ depth:.86, bevelEnabled:true, bevelSegments:2, bevelSize:.018, bevelThickness:.018, steps:1 });
  adicionar(cabineGeo,vidro,0,0,-.43);
  caixa(.85,.055,.91,-.125,teto+.025,0,pintura);
  // Pillars follow the exact windshield slope. Opaque window solid cannot clip through the roof.
  const haste = (a: THREE.Vector3, b: THREE.Vector3, raio: number, material: THREE.Material) => {
    const d=b.clone().sub(a); const m=adicionar(new THREE.CylinderGeometry(raio,raio,d.length(),8),material,...a.clone().add(b).multiplyScalar(.5).toArray() as [number,number,number]);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());
  };
  for(const z of [-.451,.451]) {
    haste(new THREE.Vector3(-.85,.6,z),new THREE.Vector3(-.54,teto,z),.026,pintura);
    haste(new THREE.Vector3(.67,.6,z),new THREE.Vector3(.29,teto,z),.026,pintura);
    caixa(.045,teto-.6,.035,-.12,(teto+.6)/2,z,pintura,.01);
    caixa(.13,.025,.025,-.25,.54,z*1.2,metal,.008);
    caixa(.13,.07,.1,.5,.66,z*1.24,pintura);
  }
  caixa(.08,.10,1.01,1.27,.29,0,preto);
  caixa(.08,.10,1.01,-1.27,.29,0,preto);
  caixa(.025,.12,.45,1.303,.43,0,preto,.008);
  const farol = new THREE.MeshStandardMaterial({color:'#fff5d3',emissive:'#ffe9ac',emissiveIntensity:.35});
  const lanterna = new THREE.MeshStandardMaterial({color:'#a72d35',emissive:'#b72624',emissiveIntensity:.3});
  for(const z of [-.37,.37]) { caixa(.035,.105,.19,1.276,.475,z,farol,.012); caixa(.035,.09,.18,-1.278,.48,z,lanterna,.012); }
  const placa = new THREE.MeshStandardMaterial({color:'#f1f0dc',roughness:.6});
  caixa(.025,.065,.25,-1.319,.31,0,placa,.005);
  if(modelo==='taxi') caixa(.32,.105,.24,-.05,teto+.1,0,farol);
  if(modelo==='suv') for(const z of [-.34,.34]) caixa(.78,.04,.035,-.16,teto+.08,z,preto,.01);
  if(modelo==='esporte') { caixa(.18,.045,.97,-1.07,.69,0,preto); for(const z of [-.34,.34]) caixa(.035,.14,.035,-1.07,.61,z,preto,.008); }
  const rodas: THREE.Group[]=[];
  for(const x of [-.79,.79]) for(const z of [-.51,.51]) {
    const roda=new THREE.Group(); roda.position.set(x,RAIO_RODA,z); grupo.add(roda);
    const pneu=new THREE.Mesh(new THREE.CylinderGeometry(RAIO_RODA,RAIO_RODA,.14,24),preto); pneu.rotation.x=Math.PI/2; pneu.castShadow=true; roda.add(pneu);
    const face=Math.sign(z)*.076;
    const aro=new THREE.Mesh(new THREE.CylinderGeometry(.151,.151,.018,24),metal); aro.rotation.x=Math.PI/2; aro.position.z=face; roda.add(aro);
    for(let i=0;i<5;i++) { const a=i*Math.PI*2/5; const raio=new THREE.Mesh(new THREE.BoxGeometry(.022,.095,.022),preto); raio.position.set(Math.sin(a)*.073,Math.cos(a)*.073,face+Math.sign(z)*.01); raio.rotation.z=-a; roda.add(raio); }
    rodas.push(roda);
  }
  return { grupo, rodas };
}

// Circular traffic: following distance is checked across the loop boundary as well.
export function avancarTrafego(carros: { pos: number; dir: number; vel: number; z: number }[], dt: number) {
  const inicio=-42, comprimento=96, distancia=4.5;
  const anteriores=carros.map(c=>c.pos);
  return carros.map((c,i)=>{
    let passo=c.vel*Math.max(0,Math.min(dt,.1));
    carros.forEach((outro,j)=>{ if(i===j || outro.dir!==c.dir || outro.z!==c.z) return;
      const frente=((anteriores[j]-anteriores[i])*c.dir+comprimento)%comprimento;
      passo=Math.min(passo,Math.max(0,frente-distancia));
    });
    return { pos:inicio+((c.pos-inicio+c.dir*passo)%comprimento+comprimento)%comprimento, passo };
  });
}
