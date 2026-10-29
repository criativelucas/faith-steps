// Boneco 3D (modelo feito no Blender: arte3d/boneco.py -> public/boneco.glb).
// O arquivo tem todas as peças; aqui ligamos as do visual da pessoa, pintamos e tocamos as animações.
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CORES_OLHOS, CORES_ROUPA, type Look } from './personagem';

const URL_MODELO = (process.env.EXPO_BASE_URL ? process.env.EXPO_BASE_URL.replace(/\/$/, '') + '/' : '') + 'boneco.glb';
let modelo: Promise<GLTF> | null = null;
const carregar = () => (modelo ??= new GLTFLoader().loadAsync(URL_MODELO));

export type Animacao = 'parado' | 'andar' | 'sentado' | 'deitado' | 'orar' | 'ler' | 'mexer' | 'comer' | 'louvor' | 'exercicio';
export type Expressao = { olhosFechados?: boolean; extras?: string[] };

// Pose do jogo (a mesma do desenho 2D) para animação e objetos na mão
const ANIMACAO: Record<string, Animacao> = { baixo: 'parado', andar: 'andar', cima: 'louvor', orar: 'orar', livro: 'ler', correr: 'exercicio', sentado: 'sentado', mexer: 'mexer', comer: 'comer' };
export const animacaoDe = (pose: string): Animacao => ANIMACAO[pose] ?? 'parado';
export const extrasDe = (pose: string, fones?: boolean) => [
  ...(fones ? ['extra_fones', 'extra_fones_arco'] : []),
  ...(pose === 'livro' ? ['extra_livro', 'extra_livro_paginas'] : []),
];

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
};
const BAIXO: Record<string, string[]> = { calca: [], calcaSocial: ['extra_cinto'], bermuda: [], saia: ['extra_saia'], saiaLonga: ['extra_saia_longa'] };
const SAPATOS = ['pe_tenis', 'pe_social', 'pe_botinha', 'pe_aberto_tira', 'pe_sapatilha']; // partes que pegam a cor do calçado
const PES: Record<string, string[]> = {
  tenis: ['pe_tenis', 'pe_tenis_sola'],
  sapato: ['pe_social'],
  botinha: ['pe_botinha'],
  sandalia: ['pe_aberto', 'pe_aberto_sola', 'pe_aberto_tira'],
  chinelo: ['pe_aberto', 'pe_aberto_sola', 'pe_aberto_tira'],
  sapatilha: ['pe_sapatilha'],
  salto: ['pe_sapatilha', 'pe_salto_tacao'],
};

export type Boneco = {
  objeto: THREE.Group;
  vestir: (look: Look, forma: number, humor: string) => void;
  expressao: (e: Expressao) => void;
  animar: (nome: Animacao, velocidade?: number) => void;
  atualizar: (dt: number) => void;
};

export async function criarBoneco(): Promise<Boneco> {
  const gltf = await carregar();
  const objeto = gltf.scene.clone(true) as THREE.Group;
  const pecas = new Map<string, THREE.Mesh[]>();
  const mats: Record<string, THREE.MeshStandardMaterial> = {};
  objeto.traverse(o => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.castShadow = true;
    m.receiveShadow = true;
    // Cada boneco tem os próprios materiais (para pintar sem afetar outro)
    const mat = m.material as THREE.MeshStandardMaterial;
    mats[mat.name] ??= mat.clone();
    m.material = mats[mat.name];
    const n = base(m.name);
    pecas.set(n, [...(pecas.get(n) ?? []), m]);
  });
  // Calçado pintado: material próprio, para não mudar os fones (que usam o mesmo verde do tênis)
  mats.calcado = mats.lima.clone();
  const original = new Map<THREE.Mesh, THREE.Material>();
  for (const n of SAPATOS) pecas.get(n)?.forEach(m => original.set(m, m.material as THREE.Material));
  const mixer = new THREE.AnimationMixer(objeto);
  let atual: THREE.AnimationAction | null = null;
  let ultimo: { look: Look; forma: number; humor: string } | null = null;
  let exp: Expressao = {};

  const aplicar = () => {
    if (!ultimo) return;
    const { look, forma, humor } = ultimo;
    const fem = look.corpo === 'feminino';
    const topo = look.topo ?? 'moletom', baixo = look.baixo ?? 'calca', calcado = look.calcado ?? 'tenis';
    const vestido = topo === 'vestido' || topo === 'vestidoLongo';
    const fechados = !!exp.olhosFechados;

    const liga = new Set<string>(PECAS_BASE);
    for (const p of OLHOS[fechados ? 'fechado' : look.olhos ?? 'pontinho'] ?? OLHOS.pontinho) liga.add(p);
    liga.add(`sob_${look.sobrancelha ?? (fem ? 'arqueada' : 'grossa')}`);
    liga.add(`nariz_${look.nariz ?? 'pequeno'}`);
    const boca = fechados ? 'calma' : humor === 'radiante' ? 'aberta' : humor === 'abatido' ? 'triste' : 'sorriso';
    liga.add(`boca_${boca}`);
    if (boca === 'aberta') liga.add('boca_aberta_lingua');
    liga.add(`cabelo_${look.cabelo}`);
    if (look.cabelo === 'rabo') liga.add('extra_rabo_laco');
    if (fem) liga.add('extra_cilios');
    else if (look.barba && look.barba !== 'nenhuma') liga.add(`extra_barba_${look.barba}`);
    if (look.oculos) liga.add('extra_oculos');
    for (const p of TOPO[topo] ?? []) liga.add(p);
    if (!vestido) for (const p of BAIXO[baixo] ?? []) liga.add(p);
    for (const p of PES[calcado] ?? PES.tenis) liga.add(p);
    for (const p of exp.extras ?? []) liga.add(p);
    for (const [nome, ms] of pecas) for (const m of ms) m.visible = liga.has(nome);

    // Cores
    const cima = CORES_ROUPA[humor === 'abatido' ? 'apagado' : look.corTopo ?? look.moletom] ?? CORES_ROUPA.pink;
    const deBaixo = CORES_ROUPA[look.corBaixo ?? 'ameixa'] ?? CORES_ROUPA.ameixa;
    const pinta = (nome: string, cor: string) => mats[nome]?.color.set(cor);
    pinta('pele', look.pele);
    pinta('pele_sombra', '#' + new THREE.Color(look.pele).lerp(new THREE.Color('#7a2a3a'), 0.3).getHexString());
    pinta('cabelo', look.corCabelo);
    pinta('cima', cima[1]);
    pinta('cima_claro', cima[0]);
    pinta('cima_escuro', cima[2]);
    pinta('baixo', deBaixo[1]);
    pinta('iris', look.corOlhos ?? CORES_OLHOS[0]);
    pinta('boca', fem ? '#B0124F' : '#7A1E3A');
    const corPe = look.corCalcado ? CORES_ROUPA[look.corCalcado]?.[1] : undefined;
    if (corPe) mats.calcado.color.set(corPe);
    for (const [m, mt] of original) m.material = corPe ? mats.calcado : mt;

    // Mangas, pernas e quadril viram pele conforme a roupa
    const pele = new Set<string>();
    if (['camiseta', 'polo', 'blusa', 'vestido', 'vestidoLongo'].includes(topo)) { pele.add('antebraco'); pele.add('punho'); }
    if (topo === 'regata') ['ombro', 'braco', 'antebraco', 'punho'].forEach(p => pele.add(p));
    if (vestido || baixo === 'saia' || baixo === 'saiaLonga') { pele.add('coxa'); pele.add('canela'); }
    if (!vestido && baixo === 'bermuda') pele.add('canela');
    const vestirPeca = (nome: string, roupa: THREE.Material) => pecas.get(nome)?.forEach(m => { m.material = pele.has(nome) ? mats.pele : roupa; });
    for (const n of ['ombro', 'braco', 'antebraco']) vestirPeca(n, mats.cima);
    vestirPeca('punho', mats.cima_claro);
    vestirPeca('coxa', mats.baixo);
    vestirPeca('canela', mats.baixo);
    pecas.get('quadril_roupa')?.forEach(m => { m.material = vestido ? mats.cima : mats.baixo; });

    // Formas do corpo e do rosto
    const morph = (nome: string, valores: Record<string, number>) => pecas.get(nome)?.forEach(m => {
      if (!m.morphTargetDictionary || !m.morphTargetInfluences) return;
      for (const [k, v] of Object.entries(valores)) {
        const i = m.morphTargetDictionary[k];
        if (i !== undefined) m.morphTargetInfluences[i] = v;
      }
    });
    morph('tronco', { feminino: fem ? 1 : 0, cheinho: Math.max(0, (50 - forma) / 50), atletico: Math.max(0, (forma - 50) / 50) });
    morph('cabeca', { redondo: look.rosto === 'redondo' ? 1 : 0, quadrado: look.rosto === 'quadrado' ? 1 : 0, coracao: look.rosto === 'coracao' ? 1 : 0 });
  };

  return {
    objeto,
    vestir: (look, forma, humor) => { ultimo = { look, forma, humor }; aplicar(); },
    expressao: e => {
      if (JSON.stringify(e) === JSON.stringify(exp)) return;
      exp = e;
      aplicar();
    },
    animar: (nome, velocidade = 1) => {
      const clip = gltf.animations.find(c => c.name === nome);
      if (!clip) return;
      const acao = mixer.clipAction(clip);
      acao.timeScale = velocidade;
      if (acao === atual) return;
      acao.reset().fadeIn(0.25).play();
      atual?.fadeOut(0.25);
      atual = acao;
    },
    atualizar: dt => mixer.update(dt),
  };
}
