// Personagem chibi feito com o pacote KayKit Adventurers (CC0, preparado em arte3d/corpo_chibi.py -> public/corpo_m.glb
// e corpo_f.glb). Mesma interface do boneco antigo (Boneco): o resto do jogo não muda. Cada arquivo traz o rosto, olhos
// (abertos e fechados), 7 cabelos, barbas e as roupas do pacote (tronco com braços, pernas com botas, capacete...).
// O degradê de cada peça vem na cor de vértice; aqui ligamos as peças e escolhemos a cor de cada categoria
// (pele, cabelo, cima, cima2, baixo, calcado; "fixo" = couro e metal, que não mudam).
import * as THREE from 'three';
import { adicionarAnimacoesContextuais } from './animacoesContextuais';
import { clone as clonarEsqueleto } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { CORES_ROUPA, type Look } from './personagem';
import { descartarAcessorio, descartarCorpo } from './recursos3D';
import { FANTASIAS, criarItemMao, criarLivro, criarViolao, type Animacao, type Boneco, type Expressao, type ItemMao } from './boneco3d';

const prefixo = process.env.NODE_ENV === 'production' && process.env.EXPO_BASE_URL ? process.env.EXPO_BASE_URL.replace(/\/$/, '') + '/' : '';
const cache: Partial<Record<'m' | 'f', Promise<GLTF>>> = {};
let leitor: GLTFLoader | null = null;
// As malhas vêm comprimidas (Draco); o descompactador fica em public/draco
const ler = () => (leitor ??= new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath(`${prefixo}draco/`)));
const carregar = (s: 'm' | 'f') => (cache[s] ??= ler().loadAsync(`${prefixo}corpo_${s}.glb?v=20261102-cabelos2`).catch(e => { delete cache[s]; throw e; }));

// Cabelos do jogo -> os 7 do modelo
const CABELO: Record<string, string> = {
  curto: 'curto', topete: 'curto', lateral: 'curto', raspado: 'raspado', moicano: 'raspado', crespo: 'raspado', black: 'tigela',
  longo: 'longo', ondulado: 'longo', franja: 'tigela', chanel: 'liso', rabo: 'rabo', trancas: 'rabo', dreads: 'liso', cacheado: 'coque', coque: 'coque',
};
// Parte de cima do jogo -> conjunto KayKit (túnica do Rogue, camisa do Ranger, casaco do Mago)
const CIMA: Record<string, string> = {
  moletom: 'roupa_tunica', moletomPaz: 'roupa_tunica', camiseta: 'roupa_tunica', camisetaConf: 'roupa_tunica', regata: 'roupa_tunica', polo: 'roupa_tunica',
  camisa: 'roupa_camisa', blusa: 'roupa_camisa', jaqueta: 'roupa_casaco', blazer: 'roupa_casaco',
  vestido: 'roupa_casaco', tunicaCoral: 'roupa_casaco', vestidoLongo: 'roupa_casaco_longo',
};
const VESTIDOS = new Set(['vestido', 'vestidoLongo', 'tunicaCoral']);
const SAIAS: Record<string, string> = { saia: 'roupa_saia', saiaLonga: 'roupa_saia_longa' };
const PERNAS_CURTAS = new Set(['bermuda', 'saia', 'saiaLonga']);
// Fantasias: peças do pacote (e cor de cima própria quando a original não combina)
const FANT: Record<string, { pecas: string[]; cima?: string }> = {
  cavaleiro: { pecas: ['chapeu_capacete', 'roupa_armadura', 'pernas_armadura', 'capa'], cima: '#B3263A' },
  robo: { pecas: ['chapeu_capacete', 'roupa_armadura', 'pernas_armadura'] },
  viking: { pecas: ['chapeu_urso', 'roupa_barbaro', 'pernas_barbaro'] },
  pastor: { pecas: ['chapeu_capuz', 'roupa_capuz', 'pernas_calca'] },
  rei: { pecas: ['roupa_casaco_longo', 'pernas_curta', 'capa'] },
  ester: { pecas: ['roupa_casaco_longo', 'pernas_curta'] },
  anjo: { pecas: ['roupa_casaco_longo', 'pernas_curta'] },
  jose: { pecas: ['roupa_casaco_longo', 'pernas_curta'] },
  tunicaFestiva: { pecas: ['roupa_casaco_longo', 'pernas_curta'] },
  pescador: { pecas: ['roupa_camisa', 'pernas_calca'] },
  pirata: { pecas: ['roupa_camisa', 'pernas_calca'] },
  mineiro: { pecas: ['roupa_tunica', 'pernas_calca'] },
  domingo: { pecas: ['roupa_casaco', 'pernas_calca'] },
};
// Calçado do jogo -> modelo (a bota é a do KayKit; os outros foram modelados no mesmo estilo) e cor padrão de cada um
const SAPATO: Record<string, string> = {
  tenis: 'sapato_tenis', botinha: 'sapato_bota', sapato: 'sapato_social', sandalia: 'sapato_sandalia', chinelo: 'sapato_sandalia',
  sapatilha: 'sapato_sapatilha', salto: 'sapato_salto', pantufa: 'sapato_pantufa',
};
const COR_SAPATO: Record<string, string> = {
  tenis: '#F2F2F2', botinha: '#8A5A3C', sapato: '#3A2A30', sandalia: '#8A5A3C', chinelo: '#3E6FA8', sapatilha: '#D04A7A', salto: '#B3263A', pantufa: '#F4F1EA',
};
const PERNAS_COM_BOTA = new Set(['pernas_armadura', 'pernas_barbaro']);
const nomeBase = (n: string) => n.replace(/[._]\d+$/, '');
const BRANCO = new THREE.Color('#FFFFFF');

type Corpo = { s: 'm' | 'f'; objeto: THREE.Group; pecas: Map<string, THREE.Object3D[]>; mats: Record<string, THREE.MeshStandardMaterial>; mixer: THREE.AnimationMixer; clipes: Map<string, THREE.AnimationClip>; ossos: Map<string, THREE.Object3D> };

async function montar(s: 'm' | 'f'): Promise<Corpo> {
  const gltf = await carregar(s);
  const objeto = clonarEsqueleto(gltf.scene) as THREE.Group;
  const pecas = new Map<string, THREE.Object3D[]>(), mats: Record<string, THREE.MeshStandardMaterial> = {}, ossos = new Map<string, THREE.Object3D>();
  objeto.traverse(o => {
    if ((o as THREE.Bone).isBone) ossos.set(o.name, o);
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.castShadow = m.receiveShadow = true;
    if ((m as THREE.SkinnedMesh).isSkinnedMesh) m.frustumCulled = false;
    const mat = m.material as THREE.MeshStandardMaterial, nm = nomeBase(mat.name);
    mats[nm] ??= mat.clone();
    mats[nm].vertexColors = true; // degradê KayKit de cada peça
    mats[nm].roughness = 0.85; mats[nm].metalness = 0;
    m.material = mats[nm];
    // uma peça com várias categorias chega dividida em várias malhas com o mesmo nome base
    const nome = nomeBase(m.name);
    pecas.set(nome, [...(pecas.get(nome) ?? []), m]);
  });
  if (mats.cabelo) mats.cabelo.side = THREE.DoubleSide;
  const clipes = new Map<string, THREE.AnimationClip>();
  for (const c of gltf.animations) clipes.set(c.name, c);
  // Sentado + braços de outra ação (ler, orar, comer...) no mesmo assento
  const sentado = clipes.get('sentado'), perna = (n: string) => /^(root|pelvis|thigh_|calf_|foot_|ball_)/.test(n);
  if (sentado) for (const sub of ['ler', 'orar', 'mexer', 'comer']) {
    const o = clipes.get(sub);
    if (o) clipes.set(`sentado_${sub}`, new THREE.AnimationClip(`sentado_${sub}`, o.duration, [...sentado.tracks.filter(t => perna(t.name)), ...o.tracks.filter(t => !perna(t.name))]));
  }
  adicionarAnimacoesContextuais(clipes);
  return { s, objeto, pecas, mats, mixer: new THREE.AnimationMixer(objeto), clipes, ossos };
}

export async function criarBoneco(tipo: Look['corpo'] = 'masculino'): Promise<Boneco> {
  const raiz = new THREE.Group();
  let corpo = await montar(tipo === 'feminino' ? 'f' : 'm');
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
    for (const n of naMao) descartarAcessorio(n.obj);
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
    const f = look.fantasia ? FANTASIAS[look.fantasia] : undefined, fant = look.fantasia ? FANT[look.fantasia] : undefined;
    const topo = look.topo ?? 'moletom', baixo = look.baixo ?? 'calca', calcado = f?.pe ?? look.calcado ?? 'tenis';
    const liga = new Set(['pele', exp.olhosFechados ? 'olhos_fechados' : 'olhos', 'sobrancelha']);
    const cab = f?.cabelo === 'esconde' ? null : f?.cabelo === 'compacto' ? (fem ? 'coque' : 'raspado') : CABELO[look.cabelo] ?? (fem ? 'longo' : 'curto');
    if (cab) liga.add(`cabelo_${cab}`);
    if (!fem && look.barba && look.barba !== 'nenhuma') liga.add(look.barba === 'cheia' ? 'barba_cheia' : 'barba');
    if (f) for (const p of fant?.pecas ?? ['roupa_tunica', 'pernas_calca']) liga.add(fem && p === 'roupa_barbaro' ? 'roupa_tunica' : p); // peito de fora só no homem
    else {
      liga.add(CIMA[topo] ?? 'roupa_tunica');
      if (VESTIDOS.has(topo)) liga.add('pernas_curta');
      else {
        liga.add(PERNAS_CURTAS.has(baixo) ? 'pernas_curta' : 'pernas_calca');
        if (SAIAS[baixo]) liga.add(SAIAS[baixo]);
      }
    }
    if (![...liga].some(n => PERNAS_COM_BOTA.has(n))) liga.add(SAPATO[calcado] ?? 'sapato_tenis');
    for (const [nome, ms] of corpo.pecas) for (const m of ms) m.visible = liga.has(nome);
    // Cores (a cor escolhida é o tom claro do degradê; cima2 = detalhe da roupa, um tom mais claro)
    const cima = fant?.cima ?? (f ? f.cores[0] : (CORES_ROUPA[humor === 'abatido' ? 'apagado' : look.corTopo ?? look.moletom] ?? CORES_ROUPA.pink)[1]);
    const deBaixo = f ? f.cores[3] : (CORES_ROUPA[look.corBaixo ?? 'ameixa'] ?? CORES_ROUPA.ameixa)[1];
    const pe = f ? f.cores[4] : look.corCalcado ? CORES_ROUPA[look.corCalcado]?.[1] ?? '#3A2A30' : COR_SAPATO[calcado] ?? '#6E4A2E';
    corpo.mats.pele?.color.set(look.pele);
    for (const nm of ['cabelo', 'sobrancelha']) corpo.mats[nm]?.color.set(look.corCabelo);
    corpo.mats.cima?.color.set(cima);
    if (corpo.mats.cima2) { if (f) corpo.mats.cima2.color.set(f.cores[1]); else corpo.mats.cima2.color.set(cima).lerp(BRANCO, 0.35); }
    corpo.mats.baixo?.color.set(deBaixo);
    corpo.mats.calcado?.color.set(pe);
  };

  // Troca de corpo (homem/mulher) quando o visual muda de sexo
  const garantirCorpo = (s: 'm' | 'f') => {
    if (descartado || corpo.s === s || trocando) return;
    trocando = montar(s).then(novo => {
      trocando = null;
      if (descartado) { descartarCorpo(novo); return; }
      // Uma escolha mais recente pode chegar enquanto o arquivo carrega.
      if (ultimo && novo.s !== (ultimo.look.corpo === 'feminino' ? 'f' : 'm')) {
        descartarCorpo(novo);
        garantirCorpo(ultimo.look.corpo === 'feminino' ? 'f' : 'm');
        return;
      }
      const anterior = corpo;
      const itens = [livro, violao, ...naMao.map(n => n.obj)];
      corpo = novo; raiz.add(corpo.objeto); atual = null;
      for (const i of itens) if (i) corpo.objeto.add(i);
      descartarCorpo(anterior);
      aplicar(); tocar(true); corpo.mixer.update(0.016);
      moverItens();
      if (ultimo && (ultimo.look.corpo === 'feminino' ? 'f' : 'm') !== corpo.s) garantirCorpo(ultimo.look.corpo === 'feminino' ? 'f' : 'm');
    }).catch(() => { trocando = null; });
  };

  // Já nasce na pose parada (miniaturas e prévias desenham antes de qualquer animação)
  tocar(true); corpo.mixer.update(0.016);

  return {
    objeto: raiz,
    pronto: async () => {
      while (trocando) await trocando;
      if (!descartado && ultimo && corpo.s !== (ultimo.look.corpo === 'feminino' ? 'f' : 'm')) {
        throw new Error('Não foi possível carregar o corpo escolhido.');
      }
    },
    descartar: () => {
      if (descartado) return;
      descartado = true;
      limparItens();
      if (livro) descartarAcessorio(livro);
      if (violao) descartarAcessorio(violao);
      descartarCorpo(corpo);
      raiz.removeFromParent();
    },
    vestir: (look, forma, humor) => { ultimo = { look, forma, humor }; garantirCorpo(look.corpo === 'feminino' ? 'f' : 'm'); aplicar(); },
    expressao: e => { if (JSON.stringify(e) === JSON.stringify(exp)) return; exp = e; atualizarLivro(); aplicar(); tocar(); },
    animar: (nome, v = 1) => { animacao = nome; velocidade = v; atualizarLivro(); tocar(); },
    atualizar: dt => { corpo.mixer.update(dt); moverItens(); },
    segurar,
  };
}
