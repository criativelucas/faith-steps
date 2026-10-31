// Boneco 3D (modelo feito no Blender: arte3d/boneco.py -> public/boneco.glb).
// O arquivo tem todas as peças; aqui ligamos as do visual da pessoa, pintamos e tocamos as animações.
import * as THREE from 'three';
import { clone as clonarEsqueleto } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CORES_OLHOS, CORES_ROUPA, type Look } from './personagem';

const URL_MODELO = (process.env.NODE_ENV === 'production' && process.env.EXPO_BASE_URL ? process.env.EXPO_BASE_URL.replace(/\/$/, '') + '/' : '') + 'boneco.glb?v=20261030-movimento3';
let modelo: Promise<GLTF> | null = null;
const carregar = () => (modelo ??= new GLTFLoader().loadAsync(URL_MODELO).catch(erro => { modelo = null; throw erro; }));

export type Animacao = 'parado' | 'andar' | 'sentado' | 'deitado' | 'orar' | 'ler' | 'mexer' | 'comer' | 'louvor' | 'exercicio' | 'correr' | 'pedalar' | 'cantar';
export type Expressao = { olhosFechados?: boolean; extras?: string[] };

// Pose do jogo (a mesma do desenho 2D) para animação e objetos na mão
const ANIMACAO: Record<string, Animacao> = { baixo: 'parado', andar: 'andar', cima: 'louvor', orar: 'orar', livro: 'ler', correr: 'correr', pedalar: 'pedalar', cantar: 'cantar', exercicio: 'exercicio', sentado: 'sentado', mexer: 'mexer', comer: 'comer' };
export const animacaoDe = (pose: string): Animacao => ANIMACAO[pose] ?? 'parado';
export const extrasDe = (pose: string, fones?: boolean, item?: string | null) => [
  ...(fones ? ['extra_fones', 'extra_fones_arco'] : []),
  ...((pose === 'livro' || item === 'livro') ? ['extra_livro', 'extra_livro_paginas'] : []),
];

// Objetos que o boneco segura durante as ações
export type ItemMao = 'violao' | 'livro' | 'copo' | 'escova' | 'regador' | 'microfone' | 'maca' | 'colher' | 'halteres' | 'baquetas' | 'frigideira' | 'coco';
const matItem = (cor: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.6, ...extra });
const pecaItem = (g: THREE.Object3D, geo: THREE.BufferGeometry, cor: string, x = 0, y = 0, z = 0, extra?: THREE.MeshStandardMaterialParameters) => {
  const m = new THREE.Mesh(geo, matItem(cor, extra));
  m.position.set(x, y, z);
  m.castShadow = true;
  g.add(m);
  return m;
};
// Livro / Bíblia aberta nas mãos: virado para o rosto do personagem (Y = PI, X = -0.85) com capa vinho, páginas brancas abertas e marcador dourado
function criarLivro() {
  const g = new THREE.Group();
  const inclinado = new THREE.Group();
  inclinado.rotation.set(-0.85, Math.PI, 0, 'YXZ');
  g.add(inclinado);
  // Lombada central
  pecaItem(inclinado, new THREE.BoxGeometry(0.024, 0.17, 0.022), '#6E1423', 0, 0, 0);
  // Duas metades abertas (capa externa + páginas brancas abertas para o personagem + linhas de texto)
  for (const s of [-1, 1]) {
    const lado = new THREE.Group();
    lado.position.set(s * 0.01, 0, 0);
    lado.rotation.y = -s * 0.28;
    inclinado.add(lado);
    pecaItem(lado, new THREE.BoxGeometry(0.115, 0.168, 0.014), '#8B1E2F', s * 0.058, 0, -0.004);
    pecaItem(lado, new THREE.BoxGeometry(0.106, 0.156, 0.016), '#FFFDF7', s * 0.055, 0, 0.006);
    for (const dy of [-0.045, -0.015, 0.015, 0.045]) {
      pecaItem(lado, new THREE.BoxGeometry(0.076, 0.006, 0.004), '#C7B8A6', s * 0.055, dy, 0.015);
    }
  }
  // Fita marcadora dourada
  pecaItem(inclinado, new THREE.BoxGeometry(0.012, 0.06, 0.006), '#F2C94C', 0.015, -0.08, 0.012);
  g.position.set(0, 0.04, 0.25); // relativo ao osso do tronco (0, 0.74, 0)
  return g;
}
// Violão: preso ao tronco, bojo no lado direito (-X) e braço subindo para a mão esquerda (+X)
function criarViolao() {
  const g = new THREE.Group();
  const corpo = new THREE.Group();
  corpo.rotation.z = -1.1;
  corpo.rotation.y = 0.12;
  g.add(corpo);
  const bojo = (r: number, y: number) => { const m = pecaItem(corpo, new THREE.CylinderGeometry(r, r, 0.075, 22), '#C98A4B', 0, y, 0); m.rotation.x = Math.PI / 2; return m; };
  bojo(0.15, 0);
  bojo(0.115, 0.17);
  const boca = pecaItem(corpo, new THREE.CylinderGeometry(0.045, 0.045, 0.01, 16), '#2A1408', 0, 0.09, 0.04);
  boca.rotation.x = Math.PI / 2;
  pecaItem(corpo, new THREE.BoxGeometry(0.1, 0.025, 0.012), '#3A2010', 0, -0.06, 0.04);
  pecaItem(corpo, new THREE.BoxGeometry(0.045, 0.4, 0.03), '#5A3418', 0, 0.42, 0.01);
  pecaItem(corpo, new THREE.BoxGeometry(0.07, 0.12, 0.03), '#2A1408', 0, 0.67, 0.005);
  for (const x of [-0.012, 0, 0.012]) pecaItem(corpo, new THREE.BoxGeometry(0.003, 0.62, 0.003), '#EDEDED', x, 0.3, 0.045);
  g.position.set(-0.05, -0.06, 0.22); // relativo ao osso do tronco (0, 0.74, 0)
  return g;
}
function criarItemMao(nome: ItemMao): THREE.Group {
  const g = new THREE.Group();
  if (nome === 'copo') {
    pecaItem(g, new THREE.CylinderGeometry(0.035, 0.028, 0.09, 14), '#DDF0FF', 0, 0.02, 0, { transparent: true, opacity: 0.75 });
    pecaItem(g, new THREE.CylinderGeometry(0.03, 0.026, 0.06, 14), '#8FD3FF', 0, 0.005, 0);
  } else if (nome === 'escova') {
    const cabo = pecaItem(g, new THREE.BoxGeometry(0.018, 0.16, 0.014), '#3FA9F5', 0, 0.05, 0);
    cabo.rotation.x = -0.5;
    pecaItem(g, new THREE.BoxGeometry(0.02, 0.035, 0.02), '#FFFFFF', 0, 0.12, 0.04).rotation.x = -0.5;
  } else if (nome === 'microfone') {
    pecaItem(g, new THREE.CylinderGeometry(0.018, 0.012, 0.13, 12), '#2A2A30', 0, 0.03, 0);
    pecaItem(g, new THREE.SphereGeometry(0.035, 14, 10), '#9AA0A8', 0, 0.11, 0, { metalness: 0.5, roughness: 0.4 });
  } else if (nome === 'maca') {
    pecaItem(g, new THREE.SphereGeometry(0.042, 14, 10), '#E0302C', 0, 0.03, 0.01);
    pecaItem(g, new THREE.CylinderGeometry(0.004, 0.004, 0.025, 6), '#5A3418', 0, 0.075, 0.01);
  } else if (nome === 'colher') {
    const cabo = pecaItem(g, new THREE.BoxGeometry(0.016, 0.22, 0.01), '#C9A06A', 0, 0.06, 0.02);
    cabo.rotation.x = 0.7;
    pecaItem(g, new THREE.SphereGeometry(0.03, 10, 8), '#C9A06A', 0, -0.02, 0.1).scale.set(1, 0.4, 1.3);
  } else if (nome === 'regador') {
    pecaItem(g, new THREE.CylinderGeometry(0.07, 0.08, 0.13, 16), '#4FA36B', 0, -0.1, 0.06);
    const bico = pecaItem(g, new THREE.CylinderGeometry(0.012, 0.016, 0.2, 8), '#4FA36B', 0, -0.06, 0.18);
    bico.rotation.x = 1.0;
    const alca = pecaItem(g, new THREE.TorusGeometry(0.05, 0.01, 6, 14, Math.PI), '#3C8456', 0, -0.03, 0.03);
    alca.rotation.y = Math.PI / 2;
  } else if (nome === 'halteres') {
    const barra = pecaItem(g, new THREE.CylinderGeometry(0.012, 0.012, 0.16, 8), '#3A3A40', 0, 0, 0.01);
    barra.rotation.z = Math.PI / 2;
    for (const x of [-0.07, 0.07]) { const p = pecaItem(g, new THREE.CylinderGeometry(0.035, 0.035, 0.04, 12), '#FE0472', x, 0, 0.01); p.rotation.z = Math.PI / 2; }
  } else if (nome === 'baquetas') {
    const b = pecaItem(g, new THREE.CylinderGeometry(0.005, 0.008, 0.24, 8), '#E0C090', 0, 0.02, 0.08);
    b.rotation.x = 1.25;
  } else if (nome === 'frigideira') {
    // Cabo longo ergonômico estendido para a mão segurar
    const cabo = pecaItem(g, new THREE.BoxGeometry(0.02, 0.18, 0.016), '#1F1F24', 0, 0.04, -0.08);
    cabo.rotation.x = 0.55;
    // Frigideira: metal escuro com fundo e borda elevada
    const panX = 0, panY = -0.01, panZ = 0.12;
    const basePan = pecaItem(g, new THREE.CylinderGeometry(0.11, 0.096, 0.026, 20), '#282830', panX, panY, panZ, { metalness: 0.6, roughness: 0.35 });
    basePan.rotation.x = 0.15;
    const fundo = pecaItem(g, new THREE.CylinderGeometry(0.092, 0.092, 0.006, 20), '#18181E', panX, panY + 0.012, panZ, { metalness: 0.5, roughness: 0.4 });
    fundo.rotation.x = 0.15;
    // Comida saborosa fritando: clara de ovo branca + gema dourada
    const clara = pecaItem(g, new THREE.CylinderGeometry(0.06, 0.068, 0.005, 14), '#FFFFFF', panX - 0.01, panY + 0.016, panZ);
    clara.rotation.x = 0.15;
    const gema = pecaItem(g, new THREE.SphereGeometry(0.024, 12, 8), '#FFB200', panX - 0.008, panY + 0.022, panZ);
    gema.scale.set(1, 0.55, 1);
    gema.rotation.x = 0.15;
    // Fumacinha realista saindo da frigideira: puffs translúcidos que sobem e desvanecem
    const fumacas: { mesh: THREE.Mesh; fase: number; vel: number; dx: number; dz: number }[] = [];
    const matFumaca = new THREE.MeshStandardMaterial({
      color: '#FFFFFF', transparent: true, opacity: 0.5, roughness: 0.95, depthWrite: false,
    });
    for (let k = 0; k < 6; k++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), matFumaca.clone());
      m.position.set(panX, panY + 0.03, panZ);
      m.castShadow = false;
      g.add(m);
      fumacas.push({
        mesh: m,
        fase: k * 0.166,
        vel: 0.38 + (k % 3) * 0.08,
        dx: (k % 2 === 0 ? 1 : -1) * (0.016 + (k % 4) * 0.005),
        dz: (k % 3 === 0 ? 1 : -1) * 0.012,
      });
    }
    g.userData.fumacas = fumacas;
    g.userData.panCenter = { x: panX, y: panY, z: panZ };
  } else if (nome === 'coco') {
    // Coco verde geladinho com água de coco e canudinho listrado
    const cocoVerde = pecaItem(g, new THREE.SphereGeometry(0.046, 14, 12), '#4C9A2A', 0, 0.02, 0);
    cocoVerde.scale.set(1, 1.1, 1);
    // Polpa branca e abertura no topo
    pecaItem(g, new THREE.CylinderGeometry(0.024, 0.024, 0.008, 12), '#FAF7EE', 0, 0.068, 0);
    // Canudo inclinado
    const canudo = pecaItem(g, new THREE.CylinderGeometry(0.0035, 0.0035, 0.08, 8), '#FE0472', 0.008, 0.09, 0.004);
    canudo.rotation.z = -0.35;
  }
  return g;
}

// Nome da peça sem o lado (_L/_R) e sem o número que o carregador põe em nomes repetidos
const base = (nome: string) => nome.replace(/_\d+$/, '').replace(/_(L|R)$/, '');

const PECAS_BASE = ['cabeca', 'pescoco', 'tronco', 'quadril_roupa', 'ombro', 'braco', 'antebraco', 'mao', 'coxa', 'canela', 'orelha', 'orelha_dentro', 'bochecha', 'punho'];
const OLHOS: Record<string, string[]> = {
  pontinho: ['olho_pontinho', 'olho_pontinho_brilho'],
  grande: ['olho_grande', 'olho_grande_iris', 'olho_grande_pupila', 'olho_grande_brilho'],
  amendoado: ['olho_amendoado', 'olho_amendoado_iris', 'olho_amendoado_pupila', 'olho_amendoado_palpebra'],
  sorridente: ['olho_sorridente'],
  fechado: ['olho_fechado'],
};
const TOPO: Record<string, string[]> = {
  moletom: ['extra_capuz', 'extra_cordao', 'extra_bolso'],
  camiseta: [],
  regata: [],
  camisa: ['extra_gola', 'extra_botoes_camisa'],
  polo: ['extra_gola', 'extra_botoes_polo'],
  jaqueta: ['extra_camisa_interna', 'extra_lapelas'],
  blazer: ['extra_camisa_interna', 'extra_gravata', 'extra_lapelas'],
  blusa: ['extra_babado'],
  vestido: ['extra_vestido_saia'],
  vestidoLongo: ['extra_vestido_longo_saia'],
  tunicaCoral: ['extra_gola', 'extra_vestido_saia'],
  camisetaConf: ['extra_estampa_conf'],
  moletomPaz: ['extra_capuz', 'extra_cordao', 'extra_bolso', 'extra_estampa_paz'],
};
const BAIXO: Record<string, string[]> = {
  calca: [],
  calcaSocial: ['extra_cinto'],
  bermuda: [],
  saia: ['extra_saia'],
  saiaLonga: ['extra_saia_longa'],
  macacaoJardim: ['extra_cinto', 'extra_macacao', 'extra_macacao_bolso'],
  pijamaOvelha: ['extra_pijama'],
};
// Fantasias (mesma configuração de arte3d/boneco.py). cores: cima, cima claro, cima escuro, baixo, calçado
type Fantasia = { cabelo?: 'esconde' | 'compacto'; rosto?: false; saia?: boolean; pe: string; luvas?: string; cores: [string, string, string, string, string] };
const FANTASIAS: Record<string, Fantasia> = {
  cavaleiro: { cabelo: 'esconde', pe: 'botinha', cores: ['#AEB6C2', '#D6DCE4', '#7E8794', '#8F97A3', '#9AA2AE'] },
  pastor: { cabelo: 'esconde', pe: 'sandalia', cores: ['#8B6B4E', '#A8876A', '#6B4E36', '#5A412C', '#6E4A2E'] },
  rei: { cabelo: 'compacto', pe: 'sapato', cores: ['#6A2A8C', '#8E4FB0', '#4A1A63', '#36134A', '#E8B83A'] },
  ester: { cabelo: 'compacto', pe: 'sapatilha', saia: true, cores: ['#C95B9E', '#E384BE', '#9A2B6E', '#9A2B6E', '#E8B83A'] },
  pescador: { cabelo: 'compacto', pe: 'botinha', cores: ['#3E6FA8', '#6A93C6', '#2A4F80', '#3A4A66', '#3F5A3A'] },
  anjo: { pe: 'sandalia', saia: true, cores: ['#F7F4EE', '#FFFFFF', '#E6DFD2', '#E6DFD2', '#E8B83A'] },
  pirata: { cabelo: 'compacto', pe: 'botinha', cores: ['#B3203A', '#D4475F', '#7A1426', '#2A2230', '#5E3A26'] },
  viking: { cabelo: 'esconde', pe: 'botinha', cores: ['#5B7FA6', '#7E9EC0', '#3F5E80', '#6B4A32', '#5E3A26'] },
  robo: { cabelo: 'esconde', rosto: false, pe: 'botinha', luvas: '#8F96A0', cores: ['#A9B0BA', '#C9CED6', '#7B838F', '#8F96A0', '#7B838F'] },
  mineiro: { cabelo: 'compacto', pe: 'botinha', luvas: '#F2F2F2', cores: ['#F07A22', '#FF9A4A', '#B85512', '#2F5B9A', '#3A2A30'] },
  jose: { cabelo: 'compacto', pe: 'sandalia', saia: true, cores: ['#E65100', '#FFB300', '#1E88E5', '#8E24AA', '#6E4A2E'] },
  tunicaFestiva: { cabelo: 'compacto', pe: 'sandalia', saia: true, cores: ['#F5EFE6', '#FFFFFF', '#D4AF37', '#C5A059', '#8B6B4E'] },
  domingo: { pe: 'sapato', cores: ['#1E3A5F', '#3B6998', '#102542', '#1B263B', '#2A1E17'] },
};
const ROSTO = ['cabeca', 'orelha', 'orelha_dentro', 'bochecha'];
const MAOS_LIVRES = new Set<Animacao>(['parado', 'andar']); // espada, escudo, harpa... só aparecem parado ou andando

const SAPATOS = ['pe_tenis', 'pe_social', 'pe_botinha', 'pe_aberto_tira', 'pe_sapatilha']; // partes que pegam a cor do calçado
const PES: Record<string, string[]> = {
  tenis: ['pe_tenis', 'pe_tenis_sola'],
  sapato: ['pe_social'],
  botinha: ['pe_botinha'],
  sandalia: ['pe_aberto', 'pe_aberto_sola', 'pe_aberto_tira'],
  chinelo: ['pe_aberto', 'pe_aberto_sola', 'pe_aberto_tira'],
  sapatilha: ['pe_sapatilha'],
  salto: ['pe_sapatilha', 'pe_salto_tacao'],
  pantufa: ['pe_ovelha', 'pe_ovelha_rosto', 'pe_tenis_sola'],
};

export type Boneco = {
  objeto: THREE.Group;
  descartar: () => void;
  vestir: (look: Look, forma: number, humor: string) => void;
  expressao: (e: Expressao) => void;
  animar: (nome: Animacao, velocidade?: number) => void;
  atualizar: (dt: number) => void;
  segurar: (item: ItemMao | null | undefined) => void;
};

export async function criarBoneco(): Promise<Boneco> {
  const gltf = await carregar();
  const objeto = clonarEsqueleto(gltf.scene) as THREE.Group;
  const pecas = new Map<string, THREE.Mesh[]>();
  const mats: Record<string, THREE.MeshStandardMaterial> = {};
  objeto.traverse(o => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    // Own geometry as well as materials: closing a preview must not dispose the cached GLTF.
    m.geometry = m.geometry.clone();
    m.castShadow = true;
    m.receiveShadow = true;
    // Cada boneco tem os próprios materiais (para pintar sem afetar outro)
    const mat = m.material as THREE.MeshStandardMaterial;
    mats[mat.name] ??= mat.clone();
    m.material = mats[mat.name];
    const n = base(m.name);
    pecas.set(n, [...(pecas.get(n) ?? []), m]);
  });
  for (const nomeBarba of ['extra_barba_curta', 'extra_barba_cheia']) {
    pecas.get(nomeBarba)?.forEach(m => {
      m.geometry.computeVertexNormals();
      // Leve offset frontal e escala para acompanhar a mandíbula sem clipar na boca ou bochechas
      // Preserve the GLTF bind transform. Scale around the beard's own center,
      // never the skeleton origin (which moves the beard away from the jaw).
      m.geometry.computeBoundingBox();
      m.userData.barbaCentro = m.geometry.boundingBox!.getCenter(new THREE.Vector3());
      m.userData.barbaPosicao = m.position.clone();
      m.userData.barbaEscala = m.scale.clone();
    });
  }

  // Ajuste de rugosidade dos materiais de pele e cabelo.
  if (mats.pele) {
    mats.pele.roughness = 0.52;
    mats.pele.metalness = 0.02;
  }
  if (mats.cabelo) {
    mats.cabelo.roughness = 0.64;
    mats.cabelo.metalness = 0.08;
    mats.cabelo.polygonOffset = true;
    mats.cabelo.polygonOffsetFactor = -1;
    mats.cabelo.polygonOffsetUnits = -1;
  }
  // Calçado pintado: material próprio, para não mudar os fones (que usam o mesmo verde do tênis)
  mats.calcado = mats.lima.clone();
  const original = new Map<THREE.Mesh, THREE.Material>();
  for (const n of SAPATOS) pecas.get(n)?.forEach(m => original.set(m, m.material as THREE.Material));
  const mixer = new THREE.AnimationMixer(objeto);
  const clipes = new Map<string, THREE.AnimationClip>();
  for (const c of gltf.animations) clipes.set(c.name, c);
  const baseSentado = clipes.get('sentado');
  if (baseSentado) {
    const pernasSentado = baseSentado.tracks.filter(t => t.name === 'tronco.position' || /^(coxa|canela)_/.test(t.name));
    for (const sub of ['ler', 'orar', 'mexer', 'comer'] as const) {
      const orig = clipes.get(sub);
      if (!orig) continue;
      const troncoBracos = orig.tracks.filter(t => t.name !== 'tronco.position' && !/^(coxa|canela)_/.test(t.name));
      clipes.set(`sentado_${sub}`, new THREE.AnimationClip(`sentado_${sub}`, orig.duration, [...pernasSentado, ...troncoBracos]));
    }
  }
  let atual: THREE.AnimationAction | null = null;
  let ultimo: { look: Look; forma: number; humor: string } | null = null;
  let exp: Expressao = {};
  let animacao: Animacao = 'parado';
  mats.luva = mats.pele.clone();

  // Itens nas mãos: violão e livro aberto vão presos ao tronco; os outros acompanham a mão
  let ossoTronco: THREE.Object3D | null = null;
  const maos: { D?: THREE.Mesh; E?: THREE.Mesh } = {};
  objeto.traverse(o => {
    if ((o as THREE.Bone).isBone && base(o.name) === 'tronco' && !ossoTronco) ossoTronco = o;
    const m = o as THREE.Mesh;
    if (m.isMesh && base(m.name) === 'mao') {
      m.geometry.computeBoundingBox();
      if (/_R(_\d+)?$/.test(m.name)) maos.D = m; else maos.E = m;
    }
  });
  let itemAtual: ItemMao | null = null;
  const naMao: { obj: THREE.Object3D; mao: 'D' | 'E' }[] = [];
  let violao: THREE.Group | null = null;
  let livro: THREE.Group | null = null;
  const tmpMao = new THREE.Vector3();
  const atualizarLivro = () => {
    const mostrar = itemAtual === 'livro' || animacao === 'ler' || !!exp.extras?.includes('extra_livro');
    if (mostrar && !livro) {
      livro = criarLivro();
      (ossoTronco ?? objeto).add(livro);
    }
    if (livro) livro.visible = mostrar;
  };
  const segurar = (item: ItemMao | null | undefined) => {
    const novo = item ?? null;
    if (novo === itemAtual) {
      atualizarLivro();
      return;
    }
    itemAtual = novo;
    for (const n of naMao) {
      n.obj.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); (Array.isArray(m.material) ? m.material : [m.material]).forEach(mt => mt.dispose()); } });
      n.obj.removeFromParent();
    }
    naMao.length = 0;
    if (violao) violao.visible = false;
    atualizarLivro();
    if (novo === 'violao') {
      if (!violao) { violao = criarViolao(); (ossoTronco ?? objeto).add(violao); }
      violao.visible = true;
    } else if (novo === 'halteres' || novo === 'baquetas') {
      for (const mao of ['D', 'E'] as const) { const o = criarItemMao(novo); objeto.add(o); naMao.push({ obj: o, mao }); }
    } else if (novo && novo !== 'livro') {
      const o = criarItemMao(novo);
      objeto.add(o);
      naMao.push({ obj: o, mao: 'D' });
    }
  };
  const moverItens = (dt: number) => {
    if (!naMao.length) return;
    objeto.updateMatrixWorld(true);
    for (const n of naMao) {
      const m = maos[n.mao];
      if (m?.geometry.boundingBox) {
        m.geometry.boundingBox.getCenter(tmpMao);
        m.localToWorld(tmpMao);
        objeto.worldToLocal(tmpMao);
        n.obj.position.set(tmpMao.x, tmpMao.y - 0.02, tmpMao.z + 0.02);
      }
      // Anima partículas de fumacinha (frigideira)
      const fumacas = n.obj.userData.fumacas as { mesh: THREE.Mesh; fase: number; vel: number; dx: number; dz: number }[] | undefined;
      const pc = n.obj.userData.panCenter as { x: number; y: number; z: number } | undefined;
      if (fumacas && pc) {
        for (const f of fumacas) {
          f.fase = (f.fase + dt * f.vel) % 1;
          const prog = f.fase;
          const y = pc.y + 0.025 + prog * 0.28;
          const osc = Math.sin(prog * Math.PI * 3);
          f.mesh.position.set(pc.x + f.dx * osc, y, pc.z + f.dz * osc);
          const esc = 0.5 + prog * 1.6;
          f.mesh.scale.setScalar(esc);
          const mat = f.mesh.material as THREE.MeshStandardMaterial;
          mat.opacity = prog < 0.2 ? (prog / 0.2) * 0.55 : (1 - prog) * 0.6;
        }
      }
    }
  };

  const aplicar = () => {
    if (!ultimo) return;
    const { look, forma, humor } = ultimo;
    const fem = look.corpo === 'feminino';
    const f = look.fantasia ? FANTASIAS[look.fantasia] : undefined;
    const topo = look.topo ?? 'moletom', baixo = look.baixo ?? 'calca', calcado = f?.pe ?? look.calcado ?? 'tenis';
    const vestido = !f && (topo === 'vestido' || topo === 'vestidoLongo');
    const fechados = !!exp.olhosFechados;
    const comRosto = f?.rosto !== false;

    const liga = new Set<string>(PECAS_BASE);
    if (!comRosto) ROSTO.forEach(p => liga.delete(p));
    if (comRosto) {
      for (const p of OLHOS[fechados ? 'fechado' : look.olhos ?? 'pontinho'] ?? OLHOS.pontinho) liga.add(p);
      liga.add(`sob_${look.sobrancelha ?? (fem ? 'arqueada' : 'grossa')}`);
      liga.add(`nariz_${look.nariz ?? 'pequeno'}`);
      const boca = fechados ? 'calma' : humor === 'radiante' ? 'aberta' : humor === 'abatido' ? 'triste' : 'sorriso';
      liga.add(`boca_${boca}`);
      if (boca === 'aberta') liga.add('boca_aberta_lingua');
      if (fem) liga.add('extra_cilios');
      else if (look.barba && look.barba !== 'nenhuma') liga.add(`extra_barba_${look.barba}`);
      if (look.oculos) liga.add('extra_oculos');
      if (look.sardas) liga.add('extra_sardas');
    }
    // Cabelo: algumas fantasias cobrem a cabeça; com chapéu, o cabelo fica curtinho para caber
    const cabelo = f?.cabelo === 'esconde' ? null : f?.cabelo === 'compacto' ? (fem ? 'longo' : 'curto') : look.cabelo;
    if (cabelo && comRosto) liga.add(`cabelo_${cabelo}`);
    if (cabelo === 'rabo') liga.add('extra_rabo_laco');
    if (f) {
      if (f.saia) liga.add('extra_vestido_longo_saia');
      if(look.fantasia==='domingo') for(const p of ['extra_camisa_interna','extra_gravata','extra_lapelas']) liga.add(p);
      const maosLivres = MAOS_LIVRES.has(animacao) && !itemAtual && !livro?.visible;
      for (const nome of pecas.keys()) if (nome.startsWith(`fant_${look.fantasia}_`) && (maosLivres || !nome.includes('_mao_'))) liga.add(nome);
    } else {
      for (const p of TOPO[topo] ?? []) liga.add(p);
      if (!vestido) for (const p of BAIXO[baixo] ?? []) liga.add(p);
    }
    if (!f && baixo === 'macacaoJardim') for (const nome of ['extra_estampa_paz','extra_estampa_conf','extra_bolso','extra_cordao']) liga.delete(nome);
    for (const p of PES[calcado] ?? PES.tenis) liga.add(p);
    for (const p of exp.extras ?? []) if (p !== 'extra_livro' && p !== 'extra_livro_paginas') liga.add(p);
    for (const [nome, ms] of pecas) for (const m of ms) m.visible = liga.has(nome);

    // Cores
    const cima = f ? [f.cores[1], f.cores[0], f.cores[2]] : CORES_ROUPA[humor === 'abatido' ? 'apagado' : look.corTopo ?? look.moletom] ?? CORES_ROUPA.pink;
    const deBaixo = f ? [f.cores[3], f.cores[3], f.cores[3]] : CORES_ROUPA[look.corBaixo ?? 'ameixa'] ?? CORES_ROUPA.ameixa;
    const pinta = (nome: string, cor: string) => mats[nome]?.color.set(cor);
    pinta('pele', look.pele);
    pinta('pele_sombra', '#' + new THREE.Color(look.pele).lerp(new THREE.Color('#7a2a3a'), 0.3).getHexString());
    pinta('cabelo', look.corCabelo);
    pinta('cima', cima[1]);
    pinta('cima_claro', cima[0]);
    pinta('cima_escuro', cima[2]);
    pinta('baixo', deBaixo[1]);
    pinta('iris', look.corOlhos ?? CORES_OLHOS[0]);
    pinta('boca', fem ? '#98565D' : '#815043');
    pinta('bochecha', '#' + new THREE.Color(look.pele).lerp(new THREE.Color('#CF7B76'), 0.22).getHexString());
    const corPe = f ? f.cores[4] : look.corCalcado ? CORES_ROUPA[look.corCalcado]?.[1] : undefined;
    if (corPe) mats.calcado.color.set(corPe);
    for (const [m, mt] of original) m.material = corPe ? mats.calcado : mt;

    // Mangas, pernas e quadril viram pele conforme a roupa
    const pele = new Set<string>();
    if (!f) {
    if (['camiseta', 'camisetaConf', 'polo', 'blusa', 'vestido', 'vestidoLongo'].includes(topo)) { pele.add('antebraco'); pele.add('punho'); }
    if (topo === 'regata') ['ombro', 'braco', 'antebraco', 'punho'].forEach(p => pele.add(p));
    if (vestido || baixo === 'saia' || baixo === 'saiaLonga') { pele.add('coxa'); pele.add('canela'); }
    if (!vestido && baixo === 'bermuda') pele.add('canela');
    }
    const vestirPeca = (nome: string, roupa: THREE.Material) => pecas.get(nome)?.forEach(m => { m.material = pele.has(nome) ? mats.pele : roupa; });
    for (const n of ['ombro', 'braco', 'antebraco']) vestirPeca(n, mats.cima);
    vestirPeca('punho', mats.cima_claro);
    pecas.get('punho')?.forEach(m => { m.visible = !pele.has('punho'); });
    vestirPeca('coxa', mats.baixo);
    vestirPeca('canela', mats.baixo);
    pecas.get('quadril_roupa')?.forEach(m => { m.material = vestido || topo === 'tunicaCoral' || f?.saia ? mats.cima : mats.baixo; });
    // Luvas (robô, mineiro) e pescoço de metal (robô)
    if (f?.luvas) mats.luva.color.set(f.luvas);
    pecas.get('mao')?.forEach(m => { m.material = f?.luvas ? mats.luva : mats.pele; });
    pecas.get('pescoco')?.forEach(m => { m.material = comRosto ? mats.pele : mats.cima_escuro; });

    // Formas do corpo e do rosto
    const morph = (nome: string, valores: Record<string, number>) => pecas.get(nome)?.forEach(m => {
      if (!m.morphTargetDictionary || !m.morphTargetInfluences) return;
      for (const [k, v] of Object.entries(valores)) {
        const i = m.morphTargetDictionary[k];
        if (i !== undefined) m.morphTargetInfluences[i] = v;
      }
    });
    const formaSegura = THREE.MathUtils.clamp(forma, 0, 100);
    morph('tronco', { feminino: fem ? 1 : 0, cheinho: Math.max(0, (50 - formaSegura) / 50), atletico: Math.max(0, (formaSegura - 50) / 50) });
    morph('cabeca', { redondo: look.rosto === 'redondo' ? 1 : 0, quadrado: look.rosto === 'quadrado' ? 1 : 0, coracao: look.rosto === 'coracao' ? 1 : 0 });
    const escalaRostoX = look.rosto === 'redondo' ? 1.06 : look.rosto === 'quadrado' ? 1.05 : 1.035;
    const escalaRostoZ = look.rosto === 'coracao' ? 1.02 : 1.045;
    for (const nomeBarba of ['extra_barba_curta', 'extra_barba_cheia']) {
      pecas.get(nomeBarba)?.forEach(m => {
        const centro = m.userData.barbaCentro as THREE.Vector3;
        const escala = m.userData.barbaEscala as THREE.Vector3;
        m.scale.copy(escala).multiply(new THREE.Vector3(escalaRostoX, 1.02, escalaRostoZ));
        const compensacao = centro.clone().multiply(escala.clone().sub(m.scale)).applyQuaternion(m.quaternion);
        m.position.copy(m.userData.barbaPosicao).add(compensacao);
      });
    }
  };

  let descartado = false;
  return {
    objeto,
    descartar: () => {
      if (descartado) return;
      descartado = true;
      mixer.stopAllAction(); mixer.uncacheRoot(objeto);
      const materiais = new Set<THREE.Material>(Object.values(mats));
      objeto.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); (Array.isArray(m.material) ? m.material : [m.material]).forEach(mt => materiais.add(mt)); } });
      materiais.forEach(mt => mt.dispose()); objeto.removeFromParent();
    },
    vestir: (look, forma, humor) => { ultimo = { look, forma, humor }; aplicar(); },
    expressao: e => {
      if (JSON.stringify(e) === JSON.stringify(exp)) return;
      exp = e;
      atualizarLivro();
      aplicar();
    },
    animar: (nome, velocidade = 1) => {
      const livresAntes = MAOS_LIVRES.has(animacao);
      animacao = nome;
      atualizarLivro();
      let clipeNome: string = nome;
      if (nome === 'sentado') {
        if (itemAtual === 'livro' || exp.extras?.includes('extra_livro')) clipeNome = 'sentado_ler';
        else if (itemAtual === 'violao' || itemAtual === 'baquetas') clipeNome = 'sentado_mexer';
        else if (itemAtual === 'copo' || itemAtual === 'maca' || itemAtual === 'colher' || itemAtual === 'frigideira') clipeNome = 'sentado_comer';
        else if (exp.olhosFechados) clipeNome = 'sentado_orar';
      }
      const clip = clipes.get(clipeNome) ?? clipes.get(nome);
      if (!clip) return;
      const acao = mixer.clipAction(clip);
      acao.timeScale = velocidade;
      if (acao !== atual) {
        acao.reset().fadeIn(0.25).play();
        atual?.fadeOut(0.25);
        atual = acao;
      }
      if (ultimo?.look.fantasia && livresAntes !== MAOS_LIVRES.has(nome)) aplicar();
    },
    atualizar: dt => { mixer.update(dt); moverItens(dt); },
    segurar,
  };
}
