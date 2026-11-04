import * as THREE from 'three';
import dados from './assets/kaykit.json' with { type: 'json' };
import { descartarCena } from './recursos3D.ts';

export type ModeloKaykit = keyof typeof dados;
type Colocacao = { x?: number; y?: number; z?: number; w: number; h: number; d: number; giro?: number };

/** Uma malha por peça, com a paleta original incorporada e recursos próprios. */
export function pecaKaykit(id: ModeloKaykit, p: Colocacao): THREE.Mesh {
  const dadosModelo = dados[id];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(dadosModelo.position, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(dadosModelo.normal, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(dadosModelo.color, 3));
  geo.setIndex(dadosModelo.index);
  geo.rotateY(p.giro ?? 0);
  geo.computeBoundingBox();
  const b = geo.boundingBox!, tamanho = b.getSize(new THREE.Vector3()), centro = b.getCenter(new THREE.Vector3());
  geo.translate(-centro.x, -b.min.y, -centro.z);
  geo.scale(p.w / tamanho.x, p.h / tamanho.y, p.d / tamanho.z);
  geo.computeBoundingBox(); geo.computeBoundingSphere();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .78, metalness: 0 }));
  m.name = `KayKit:${id}`;
  m.position.set(p.x ?? 0, p.y ?? 0, p.z ?? 0);
  m.castShadow = m.receiveShadow = true;
  return m;
}

export function detalharObjetoKaykit(id: string, g: THREE.Group) {
  const substituir = (modelo: ModeloKaykit, p: Colocacao) => {
    descartarCena(g); g.clear(); g.add(pecaKaykit(modelo, p));
  };
  const add = (modelo: ModeloKaykit, p: Colocacao) => g.add(pecaKaykit(modelo, p));
  // Mantém o volume, orientação e pontos de interação dos móveis originais.
  if (id === 'cama') substituir('bed_double_B', { x:2.1,z:1.245,w:1.9,h:1.15,d:2.25 });
  if (id === 'sofa') substituir('couch_pillows', { x:.675,z:6.7,w:.95,h:.93,d:2.2,giro:Math.PI/2 });
  if (id === 'poltrona') substituir('armchair_pillows', { x:8.725,z:3.4,w:.85,h:1.02,d:.9,giro:Math.PI/2 });
  if (id === 'banco') substituir('bench', { x:5.5,z:-2.89,w:1.4,h:.44,d:.46 });
  if (id === 'mesa') {
    add('book_set',{x:11.55,y:.79,z:2.48,w:.33,h:.27,d:.22,giro:Math.PI/2});
    add('pictureframe_standing_A',{x:11.78,y:.78,z:2.72,w:.12,h:.23,d:.18,giro:Math.PI/2});
  }
  if (id === 'estante') add('book_single',{x:8.65,y:2.2,z:.3,w:.28,h:.08,d:.22});
  if (id === 'guarda-roupa') add('cactus_medium_A',{x:.4,y:2.18,z:3.95,w:.32,h:.42,d:.32});
  if (id === 'pia') add('cactus_small_B',{x:11.65,y:.87,z:5.12,w:.23,h:.31,d:.23});
  if (id === 'espelho') add('cactus_small_A',{x:7.67,y:.88,z:2.29,w:.15,h:.21,d:.15});
  if (id === 'cafeteira_varanda') add('cactus_small_B',{x:11.65,y:.92,z:-1.78,w:.23,h:.3,d:.23});
}

/** Detalhes de apoio sobre o piso, em cantos e volumes já fora da circulação. */
export function detalharCenariosKaykit(casa: THREE.Group, extras: Record<string,THREE.Group>, fora: THREE.Group) {
  const add = (pai: THREE.Group, id: ModeloKaykit, p: Colocacao) => pai.add(pecaKaykit(id,p));
  add(casa,'rug_oval_A',{x:2.05,y:.012,z:2.65,w:2.5,h:.025,d:1.65});
  add(casa,'rug_rectangle_stripes_A',{x:1.95,y:.012,z:6.7,w:2.2,h:.025,d:2.8});
  // A decoração móvel é anexada ao objeto em detalharObjetoKaykit; aqui ficam só os ambientes.
  add(extras.estudio,'rug_rectangle_stripes_A',{x:15.7,y:.014,z:2.45,w:3.6,h:.025,d:2.5});
  add(extras.academia,'cactus_medium_A',{x:17.8,y:0,z:5.22,w:.4,h:.6,d:.4});
  add(extras.piscina,'cactus_medium_A',{x:-5.18,y:.06,z:6.4,w:.44,h:.66,d:.44});
  add(extras.varanda,'cactus_medium_A',{x:7.7,y:.06,z:-3.7,w:.44,h:.66,d:.44});
  add(extras.jardim,'bush',{x:1,y:0,z:-6.35,w:1.3,h:.6,d:.45});
  add(extras.jardim,'bush',{x:3,y:0,z:-6.35,w:1.3,h:.5,d:.45});
  // Mobiliário urbano fica na borda da calçada, fora da faixa dos pedestres.
  for (const x of [-9,8,23]) {
    add(fora,'bench',{x,y:.08,z:19.65,w:1.6,h:.82,d:.55,giro:Math.PI});
    add(fora,'bush',{x:x+1.25,y:.08,z:19.65,w:.7,h:.75,d:.5});
  }
  for (const x of [-7,11,24]) add(fora,'firehydrant',{x,y:.09,z:13.5,w:.28,h:.55,d:.28});
  add(fora,'dumpster',{x:-9.4,y:0,z:22,w:1.3,h:1,d:.75,giro:Math.PI});
  add(fora,'trafficlight_A',{x:5.8,y:.08,z:19.5,w:.48,h:2.5,d:.38,giro:Math.PI});
  for(const x of [-18,29]) add(fora,'streetlight',{x,y:.08,z:19.7,w:1.1,h:3.4,d:.4,giro:Math.PI});
}

export const MOVEIS_KAYKIT: Record<string,(g:THREE.Group)=>void> = {
  cacto:g=>{g.add(pecaKaykit('cactus_medium_A',{w:.4,h:.75,d:.36}));},
  luminaria:g=>{g.add(pecaKaykit('lamp_standing',{w:.48,h:1.5,d:.48}));},
  prateleira:g=>{g.add(pecaKaykit('shelf_B_small_decorated',{w:.9,h:.38,d:.24}));},
  estantinha:g=>{g.add(pecaKaykit('cabinet_medium_decorated',{w:1.1,h:.95,d:.45}));},
};
