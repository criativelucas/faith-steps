// Personagem chibi no estilo KayKit (CC0, preparado em arte3d/corpo_chibi.py -> public/corpo_m.glb e corpo_f.glb).
// Mesma interface do boneco antigo (Boneco): o resto do jogo não muda. Cada arquivo traz o corpo, olhos (abertos e
// fechados), sobrancelhas, 7 cabelos, barbas e as roupas em "cascas" que acompanham o corpo; aqui ligamos e pintamos.
import * as THREE from 'three';
import { clone as clonarEsqueleto } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CORES_ROUPA, type Look } from './personagem';
import { FANTASIAS, criarItemMao, criarLivro, criarViolao, type Animacao, type Boneco, type Expressao, type ItemMao } from './boneco3d';

const prefixo = process.env.NODE_ENV === 'production' && process.env.EXPO_BASE_URL ? process.env.EXPO_BASE_URL.replace(/\/$/, '') + '/' : '';
const cache: Partial<Record<'m' | 'f', Promise<GLTF>>> = {};
const carregar = (s: 'm' | 'f') => (cache[s] ??= new GLTFLoader().loadAsync(`${prefixo}corpo_${s}.glb?v=20261103`).catch(e => { delete cache[s]; throw e; }));

// Cabelos do jogo -> os 7 do modelo
const CABELO: Record<string, string> = {
  curto: 'curto', topete: 'curto', lateral: 'curto', raspado: 'raspado', moicano: 'raspado', crespo: 'raspado', black: 'tigela',
  longo: 'longo', ondulado: 'longo', franja: 'tigela', chanel: 'liso', rabo: 'rabo', trancas: 'rabo', dreads: 'liso', cacheado: 'coque', coque: 'coque',
};
const CIMA: Record<string, string> = { regata: 'roupa_regata', camiseta: 'roupa_curta', camisetaConf: 'roupa_curta', polo: 'roupa_curta', blusa: 'roupa_curta', tunicaCoral: 'roupa_curta', vestido: 'roupa_curta', vestidoLongo: 'roupa_curta' };
const SAIA_VESTIDO: Record<string, string> = { vestido: 'roupa_vestido_saia', vestidoLongo: 'roupa_vestido_longo_saia', tunicaCoral: 'roupa_vestido_saia' };
const BAIXO: Record<string, string> = { bermuda: 'roupa_bermuda', saia: 'roupa_saia', saiaLonga: 'roupa_saia_longa' };
const PES_ABERTOS = new Set(['sandalia', 'chinelo']);
const nomeBase = (n: string) => n.replace(/[._]\d+$/, '');

type Corpo = { s: 'm' | 'f'; objeto: THREE.Group; pecas: Map<string, THREE.Mesh>; mats: Record<string, THREE.MeshStandardMaterial>; mixer: THREE.AnimationMixer; clipes: Map<string, THREE.AnimationClip>; ossos: Map<string, THREE.Object3D> };

async function montar(s: 'm' | 'f'): Promise<Corpo> {
  const gltf = await carregar(s);
  const objeto = clonarEsqueleto(gltf.scene) as THREE.Group;
  const pecas = new Map<string, THREE.Mesh>(), mats: Record<string, THREE.MeshStandardMaterial> = {}, ossos = new Map<string, THREE.Object3D>();
  objeto.traverse(o => {
    if ((o as THREE.Bone).isBone) ossos.set(o.name, o);
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.castShadow = m.receiveShadow = true;
    if ((m as THREE.SkinnedMesh).isSkinnedMesh) m.frustumCulled = false;
    const mat = m.material as THREE.MeshStandardMaterial, nm = nomeBase(mat.name);
    mats[nm] ??= mat.clone();
    mats[nm].vertexColors = false; // a base traz cores de vértice que não usamos (deixavam a saia preta)
    m.material = mats[nm];
    pecas.set(nomeBase(m.name), m);
  });
  for (const nm of ['cabelo', 'sobrancelha']) if (mats[nm]) { mats[nm].alphaTest = 0.4; mats[nm].transparent = false; mats[nm].side = THREE.DoubleSide; }
  if (mats.pele) { mats.pele.roughness = 0.55; mats.pele.metalness = 0; }
  const clipes = new Map<string, THREE.AnimationClip>();
  for (const c of gltf.animations) clipes.set(c.name, c);
  // Sentado + braços de outra ação (ler, orar, comer...) no mesmo assento
  const sentado = clipes.get('sentado'), perna = (n: string) => /^(root|pelvis|thigh_|calf_|foot_|ball_)/.test(n);
  if (sentado) for (const sub of ['ler', 'orar', 'mexer', 'comer']) {
    const o = clipes.get(sub);
    if (o) clipes.set(`sentado_${sub}`, new THREE.AnimationClip(`sentado_${sub}`, o.duration, [...sentado.tracks.filter(t => perna(t.name)), ...o.tracks.filter(t => !perna(t.name))]));
  }
  return { s, objeto, pecas, mats, mixer: new THREE.AnimationMixer(objeto), clipes, ossos };
}

export async function criarBoneco(): Promise<Boneco> {
  const raiz = new THREE.Group();
  let corpo = await montar('m');
  raiz.add(corpo.objeto);
  let atual: THREE.AnimationAction | null = null, animacao: Animacao = 'parado', velocidade = 1;
  let ultimo: { look: Look; forma: number; humor: string } | null = null;
  let exp: Expressao = {};
  let itemAtual: ItemMao | null = null, livro: THREE.Group | null = null, violao: THREE.Group | null = null;
  const naMao: { obj: THREE.Object3D; mao: 'hand_r' | 'hand_l' }[] = [];
  let trocando: Promise<void> | null = null, descartado = false;
  const tmp = new THREE.Vector3();

  const tocar = (forcar = false) => {
    let nome: string = animacao;
    if (animacao === 'sentado') {
      if (itemAtual === 'livro' || exp.extras?.includes('extra_livro')) nome = 'sentado_ler';
      else if (itemAtual === 'violao' || itemAtual === 'baquetas') nome = 'sentado_mexer';
      else if (itemAtual && ['copo', 'maca', 'colher', 'frigideira'].includes(itemAtual)) nome = 'sentado_comer';
      else if (exp.olhosFechados) nome = 'sentado_orar';
    }
    const clip = corpo.clipes.get(nome) ?? corpo.clipes.get(animacao);
    if (!clip) return;
    const acao = corpo.mixer.clipAction(clip);
    acao.timeScale = velocidade;
    if (acao !== atual || forcar) { acao.reset().fadeIn(forcar ? 0 : 0.25).play(); if (atual && atual !== acao) atual.fadeOut(0.25); atual = acao; }
  };
  const tronco = () => corpo.ossos.get('spine_03') ?? corpo.objeto;
  const atualizarLivro = () => {
    const mostrar = itemAtual === 'livro' || animacao === 'ler' || !!exp.extras?.includes('extra_livro');
    if (mostrar && !livro) { livro = criarLivro(); corpo.objeto.add(livro); }
    if (livro) livro.visible = mostrar;
  };
  const limparItens = () => {
    for (const n of naMao) n.obj.removeFromParent();
    naMao.length = 0;
    if (violao) violao.visible = false;
  };
  const segurar = (item: ItemMao | null | undefined) => {
    const novo = item ?? null;
    if (novo === itemAtual) { atualizarLivro(); return; }
    itemAtual = novo;
    limparItens();
    atualizarLivro();
    if (novo === 'violao') { if (!violao) { violao = criarViolao(); corpo.objeto.add(violao); } violao.visible = true; }
    else if (novo === 'halteres' || novo === 'baquetas') for (const mao of ['hand_r', 'hand_l'] as const) { const o = criarItemMao(novo); corpo.objeto.add(o); naMao.push({ obj: o, mao }); }
    else if (novo && novo !== 'livro') { const o = criarItemMao(novo); corpo.objeto.add(o); naMao.push({ obj: o, mao: 'hand_r' }); }
    tocar();
  };
  // Itens seguem a mão/peito (posição do osso, no espaço do boneco)
  const ondeOsso = (osso: THREE.Object3D | undefined, dy = 0, dz = 0) => {
    if (!osso) return null;
    osso.getWorldPosition(tmp); corpo.objeto.worldToLocal(tmp);
    return tmp.set(tmp.x, tmp.y + dy, tmp.z + dz);
  };
  const moverItens = () => {
    corpo.objeto.updateMatrixWorld(true);
    for (const n of naMao) { const p = ondeOsso(corpo.ossos.get(n.mao), -0.03, 0.02); if (p) n.obj.position.copy(p); }
    const peito = ondeOsso(tronco());
    if (peito && livro?.visible) livro.position.set(peito.x, peito.y - 0.12, peito.z + 0.22);
    if (peito && violao?.visible) violao.position.set(peito.x - 0.05, peito.y - 0.2, peito.z + 0.2);
  };

  const aplicar = () => {
    if (!ultimo) return;
    const { look, humor } = ultimo, fem = look.corpo === 'feminino';
    const f = look.fantasia ? FANTASIAS[look.fantasia] : undefined;
    const topo = look.topo ?? 'moletom', baixo = look.baixo ?? 'calca', calcado = f?.pe ?? look.calcado ?? 'tenis';
    const vestido = !f && !!SAIA_VESTIDO[topo];
    const liga = new Set(['pele', exp.olhosFechados ? 'olhos_fechados' : 'olhos', 'sobrancelha']);
    const cab = f?.cabelo === 'esconde' ? null : f?.cabelo === 'compacto' ? (fem ? 'coque' : 'raspado') : CABELO[look.cabelo] ?? (fem ? 'longo' : 'curto');
    if (cab) liga.add(`cabelo_${cab}`);
    if (!fem && look.barba && look.barba !== 'nenhuma') liga.add(look.barba === 'cheia' ? 'barba_cheia' : 'barba');
    if (f) { liga.add('roupa_longa'); liga.add(f.saia ? 'roupa_vestido_longo_saia' : 'roupa_calca'); }
    else {
      liga.add(CIMA[topo] ?? 'roupa_longa');
      if (vestido) liga.add(SAIA_VESTIDO[topo]);
      else { liga.add(BAIXO[baixo] ?? 'roupa_calca'); if (baixo === 'saia' || baixo === 'saiaLonga') liga.add('roupa_bermuda'); }
    }
    if (!PES_ABERTOS.has(calcado)) liga.add('roupa_sapato');
    for (const [nome, m] of corpo.pecas) m.visible = liga.has(nome);
    // Cores
    const cima = f ? f.cores[0] : (CORES_ROUPA[humor === 'abatido' ? 'apagado' : look.corTopo ?? look.moletom] ?? CORES_ROUPA.pink)[1];
    const deBaixo = f ? f.cores[3] : (CORES_ROUPA[look.corBaixo ?? 'ameixa'] ?? CORES_ROUPA.ameixa)[1];
    const pe = f ? f.cores[4] : look.corCalcado ? CORES_ROUPA[look.corCalcado]?.[1] ?? '#3A2A30' : calcado === 'tenis' ? '#F2F2F2' : '#3A2A30';
    corpo.mats.pele?.color.set(look.pele);
    for (const nm of ['cabelo', 'sobrancelha']) corpo.mats[nm]?.color.set(look.corCabelo);
    corpo.mats.cima?.color.set(cima);
    corpo.mats.baixo?.color.set(baixo === 'saia' || baixo === 'saiaLonga' ? deBaixo : deBaixo);
    corpo.mats.calcado?.color.set(pe);
  };

  // Troca de corpo (homem/mulher) quando o visual muda de sexo
  const garantirCorpo = (s: 'm' | 'f') => {
    if (corpo.s === s || trocando) return;
    trocando = montar(s).then(novo => {
      trocando = null;
      if (descartado) return;
      corpo.mixer.stopAllAction(); corpo.objeto.removeFromParent();
      const itens = [livro, violao, ...naMao.map(n => n.obj)];
      corpo = novo; raiz.add(corpo.objeto); atual = null;
      for (const i of itens) if (i) corpo.objeto.add(i);
      aplicar(); tocar(true); corpo.mixer.update(0.016);
      if (ultimo && (ultimo.look.corpo === 'feminino' ? 'f' : 'm') !== corpo.s) garantirCorpo(ultimo.look.corpo === 'feminino' ? 'f' : 'm');
    }).catch(() => { trocando = null; });
  };

  // Já nasce na pose parada (miniaturas e prévias desenham antes de qualquer animação)
  tocar(true); corpo.mixer.update(0.016);

  return {
    objeto: raiz,
    descartar: () => {
      if (descartado) return;
      descartado = true;
      corpo.mixer.stopAllAction(); corpo.mixer.uncacheRoot(corpo.objeto);
      Object.values(corpo.mats).forEach(m => m.dispose());
      raiz.removeFromParent();
    },
    vestir: (look, forma, humor) => { ultimo = { look, forma, humor }; garantirCorpo(look.corpo === 'feminino' ? 'f' : 'm'); aplicar(); },
    expressao: e => { if (JSON.stringify(e) === JSON.stringify(exp)) return; exp = e; atualizarLivro(); aplicar(); tocar(); },
    animar: (nome, v = 1) => { animacao = nome; velocidade = v; atualizarLivro(); tocar(); },
    atualizar: dt => { corpo.mixer.update(dt); moverItens(); },
    segurar,
  };
}
