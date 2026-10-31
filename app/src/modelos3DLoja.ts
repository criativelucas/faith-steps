import { texturaPapel, texturaRevestimentoPiso } from './texturasCasa.ts';
import * as THREE from 'three';
import type { Item } from './jogo';

export const LIMA = '#8AFF00', PINK = '#FE0472', NOITE = '#2A0A31', NEVOA = '#FBF3F8', ROSA = '#FFD1E6';
export const MADEIRA = '#C9A88A', MADEIRA_CLARA = '#E0CDBE', AMEIXA_SUAVE = '#6A4A6E', BRANCO = '#FFFFFF';

export const mat = (cor: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color: cor, roughness: 0.82, metalness: 0.04, ...extra });

export function caixa(g: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, cor: string | THREE.Material, sombra = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof cor === 'string' ? mat(cor) : cor);
  m.position.set(x + w / 2, y + h / 2, z + d / 2);
  m.castShadow = sombra;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

export function cil(g: THREE.Object3D, x: number, y: number, z: number, r: number, h: number, cor: string, topo?: number, seg = 22) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(topo ?? r, r, h, seg), mat(cor));
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

export function bola(g: THREE.Object3D, x: number, y: number, z: number, r: number, cor: string, achatada = 1) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 2), mat(cor, { flatShading: true }));
  m.position.set(x, y, z);
  m.scale.y = achatada;
  m.castShadow = true;
  g.add(m);
  return m;
}

export function esfera(g: THREE.Object3D, x: number, y: number, z: number, rx: number, ry: number, rz: number, cor: string) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), mat(cor));
  m.position.set(x, y, z);
  m.scale.set(rx, ry, rz);
  m.castShadow = true;
  g.add(m);
  return m;
}

const txNeon = (() => {
  if (typeof document === 'undefined') return new THREE.Texture();
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 192;
  const c = cv.getContext('2d');
  if (!c) return new THREE.Texture();
  c.fillStyle = '#000000'; c.fillRect(0, 0, 512, 192);
  c.font = '900 112px BarlowCondensed_900Black, Archivo, system-ui, sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.shadowColor = '#FFFFFF'; c.shadowBlur = 18;
  c.fillStyle = '#FFFFFF'; c.fillText('JESUS', 256, 102);
  const tx = new THREE.CanvasTexture(cv);
  tx.colorSpace = THREE.SRGBColorSpace;
  return tx;
})();

export const MONTAR_MOVEIS: Record<string, (g: THREE.Group) => void> = {
  quadro: g => { caixa(g, -0.45, -0.38, 0, 0.9, 0.76, 0.04, MADEIRA); caixa(g, -0.39, -0.32, 0.02, 0.78, 0.64, 0.03, NEVOA); caixa(g, -0.03, -0.2, 0.05, 0.06, 0.42, 0.02, PINK); caixa(g, -0.14, 0.04, 0.05, 0.28, 0.06, 0.02, PINK); },
  cruz: g => { caixa(g, -0.05, -0.5, 0, 0.1, 1.0, 0.06, MADEIRA); caixa(g, -0.28, 0.1, 0, 0.56, 0.1, 0.06, MADEIRA); },
  relogio: g => { const a = cil(g, 0, 0, 0, 0.28, 0.05, AMEIXA_SUAVE); a.rotation.x = Math.PI / 2; a.position.set(0, 0, 0.025); const b = cil(g, 0, 0, 0, 0.24, 0.02, BRANCO); b.rotation.x = Math.PI / 2; b.position.set(0, 0, 0.055); caixa(g, -0.01, 0, 0.07, 0.02, 0.17, 0.01, NOITE); caixa(g, 0, -0.01, 0.07, 0.13, 0.02, 0.01, PINK); },
  espelhoRedondo: g => { const a = cil(g, 0, 0, 0, 0.36, 0.04, '#E79BB9'); a.rotation.x = Math.PI / 2; a.position.set(0, 0, 0.02); const b = cil(g, 0, 0, 0, 0.3, 0.02, '#DDF0FF'); b.rotation.x = Math.PI / 2; b.position.set(0, 0, 0.045); },
  poster: g => { caixa(g, -0.3, -0.42, 0, 0.6, 0.84, 0.02, NOITE); const n = cil(g, 0, 0, 0, 0.08, 0.01, LIMA); n.rotation.x = Math.PI / 2; n.position.set(-0.06, -0.12, 0.03); caixa(g, 0.0, -0.12, 0.025, 0.03, 0.34, 0.01, LIMA); },
  versiculo: g => { caixa(g, -0.4, -0.45, 0, 0.8, 0.9, 0.04, MADEIRA); caixa(g, -0.34, -0.39, 0.02, 0.68, 0.78, 0.03, '#FBF8F4'); for (const [y, w] of [[0.05, 0.5], [-0.07, 0.42], [-0.19, 0.5], [-0.3, 0.26]]) caixa(g, -w / 2, y, 0.05, w, 0.025, 0.01, AMEIXA_SUAVE); caixa(g, -0.015, 0.14, 0.05, 0.03, 0.16, 0.01, PINK); caixa(g, -0.06, 0.2, 0.05, 0.12, 0.03, 0.01, PINK); },
  paisagem: g => { caixa(g, -0.55, -0.38, 0, 1.1, 0.76, 0.04, BRANCO); caixa(g, -0.49, -0.32, 0.02, 0.98, 0.64, 0.03, '#FFE3EF'); caixa(g, -0.49, -0.32, 0.04, 0.98, 0.22, 0.02, '#88B862'); const m = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.28, 3), mat('#A9CF86')); m.position.set(-0.15, -0.04, 0.05); m.scale.z = 0.05; g.add(m); const s = cil(g, 0, 0, 0, 0.07, 0.01, '#FFD27A'); s.rotation.x = Math.PI / 2; s.position.set(0.25, 0.12, 0.05); },
  luzinhas: g => { for (let i = 0; i <= 10; i++) { const x = -0.9 + i * 0.18, y = 0.15 - 0.2 * Math.sin((i / 10) * Math.PI); const l = bola(g, x, y, 0.04, 0.035, ['#FFD27A', PINK, LIMA][i % 3]); (l.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(['#FFD27A', PINK, LIMA][i % 3]); (l.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6; } },
  prateleira: g => { caixa(g, -0.45, -0.1, 0, 0.9, 0.04, 0.22, MADEIRA); for (const x of [-0.25, 0.22]) { cil(g, x, -0.06, 0.11, 0.06, 0.12, PINK); bola(g, x, 0.12, 0.11, 0.09, '#93C06C'); } },
  planta: g => { cil(g, 0, 0, 0, 0.2, 0.38, PINK, 0.24); bola(g, 0, 0.62, 0, 0.26, '#93C06C'); bola(g, 0.12, 0.85, 0.05, 0.18, '#A9CF86'); bola(g, -0.12, 0.8, -0.05, 0.17, '#88B862'); },
  vaso: g => { cil(g, 0, 0, 0, 0.13, 0.42, '#FBF8F4', 0.1); for (const [x, y, c] of [[0, 0.62, PINK], [-0.1, 0.56, ROSA], [0.1, 0.58, '#E79BB9']] as const) { cil(g, x, 0.42, 0, 0.01, y - 0.42, '#88B862'); bola(g, x, y, 0, 0.06, c); } },
  cacto: g => { cil(g, 0, 0, 0, 0.14, 0.22, MADEIRA_CLARA); cil(g, 0, 0.22, 0, 0.08, 0.45, '#88B862'); bola(g, 0, 0.67, 0, 0.08, '#88B862'); cil(g, 0.13, 0.38, 0, 0.045, 0.18, '#93C06C'); bola(g, 0, 0.75, 0, 0.03, PINK); },
  puff: g => { cil(g, 0, 0, 0, 0.3, 0.36, '#E79BB9'); cil(g, 0, 0.36, 0, 0.27, 0.03, ROSA); },
  cesto: g => { cil(g, 0, 0, 0, 0.28, 0.36, MADEIRA, 0.3); cil(g, 0, 0.36, 0, 0.22, 0.12, ROSA); },
  estantinha: g => { caixa(g, -0.3, 0, -0.15, 0.6, 0.9, 0.3, MADEIRA); for (const [y, c] of [[0.08, PINK], [0.5, '#42124C']] as const) caixa(g, -0.25, y, -0.12, 0.5, 0.3, 0.26, c); },
  luminaria: g => { cil(g, 0, 0, 0, 0.18, 0.04, NOITE); cil(g, 0, 0.04, 0, 0.02, 1.45, NOITE); const s = cil(g, 0, 1.45, 0, 0.26, 0.3, PINK, 0.16); (s.material as THREE.MeshStandardMaterial).emissive = new THREE.Color('#5A0024'); },
  teclado: g => { for (const x of [-0.4, 0.36]) caixa(g, x, 0, -0.1, 0.04, 0.72, 0.2, NOITE); caixa(g, -0.5, 0.72, -0.18, 1.0, 0.08, 0.34, NOITE); caixa(g, -0.46, 0.8, 0.0, 0.92, 0.01, 0.14, BRANCO); },
  tapete: g => { caixa(g, -0.95, 0, -0.75, 1.9, 0.012, 1.5, '#E79BB9', false); caixa(g, -0.75, 0.002, -0.55, 1.5, 0.012, 1.1, ROSA, false); },
  tapeteRedondo: g => { cil(g, 0, 0, 0, 0.9, 0.012, '#C9B6D9').castShadow = false; cil(g, 0, 0.002, 0, 0.6, 0.012, NEVOA).castShadow = false; },
  tapeteListrado: g => { caixa(g, -0.8, 0, -0.6, 1.6, 0.012, 1.2, NEVOA, false); for (let i = 0; i < 4; i++) caixa(g, -0.8, 0.002, -0.5 + i * 0.3, 1.6, 0.012, 0.14, i % 2 ? '#C7F28A' : '#F2B8CF', false); },
  girassol: g => {
    cil(g, 0, 0, 0, 0.15, 0.34, '#C98B4A', 0.19);
    cil(g, 0, 0.34, 0, 0.02, 0.48, '#6FA84A');
    for (const s of [-1, 1]) { const f = bola(g, s * 0.09, 0.54 + s * 0.04, 0.02, 0.07, '#88B862', 0.4); f.rotation.z = s * 0.4; }
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      const pt = bola(g, Math.cos(a) * 0.11, 0.84 + Math.sin(a) * 0.11, 0.03, 0.048, '#F5B700', 0.7);
      pt.scale.z = 0.35;
    }
    const centroF = bola(g, 0, 0.84, 0.045, 0.07, '#5A3420');
    centroF.scale.z = 0.45;
  },
  bau: g => {
    caixa(g, -0.34, 0, -0.2, 0.68, 0.32, 0.4, '#A97850');
    const tampa = cil(g, 0, 0.32, 0, 0.2, 0.68, MADEIRA, 0.2, 16);
    tampa.rotation.z = Math.PI / 2;
    tampa.position.set(0, 0.32, 0);
    tampa.scale.set(0.6, 1, 1);
    for (const x of [-0.24, 0.2]) caixa(g, x, 0, -0.21, 0.05, 0.43, 0.42, '#6B4E36');
    caixa(g, -0.04, 0.24, 0.19, 0.08, 0.12, 0.03, '#E8B83A');
  },
  cadeiraBalanco: g => {
    for (const x of [-0.24, 0.2]) {
      caixa(g, x, 0.02, -0.34, 0.04, 0.04, 0.68, '#8A5A3C').rotation.x = 0.04;
      for (const z of [-0.2, 0.18]) caixa(g, x, 0.04, z, 0.04, 0.32, 0.04, MADEIRA);
      caixa(g, x, 0.52, -0.22, 0.05, 0.04, 0.44, MADEIRA);
      caixa(g, x, 0.36, 0.16, 0.04, 0.16, 0.04, MADEIRA);
    }
    caixa(g, -0.24, 0.35, -0.22, 0.48, 0.05, 0.44, MADEIRA);
    caixa(g, -0.2, 0.4, -0.18, 0.4, 0.05, 0.36, ROSA);
    caixa(g, -0.24, 0.4, -0.24, 0.48, 0.48, 0.04, MADEIRA);
  },
  arvoreNatal: g => {
    cil(g, 0, 0, 0, 0.16, 0.24, '#8A5A3C', 0.19);
    cil(g, 0, 0.24, 0, 0.06, 0.2, '#6B4E36');
    for (const [y, r, h, c] of [[0.36, 0.44, 0.55, '#4E8C45'], [0.68, 0.35, 0.5, '#5FA354'], [0.98, 0.25, 0.44, '#73B865']] as const) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 14), mat(c));
      cone.position.set(0, y + h / 2, 0);
      cone.castShadow = true;
      g.add(cone);
    }
    const est = bola(g, 0, 1.48, 0, 0.075, '#F5B700');
    (est.material as THREE.MeshStandardMaterial).emissive = new THREE.Color('#7A5600');
    for (let k = 0; k < 9; k++) {
      const a = k * 1.9, y = 0.5 + k * 0.095, r = 0.36 - k * 0.025;
      const corB = [PINK, '#F5B700', '#E63B2E'][k % 3];
      const enfeite = bola(g, Math.cos(a) * r, y, Math.sin(a) * r, 0.038, corB);
      (enfeite.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(corB);
      (enfeite.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.35;
    }
  },
  neon: g => {
    caixa(g, -0.58, -0.24, 0, 1.16, 0.48, 0.03, NOITE);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.06, 0.4), new THREE.MeshStandardMaterial({
      color: BRANCO, emissive: new THREE.Color(PINK), emissiveMap: txNeon, emissiveIntensity: 1.4, roughness: 0.35,
    }));
    m.position.set(0, 0, 0.034);
    g.add(m);
  },
  pomba: g => {
    caixa(g, -0.44, -0.38, 0, 0.88, 0.76, 0.04, BRANCO);
    caixa(g, -0.38, -0.32, 0.02, 0.76, 0.64, 0.025, '#CFEAFF');
    const corpo = bola(g, -0.02, -0.04, 0.055, 0.13, BRANCO, 0.75); corpo.scale.z = 0.25;
    const cab = bola(g, 0.11, 0.04, 0.058, 0.065, BRANCO); cab.scale.z = 0.3;
    const asa1 = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.28, 4), mat('#F7FAFF'));
    asa1.position.set(-0.08, 0.11, 0.06); asa1.rotation.z = 0.45; asa1.scale.z = 0.15; g.add(asa1);
    caixa(g, 0.15, -0.02, 0.06, 0.14, 0.02, 0.01, '#6FA84A').rotation.z = -0.35;
  },
  tv: g => {
    caixa(g, -0.68, -0.4, 0, 1.36, 0.8, 0.05, '#1E1624');
    const telaTv = caixa(g, -0.63, -0.35, 0.035, 1.26, 0.7, 0.02, '#62B2EC');
    (telaTv.material as THREE.MeshStandardMaterial).emissive = new THREE.Color('#193A58');
    caixa(g, -0.63, -0.35, 0.056, 1.26, 0.22, 0.008, '#7EC26B');
    const solTv = cil(g, 0, 0, 0, 0.08, 0.008, '#FFE27A');
    solTv.rotation.x = Math.PI / 2; solTv.position.set(0.36, 0.16, 0.06);
  },
  calendario: g => {
    caixa(g, -0.32, -0.38, 0, 0.64, 0.76, 0.025, BRANCO);
    caixa(g, -0.32, 0.2, 0.01, 0.64, 0.18, 0.02, PINK);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      caixa(g, -0.26 + c * 0.14, -0.3 + r * 0.15, 0.025, 0.09, 0.09, 0.01, r === 1 && c === 2 ? LIMA : '#EADFD3');
    }
  },
  tapeteFelpudo: g => {
    for (const [dx, dz, r] of [[0, 0, 0.78], [-0.42, 0.06, 0.52], [0.42, -0.06, 0.52], [0.06, 0.38, 0.5], [-0.08, -0.38, 0.5]]) {
      cil(g, dx, 0, dz, r, 0.022, '#FAF4EE').castShadow = false;
    }
    cil(g, 0, 0.004, 0, 0.5, 0.022, ROSA).castShadow = false;
  },
  tapeteColorido: g => {
    caixa(g, -0.9, 0, -0.68, 1.8, 0.012, 1.36, NEVOA, false);
    caixa(g, -0.8, 0.002, -0.58, 0.75, 0.012, 0.53, '#F2B8CF', false);
    caixa(g, 0.05, 0.002, -0.58, 0.75, 0.012, 0.53, '#FFD27A', false);
    caixa(g, -0.8, 0.002, 0.05, 0.75, 0.012, 0.53, '#9ED8F0', false);
    caixa(g, 0.05, 0.002, 0.05, 0.75, 0.012, 0.53, '#C7F28A', false);
  },
  quadroJosue: g => {
    caixa(g, -0.45, -0.38, 0, 0.9, 0.76, 0.04, '#8A5A3C');
    caixa(g, -0.39, -0.32, 0.02, 0.78, 0.64, 0.03, '#FAF6F0');
    caixa(g, -0.02, -0.18, 0.05, 0.04, 0.34, 0.015, '#D4AF37');
    caixa(g, -0.12, 0.02, 0.05, 0.24, 0.04, 0.015, '#D4AF37');
  },
  mapaPaulo: g => {
    caixa(g, -0.52, -0.38, 0, 1.04, 0.76, 0.04, '#6B4226');
    caixa(g, -0.46, -0.32, 0.02, 0.92, 0.64, 0.03, '#A7D8F0');
    caixa(g, -0.4, -0.05, 0.045, 0.35, 0.22, 0.015, '#E8D4B4');
    caixa(g, 0.05, -0.22, 0.045, 0.32, 0.28, 0.015, '#E8D4B4');
  },
  painelBotanico: g => {
    caixa(g, -0.48, -0.36, 0, 0.96, 0.72, 0.04, MADEIRA);
    for (const dx of [-0.22, 0, 0.22]) {
      bola(g, dx, -0.05, 0.06, 0.14, '#6FA84A', 0.8);
      bola(g, dx + 0.04, -0.18, 0.06, 0.1, '#88B862', 0.9);
    }
  },
  quadroSalmo23: g => {
    caixa(g, -0.5, -0.38, 0, 1.0, 0.76, 0.04, '#C89B72');
    caixa(g, -0.44, -0.32, 0.02, 0.88, 0.64, 0.03, '#E0F2FE');
    caixa(g, -0.44, -0.32, 0.04, 0.88, 0.24, 0.015, '#88B862');
    caixa(g, -0.08, -0.32, 0.05, 0.16, 0.24, 0.015, '#4BA7CC');
  },
  poltronaCostela: g => {
    for (const [dx, dz] of [[-0.24, -0.22], [0.24, -0.22], [-0.24, 0.22], [0.24, 0.22]]) cil(g, dx, 0, dz, 0.025, 0.24, '#6B4226');
    caixa(g, -0.32, 0.22, -0.28, 0.64, 0.06, 0.56, '#8A5A3C');
    caixa(g, -0.28, 0.28, -0.24, 0.56, 0.12, 0.48, '#F5EFE6');
    caixa(g, -0.3, 0.36, -0.28, 0.6, 0.44, 0.1, '#8A5A3C');
    caixa(g, -0.26, 0.38, -0.2, 0.52, 0.38, 0.08, '#F5EFE6');
  },
  lustreNordico: g => {
    cil(g, 0, 0, 0, 0.18, 0.04, '#8A5A3C');
    cil(g, 0, 0.04, 0, 0.025, 1.38, '#C89B72');
    const cup = cil(g, 0, 1.4, 0, 0.28, 0.26, '#FAF6F0', 0.18);
    (cup.material as THREE.MeshStandardMaterial).emissive = new THREE.Color('#FFE09E');
    (cup.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.55;
  },
  estanteArvore: g => {
    caixa(g, -0.24, 0, -0.14, 0.48, 0.05, 0.28, '#8A5A3C');
    caixa(g, -0.05, 0.05, -0.12, 0.1, 1.15, 0.24, '#8A5A3C');
    for (const [y, dx, corL] of [[0.28, -0.22, PINK], [0.55, 0.04, '#4BA7CC'], [0.82, -0.22, LIMA], [1.05, 0.02, '#F5B700']] as const) {
      caixa(g, dx, y, -0.11, 0.22, 0.04, 0.22, '#A97850');
      caixa(g, dx + 0.04, y + 0.04, -0.08, 0.12, 0.16, 0.16, corL);
    }
  },
  tapeteNordico: g => {
    caixa(g, -0.92, 0, -0.7, 1.84, 0.012, 1.4, '#FAF6F0', false);
    caixa(g, -0.82, 0.002, -0.6, 1.64, 0.012, 1.2, '#EAE0D5', false);
    const los = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.34, 4), mat('#8A5A3C'));
    los.rotation.x = -Math.PI / 2;
    los.position.set(0, 0.016, 0);
    g.add(los);
  },
  plantasVivas: g => {
    for (const [dx, dz, h, corV, corF] of [[-0.18, 0.04, 0.32, '#C86D51', '#5CA84D'], [0.16, -0.05, 0.24, '#FAF6F0', '#7FB65A'], [0, 0.14, 0.18, '#D4AF37', '#88B862']] as const) {
      cil(g, dx, 0, dz, 0.11, h, corV, 0.14);
      bola(g, dx, h + 0.16, dz, 0.16, corF);
    }
  },
  poteGratidao: g => {
    cil(g, 0, 0, 0, 0.22, 0.42, '#C89B72', 0.26);
    const pote = cil(g, 0, 0.42, 0, 0.12, 0.24, '#DDF0FF');
    (pote.material as THREE.MeshStandardMaterial).transparent = true;
    (pote.material as THREE.MeshStandardMaterial).opacity = 0.72;
    cil(g, 0, 0.66, 0, 0.1, 0.04, '#8A5A3C');
    for (const [dx, dy, c] of [[-0.04, 0.48, PINK], [0.04, 0.52, '#FFD27A'], [0, 0.56, LIMA]] as const) {
      bola(g, dx, dy, 0, 0.04, c);
    }
  },
};

export const MONTAR_EXTRAS: Record<string, (g: THREE.Group) => void> = {
  cachorro: g => {
    const [c1, c2, c3] = ['#C98B4A', '#F3E3CC', '#6B4226'];
    esfera(g, 0, 0.26, 0, 0.15, 0.14, 0.24, c1);
    esfera(g, 0, 0.44, 0.22, 0.13, 0.12, 0.12, c1);
    esfera(g, 0, 0.41, 0.32, 0.07, 0.06, 0.08, c2);
    esfera(g, 0, 0.44, 0.38, 0.026, 0.022, 0.022, NOITE);
    for (const s of [1, -1]) {
      esfera(g, s * 0.05, 0.48, 0.3, 0.02, 0.022, 0.014, NOITE);
      esfera(g, s * 0.12, 0.41, 0.18, 0.038, 0.09, 0.05, c3).rotation.z = s * 0.35;
      cil(g, s * 0.08, 0, 0.12, 0.036, 0.22, c1);
      cil(g, s * 0.08, 0, -0.12, 0.036, 0.22, c1);
      esfera(g, s * 0.08, 0.015, 0.13, 0.045, 0.025, 0.05, c2);
      esfera(g, s * 0.08, 0.015, -0.11, 0.045, 0.025, 0.05, c2);
    }
    const col = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.02, 8, 20), mat(PINK));
    col.position.set(0, 0.36, 0.16); col.rotation.x = Math.PI / 2 - 0.4; g.add(col);
    const rabo = cil(g, 0, 0.28, -0.22, 0.022, 0.14, c1); rabo.rotation.x = -0.7;
  },
  gato: g => {
    const [c1, c2] = ['#E49B3E', '#FDF8F2'];
    esfera(g, 0, 0.22, 0, 0.13, 0.12, 0.22, c1);
    esfera(g, 0, 0.38, 0.19, 0.11, 0.1, 0.11, c1);
    esfera(g, 0, 0.35, 0.28, 0.06, 0.05, 0.06, c2);
    esfera(g, 0, 0.37, 0.33, 0.018, 0.015, 0.015, '#E88B9E');
    for (const s of [1, -1]) {
      esfera(g, s * 0.045, 0.41, 0.27, 0.018, 0.02, 0.012, '#38B54A');
      const orelha = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 4), mat(c1));
      orelha.position.set(s * 0.07, 0.48, 0.18); orelha.rotation.z = -s * 0.25; g.add(orelha);
      cil(g, s * 0.07, 0, 0.1, 0.028, 0.19, c1);
      cil(g, s * 0.07, 0, -0.1, 0.028, 0.19, c1);
      esfera(g, s * 0.07, 0.012, 0.11, 0.038, 0.02, 0.04, c2);
      esfera(g, s * 0.07, 0.012, -0.09, 0.038, 0.02, 0.04, c2);
    }
    const rabo = cil(g, 0, 0.24, -0.2, 0.018, 0.22, c1); rabo.rotation.x = -0.9;
  },
  versiculoDia: g => {
    caixa(g, -0.38, 0.04, -0.28, 0.76, 0.08, 0.56, '#6B4226');
    caixa(g, -0.36, 0.08, -0.26, 0.72, 0.07, 0.52, '#D4AF37');
    caixa(g, -0.34, 0.12, -0.24, 0.33, 0.08, 0.48, '#FAF6F0').rotation.y = 0.05;
    caixa(g, 0.01, 0.12, -0.24, 0.33, 0.08, 0.48, '#FAF6F0').rotation.y = -0.05;
    const fita = caixa(g, -0.02, 0.2, -0.28, 0.04, 0.01, 0.58, PINK);
    fita.rotation.x = 0.08;
    const cruz = caixa(g, -0.025, 0.22, 0.05, 0.05, 0.01, 0.14, '#D4AF37');
    caixa(g, -0.07, 0.22, 0.08, 0.14, 0.01, 0.04, '#D4AF37');
    (cruz.material as THREE.MeshStandardMaterial).emissive = new THREE.Color('#D4AF37');
    (cruz.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5;
  },
  piscina: g => {
    caixa(g, -0.7, 0, -0.55, 1.4, 0.08, 1.1, MADEIRA, false);
    caixa(g, -0.55, 0.02, -0.4, 1.1, 0.05, 0.8, '#FAF7F2', false);
    const agua = caixa(g, -0.5, 0.04, -0.35, 1.0, 0.035, 0.7, '#28C5E6', false);
    (agua.material as THREE.MeshStandardMaterial).roughness = 0.15;
    (agua.material as THREE.MeshStandardMaterial).metalness = 0.1;
    for (const [x, y, z] of [[-0.42, 0.07, 0.2], [-0.34, 0.07, 0.2]]) {
      cil(g, x, y, z, 0.014, 0.22, '#E0E5EC');
    }
    const boia = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.045, 12, 28), mat(PINK));
    boia.position.set(0.18, 0.11, -0.05); boia.rotation.x = Math.PI / 2; g.add(boia);
    const pesc = cil(g, 0.27, 0.13, -0.05, 0.02, 0.12, PINK); pesc.rotation.z = -0.4;
    bola(g, 0.33, 0.24, -0.05, 0.035, PINK);
    const bico = cil(g, 0.36, 0.24, -0.05, 0.012, 0.03, '#FFD54F'); bico.rotation.z = Math.PI / 2;
  },
  jardim: g => {
    caixa(g, -0.7, 0, -0.55, 1.4, 0.06, 1.1, '#6FA84A', false);
    caixa(g, -0.58, 0.06, -0.42, 0.44, 0.12, 0.84, '#8A5A3C');
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
      bola(g, -0.48 + c * 0.18, 0.22, -0.3 + r * 0.28, 0.08, ['#E63B2E', '#F5B700', PINK][(r + c) % 3]);
    }
    cil(g, 0.25, 0.06, 0, 0.32, 0.14, '#CFC4B4');
    const fAgua = cil(g, 0.25, 0.16, 0, 0.24, 0.04, '#4CA9CC');
    (fAgua.material as THREE.MeshStandardMaterial).roughness = 0.2;
    cil(g, 0.25, 0.18, 0, 0.08, 0.22, '#B4A694');
    bola(g, 0.25, 0.44, 0, 0.07, '#DDF2FA');
  },
  garagem: g => {
    caixa(g, -0.7, 0, -0.55, 1.4, 0.05, 1.1, '#B0B4BC', false);
    caixa(g, -0.6, 0.05, -0.48, 0.45, 0.52, 0.96, '#8A5A3C');
    caixa(g, -0.62, 0.57, -0.5, 0.49, 0.05, 1.0, MADEIRA);
    for (const [x, z] of [[-0.45, -0.2], [-0.45, 0.2]]) {
      cil(g, x, 0.62, z, 0.03, 0.12, '#6B4226');
    }
    const quadroBici = new THREE.Group(); quadroBici.position.set(0.18, 0.12, 0); g.add(quadroBici);
    cil(quadroBici, -0.16, 0.08, 0, 0.14, 0.02, NOITE).rotation.x = Math.PI / 2;
    cil(quadroBici, 0.16, 0.08, 0, 0.14, 0.02, NOITE).rotation.x = Math.PI / 2;
    caixa(quadroBici, -0.14, 0.1, -0.015, 0.28, 0.03, 0.03, '#1E88E5');
    caixa(quadroBici, -0.06, 0.1, -0.015, 0.18, 0.14, 0.03, '#1E88E5').rotation.z = 0.55;
    cil(quadroBici, -0.02, 0.25, 0, 0.05, 0.02, '#333333');
    caixa(quadroBici, 0.14, 0.22, -0.07, 0.03, 0.03, 0.14, '#CCCCCC');
  },
  varanda: g => {
    caixa(g, -0.7, 0, -0.55, 1.4, 0.06, 1.1, '#C89B72', false);
    caixa(g, -0.7, 0.06, 0.48, 1.4, 0.38, 0.06, '#FAF6F0');
    caixa(g, -0.7, 0.06, -0.55, 0.06, 0.38, 1.03, '#FAF6F0');
    caixa(g, 0.12, 0.06, -0.22, 0.46, 0.48, 0.46, MADEIRA);
    caixa(g, 0.08, 0.54, -0.26, 0.54, 0.04, 0.54, MADEIRA_CLARA);
    cil(g, 0.28, 0.58, -0.08, 0.035, 0.06, '#FAF6F0');
    caixa(g, -0.48, 0.06, -0.32, 0.38, 0.55, 0.38, '#262626');
    cil(g, -0.48, 0.61, -0.32, 0.18, 0.18, '#262626', 0.12);
  },
  academia: g => {
    caixa(g, -0.7, 0, -0.55, 1.4, 0.05, 1.1, '#3A3E48', false);
    const esteira = new THREE.Group(); esteira.position.set(-0.25, 0.05, 0); g.add(esteira);
    caixa(esteira, -0.24, 0, -0.4, 0.48, 0.09, 0.8, '#1E222A');
    caixa(esteira, -0.2, 0.09, -0.36, 0.4, 0.015, 0.72, '#484E5A');
    caixa(esteira, -0.22, 0.09, -0.38, 0.04, 0.56, 0.04, '#C8CDD6');
    caixa(esteira, 0.18, 0.09, -0.38, 0.04, 0.56, 0.04, '#C8CDD6');
    caixa(esteira, -0.22, 0.62, -0.4, 0.44, 0.14, 0.06, '#1E222A');
    const bicoAc = caixa(g, 0.28, 0.05, -0.1, 0.32, 0.04, 0.52, '#2C3038');
    cil(bicoAc, 0.12, 0.04, 0.1, 0.08, 0.24, '#E53935');
  },
  estudio: g => {
    caixa(g, -0.7, 0, -0.55, 1.4, 0.06, 1.1, '#8A5A3C', false);
    caixa(g, -0.7, 0.06, -0.55, 1.4, 0.8, 0.05, '#2A2E38');
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
      caixa(g, -0.55 + c * 0.42, 0.22 + r * 0.34, -0.5, 0.34, 0.26, 0.04, (r + c) % 2 ? '#4BA7CC' : '#E8B83A');
    }
    caixa(g, -0.52, 0.06, -0.1, 0.04, 0.48, 0.2, NOITE);
    caixa(g, 0.22, 0.06, -0.1, 0.04, 0.48, 0.2, NOITE);
    caixa(g, -0.58, 0.54, -0.16, 0.88, 0.07, 0.32, '#1E1E1E');
    caixa(g, -0.54, 0.61, -0.04, 0.8, 0.015, 0.16, BRANCO);
    cil(g, 0.44, 0.06, 0.15, 0.1, 0.03, NOITE);
    cil(g, 0.44, 0.09, 0.15, 0.015, 0.72, '#CCCCCC');
    bola(g, 0.44, 0.83, 0.15, 0.04, '#888888');
  },
  jejum: g => {
    caixa(g, -0.4, 0, -0.3, 0.8, 0.42, 0.6, '#B09B88');
    caixa(g, -0.44, 0.42, -0.34, 0.88, 0.06, 0.68, '#C4B2A0');
    cil(g, -0.18, 0.48, -0.08, 0.035, 0.16, '#F8F4EC');
    const chama = bola(g, -0.18, 0.67, -0.08, 0.025, '#FFB300');
    (chama.material as THREE.MeshStandardMaterial).emissive = new THREE.Color('#FF8F00');
    (chama.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.0;
    bola(g, 0.08, 0.54, -0.04, 0.07, '#C88B4A', 0.65);
    cil(g, 0.22, 0.48, 0.08, 0.06, 0.18, '#C96D48', 0.08);
  },
  evangelismo: g => {
    caixa(g, -0.35, 0, -0.3, 0.7, 0.25, 0.6, '#6B4226');
    cil(g, -0.02, 0.25, 0.02, 0.14, 0.04, '#D4AF37');
    cil(g, -0.02, 0.29, 0.02, 0.02, 0.22, '#D4AF37');
    const globo = bola(g, -0.02, 0.58, 0.02, 0.16, '#1E88E5');
    (globo.material as THREE.MeshStandardMaterial).roughness = 0.4;
    bola(g, 0.02, 0.62, 0.14, 0.05, '#4CAF50');
    caixa(g, 0.15, 0.25, -0.12, 0.26, 0.06, 0.2, '#FAF6F0').rotation.y = 0.3;
  },
};

export function montarRevestimento3D(g: THREE.Group, id: string, tipo: 'papel' | 'piso', corTema='#FE0472') {
  const L = 1.1, H = 0.95, E = 0.06;
  const corPiso = tipo === 'piso' ? corDoRevestimento(id) : '#E6DACB';
  const corParede = tipo === 'papel' ? corDoRevestimento(id) : '#F6EFE6';

  let acabamento:THREE.MeshStandardMaterial|undefined;
  if(typeof document!=='undefined'){
    const {tx,roughness}=tipo==='papel'?texturaPapel(id,corTema):texturaRevestimentoPiso(id,corTema);
    acabamento=new THREE.MeshStandardMaterial({map:tx,roughness});
    acabamento.userData.texturaLoja=true;
  }
  // Base do chão isométrica
  caixa(g, -L / 2, 0, -L / 2, L, E, L, tipo==='piso'?(acabamento??corPiso):corPiso, false);
  // Parede de trás (fundo)
  caixa(g, -L / 2, E, -L / 2, L, H, E, tipo==='papel'?(acabamento??corParede):corParede, false);
  // Parede lateral esquerda
  caixa(g, -L / 2, E, -L / 2 + E, E, H, L - E, tipo==='papel'?(acabamento??corParede):corParede, false);
  // Rodapé decorativo
  caixa(g, -L / 2 + E, E, -L / 2 + E, L - E, 0.08, 0.02, BRANCO, false);
  caixa(g, -L / 2 + E, E, -L / 2 + E + 0.02, 0.02, 0.08, L - E - 0.02, BRANCO, false);
}

function corDoRevestimento(id: string): string {
  const CORES: Record<string, string> = {
    papelCreme: '#F6EFE6', papelListras: '#F2D7E6', papelPoa: '#FDF1E2', papelSalvia: '#D5E3D0',
    papelAzulejo: '#F0F5FA', papelTijolo: '#C86D51', papelFloral: '#FDF2E9', papelCeu: '#2A3655',
    papelBoiserie: '#EFEAE2', papelMadeira: '#C89B72',
    pisoClareira: '#E2CCB2', pisoPorcelanato: '#F5EFE6', pisoTerracota: '#C86B4A', pisoCimento: '#C4C6CA',
    pisoNogueira: '#7F5539', pisoXadrez: '#2C2E35', pisoCarpete: '#EED9C4', pisoEspinha: '#C09368',
    pisoHidraulico: '#4285F4', pisoMarmore: '#F8F9FA',
  };
  return CORES[id] ?? '#E8E0D5';
}

export function montarItemLoja3D(g: THREE.Group, item: Item, corTema='#FE0472') {
  if (item.tipo === 'movel' && MONTAR_MOVEIS[item.id]) {
    MONTAR_MOVEIS[item.id](g);
    return;
  }
  if ((item.tipo === 'comodo' || item.tipo === 'funcao' || item.tipo === 'atividade') && MONTAR_EXTRAS[item.id]) {
    MONTAR_EXTRAS[item.id](g);
    return;
  }
  if (item.tipo === 'papel' || item.tipo === 'piso') {
    montarRevestimento3D(g, item.id, item.tipo,corTema);
    return;
  }
}

export function enquadrarItemLoja3D(item: Item): { alvoY: number; meiaAltura: number; giro: number; elev: number } {
  if (item.tipo === 'fantasia') return { alvoY: 0.85, meiaAltura: 0.94, giro: 0.46, elev: 0.08 };
  if (item.peca === 'topo') {
    if (item.id === 'vestido' || item.id === 'vestidoLongo') return { alvoY: 0.62, meiaAltura: 0.58, giro: 0.38, elev: 0.08 };
    return { alvoY: 1.0, meiaAltura: 0.42, giro: 0.38, elev: 0.08 };
  }
  if (item.peca === 'baixo') return { alvoY: 0.43, meiaAltura: 0.43, giro: 0.42, elev: 0.1 };
  if (item.peca === 'calcado') return { alvoY: 0.12, meiaAltura: 0.2, giro: 0.64, elev: 0.2 };

  if (item.tipo === 'movel') {
    if (item.vaga === 'parede') return { alvoY: 0.02, meiaAltura: 0.65, giro: 0.18, elev: 0.05 };
    if (item.vaga === 'tapete') return { alvoY: 0.08, meiaAltura: 0.95, giro: 0.45, elev: 0.65 };
    if (item.id === 'luminaria' || item.id === 'lustreNordico') return { alvoY: 0.72, meiaAltura: 0.88, giro: 0.35, elev: 0.12 };
    return { alvoY: 0.42, meiaAltura: 0.58, giro: 0.45, elev: 0.2 };
  }

  if (item.tipo === 'funcao') {
    if (item.id === 'versiculoDia') return { alvoY: 0.18, meiaAltura: 0.36, giro: 0.4, elev: 0.32 };
    return { alvoY: 0.28, meiaAltura: 0.42, giro: 0.52, elev: 0.18 };
  }

  if (item.tipo === 'comodo') {
    return { alvoY: 0.25, meiaAltura: 0.68, giro: 0.55, elev: 0.36 };
  }

  if (item.tipo === 'papel' || item.tipo === 'piso') {
    return { alvoY: 0.45, meiaAltura: 0.7, giro: 0.78, elev: 0.42 };
  }

  return { alvoY: 0.32, meiaAltura: 0.52, giro: 0.45, elev: 0.25 };
}

