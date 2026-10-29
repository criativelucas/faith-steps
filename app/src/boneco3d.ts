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
  let animacao: Animacao = 'parado';
  mats.luva = mats.pele.clone();

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
    }
    // Cabelo: algumas fantasias cobrem a cabeça; com chapéu, o cabelo fica curtinho para caber
    const cabelo = f?.cabelo === 'esconde' ? null : f?.cabelo === 'compacto' ? (fem ? 'longo' : 'curto') : look.cabelo;
    if (cabelo && comRosto) liga.add(`cabelo_${cabelo}`);
    if (cabelo === 'rabo') liga.add('extra_rabo_laco');
    if (f) {
      if (f.saia) liga.add('extra_vestido_longo_saia');
      const maosLivres = MAOS_LIVRES.has(animacao);
      for (const nome of pecas.keys()) if (nome.startsWith(`fant_${look.fantasia}_`) && (maosLivres || !nome.includes('_mao_'))) liga.add(nome);
    } else {
      for (const p of TOPO[topo] ?? []) liga.add(p);
      if (!vestido) for (const p of BAIXO[baixo] ?? []) liga.add(p);
    }
    for (const p of PES[calcado] ?? PES.tenis) liga.add(p);
    for (const p of exp.extras ?? []) liga.add(p);
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
    pinta('boca', fem ? '#B0124F' : '#7A1E3A');
    const corPe = f ? f.cores[4] : look.corCalcado ? CORES_ROUPA[look.corCalcado]?.[1] : undefined;
    if (corPe) mats.calcado.color.set(corPe);
    for (const [m, mt] of original) m.material = corPe ? mats.calcado : mt;

    // Mangas, pernas e quadril viram pele conforme a roupa
    const pele = new Set<string>();
    if (!f) {
    if (['camiseta', 'polo', 'blusa', 'vestido', 'vestidoLongo'].includes(topo)) { pele.add('antebraco'); pele.add('punho'); }
    if (topo === 'regata') ['ombro', 'braco', 'antebraco', 'punho'].forEach(p => pele.add(p));
    if (vestido || baixo === 'saia' || baixo === 'saiaLonga') { pele.add('coxa'); pele.add('canela'); }
    if (!vestido && baixo === 'bermuda') pele.add('canela');
    }
    const vestirPeca = (nome: string, roupa: THREE.Material) => pecas.get(nome)?.forEach(m => { m.material = pele.has(nome) ? mats.pele : roupa; });
    for (const n of ['ombro', 'braco', 'antebraco']) vestirPeca(n, mats.cima);
    vestirPeca('punho', mats.cima_claro);
    vestirPeca('coxa', mats.baixo);
    vestirPeca('canela', mats.baixo);
    pecas.get('quadril_roupa')?.forEach(m => { m.material = vestido || f?.saia ? mats.cima : mats.baixo; });
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
      const livresAntes = MAOS_LIVRES.has(animacao);
      animacao = nome;
      if (ultimo?.look.fantasia && livresAntes !== MAOS_LIVRES.has(nome)) aplicar();
    },
    atualizar: dt => mixer.update(dt),
  };
}
