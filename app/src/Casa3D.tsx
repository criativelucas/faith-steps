'use dom';
// Casa 3D do Faith Steps (three.js). No navegador roda direto; no celular roda dentro de uma WebView do Expo.
// A casa tem 5 cômodos numa planta só. A câmera gira em volta (presa na casa), dá zoom e foca em cada cômodo.
// O personagem é o desenho 2D de sempre, de pé na cena 3D e sempre virado para a câmera.
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { pessoaSvg, type Look, type Pose } from './personagem';
import { ATIVIDADES, type AtividadeId } from './jogo';

type Props = {
  look: Look;
  forma: number;
  humor: string;
  nome: string;
  itens: string[];
  casa: Record<string, string>;
  achados: string[];
  acao: AtividadeId | null;
  foco: string;
  onUsar: (alvo: string) => Promise<void>;
  dom?: import('expo/dom').DOMProps;
};

/* ---------- Planta da casa ---------- */

const ALTURA = 2.6, ESP = 0.14, BAIXA = 0.32;
type Comodo = { id: string; nome: string; x0: number; z0: number; x1: number; z1: number; parede: string; chao: string; piso: 'madeira' | 'azulejo' | 'carpete' };
export const COMODOS: Comodo[] = [
  { id: 'quarto', nome: 'Quarto', x0: 0, z0: 0, x1: 5, z1: 4.5, parede: '#F4E3EA', chao: '#F3E9E0', piso: 'carpete' },
  { id: 'banheiro', nome: 'Banheiro', x0: 5, z0: 0, x1: 8, z1: 4.5, parede: '#F3EEE8', chao: '#EFE3DA', piso: 'azulejo' },
  { id: 'estudo', nome: 'Sala de estudo', x0: 8, z0: 0, x1: 12, z1: 4.5, parede: '#EFE5D8', chao: '#D9C2AA', piso: 'madeira' },
  { id: 'sala', nome: 'Sala', x0: 0, z0: 4.5, x1: 7, z1: 9, parede: '#F2EAE0', chao: '#DCC6B0', piso: 'madeira' },
  { id: 'cozinha', nome: 'Cozinha', x0: 7, z0: 4.5, x1: 12, z1: 9, parede: '#EEF0E8', chao: '#F1E8DD', piso: 'azulejo' },
];
const comodoEm = (x: number, z: number) => COMODOS.find(c => x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1);
const CENTRO_CASA = new THREE.Vector3(6, 0, 4.5);

// Paredes já com os vãos das portas. y0/y1 permitem as vergas em cima das portas.
type Parede = { x0: number; z0: number; x1: number; z1: number; y0?: number; y1?: number; externa?: boolean };
const PAREDES: Parede[] = [
  { x0: 0, z0: 0, x1: 12, z1: 0, externa: true },
  { x0: 0, z0: 9, x1: 2, z1: 9, externa: true }, { x0: 3, z0: 9, x1: 12, z1: 9, externa: true },
  { x0: 2, z0: 9, x1: 3, z1: 9, y0: 2.15, externa: true },
  { x0: 0, z0: 0, x1: 0, z1: 9, externa: true },
  { x0: 12, z0: 0, x1: 12, z1: 9, externa: true },
  { x0: 0, z0: 4.5, x1: 2.6, z1: 4.5 }, { x0: 3.5, z0: 4.5, x1: 6.0, z1: 4.5 }, { x0: 6.9, z0: 4.5, x1: 9.6, z1: 4.5 }, { x0: 10.5, z0: 4.5, x1: 12, z1: 4.5 },
  { x0: 2.6, z0: 4.5, x1: 3.5, z1: 4.5, y0: 2.15 }, { x0: 6.0, z0: 4.5, x1: 6.9, z1: 4.5, y0: 2.15 }, { x0: 9.6, z0: 4.5, x1: 10.5, z1: 4.5, y0: 2.15 },
  { x0: 5, z0: 0, x1: 5, z1: 4.5 },
  { x0: 8, z0: 0, x1: 8, z1: 4.5 },
  { x0: 7, z0: 4.5, x1: 7, z1: 5.4 }, { x0: 7, z0: 8.1, x1: 7, z1: 9 },
];

const LIMA = '#8AFF00', PINK = '#FE0472', NOITE = '#2A0A31', NEVOA = '#FBF3F8', ROSA = '#FFD1E6';
const MADEIRA = '#C9A88A', MADEIRA_CLARA = '#E0CDBE', AMEIXA_SUAVE = '#6A4A6E', BRANCO = '#FFFFFF';

/* ---------- Ajudantes de geometria ---------- */

const mat = (cor: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color: cor, roughness: 0.85, metalness: 0, ...extra });

function caixa(g: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, cor: string | THREE.Material, sombra = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof cor === 'string' ? mat(cor) : cor);
  m.position.set(x + w / 2, y + h / 2, z + d / 2);
  m.castShadow = sombra;
  m.receiveShadow = true;
  g.add(m);
  return m;
}
function cil(g: THREE.Object3D, x: number, y: number, z: number, r: number, h: number, cor: string, topo?: number, seg = 20) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(topo ?? r, r, h, seg), mat(cor));
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}
function bola(g: THREE.Object3D, x: number, y: number, z: number, r: number, cor: string, achatada = 1) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat(cor, { flatShading: true }));
  m.position.set(x, y, z);
  m.scale.y = achatada;
  m.castShadow = true;
  g.add(m);
  return m;
}

// Texturas desenhadas num canvas (pisos, janelas dos prédios)
function textura(desenhar: (c: CanvasRenderingContext2D, t: number) => void, tamanho = 256, repetir = 1) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = tamanho;
  desenhar(cv.getContext('2d')!, tamanho);
  const tx = new THREE.CanvasTexture(cv);
  tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
  tx.repeat.set(repetir, repetir);
  tx.colorSpace = THREE.SRGBColorSpace;
  return tx;
}
const escurecer = (hex: string, t: number) => '#' + new THREE.Color(hex).lerp(new THREE.Color('#1A0420'), t).getHexString();
const clarear = (hex: string, t: number) => '#' + new THREE.Color(hex).lerp(new THREE.Color('#FFFFFF'), t).getHexString();

function texturaPiso(piso: Comodo['piso'], cor: string) {
  return textura((c, t) => {
    c.fillStyle = cor;
    c.fillRect(0, 0, t, t);
    c.strokeStyle = escurecer(cor, 0.1);
    c.lineWidth = 2;
    if (piso === 'madeira') {
      for (let i = 0; i <= 8; i++) { c.beginPath(); c.moveTo(0, i * 32); c.lineTo(t, i * 32); c.stroke(); }
      for (let i = 0; i < 8; i++) { const x = ((i * 97) % t); c.beginPath(); c.moveTo(x, i * 32); c.lineTo(x, i * 32 + 32); c.stroke(); }
    } else if (piso === 'azulejo') {
      for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(0, i * 64); c.lineTo(t, i * 64); c.moveTo(i * 64, 0); c.lineTo(i * 64, t); c.stroke(); }
    } else {
      c.fillStyle = escurecer(cor, 0.04);
      for (let i = 0; i < 400; i++) c.fillRect((i * 53) % t, (i * 97) % t, 2, 2);
    }
  });
}

/* ---------- Personagem como sprite ---------- */

const SVG_W = 200, SVG_H = 330, PE = 312 / 330;
function texturaSvg(svg: string, espelhar = false) {
  const vazio = document.createElement('canvas');
  vazio.width = vazio.height = 2;
  const tx = new THREE.Texture(vazio);
  tx.colorSpace = THREE.SRGBColorSpace;
  const img = new Image();
  img.onload = () => {
    const cv = document.createElement('canvas');
    cv.width = SVG_W * 2;
    cv.height = SVG_H * 2;
    const c = cv.getContext('2d')!;
    if (espelhar) { c.translate(cv.width, 0); c.scale(-1, 1); }
    c.drawImage(img, 0, 0, cv.width, cv.height);
    tx.image = cv;
    tx.needsUpdate = true;
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('<svg ', `<svg width="${SVG_W}" height="${SVG_H}" `));
  return tx;
}

/* ---------- Objetos clicáveis e ações ---------- */

type Acao = {
  rotulo: string;
  alvo?: string; // vai para o app: "atividade:devocional", "visual", "roupas", "segredo:dracma"
  pose?: Pose;
  texto?: string; // o que aparece no balão enquanto faz
  lugar?: [number, number, number]; // onde fica durante a ação (sentar, deitar, banheira)
  deitar?: [number, number]; // direção do corpo deitado (cabeça para os pés)
  fechados?: boolean;
};
type Obj = { id: string; nome: string; comodo: string; ponto: [number, number]; acoes: Acao[]; grupo: THREE.Group };

/* ---------- Componente ---------- */

export default function Casa3D(props: Props) {
  const raiz = useRef<HTMLDivElement>(null);
  const p = useRef(props);
  p.current = props;
  const api = useRef<{
    setFoco: (f: string) => void; setVisual: () => void; setDecoracao: () => void; setAcao: (a: AtividadeId | null) => void;
    girar: (d: number) => void; zoom: (d: number) => void;
  } | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; obj: Obj } | null>(null);
  const [balao, setBalao] = useState<{ x: number; y: number; texto: string } | null>(null);
  const menuRef = useRef(menu);
  menuRef.current = menu;

  useEffect(() => {
    const el = raiz.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.prepend(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.cursor = 'grab';

    const cena = new THREE.Scene();
    cena.background = new THREE.Color('#EFE7EF');
    cena.fog = new THREE.Fog('#EFE7EF', 38, 75);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);

    cena.add(new THREE.HemisphereLight('#FFF8F0', '#D9C2AA', 1.6));
    const sol = new THREE.DirectionalLight('#FFF1DE', 2.2);
    sol.position.set(-10, 18, 8);
    sol.castShadow = true;
    sol.shadow.mapSize.set(2048, 2048);
    Object.assign(sol.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 });
    sol.shadow.bias = -0.0006;
    sol.target.position.copy(CENTRO_CASA);
    cena.add(sol, sol.target);

    const casa = new THREE.Group();
    cena.add(casa);
    const objetos: Obj[] = [];
    const bloqueios: [number, number, number, number][] = [];
    const bloquear = (x0: number, z0: number, x1: number, z1: number) => bloqueios.push([x0, z0, x1, z1]);
    const interativo = (id: string, nome: string, comodo: string, ponto: [number, number], acoes: Acao[], construir: (g: THREE.Group) => void) => {
      const g = new THREE.Group();
      construir(g);
      g.userData.objeto = id;
      casa.add(g);
      objetos.push({ id, nome, comodo, ponto, acoes, grupo: g });
      return g;
    };

    /* Vizinhança: gramado, cerca, calçada, rua, árvores, prédios e igreja */
    const fora = new THREE.Group();
    cena.add(fora);
    const grama = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), mat('#D3E5BF'));
    grama.rotation.x = -Math.PI / 2;
    grama.receiveShadow = true;
    grama.userData.chao = true;
    fora.add(grama);
    caixa(fora, -40, 0, 12.2, 92, 0.06, 1.6, '#F1EAE2', false);
    caixa(fora, -40, 0, 13.8, 92, 0.03, 4.4, '#CFC3C9', false);
    for (let x = -38; x < 50; x += 2.2) caixa(fora, x, 0.035, 15.92, 1.1, 0.01, 0.16, BRANCO, false);
    caixa(fora, -40, 0, 18.2, 92, 0.06, 1.6, '#F1EAE2', false);
    for (let i = 0; i < 5; i++) { const c = cil(fora, 2.5 + (i % 2) * 0.2, 0, 9.6 + i * 0.55, 0.22, 0.04, '#F1EAE2'); c.castShadow = false; }
    // Cerca baixa em volta do terreno, com passagem na frente
    const cerca = (x0: number, z0: number, x1: number, z1: number) => {
      const len = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(len / 0.45);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        caixa(fora, x0 + (x1 - x0) * t - 0.04, 0, z0 + (z1 - z0) * t - 0.04, 0.08, 0.62, 0.08, BRANCO);
      }
      const trilho = new THREE.Mesh(new THREE.BoxGeometry(len, 0.06, 0.05), mat(BRANCO));
      trilho.position.set((x0 + x1) / 2, 0.42, (z0 + z1) / 2);
      trilho.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
      fora.add(trilho);
    };
    cerca(-2.5, -2.5, 14.5, -2.5); cerca(-2.5, -2.5, -2.5, 11.6); cerca(14.5, -2.5, 14.5, 11.6);
    cerca(-2.5, 11.6, 1.9, 11.6); cerca(3.1, 11.6, 14.5, 11.6);
    const arvore = (x: number, z: number, k = 1) => {
      cil(fora, x, 0, z, 0.16 * k, 1.5 * k, '#9C7A62');
      bola(fora, x, 1.9 * k, z, 0.95 * k, '#9BC775');
      bola(fora, x + 0.5 * k, 1.6 * k, z + 0.2 * k, 0.65 * k, '#88B862');
      bola(fora, x - 0.45 * k, 1.7 * k, z - 0.3 * k, 0.6 * k, '#A9CF86');
    };
    arvore(-1.5, -1.4, 1.2); arvore(13.6, -1.5, 1.1); arvore(-1.6, 10.6, 1); arvore(13.7, 10.4, 1.15); arvore(-7, 20.5, 1.2); arvore(20, 20.8, 1); arvore(-6, -8, 1.3);
    for (const [x, z] of [[4.5, 10.6], [6, 10.8], [8.5, 10.6], [10.5, 10.8], [12.5, 10.6], [0.6, 10.7], [-1.6, 3], [13.6, 4.5]]) {
      bola(fora, x, 0.32, z, 0.42, '#93C06C', 0.8);
      bola(fora, x + 0.15, 0.55, z, 0.07, ROSA);
    }
    const janelas = (cor: string) => textura((c, t) => {
      c.fillStyle = cor;
      c.fillRect(0, 0, t, t);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        c.fillStyle = (i * 3 + j) % 5 === 0 ? '#FFE9A8' : '#FFFFFF';
        c.globalAlpha = 0.85;
        c.fillRect(16 + i * 60, 16 + j * 60, 28, 36);
        c.globalAlpha = 1;
      }
    });
    const predio = (x: number, z: number, w: number, d: number, h: number, cor: string) => {
      const tx = janelas(cor);
      tx.repeat.set(w / 3, h / 3);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [mat(cor, { map: tx }), mat(cor, { map: tx }), mat(escurecer(cor, 0.06)), mat(cor), mat(cor, { map: tx }), mat(cor, { map: tx })]);
      m.position.set(x + w / 2, h / 2, z + d / 2);
      m.castShadow = true;
      m.receiveShadow = true;
      fora.add(m);
      caixa(fora, x - 0.1, h, z - 0.1, w + 0.2, 0.25, d + 0.2, escurecer(cor, 0.08));
    };
    predio(-14, -12, 6, 6, 11, '#DCCFD9'); predio(-6, -13, 5, 5, 7, '#EFE4D6'); predio(10, -13, 5, 5, 9, '#E9DCCB'); predio(17, -10, 5, 6, 6, '#DCCFD9');
    predio(-13, -3, 5, 6, 8, '#E6D9E3'); predio(-13, 5, 5, 6, 6, '#EFE4D6'); predio(19, -1, 5, 6, 9.5, '#D6C6CF'); predio(19, 7, 5, 5, 6.5, '#E9DCCB');
    predio(-12, 21, 6, 5, 7, '#E6D9E3'); predio(-4, 21, 5, 5, 10, '#DCCFD9'); predio(4, 21, 7, 5, 6, '#EFE4D6'); predio(13, 21, 5, 5, 8.5, '#D6C6CF');
    // Igreja ao fundo, com torre e cruz
    {
      const ig = new THREE.Group();
      ig.position.set(1.5, 0, -13);
      fora.add(ig);
      caixa(ig, 0, 0, 0, 5, 3.6, 3.4, '#FBF8F4');
      const telhado = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 5.2, 3, 1), mat('#A88AB2'));
      telhado.rotation.z = Math.PI / 2;
      telhado.position.set(2.5, 4.3, 1.7);
      telhado.scale.set(1, 1, 0.78);
      telhado.castShadow = true;
      ig.add(telhado);
      caixa(ig, 3.6, 0, 2.6, 1.5, 7, 1.5, '#FBF8F4');
      const ponta = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.2, 4), mat('#A88AB2'));
      ponta.position.set(4.35, 8.1, 3.35);
      ponta.rotation.y = Math.PI / 4;
      ig.add(ponta);
      caixa(ig, 4.27, 9.1, 3.3, 0.16, 1.2, 0.12, PINK);
      caixa(ig, 4.0, 9.7, 3.3, 0.7, 0.16, 0.12, PINK);
      caixa(ig, 1.9, 0, 3.38, 1.1, 1.9, 0.06, AMEIXA_SUAVE);
      for (const x of [0.6, 3.1]) caixa(ig, x, 1.4, 3.38, 0.6, 1.3, 0.05, '#F2B8CF');
    }
    // Carro e poste na rua
    {
      const carro = new THREE.Group();
      carro.position.set(-5, 0, 14.6);
      fora.add(carro);
      caixa(carro, 0, 0.3, 0, 2.6, 0.6, 1.3, '#F2B8CF');
      caixa(carro, 0.6, 0.9, 0.08, 1.4, 0.55, 1.14, '#F9DCE8');
      for (const [x, z] of [[0.55, 0], [2.05, 0], [0.55, 1.3], [2.05, 1.3]]) {
        const r = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.2, 16), mat(NOITE));
        r.rotation.x = Math.PI / 2;
        r.position.set(x, 0.28, z);
        carro.add(r);
      }
      cil(fora, -2.2, 0, 12.6, 0.07, 3.4, AMEIXA_SUAVE);
      bola(fora, -2.2, 3.5, 12.6, 0.22, '#FFF6C8');
    }

    /* Casa: fundação, pisos, paredes, janelas */
    caixa(casa, -0.25, -0.25, -0.25, 12.5, 0.25, 9.5, '#F6F0E9', false);
    for (const c of COMODOS) {
      const tx = texturaPiso(c.piso, c.chao);
      tx.repeat.set((c.x1 - c.x0) / 1.6, (c.z1 - c.z0) / 1.6);
      const piso = new THREE.Mesh(new THREE.PlaneGeometry(c.x1 - c.x0, c.z1 - c.z0), mat(c.chao, { map: tx }));
      piso.rotation.x = -Math.PI / 2;
      piso.position.set((c.x0 + c.x1) / 2, 0.005, (c.z0 + c.z1) / 2);
      piso.receiveShadow = true;
      piso.userData.chao = true;
      casa.add(piso);
    }
    // Cada face da parede pega a cor do cômodo daquele lado; o lado de fora é claro
    const EXTERNA = '#F7F1EA';
    type ParedeMesh = { mesh: THREE.Mesh; p: Parede; centro: THREE.Vector3; alvo: number; atual: number };
    const paredes: ParedeMesh[] = PAREDES.map(pa => {
      const aoLongoX = pa.z0 === pa.z1;
      const len = Math.max(Math.abs(pa.x1 - pa.x0), Math.abs(pa.z1 - pa.z0)) + (pa.y0 ? 0 : ESP);
      const y0 = pa.y0 ?? 0, y1 = pa.y1 ?? ALTURA, h = y1 - y0;
      const cx = (pa.x0 + pa.x1) / 2, cz = (pa.z0 + pa.z1) / 2;
      const lado = (dx: number, dz: number) => comodoEm(cx + dx * 0.3, cz + dz * 0.3)?.parede ?? EXTERNA;
      const topo = mat(BRANCO);
      const faces = aoLongoX
        ? [mat(EXTERNA), mat(EXTERNA), topo, mat(EXTERNA), mat(lado(0, 1)), mat(lado(0, -1))]
        : [mat(lado(1, 0)), mat(lado(-1, 0)), topo, mat(EXTERNA), mat(EXTERNA), mat(EXTERNA)];
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(aoLongoX ? len : ESP, h, aoLongoX ? ESP : len), faces);
      mesh.position.set(cx, y0 + h / 2, cz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      casa.add(mesh);
      return { mesh, p: pa, centro: new THREE.Vector3(cx, 0, cz), alvo: 1, atual: 1 };
    });
    const janela = (x: number, z: number, w: number, y: number, h: number, aoLongoX: boolean) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      if (!aoLongoX) g.rotation.y = Math.PI / 2;
      caixa(g, -w / 2 - 0.06, -0.06, -0.1, w + 0.12, h + 0.12, 0.2, BRANCO);
      caixa(g, -w / 2, 0, -0.11, w, h, 0.22, '#CFE8F7');
      caixa(g, -0.03, 0, -0.12, 0.06, h, 0.24, BRANCO);
      caixa(g, -w / 2 - 0.1, -0.12, -0.16, w + 0.2, 0.06, 0.3, BRANCO);
      casa.add(g);
      return g;
    };
    janela(4.1, 0, 1.0, 1.0, 1.0, true); janela(6.6, 0, 0.7, 1.6, 0.5, true); janela(11.1, 0, 0.9, 1.1, 0.9, true); janela(12, 6.0, 1.0, 1.35, 0.8, false);

    /* Móveis com ações. Os pontos são onde o personagem para; "lugar" é onde ele fica (sentado, deitado...) */
    // Quarto
    interativo('cama', 'Cama', 'quarto', [3.4, 1.4], [{ rotulo: 'Deitar', texto: 'Descansando', lugar: [2.1, 0.62, 1.35], deitar: [0, 1], fechados: true }], g => {
      caixa(g, 1.15, 0, 0.12, 1.9, 1.15, 0.14, AMEIXA_SUAVE);
      caixa(g, 1.2, 0, 0.26, 1.8, 0.32, 2.1, MADEIRA_CLARA);
      caixa(g, 1.25, 0.32, 0.28, 1.7, 0.22, 2.05, BRANCO);
      caixa(g, 1.35, 0.54, 0.35, 0.7, 0.14, 0.4, NEVOA);
      caixa(g, 2.15, 0.54, 0.35, 0.7, 0.14, 0.4, NEVOA);
      caixa(g, 1.22, 0.54, 0.95, 1.76, 0.07, 1.36, PINK);
      caixa(g, 1.22, 0.6, 0.95, 1.76, 0.03, 0.25, clarear(PINK, 0.45));
    });
    bloquear(1.15, 0.1, 3.05, 2.4);
    interativo('biblia', 'Bíblia na cabeceira', 'quarto', [0.65, 1.15], [{ rotulo: 'Devocional', alvo: 'atividade:devocional' }], g => {
      caixa(g, 0.3, 0, 0.18, 0.62, 0.52, 0.48, MADEIRA_CLARA);
      caixa(g, 0.33, 0.25, 0.67, 0.56, 0.02, 0.01, escurecer(MADEIRA_CLARA, 0.25));
      caixa(g, 0.38, 0.52, 0.26, 0.3, 0.07, 0.22, NOITE);
      caixa(g, 0.39, 0.53, 0.27, 0.28, 0.05, 0.2, BRANCO);
      caixa(g, 0.38, 0.58, 0.26, 0.3, 0.02, 0.22, NOITE);
      caixa(g, 0.52, 0.605, 0.3, 0.02, 0.005, 0.14, LIMA);
      caixa(g, 0.47, 0.605, 0.35, 0.12, 0.005, 0.02, LIMA);
      cil(g, 0.78, 0.52, 0.42, 0.03, 0.35, AMEIXA_SUAVE);
      cil(g, 0.78, 0.82, 0.42, 0.14, 0.18, ROSA, 0.09);
    });
    bloquear(0.25, 0.1, 0.95, 0.7);
    interativo('guarda-roupa', 'Guarda-roupa', 'quarto', [1.2, 3.5], [{ rotulo: 'Trocar de roupa', alvo: 'roupas' }], g => {
      caixa(g, 0.1, 0, 2.8, 0.65, 2.1, 1.4, MADEIRA_CLARA);
      caixa(g, 0.74, 0.08, 2.86, 0.02, 1.95, 0.64, clarear(MADEIRA_CLARA, 0.2));
      caixa(g, 0.74, 0.08, 3.54, 0.02, 1.95, 0.6, clarear(MADEIRA_CLARA, 0.2));
      caixa(g, 0.77, 0.95, 3.38, 0.03, 0.22, 0.03, AMEIXA_SUAVE);
      caixa(g, 0.77, 0.95, 3.6, 0.03, 0.22, 0.03, AMEIXA_SUAVE);
      caixa(g, 0.06, 2.1, 2.76, 0.73, 0.08, 1.48, escurecer(MADEIRA_CLARA, 0.06));
    });
    bloquear(0.05, 2.75, 0.85, 4.25);
    interativo('almofada', 'Almofada de oração', 'quarto', [4.0, 2.4], [{ rotulo: 'Orar', alvo: 'atividade:oracao' }], g => {
      caixa(g, 3.6, 0, 1.15, 0.8, 0.14, 0.8, PINK);
      caixa(g, 3.66, 0.14, 1.21, 0.68, 0.03, 0.68, '#FF5AA8');
    });
    interativo('moeda', 'Algo brilha aqui...', 'quarto', [3.4, 2.7], [{ rotulo: 'Pegar', alvo: 'segredo:dracma' }], g => {
      const m = cil(g, 3.2, 0.01, 2.45, 0.09, 0.02, '#F2C94C');
      (m.material as THREE.MeshStandardMaterial).emissive = new THREE.Color('#6A5200');
      g.userData.moeda = true;
    });
    // Banheiro
    interativo('banheira', 'Banheira', 'banheiro', [6.1, 1.5], [{ rotulo: 'Tomar banho', texto: 'Tomando banho', lugar: [6.05, 0.05, 0.6], pose: 'baixo' }], g => {
      for (const [x, z] of [[5.3, 0.25], [6.85, 0.25], [5.3, 0.9], [6.85, 0.9]]) cil(g, x, 0, z, 0.05, 0.12, '#C9B6A2');
      caixa(g, 5.2, 0.1, 0.15, 1.8, 0.48, 0.12, BRANCO);
      caixa(g, 5.2, 0.1, 0.93, 1.8, 0.48, 0.12, BRANCO);
      caixa(g, 5.2, 0.1, 0.27, 0.12, 0.48, 0.66, BRANCO);
      caixa(g, 6.88, 0.1, 0.27, 0.12, 0.48, 0.66, BRANCO);
      caixa(g, 5.32, 0.1, 0.27, 1.56, 0.05, 0.66, BRANCO);
      caixa(g, 5.32, 0.4, 0.27, 1.56, 0.02, 0.66, '#BFE6FF', false);
      cil(g, 5.32, 0.58, 0.55, 0.03, 0.25, '#C9B6A2');
    });
    bloquear(5.15, 0.1, 7.05, 1.1);
    interativo('patinho', 'Patinho de borracha', 'banheiro', [5.7, 1.5], [{ rotulo: 'Apertar o patinho', alvo: 'segredo:patinho' }], g => {
      bola(g, 5.75, 0.47, 0.5, 0.09, '#F2C94C', 0.75);
      bola(g, 5.8, 0.56, 0.5, 0.055, '#F2C94C');
      caixa(g, 5.84, 0.54, 0.48, 0.05, 0.02, 0.04, PINK);
    });
    {
      const g = new THREE.Group();
      casa.add(g);
      caixa(g, 7.3, 0, 0.12, 0.5, 0.5, 0.2, BRANCO);
      caixa(g, 7.35, 0, 0.32, 0.4, 0.38, 0.45, BRANCO);
      caixa(g, 7.34, 0.38, 0.32, 0.42, 0.04, 0.47, '#F1EAE2');
    }
    bloquear(7.25, 0.1, 7.85, 0.8);
    interativo('espelho', 'Pia e espelho', 'banheiro', [7.05, 2.6], [
      { rotulo: 'Mudar o visual', alvo: 'visual' },
      { rotulo: 'Escovar os dentes', pose: 'mexer', texto: 'Escovando os dentes' },
    ], g => {
      caixa(g, 7.4, 0, 2.2, 0.52, 0.82, 0.8, '#F2B8CF');
      caixa(g, 7.36, 0.82, 2.16, 0.58, 0.05, 0.88, BRANCO);
      cil(g, 7.62, 0.87, 2.6, 0.16, 0.02, '#E8F4FF');
      cil(g, 7.8, 0.87, 2.6, 0.02, 0.22, '#C9B6A2');
      caixa(g, 7.82, 1.15, 2.15, 0.06, 0.95, 0.9, '#E79BB9');
      caixa(g, 7.8, 1.2, 2.2, 0.06, 0.85, 0.8, '#DDF0FF');
    });
    bloquear(7.35, 2.1, 7.95, 3.05);
    {
      const t = new THREE.Group();
      casa.add(t);
      caixa(t, 5.08, 1.5, 3.1, 0.04, 0.05, 0.9, '#C9B6A2');
      caixa(t, 5.1, 0.95, 3.15, 0.05, 0.6, 0.8, '#C7F28A');
      caixa(t, 6.0, 0.005, 2.3, 1.0, 0.01, 0.6, '#F2B8CF', false);
    }
    // Sala de estudo
    interativo('estante', 'Estante', 'estudo', [9.3, 1.15], [{ rotulo: 'Ler a Bíblia', alvo: 'atividade:leitura' }], g => {
      // Estante aberta: fundo, laterais e tampo, com os livros à mostra
      caixa(g, 8.3, 0, 0.1, 2.0, 2.2, 0.05, escurecer(MADEIRA, 0.3));
      caixa(g, 8.3, 0, 0.1, 0.08, 2.2, 0.44, MADEIRA);
      caixa(g, 10.22, 0, 0.1, 0.08, 2.2, 0.44, MADEIRA);
      caixa(g, 8.3, 2.14, 0.1, 2.0, 0.08, 0.44, MADEIRA);
      caixa(g, 8.3, 0, 0.1, 2.0, 0.1, 0.44, MADEIRA);
      const cores = ['#42124C', ROSA, PINK, NEVOA, '#8E6A9A', '#F2B8CF', '#A9CF86'];
      [0.1, 0.62, 1.14, 1.66].forEach((y, fila) => {
        caixa(g, 8.38, y, 0.12, 1.84, 0.04, 0.4, clarear(MADEIRA, 0.15));
        for (let i = 0, x = 8.42; x < 10.1; i++, x += 0.12) {
          if ((i + fila) % 9 === 8) { x += 0.1; continue; }
          const h = 0.32 + ((i * 7 + fila * 3) % 4) * 0.035;
          caixa(g, x, y + 0.04, 0.16, 0.1, h, 0.3, cores[(i + fila) % cores.length]);
        }
      });
      cil(g, 9.6, 2.2, 0.3, 0.1, 0.16, PINK);
      bola(g, 9.6, 2.45, 0.3, 0.16, '#93C06C');
    });
    bloquear(8.25, 0.05, 10.35, 0.6);
    interativo('pergaminho', 'Pergaminho', 'estudo', [11.2, 1.1], [{ rotulo: 'Ler o pergaminho', alvo: 'segredo:pergaminho' }], g => {
      caixa(g, 10.75, 1.5, 0.08, 0.9, 0.05, 0.28, MADEIRA);
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.45, 12), mat('#FBF8F4'));
      r.rotation.z = Math.PI / 2;
      r.position.set(11.2, 1.6, 0.22);
      g.add(r);
      (r.material as THREE.MeshStandardMaterial).emissive = new THREE.Color('#4A3A10');
    });
    interativo('mesa', 'Mesa de estudo', 'estudo', [10.75, 2.2], [
      { rotulo: 'Estudar a Bíblia', alvo: 'atividade:estudo' },
      { rotulo: 'Sentar', pose: 'sentado', texto: 'Sentado na mesa', lugar: [10.8, 0.3, 2.15] },
    ], g => {
      for (const [x, z] of [[11.2, 1.4], [11.82, 1.4], [11.2, 2.88], [11.82, 2.88]]) caixa(g, x, 0, z, 0.06, 0.72, 0.06, BRANCO);
      caixa(g, 11.15, 0.72, 1.35, 0.75, 0.05, 1.6, BRANCO);
      caixa(g, 11.35, 0.77, 1.55, 0.35, 0.02, 0.5, PINK);
      caixa(g, 11.35, 0.77, 2.15, 0.4, 0.015, 0.45, BRANCO);
      cil(g, 11.6, 0.77, 2.75, 0.05, 0.12, '#E79BB9');
      cil(g, 11.7, 0.77, 1.5, 0.08, 0.02, AMEIXA_SUAVE);
      cil(g, 11.7, 0.79, 1.5, 0.015, 0.4, AMEIXA_SUAVE);
      cil(g, 11.7, 1.15, 1.5, 0.12, 0.13, ROSA, 0.07);
      for (const [x, z] of [[10.62, 1.92], [11.0, 1.92], [10.62, 2.36], [11.0, 2.36]]) caixa(g, x, 0, z, 0.04, 0.45, 0.04, AMEIXA_SUAVE);
      caixa(g, 10.6, 0.45, 1.9, 0.45, 0.05, 0.5, PINK);
      caixa(g, 10.58, 0.45, 1.9, 0.05, 0.5, 0.5, PINK);
    });
    bloquear(11.1, 1.3, 11.95, 3.0);
    interativo('poltrona', 'Poltrona', 'estudo', [9.4, 3.4], [
      { rotulo: 'Devocional', alvo: 'atividade:devocional' },
      { rotulo: 'Sentar', pose: 'sentado', texto: 'Descansando na poltrona', lugar: [9.0, 0.3, 3.4] },
    ], g => {
      caixa(g, 8.3, 0.1, 2.95, 0.85, 0.32, 0.9, '#8E6A9A');
      caixa(g, 8.3, 0.42, 2.95, 0.22, 0.6, 0.9, '#7A5686');
      caixa(g, 8.52, 0.42, 2.95, 0.63, 0.25, 0.15, '#7A5686');
      caixa(g, 8.52, 0.42, 3.7, 0.63, 0.25, 0.15, '#7A5686');
      caixa(g, 8.52, 0.42, 3.1, 0.6, 0.08, 0.6, '#A88AB2');
      for (const [x, z] of [[8.35, 3.0], [9.08, 3.0], [8.35, 3.78], [9.08, 3.78]]) caixa(g, x, 0, z, 0.05, 0.1, 0.05, NOITE);
    });
    bloquear(8.25, 2.9, 9.2, 3.9);
    // Sala
    interativo('sofa', 'Sofá', 'sala', [1.65, 6.7], [{ rotulo: 'Sentar', pose: 'sentado', texto: 'Relaxando no sofá', lugar: [1.05, 0.3, 6.7] }], g => {
      caixa(g, 0.2, 0.08, 5.6, 0.95, 0.35, 2.2, '#F2B8CF');
      caixa(g, 0.2, 0.43, 5.6, 0.3, 0.5, 2.2, '#E79BB9');
      caixa(g, 0.5, 0.43, 5.6, 0.65, 0.25, 0.22, '#E79BB9');
      caixa(g, 0.5, 0.43, 7.58, 0.65, 0.25, 0.22, '#E79BB9');
      caixa(g, 0.5, 0.43, 5.84, 0.62, 0.1, 0.84, ROSA);
      caixa(g, 0.5, 0.43, 6.72, 0.62, 0.1, 0.84, ROSA);
      caixa(g, 0.52, 0.53, 6.0, 0.14, 0.3, 0.4, PINK);
      caixa(g, 0.52, 0.53, 7.1, 0.14, 0.3, 0.4, NEVOA);
      for (const [x, z] of [[0.25, 5.65], [1.08, 5.65], [0.25, 7.73], [1.08, 7.73]]) caixa(g, x, 0, z, 0.05, 0.08, 0.05, NOITE);
    });
    bloquear(0.15, 5.55, 1.2, 7.85);
    interativo('aquario', 'Aquário', 'sala', [1.5, 5.25], [{ rotulo: 'Ver o peixe', alvo: 'segredo:peixe' }], g => {
      caixa(g, 0.2, 0, 4.65, 0.8, 0.6, 0.45, AMEIXA_SUAVE);
      caixa(g, 0.24, 0.6, 4.69, 0.72, 0.45, 0.37, '#BFE6FF', false).material = mat('#BFE6FF', { transparent: true, opacity: 0.55 });
      caixa(g, 0.26, 0.6, 4.71, 0.68, 0.06, 0.33, '#E9DCCB');
      bola(g, 0.6, 0.85, 4.88, 0.06, PINK, 0.6);
      cil(g, 0.4, 0.66, 4.8, 0.015, 0.25, '#88B862');
    });
    bloquear(0.15, 4.6, 1.05, 5.15);
    interativo('som', 'Caixa de som', 'sala', [4.7, 5.55], [{ rotulo: 'Ouvir louvor', alvo: 'atividade:louvor' }], g => {
      caixa(g, 3.8, 0, 4.62, 1.8, 0.5, 0.45, MADEIRA);
      caixa(g, 3.55, 0, 4.62, 0.25, 0.95, 0.3, NOITE);
      caixa(g, 5.6, 0, 4.62, 0.25, 0.95, 0.3, NOITE);
      for (const x of [3.675, 5.725]) for (const y of [0.28, 0.66]) { const c = cil(g, x, y, 4.93, 0.07, 0.01, LIMA); c.rotation.x = Math.PI / 2; c.position.set(x, y, 4.93); }
      caixa(g, 4.35, 0.5, 4.68, 0.7, 0.06, 0.36, NEVOA);
      cil(g, 4.62, 0.56, 4.86, 0.15, 0.01, NOITE);
      cil(g, 4.62, 0.57, 4.86, 0.04, 0.01, PINK);
      for (let k = 0; k < 7; k++) caixa(g, 3.9 + k * 0.08, 0.04, 4.68, 0.05, 0.3, 0.32, [PINK, NOITE, ROSA, LIMA, '#8E6A9A', NEVOA, PINK][k]);
    });
    bloquear(3.5, 4.55, 5.9, 5.1);
    interativo('violao', 'Violão', 'sala', [6.0, 7.9], [{ rotulo: 'Ensaiar', alvo: 'atividade:ensaio' }], g => {
      caixa(g, 6.45, 0, 8.4, 0.2, 0.05, 0.2, NOITE);
      const corpo = new THREE.Group();
      corpo.position.set(6.55, 0.05, 8.5);
      corpo.rotation.set(-0.15, 0.4, 0);
      g.add(corpo);
      const a = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 20), mat(MADEIRA));
      a.rotation.x = Math.PI / 2;
      a.position.y = 0.3;
      corpo.add(a);
      const b = a.clone();
      b.scale.setScalar(0.75);
      b.position.y = 0.6;
      corpo.add(b);
      caixa(corpo, -0.03, 0.75, -0.03, 0.06, 0.6, 0.06, escurecer(MADEIRA, 0.3));
      caixa(corpo, -0.05, 1.33, -0.04, 0.1, 0.14, 0.08, NOITE);
      corpo.traverse(o => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true; });
    });
    interativo('porta', 'Porta da rua', 'sala', [2.5, 8.3], [{ rotulo: 'Ir à igreja', alvo: 'atividade:igreja' }], g => {
      caixa(g, 2.02, 0, 8.98, 0.96, 2.12, 0.06, AMEIXA_SUAVE);
      caixa(g, 2.12, 0.15, 8.95, 0.76, 0.85, 0.02, '#5A3D60');
      caixa(g, 2.12, 1.15, 8.95, 0.76, 0.8, 0.02, '#5A3D60');
      bola(g, 2.85, 1.0, 8.94, 0.04, '#F2C94C');
      caixa(g, 2.0, 0.005, 8.25, 1.0, 0.01, 0.6, '#D9C3CD', false);
    });
    interativo('treino', 'Tapete de treino', 'sala', [4.7, 7.8], [{ rotulo: 'Fazer exercício', alvo: 'atividade:exercicio' }], g => {
      caixa(g, 4.0, 0.005, 7.45, 1.4, 0.02, 0.7, '#C7F28A', false);
      caixa(g, 5.55, 0, 7.6, 0.4, 0.06, 0.06, NOITE);
      for (const x of [5.5, 5.92]) cil(g, x + 0.04, 0, 7.63, 0.08, 0.04, PINK).rotation.z = Math.PI / 2;
    });
    // Cozinha
    const balcao = (z0: number, z1: number) => {
      caixa(casa, 11.3, 0, z0, 0.65, 0.86, z1 - z0, '#FBF8F4');
      caixa(casa, 11.26, 0.86, z0 - 0.02, 0.72, 0.05, z1 - z0 + 0.04, MADEIRA);
      caixa(casa, 11.28, 0.12, z0 + 0.05, 0.02, 0.6, z1 - z0 - 0.1, '#EFE7DD');
      caixa(casa, 11.65, 1.55, z0, 0.32, 0.6, z1 - z0, '#FBF8F4');
    };
    balcao(4.65, 5.55); balcao(6.45, 6.95); balcao(7.65, 8.05);
    interativo('pia', 'Pia da cozinha', 'cozinha', [10.75, 6.0], [{ rotulo: 'Lavar a louça', pose: 'mexer', texto: 'Lavando a louça' }], g => {
      caixa(g, 11.3, 0, 5.55, 0.65, 0.86, 0.9, '#FBF8F4');
      caixa(g, 11.26, 0.86, 5.53, 0.72, 0.05, 0.94, MADEIRA);
      caixa(g, 11.42, 0.88, 5.7, 0.42, 0.02, 0.6, '#DDE8EE');
      cil(g, 11.88, 0.9, 6.0, 0.02, 0.28, '#C9B6A2');
      caixa(g, 11.38, 0.9, 5.62, 0.12, 0.08, 0.12, PINK);
      caixa(g, 11.65, 1.55, 5.55, 0.32, 0.6, 0.9, '#FBF8F4');
    });
    interativo('fogao', 'Fogão', 'cozinha', [10.75, 7.3], [{ rotulo: 'Cozinhar', pose: 'mexer', texto: 'Cozinhando' }], g => {
      caixa(g, 11.3, 0, 6.95, 0.65, 0.86, 0.7, '#E8E2EA');
      caixa(g, 11.28, 0.12, 7.0, 0.02, 0.45, 0.6, NOITE);
      caixa(g, 11.3, 0.86, 6.95, 0.65, 0.04, 0.7, NOITE);
      for (const [x, z] of [[11.48, 7.12], [11.75, 7.12], [11.48, 7.45], [11.75, 7.45]]) cil(g, x, 0.9, z, 0.08, 0.01, '#5A3D60');
      cil(g, 11.48, 0.91, 7.12, 0.11, 0.12, PINK);
    });
    interativo('geladeira', 'Geladeira', 'cozinha', [10.7, 8.4], [{ rotulo: 'Fazer um lanche', pose: 'comer', texto: 'Fazendo um lanche' }], g => {
      caixa(g, 11.25, 0, 8.1, 0.7, 1.95, 0.78, '#F2F4F6');
      caixa(g, 11.23, 1.25, 8.12, 0.02, 0.02, 0.74, '#C8CED6');
      caixa(g, 11.22, 0.9, 8.2, 0.03, 0.3, 0.04, '#C8CED6');
      caixa(g, 11.22, 1.4, 8.2, 0.03, 0.3, 0.04, '#C8CED6');
      caixa(g, 11.23, 1.6, 8.5, 0.01, 0.16, 0.12, LIMA);
    });
    bloquear(11.2, 4.6, 12, 8.95);
    interativo('jantar', 'Mesa de jantar', 'cozinha', [9.2, 7.75], [
      { rotulo: 'Sentar', pose: 'sentado', texto: 'Sentado à mesa', lugar: [9.2, 0.3, 7.45] },
      { rotulo: 'Agradecer pela comida', alvo: 'atividade:oracao' },
    ], g => {
      for (const [x, z] of [[8.55, 6.25], [9.8, 6.25], [8.55, 7.1], [9.8, 7.1]]) caixa(g, x, 0, z, 0.06, 0.72, 0.06, MADEIRA);
      caixa(g, 8.5, 0.72, 6.2, 1.4, 0.05, 1.0, MADEIRA);
      cil(g, 9.2, 0.77, 6.7, 0.18, 0.02, BRANCO);
      bola(g, 9.2, 0.84, 6.7, 0.08, '#F2C94C', 0.6);
      cil(g, 8.85, 0.77, 6.45, 0.04, 0.1, ROSA);
      const cadeira = (x: number, z: number, frente: boolean) => {
        for (const [dx, dz] of [[0, 0], [0.38, 0], [0, 0.38], [0.38, 0.38]]) caixa(g, x + dx, 0, z + dz, 0.04, 0.42, 0.04, MADEIRA_CLARA);
        caixa(g, x - 0.02, 0.42, z - 0.02, 0.46, 0.05, 0.46, MADEIRA_CLARA);
        caixa(g, x - 0.02, 0.47, frente ? z + 0.4 : z - 0.02, 0.46, 0.45, 0.04, MADEIRA_CLARA);
      };
      cadeira(8.97, 5.62, false);
      cadeira(8.97, 7.33, true);
    });
    bloquear(8.45, 5.55, 9.95, 7.25);

    /* Decoração comprada: cada vaga tem um lugar na casa 3D */
    const VAGAS3D: Record<string, { tipo: 'parede' | 'chao' | 'tapete'; x: number; y?: number; z: number; giro?: number }> = {
      'quarto-parede': { tipo: 'parede', x: 2.1, y: 1.75, z: 0.08, giro: 0 },
      'quarto-parede2': { tipo: 'parede', x: 0.08, y: 1.6, z: 1.6, giro: Math.PI / 2 },
      'quarto-canto': { tipo: 'chao', x: 4.55, z: 3.95 },
      'quarto-tapete': { tipo: 'tapete', x: 2.6, z: 3.2 },
      'estudo-parede': { tipo: 'parede', x: 11.92, y: 1.6, z: 3.7, giro: -Math.PI / 2 },
      'estudo-parede2': { tipo: 'parede', x: 8.08, y: 1.7, z: 2.0, giro: Math.PI / 2 },
      'estudo-canto': { tipo: 'chao', x: 8.45, z: 4.15 },
      'estudo-tapete': { tipo: 'tapete', x: 10.0, z: 3.0 },
      'sala-parede': { tipo: 'parede', x: 0.08, y: 1.75, z: 6.7, giro: Math.PI / 2 },
      'sala-parede2': { tipo: 'parede', x: 4.7, y: 1.75, z: 4.58, giro: 0 },
      'sala-canto': { tipo: 'chao', x: 6.55, z: 5.0 },
      'sala-tapete': { tipo: 'tapete', x: 3.4, z: 6.6 },
      'banheiro-parede': { tipo: 'parede', x: 5.08, y: 1.75, z: 1.9, giro: Math.PI / 2 },
      'banheiro-canto': { tipo: 'chao', x: 5.4, z: 4.1 },
      'banheiro-tapete': { tipo: 'tapete', x: 6.5, z: 3.3 },
      'cozinha-parede': { tipo: 'parede', x: 8.3, y: 1.75, z: 4.58, giro: 0 },
      'cozinha-canto': { tipo: 'chao', x: 7.45, z: 8.6 },
      'cozinha-tapete': { tipo: 'tapete', x: 10.2, z: 7.6 },
    };
    const decoracao = new THREE.Group();
    casa.add(decoracao);
    // Cada móvel é montado em volta da origem (parede: virado para +z; chão: em pé no chão)
    const MONTAR: Record<string, (g: THREE.Group) => void> = {
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
    };
    const montarDecoracao = () => {
      decoracao.clear();
      const { casa: lugares, itens } = p.current;
      for (const [vaga, item] of Object.entries(lugares)) {
        const v = VAGAS3D[vaga], montar = MONTAR[item];
        if (!v || !montar || !itens.includes(item)) continue;
        const g = new THREE.Group();
        montar(g);
        g.position.set(v.x, v.y ?? 0, v.z);
        g.rotation.y = v.giro ?? 0;
        g.traverse(o => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).receiveShadow = true; });
        decoracao.add(g);
      }
    };
    montarDecoracao();

    /* Caminhos: grade de 0,25 com paredes e móveis bloqueando */
    const CEL = 0.25, NX = 48, NZ = 36;
    const livre = new Uint8Array(NX * NZ);
    const centro = (i: number, j: number): [number, number] => [(i + 0.5) * CEL, (j + 0.5) * CEL];
    const pertoDeParede = (x: number, z: number) => PAREDES.some(pa => {
      if (pa.y0) return false;
      if (pa.z0 === pa.z1) return Math.abs(z - pa.z0) < 0.26 && x > Math.min(pa.x0, pa.x1) - 0.2 && x < Math.max(pa.x0, pa.x1) + 0.2;
      return Math.abs(x - pa.x0) < 0.26 && z > Math.min(pa.z0, pa.z1) - 0.2 && z < Math.max(pa.z0, pa.z1) + 0.2;
    });
    for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) {
      const [x, z] = centro(i, j);
      const bloq = bloqueios.some(([x0, z0, x1, z1]) => x > x0 - 0.12 && x < x1 + 0.12 && z > z0 - 0.12 && z < z1 + 0.12);
      livre[j * NX + i] = !bloq && !pertoDeParede(x, z) ? 1 : 0;
    }
    const atravessaParede = (ax: number, az: number, bx: number, bz: number) => PAREDES.some(pa => {
      if (pa.y0) return false;
      if (pa.z0 === pa.z1) {
        if ((az - pa.z0) * (bz - pa.z0) >= 0) return false;
        const t = (pa.z0 - az) / (bz - az), x = ax + (bx - ax) * t;
        return x > Math.min(pa.x0, pa.x1) - 0.1 && x < Math.max(pa.x0, pa.x1) + 0.1;
      }
      if ((ax - pa.x0) * (bx - pa.x0) >= 0) return false;
      const t = (pa.x0 - ax) / (bx - ax), z = az + (bz - az) * t;
      return z > Math.min(pa.z0, pa.z1) - 0.1 && z < Math.max(pa.z0, pa.z1) + 0.1;
    });
    const celula = (x: number, z: number) => [Math.max(0, Math.min(NX - 1, Math.floor(x / CEL))), Math.max(0, Math.min(NZ - 1, Math.floor(z / CEL)))];
    const maisPerto = (x: number, z: number) => {
      const [ci, cj] = celula(x, z);
      let melhor = -1, dist = Infinity;
      for (let i = Math.max(0, ci - 6); i < Math.min(NX, ci + 7); i++) for (let j = Math.max(0, cj - 6); j < Math.min(NZ, cj + 7); j++) {
        if (!livre[j * NX + i]) continue;
        const [cx, cz] = centro(i, j), dd = (cx - x) ** 2 + (cz - z) ** 2;
        if (dd < dist && !atravessaParede(x, z, cx, cz)) { dist = dd; melhor = j * NX + i; }
      }
      return melhor;
    };
    const linhaLivre = (a: THREE.Vector3, b: THREE.Vector3) => {
      if (atravessaParede(a.x, a.z, b.x, b.z)) return false;
      const n = Math.ceil(a.distanceTo(b) / 0.12);
      for (let k = 1; k < n; k++) {
        const [i, j] = celula(a.x + ((b.x - a.x) * k) / n, a.z + ((b.z - a.z) * k) / n);
        if (!livre[j * NX + i]) return false;
      }
      return true;
    };
    // ponytail: busca em largura numa grade pequena (1.728 células); trocar por A* se a casa crescer muito
    const caminho = (de: THREE.Vector3, para: [number, number]): THREE.Vector3[] | null => {
      const ini = maisPerto(de.x, de.z), fim = maisPerto(para[0], para[1]);
      if (ini < 0 || fim < 0) return null;
      const veio = new Int32Array(NX * NZ).fill(-1);
      veio[ini] = ini;
      const fila = [ini];
      for (let q = 0; q < fila.length && veio[fim] < 0; q++) {
        const c = fila[q], i = c % NX, j = (c - i) / NX, [cx, cz] = centro(i, j);
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          const ni = i + di, nj = j + dj;
          if (ni < 0 || nj < 0 || ni >= NX || nj >= NZ) continue;
          const n = nj * NX + ni;
          if (veio[n] >= 0 || !livre[n]) continue;
          if (di && dj && (!livre[j * NX + ni] || !livre[nj * NX + i])) continue;
          const [nx, nz] = centro(ni, nj);
          if (atravessaParede(cx, cz, nx, nz)) continue;
          veio[n] = c;
          fila.push(n);
        }
      }
      if (veio[fim] < 0) return null;
      const celulas: THREE.Vector3[] = [];
      for (let c = fim; c !== ini; c = veio[c]) { const [x, z] = centro(c % NX, Math.floor(c / NX)); celulas.unshift(new THREE.Vector3(x, 0, z)); }
      celulas.push(new THREE.Vector3(para[0], 0, para[1]));
      // Atalhos em linha reta quando não há parede nem móvel no meio
      const suave: THREE.Vector3[] = [];
      let atual = de.clone();
      for (let k = 0; k < celulas.length; k++) {
        let mais = k;
        while (mais + 1 < celulas.length && linhaLivre(atual, celulas[mais + 1])) mais++;
        suave.push(celulas[mais]);
        atual = celulas[mais];
        k = mais;
      }
      return suave;
    };

    /* Personagem */
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, alphaTest: 0.05 }));
    const ALTO = 1.7, LARGO = (ALTO * SVG_W) / SVG_H;
    sprite.scale.set(LARGO, ALTO, 1);
    sprite.center.set(0.5, 1 - PE);
    cena.add(sprite);
    const sombraBoneco = new THREE.Mesh(new THREE.CircleGeometry(0.28, 24), new THREE.MeshBasicMaterial({ color: '#1A0420', transparent: true, opacity: 0.18 }));
    sombraBoneco.rotation.x = -Math.PI / 2;
    cena.add(sombraBoneco);
    const texturas = new Map<string, THREE.Texture>();
    const texturaDe = (pose: Pose, passo: 0 | 1, espelhar: boolean, fones = false, fechados = false) => {
      const { look, forma, humor } = p.current;
      const h = humor === 'adormecido' ? 'normal' : humor;
      const chave = JSON.stringify([look, forma, h, pose, passo, espelhar, fones, fechados]);
      let tx = texturas.get(chave);
      if (!tx) {
        tx = texturaSvg(pessoaSvg(look, { forma, humor: h as never, pose, passo, fones, olhosFechados: fechados }), espelhar);
        texturas.set(chave, tx);
      }
      return tx;
    };
    const boneco = {
      pos: new THREE.Vector3(3.5, 0, 6.8),
      rota: [] as THREE.Vector3[],
      depois: null as null | (() => void),
      virado: false,
      passo: 0 as 0 | 1,
      relogioPasso: 0,
      acao: null as null | { pose: Pose; texto?: string; lugar?: THREE.Vector3; deitar?: [number, number]; fones?: boolean; fechados?: boolean; ate: number; voltar: THREE.Vector3 },
      paradoDesde: 0,
    };
    const andarAte = (alvo: [number, number], depois?: () => void) => {
      boneco.acao = null;
      const r = caminho(boneco.pos, alvo);
      if (!r) return;
      boneco.rota = r;
      boneco.depois = depois ?? null;
    };
    const fazer = (a: { pose: Pose; texto?: string; lugar?: [number, number, number]; deitar?: [number, number]; fones?: boolean; fechados?: boolean }, segundos = 9) => {
      boneco.rota = [];
      boneco.acao = {
        ...a,
        lugar: a.lugar ? new THREE.Vector3(...a.lugar) : undefined,
        ate: performance.now() + segundos * 1000,
        voltar: boneco.pos.clone(),
      };
    };

    /* Câmera presa na casa: gira, dá zoom e foca em cômodos */
    const cam = { giro: 0.55, alvo: CENTRO_CASA.clone(), dist: 21, giroDesejado: 0.55, alvoDesejado: CENTRO_CASA.clone(), distDesejada: 21, focoComodo: '' };
    const ALTURA_CAM = 0.82; // ângulo de cima (rad)
    const focar = (f: string) => {
      const c = COMODOS.find(x => x.id === f);
      cam.focoComodo = c ? c.id : '';
      cam.alvoDesejado.set(c ? (c.x0 + c.x1) / 2 : CENTRO_CASA.x, 0, c ? (c.z0 + c.z1) / 2 : CENTRO_CASA.z);
      cam.distDesejada = c ? 11.5 : 21;
    };
    focar(p.current.foco);

    /* Interação: arrastar gira, roda/pinça dá zoom, toque escolhe */
    const ray = new THREE.Raycaster();
    const ponteiro = new THREE.Vector2();
    const toques = new Map<number, { x: number; y: number }>();
    let arrasto = 0, inicio = { x: 0, y: 0 }, pinca = 0;
    const tela = renderer.domElement;
    const objetoNo = (cx: number, cy: number) => {
      const r = tela.getBoundingClientRect();
      ponteiro.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ponteiro, camera);
      const acertos = ray.intersectObjects([casa, grama], true);
      for (const a of acertos) {
        let o: THREE.Object3D | null = a.object;
        while (o && !o.userData.objeto && !o.userData.chao) o = o.parent;
        if (!o) continue;
        if (o.userData.chao) return { chao: a.point };
        const obj = objetos.find(x => x.id === o!.userData.objeto && x.grupo.visible);
        if (obj) return { obj };
      }
      return null;
    };
    let destacado: THREE.Group | null = null;
    const destacar = (g: THREE.Group | null) => {
      if (destacado === g) return;
      const pintar = (gr: THREE.Group | null, cor: number) => gr?.traverse(o => {
        const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (m && 'emissive' in m && !o.parent?.userData.moeda) m.emissive.setHex(cor);
      });
      pintar(destacado, 0x000000);
      pintar(g, 0x2c2410);
      destacado = g;
      tela.style.cursor = g ? 'pointer' : 'grab';
    };
    const aoDescer = (e: PointerEvent) => {
      tela.setPointerCapture(e.pointerId);
      toques.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (toques.size === 1) { arrasto = 0; inicio = { x: e.clientX, y: e.clientY }; }
      if (toques.size === 2) { const [a, b] = [...toques.values()]; pinca = Math.hypot(a.x - b.x, a.y - b.y); }
    };
    const aoMover = (e: PointerEvent) => {
      const ant = toques.get(e.pointerId);
      if (!ant) {
        if (e.pointerType === 'mouse') { const h = objetoNo(e.clientX, e.clientY); destacar(h && 'obj' in h ? h.obj!.grupo : null); }
        return;
      }
      toques.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (toques.size === 2) {
        const [a, b] = [...toques.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinca) cam.distDesejada = THREE.MathUtils.clamp(cam.distDesejada * (pinca / d), 7, 28);
        pinca = d;
        arrasto = 99;
        return;
      }
      arrasto += Math.abs(e.clientX - ant.x) + Math.abs(e.clientY - ant.y);
      if (arrasto > 6) cam.giroDesejado -= (e.clientX - ant.x) * 0.008;
    };
    const aoSubir = (e: PointerEvent) => {
      toques.delete(e.pointerId);
      if (toques.size) return;
      pinca = 0;
      if (arrasto > 6) return;
      if (menuRef.current) { setMenu(null); return; }
      const h = objetoNo(e.clientX, e.clientY);
      if (!h || p.current.humor === 'adormecido') return;
      if ('obj' in h && h.obj) {
        const r = tela.getBoundingClientRect();
        setMenu({ x: e.clientX - r.left, y: e.clientY - r.top, obj: h.obj });
      } else if (h.chao) {
        const [x, z] = [h.chao.x, h.chao.z];
        if (x > 0 && x < 12 && z > 0 && z < 9) andarAte([x, z]);
      }
    };
    const aoRodar = (e: WheelEvent) => { e.preventDefault(); cam.distDesejada = THREE.MathUtils.clamp(cam.distDesejada * (1 + e.deltaY * 0.0012), 7, 28); };
    tela.addEventListener('pointerdown', aoDescer);
    tela.addEventListener('pointermove', aoMover);
    tela.addEventListener('pointerup', aoSubir);
    tela.addEventListener('pointercancel', aoSubir);
    tela.addEventListener('wheel', aoRodar, { passive: false });

    /* Tamanho */
    const ajustar = () => {
      const w = el.clientWidth || 1, h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      tela.style.width = w + 'px';
      tela.style.height = h + 'px';
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const obs = new ResizeObserver(ajustar);
    obs.observe(el);
    ajustar();

    /* Laço principal */
    let ultimo = performance.now(), quadro = 0, vivo = true;
    const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
    const proj = (v: THREE.Vector3) => { tmp2.copy(v).project(camera); return { x: (tmp2.x * 0.5 + 0.5) * el.clientWidth, y: (-tmp2.y * 0.5 + 0.5) * el.clientHeight }; };
    let ultimoBalao = '';
    const laco = () => {
      if (!vivo) return;
      quadro = requestAnimationFrame(laco);
      const agora = performance.now(), dt = Math.min(0.12, (agora - ultimo) / 1000);
      ultimo = agora;
      const dormindo = p.current.humor === 'adormecido';

      // Câmera suave
      const k = 1 - Math.pow(0.002, dt);
      cam.giro += (cam.giroDesejado - cam.giro) * k;
      cam.dist += (cam.distDesejada - cam.dist) * k;
      cam.alvo.lerp(cam.alvoDesejado, k);
      // Tela em pé (celular) corta os lados: afasta a câmera para caber a casa
      const dist = cam.dist * (camera.aspect < 1 ? Math.min(2.2, (1 / camera.aspect) ** 0.85) : 1);
      camera.position.set(
        cam.alvo.x + Math.sin(cam.giro) * Math.cos(ALTURA_CAM) * dist,
        cam.alvo.y + Math.sin(ALTURA_CAM) * dist,
        cam.alvo.z + Math.cos(cam.giro) * Math.cos(ALTURA_CAM) * dist,
      );
      camera.lookAt(cam.alvo);

      // Paredes da frente abaixam (como no The Sims)
      tmp.set(Math.sin(cam.giro), 0, Math.cos(cam.giro));
      const ref = cam.focoComodo ? cam.alvo : CENTRO_CASA;
      for (const pa of paredes) {
        const s = tmp2.copy(pa.centro).sub(ref).dot(tmp);
        const limite = pa.p.externa || cam.focoComodo ? 0.35 : -0.6;
        pa.alvo = s > limite ? 0 : 1;
        pa.atual += (pa.alvo - pa.atual) * Math.min(1, dt * 8);
        const y0 = pa.p.y0 ?? 0, y1 = pa.p.y1 ?? ALTURA, cheia = y1 - y0;
        if (pa.p.y0) { pa.mesh.visible = pa.atual > 0.5; continue; }
        const h = BAIXA + (cheia - BAIXA) * pa.atual;
        pa.mesh.scale.y = h / cheia;
        pa.mesh.position.y = y0 + h / 2;
      }

      // Personagem: anda pela rota, faz ações e passeia quando está à toa
      const b = boneco;
      let pose: Pose = 'baixo', fones = false, fechados = false, deitar: [number, number] | undefined;
      let texto: string | null = null;
      if (dormindo) {
        b.rota = [];
        b.acao = null;
        b.pos.set(3.3, 0, 1.3);
        pose = 'baixo';
        fechados = true;
        deitar = [0, 1];
        texto = 'Zzz';
      } else if (b.rota.length) {
        const prox = b.rota[0], d = prox.distanceTo(b.pos), passo = 1.8 * dt;
        const antes = proj(b.pos).x, depois = proj(prox).x;
        if (Math.abs(depois - antes) > 0.5) b.virado = depois < antes;
        if (d <= passo) { b.pos.copy(prox); b.rota.shift(); } else b.pos.addScaledVector(tmp.copy(prox).sub(b.pos).normalize(), passo);
        b.relogioPasso += dt;
        if (b.relogioPasso > 0.17) { b.relogioPasso = 0; b.passo = b.passo ? 0 : 1; }
        pose = 'andar';
        if (!b.rota.length) { b.paradoDesde = agora; const f = b.depois; b.depois = null; f?.(); }
      } else if (b.acao) {
        if (agora > b.acao.ate) { b.acao = null; b.paradoDesde = agora; }
        else { pose = b.acao.pose; fones = !!b.acao.fones; fechados = !!b.acao.fechados; deitar = b.acao.deitar; texto = b.acao.texto ?? null; }
      } else if (!menuRef.current && agora - b.paradoDesde > 4000 + Math.random() * 3000) {
        // Passeio: um ponto livre no cômodo em foco (ou em qualquer cômodo)
        const c = COMODOS.find(x => x.id === cam.focoComodo) ?? COMODOS[Math.floor(Math.random() * COMODOS.length)];
        for (let t = 0; t < 20; t++) {
          const x = c.x0 + 0.4 + Math.random() * (c.x1 - c.x0 - 0.8), z = c.z0 + 0.4 + Math.random() * (c.z1 - c.z0 - 0.8);
          const [i, j] = celula(x, z);
          if (livre[j * NX + i]) { andarAte([x, z]); break; }
        }
        b.paradoDesde = agora;
      }
      const lugar = !b.rota.length && b.acao?.lugar ? b.acao.lugar : null;
      const onde = dormindo ? new THREE.Vector3(2.1, 0.62, 1.35) : lugar ?? b.pos;
      const sm = sprite.material;
      const tx = texturaDe(deitar ? 'baixo' : pose, b.passo, deitar ? false : b.virado, fones, fechados);
      if (sm.map !== tx) { sm.map = tx; sm.needsUpdate = true; }
      // Deitado fica por cima da cama (sem ser escondido pelo colchão)
      sm.depthTest = !deitar;
      sprite.renderOrder = deitar ? 10 : 0;
      if (deitar) {
        // Deitado: gira o desenho na direção da cama, do jeito que a câmera vê
        const a = proj(onde), c2 = proj(tmp.set(onde.x + deitar[0], onde.y, onde.z + deitar[1]));
        sm.rotation = Math.atan2(-(c2.y - a.y), c2.x - a.x) + Math.PI / 2;
        sprite.center.set(0.5, 0.42);
        sprite.position.copy(onde).add(tmp.set(0, 0.12, 0));
      } else {
        sm.rotation = 0;
        sprite.center.set(0.5, 1 - PE);
        sprite.position.copy(onde);
      }
      sombraBoneco.visible = !deitar;
      sombraBoneco.position.set(onde.x, (lugar?.y ?? 0) + 0.012, onde.z);

      // Balão com o que está fazendo
      const cabeca = proj(tmp.copy(onde).add(tmp2.set(0, deitar ? 0.6 : ALTO + 0.15, 0)));
      const chave = texto ? `${texto}|${Math.round(cabeca.x)}|${Math.round(cabeca.y)}` : '';
      if (chave !== ultimoBalao) { ultimoBalao = chave; setBalao(texto ? { x: cabeca.x, y: cabeca.y, texto } : null); }

      renderer.render(cena, camera);
    };
    laco();

    /* O que muda vindo do app */
    api.current = {
      setFoco: focar,
      setVisual: () => texturas.clear(),
      setDecoracao: () => {
        montarDecoracao();
        const moeda = objetos.find(o => o.id === 'moeda');
        if (moeda) moeda.grupo.visible = !p.current.achados.includes('dracma');
      },
      setAcao: a => {
        if (!a) return;
        const at = ATIVIDADES[a];
        fazer({ pose: at.pose, fones: at.fones, fechados: at.olhosFechados, texto: at.feito });
      },
      girar: d => { cam.giroDesejado += d; },
      zoom: f => { cam.distDesejada = THREE.MathUtils.clamp(cam.distDesejada * f, 7, 28); },
    };
    api.current.setDecoracao();
    (api.current as unknown as { usar: (o: Obj, a: Acao) => void }).usar = (o, a) => {
      andarAte(o.ponto, () => {
        if (a.alvo) {
          p.current.onUsar(a.alvo);
          if (a.alvo === 'segredo:dracma') o.grupo.visible = false;
          return;
        }
        if (a.pose || a.deitar) fazer({ pose: a.pose ?? 'baixo', texto: a.texto, lugar: a.lugar, deitar: a.deitar, fechados: a.fechados }, 10);
      });
    };

    return () => {
      vivo = false;
      cancelAnimationFrame(quadro);
      obs.disconnect();
      tela.removeEventListener('pointerdown', aoDescer);
      tela.removeEventListener('pointermove', aoMover);
      tela.removeEventListener('pointerup', aoSubir);
      tela.removeEventListener('pointercancel', aoSubir);
      tela.removeEventListener('wheel', aoRodar);
      renderer.dispose();
      tela.remove();
    };
  }, []);

  useEffect(() => { api.current?.setFoco(props.foco); }, [props.foco]);
  useEffect(() => { api.current?.setVisual(); }, [JSON.stringify(props.look), props.forma, props.humor]);
  useEffect(() => { api.current?.setDecoracao(); }, [JSON.stringify(props.casa), props.itens.join(','), props.achados.join(',')]);
  useEffect(() => { api.current?.setAcao(props.acao); }, [props.acao]);

  const usar = (o: Obj, a: Acao) => {
    setMenu(null);
    (api.current as unknown as { usar: (o: Obj, a: Acao) => void })?.usar(o, a);
  };
  const fonte = 'Archivo_700Bold, Archivo, system-ui, sans-serif';
  const botao: React.CSSProperties = {
    width: 42, height: 42, borderRadius: 21, border: '1.5px solid #EADFD3', background: '#FFFFFF', color: '#42124C',
    fontSize: 20, fontFamily: fonte, cursor: 'pointer', boxShadow: '0 4px 14px rgba(42,10,49,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  return (
    <div ref={raiz} style={{ position: 'absolute', inset: 0, overflow: 'hidden', userSelect: 'none', WebkitUserSelect: 'none' }}>
      <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button aria-label="Girar para a esquerda" style={botao} onClick={() => api.current?.girar(-Math.PI / 4)}>⟲</button>
        <button aria-label="Girar para a direita" style={botao} onClick={() => api.current?.girar(Math.PI / 4)}>⟳</button>
        <button aria-label="Aproximar" style={botao} onClick={() => api.current?.zoom(0.8)}>+</button>
        <button aria-label="Afastar" style={botao} onClick={() => api.current?.zoom(1.25)}>−</button>
      </div>
      {balao && (
        <div style={{
          position: 'absolute', left: balao.x, top: balao.y, transform: 'translate(-50%, -100%)', pointerEvents: 'none',
          background: '#FFFFFF', color: '#42124C', fontFamily: fonte, fontSize: 13, lineHeight: '18px', padding: '6px 12px', borderRadius: 14,
          boxShadow: '0 4px 14px rgba(42,10,49,0.15)', whiteSpace: 'nowrap',
        }}>{balao.texto}</div>
      )}
      {menu && (
        <div style={{
          position: 'absolute', left: Math.min(menu.x, (raiz.current?.clientWidth ?? 400) - 230), top: Math.max(10, menu.y - 20),
          display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start',
        }}>
          <div style={{ fontFamily: fonte, fontSize: 13, color: '#7D6A7F', background: 'rgba(255,255,255,0.92)', padding: '4px 10px', borderRadius: 10 }}>{menu.obj.nome}</div>
          {menu.obj.acoes.map(a => (
            <button
              key={a.rotulo}
              onClick={() => usar(menu.obj, a)}
              style={{
                fontFamily: fonte, fontSize: 15, lineHeight: '20px', padding: '10px 18px', borderRadius: 999, cursor: 'pointer',
                border: a.alvo?.startsWith('atividade') ? 'none' : '1.5px solid #EADFD3',
                background: a.alvo?.startsWith('atividade') ? '#FE0472' : '#FFFFFF', color: a.alvo?.startsWith('atividade') ? '#FFFFFF' : '#42124C',
                boxShadow: '0 6px 18px rgba(42,10,49,0.16)', whiteSpace: 'nowrap',
              }}
            >
              {a.rotulo}
            </button>
          ))}
          {!menu.obj.acoes.length && <div style={{ fontFamily: fonte, fontSize: 13, color: '#42124C', background: '#FFFFFF', padding: '8px 12px', borderRadius: 12 }}>Nada para fazer aqui.</div>}
        </div>
      )}
    </div>
  );
}
