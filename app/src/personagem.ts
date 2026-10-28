// Arte do Faith Steps desenhada em código. Cada função devolve um SVG em texto,
// que o app desenha com <SvgXml> (react-native-svg) no celular e no navegador.
// O personagem é montado em camadas: cabelo de trás, pernas, roupa de baixo, calçado,
// roupa de cima, braços, cabeça (rosto, olhos, sobrancelhas, nariz, boca) e cabelo da frente.

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rgb = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
export const mix = (a: string, b: string, t: number) =>
  '#' + rgb(a).map((v, i) => Math.round(lerp(v, rgb(b)[i], t)).toString(16).padStart(2, '0')).join('');
const r1 = (v: number) => Math.round(v * 10) / 10;

export type Cabelo =
  | 'curto' | 'topete' | 'lateral' | 'raspado' | 'moicano' | 'crespo'
  | 'longo' | 'ondulado' | 'franja' | 'chanel' | 'rabo' | 'coque' | 'trancas' | 'dreads' | 'cacheado' | 'black';
export type Corpo = 'feminino' | 'masculino';
export type Barba = 'nenhuma' | 'curta' | 'cheia';
export type Rosto = 'oval' | 'redondo' | 'quadrado' | 'coracao';
export type Olhos = 'pontinho' | 'amendoado' | 'grande' | 'sorridente';
export type Sobrancelha = 'fina' | 'grossa' | 'arqueada';
export type Nariz = 'pequeno' | 'redondo' | 'reto';
export type Topo = 'moletom' | 'camiseta' | 'jaqueta' | 'camisa' | 'polo' | 'regata' | 'blazer' | 'blusa' | 'vestido' | 'vestidoLongo';
export type Baixo = 'calca' | 'bermuda' | 'calcaSocial' | 'saia' | 'saiaLonga';
export type Calcado = 'tenis' | 'botinha' | 'chinelo' | 'sapato' | 'sandalia' | 'sapatilha' | 'salto';
export type Humor = 'radiante' | 'normal' | 'abatido' | 'adormecido';
export type Pose = 'baixo' | 'cima' | 'orar' | 'livro' | 'correr' | 'andar';

export type Look = {
  pele: string;
  cabelo: Cabelo;
  corCabelo: string;
  moletom: string; // cor da roupa de cima nos perfis antigos
  corpo?: Corpo; // sem valor = masculino (perfis antigos)
  barba?: Barba;
  oculos?: boolean;
  rosto?: Rosto;
  olhos?: Olhos;
  corOlhos?: string;
  sobrancelha?: Sobrancelha;
  nariz?: Nariz;
  sardas?: boolean;
  topo?: Topo;
  corTopo?: string;
  baixo?: Baixo;
  corBaixo?: string;
  calcado?: Calcado;
};

export const PELES = ['#F6D3B3', '#E9B48C', '#C98B62', '#A66A43', '#7A4A2E', '#55311D'];
export const CORES_CABELO = ['#2A1530', '#120A12', '#6B3A1C', '#B8813A', '#E2BC6E', '#A0432A', '#B9B2B8', '#FF8CC4'];
export const CORES_OLHOS = ['#5A3420', '#1A1012', '#8A6A2A', '#3F7F4A', '#3E6FA8'];
// Cada cabelo vale para um sexo ou para os dois
export const CABELOS_LISTA: { id: Cabelo; nome: string; para: Corpo | 'ambos' }[] = [
  { id: 'curto', nome: 'Curto', para: 'masculino' },
  { id: 'topete', nome: 'Topete', para: 'masculino' },
  { id: 'lateral', nome: 'Repartido', para: 'masculino' },
  { id: 'raspado', nome: 'Raspado', para: 'masculino' },
  { id: 'moicano', nome: 'Moicano', para: 'masculino' },
  { id: 'longo', nome: 'Longo liso', para: 'feminino' },
  { id: 'ondulado', nome: 'Ondulado', para: 'feminino' },
  { id: 'franja', nome: 'Franja', para: 'feminino' },
  { id: 'chanel', nome: 'Chanel', para: 'feminino' },
  { id: 'rabo', nome: 'Rabo de cavalo', para: 'feminino' },
  { id: 'coque', nome: 'Coque', para: 'feminino' },
  { id: 'trancas', nome: 'Tranças', para: 'feminino' },
  { id: 'crespo', nome: 'Crespo curto', para: 'ambos' },
  { id: 'cacheado', nome: 'Cacheado', para: 'ambos' },
  { id: 'black', nome: 'Black power', para: 'ambos' },
  { id: 'dreads', nome: 'Dreads', para: 'ambos' },
];
export const cabelosPara = (corpo: Corpo) => CABELOS_LISTA.filter(c => c.para === 'ambos' || c.para === corpo);
export const ROSTOS: [Rosto, string][] = [['oval', 'Oval'], ['redondo', 'Redondo'], ['quadrado', 'Quadrado'], ['coracao', 'Coração']];
export const OLHOS_LISTA: [Olhos, string][] = [['pontinho', 'Pontinho'], ['amendoado', 'Amendoado'], ['grande', 'Grande'], ['sorridente', 'Sorridente']];
export const SOBRANCELHAS: [Sobrancelha, string][] = [['fina', 'Fina'], ['grossa', 'Grossa'], ['arqueada', 'Arqueada']];
export const NARIZES: [Nariz, string][] = [['pequeno', 'Pequeno'], ['redondo', 'Redondo'], ['reto', 'Reto']];
export const TOPOS: [Topo, string][] = [
  ['moletom', 'Moletom'], ['camiseta', 'Camiseta'], ['jaqueta', 'Jaqueta'], ['camisa', 'Camisa social'], ['polo', 'Camisa polo'],
  ['regata', 'Regata'], ['blazer', 'Terno'], ['blusa', 'Blusa'], ['vestido', 'Vestido'], ['vestidoLongo', 'Vestido longo'],
];
export const BAIXOS: [Baixo, string][] = [['calca', 'Calça'], ['bermuda', 'Bermuda'], ['calcaSocial', 'Calça social'], ['saia', 'Saia'], ['saiaLonga', 'Saia longa']];
export const CALCADOS: [Calcado, string][] = [
  ['tenis', 'Tênis'], ['botinha', 'Botinha'], ['chinelo', 'Chinelo'], ['sapato', 'Sapato social'], ['sandalia', 'Sandália'], ['sapatilha', 'Sapatilha'], ['salto', 'Salto'],
];

// Cores de roupa: [claro, base, escuro]. Pink e lima nunca no mesmo degradê.
export const CORES_ROUPA: Record<string, [string, string, string]> = {
  pink: ['#FF5AA8', '#FE0472', '#C8005A'],
  rosa: ['#FFF0F7', '#FFD1E6', '#F2A6C8'],
  lima: ['#D2FF8A', '#8AFF00', '#5FD400'],
  nevoa: ['#FFFFFF', '#FBF3F8', '#E3D3E0'],
  areia: ['#F8F1E8', '#E4D6C6', '#C9B6A2'],
  noite: ['#7A2D8C', '#4E1659', '#2A0A31'],
  ameixa: ['#5A1C67', '#3A1044', '#22072A'],
  jeans: ['#7E9CC8', '#4A6FA5', '#33507D'],
  apagado: ['#C98AA8', '#A2587E', '#7A3D5E'],
};
export const CORES_ROUPA_LISTA: [string, string][] = [
  ['pink', 'Pink'], ['rosa', 'Rosa'], ['lima', 'Lima'], ['nevoa', 'Branco'],
  ['areia', 'Areia'], ['noite', 'Ameixa'], ['ameixa', 'Noite'], ['jeans', 'Jeans'],
];

const TINTA = '#2A0A31', BOCA = '#7A1E3A', LIMA = '#8AFF00';
let uid = 0;

/* ---------- Cabelos ---------- */

function cachos(r: number, bolha: number) {
  let tras = `<circle cx="100" cy="60" r="${r}"/>`;
  for (let a = 180; a <= 360; a += 22.5) {
    const t = (a * Math.PI) / 180;
    tras += `<circle cx="${r1(100 + (r - 1) * Math.cos(t))}" cy="${r1(62 + (r - 3) * Math.sin(t))}" r="${bolha}"/>`;
  }
  for (const [dx, y, k] of [[0.95, 84, 1], [0.86, 98, 0.75]] as const) {
    tras += `<circle cx="${r1(100 - r * dx)}" cy="${y}" r="${r1(bolha * k)}"/><circle cx="${r1(100 + r * dx)}" cy="${y}" r="${r1(bolha * k)}"/>`;
  }
  let frente = '<circle cx="68" cy="58" r="8"/><circle cx="132" cy="58" r="8"/>';
  for (let x = 72; x <= 128; x += 9.3) frente += `<circle cx="${r1(x)}" cy="${r1(45 + (x - 100) ** 2 / 90)}" r="8.5"/>`;
  return { tras, frente, brilho: false };
}

const TOPO = '<path d="M67 74 C63 44 84 34 100 34 C116 34 137 44 133 74 C128 56 116 48 100 48 C84 48 72 56 67 74 Z"/>';
const TRAS_LONGO = '<path d="M62 72 C58 36 142 36 138 72 C142 100 142 120 140 138 C120 146 80 146 60 138 C58 118 58 100 62 72 Z"/>';
const MECHAS = '<path d="M66 70 C62 90 64 110 70 128 L78 126 C72 108 72 90 74 72 Z"/><path d="M134 70 C138 90 136 110 130 128 L122 126 C128 108 128 90 126 72 Z"/>';
const RASPADO = '<path d="M67 70 C65 44 84 37 100 37 C116 37 135 44 133 70 C127 56 115 50 100 50 C85 50 73 56 67 70 Z"/>';

const CABELOS: Record<Cabelo, { tras: string; frente: string; brilho: boolean }> = {
  curto: {
    tras: '',
    frente: '<path d="M66 76 C60 44 82 30 104 31 C126 32 140 50 134 78 C131 64 124 56 116 53 C106 58 90 58 80 54 C72 58 68 66 66 76 Z"/>',
    brilho: true,
  },
  topete: {
    tras: '',
    frente: '<path d="M67 76 C62 50 72 38 86 34 C92 25 106 21 120 25 C132 29 137 37 131 42 C136 50 136 63 133 76 C130 63 124 56 114 53 C104 50 94 47 86 50 C78 54 70 64 67 76 Z"/><path d="M88 36 C98 28 112 27 124 32" fill="none" stroke="#000000" stroke-opacity="0.15" stroke-width="2"/>',
    brilho: true,
  },
  lateral: {
    tras: '',
    frente: '<path d="M66 76 C60 46 78 32 100 32 C122 32 140 46 134 76 C132 63 127 56 120 52 C104 50 86 58 72 66 C69 69 67 72 66 76 Z"/><path d="M112 36 C118 40 124 46 127 54" fill="none" stroke="#000000" stroke-opacity="0.15" stroke-width="2"/>',
    brilho: true,
  },
  raspado: { tras: '', frente: RASPADO.replace('/>', ' opacity="0.9"/>'), brilho: false },
  moicano: {
    tras: '',
    frente: RASPADO.replace('/>', ' opacity="0.4"/>') + '<path d="M89 52 C86 32 91 15 100 8 C109 15 114 32 111 52 C104 49 96 49 89 52 Z"/>',
    brilho: false,
  },
  crespo: cachos(36, 9),
  longo: { tras: TRAS_LONGO, frente: '<path d="M67 74 C63 44 84 33 100 33 C118 33 137 44 133 74 C126 58 112 50 94 50 C82 52 72 60 67 74 Z"/>' + MECHAS, brilho: true },
  ondulado: {
    tras: '<path d="M62 72 C58 36 142 36 138 72 C146 92 136 106 144 122 C150 136 136 148 128 142 C118 152 82 152 72 142 C64 148 50 136 56 122 C64 106 54 92 62 72 Z"/>',
    frente: '<path d="M67 74 C63 44 84 33 100 33 C118 33 137 44 133 74 C126 58 112 50 94 50 C82 52 72 60 67 74 Z"/>' +
      '<path d="M66 70 C58 86 70 98 62 112 C58 120 66 128 72 124 C68 110 78 96 74 72 Z"/><path d="M134 70 C142 86 130 98 138 112 C142 120 134 128 128 124 C132 110 122 96 126 72 Z"/>',
    brilho: true,
  },
  franja: {
    tras: TRAS_LONGO,
    frente: '<path d="M66 66 C62 36 86 30 100 30 C114 30 138 36 134 66 C120 58 80 58 66 66 Z"/>' + MECHAS,
    brilho: true,
  },
  chanel: {
    tras: '<path d="M60 72 C56 34 144 34 140 72 L142 106 C128 114 72 114 58 106 Z"/>',
    frente: '<path d="M66 64 C62 36 86 30 100 30 C114 30 138 36 134 64 C120 57 80 57 66 64 Z"/>',
    brilho: true,
  },
  rabo: {
    tras: '<path d="M118 40 C150 36 160 84 148 124 C144 136 130 134 134 118 C142 90 136 64 114 54 Z"/>',
    frente: TOPO + '<circle cx="124" cy="46" r="6"/>',
    brilho: true,
  },
  coque: { tras: '<circle cx="100" cy="30" r="15"/>', frente: TOPO, brilho: true },
  trancas: {
    tras: '<path d="M62 72 C58 36 142 36 138 72 C144 104 144 136 140 160 C120 168 80 168 60 160 C56 136 56 104 62 72 Z"/>' +
      '<path d="M68 100 V158 M78 104 V162 M122 104 V162 M132 100 V158" stroke="#000000" stroke-opacity="0.2" stroke-width="3" fill="none"/>',
    frente: '<path d="M67 74 C63 44 84 33 100 37 C116 33 137 44 133 74 C126 58 112 50 100 50 C88 50 74 58 67 74 Z"/>',
    brilho: true,
  },
  dreads: {
    tras: [60, 69, 78, 122, 131, 140].map((x, i) => `<rect x="${x - 4.5}" y="58" width="9" height="${74 + (i % 3) * 10}" rx="4.5"/>`).join(''),
    frente: TOPO + [74, 86, 98, 110, 122].map(x => `<rect x="${x - 4}" y="40" width="8" height="${18 + ((x / 2) % 3) * 3}" rx="4"/>`).join(''),
    brilho: false,
  },
  cacheado: cachos(41, 12),
  black: cachos(52, 15),
};

/* ---------- Rosto ---------- */

const elipse = (cx: number, cy: number, rx: number, ry: number) =>
  `M${cx - rx} ${cy} A${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;

const ROSTO_FORMA: Record<Rosto, { d: string; orelha: number }> = {
  oval: { d: elipse(100, 72, 33, 36), orelha: 67 },
  redondo: { d: elipse(100, 73, 35, 34), orelha: 65 },
  quadrado: { d: 'M67 66 C67 42 82 36 100 36 C118 36 133 42 133 66 L133 86 C133 101 121 108 100 108 C79 108 67 101 67 86 Z', orelha: 67 },
  coracao: { d: 'M66 66 C66 42 82 36 100 36 C118 36 134 42 134 66 C134 84 124 98 112 104 C106 107 103 108 100 108 C97 108 94 107 88 104 C76 98 66 84 66 66 Z', orelha: 66 },
};

function defs(id: string, look: Look, cima: [string, string, string], baixo: [string, string, string]) {
  const [claro, base, escuro] = cima;
  const degrade = `<stop offset="0" stop-color="${claro}"/><stop offset="0.5" stop-color="${base}"/><stop offset="1" stop-color="${escuro}"/>`;
  return `<defs>
    <radialGradient id="${id}s" cx="0.38" cy="0.32" r="0.8">
      <stop offset="0" stop-color="${mix(look.pele, '#ffffff', 0.22)}"/><stop offset="0.55" stop-color="${look.pele}"/><stop offset="1" stop-color="${mix(look.pele, '#7a2a3a', 0.14)}"/>
    </radialGradient>
    <linearGradient id="${id}h" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0" stop-color="${mix(look.corCabelo, '#ffffff', 0.22)}"/><stop offset="1" stop-color="${look.corCabelo}"/>
    </linearGradient>
    <linearGradient id="${id}r" gradientUnits="userSpaceOnUse" x1="0" y1="108" x2="0" y2="226">${degrade}</linearGradient>
    <linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="0.3">${degrade}</linearGradient>
    <linearGradient id="${id}c" gradientUnits="userSpaceOnUse" x1="0" y1="205" x2="0" y2="306">
      <stop offset="0" stop-color="${baixo[1]}"/><stop offset="1" stop-color="${baixo[2]}"/>
    </linearGradient>
    <radialGradient id="${id}g" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${LIMA}" stop-opacity="0.55"/><stop offset="0.55" stop-color="${LIMA}" stop-opacity="0.14"/><stop offset="1" stop-color="${LIMA}" stop-opacity="0"/>
    </radialGradient>
  </defs>`;
}

function olhos(look: Look, humor: Humor, fechados: boolean) {
  const fem = look.corpo === 'feminino';
  const iris = look.corOlhos ?? CORES_OLHOS[0];
  const cilios = fem ? `<path d="M83.8 73.4 L80.8 71 M116.2 73.4 L119.2 71" stroke="${TINTA}" stroke-width="1.6" stroke-linecap="round"/>` : '';
  if (fechados || humor === 'adormecido') {
    return `<path d="M84 78 Q88 82 92 78 M108 78 Q112 82 116 78" fill="none" stroke="${TINTA}" stroke-width="2.4" stroke-linecap="round"/>`;
  }
  if (humor === 'abatido') {
    return `<ellipse cx="88" cy="79" rx="3.4" ry="2.4" fill="${TINTA}"/><ellipse cx="112" cy="79" rx="3.4" ry="2.4" fill="${TINTA}"/>
      <path d="M83 76.5 Q88 75 93 76.5 M107 76.5 Q112 75 117 76.5" fill="none" stroke="${mix(look.pele, '#7a2a3a', 0.35)}" stroke-width="2"/>`;
  }
  const tipo = look.olhos ?? 'pontinho';
  if (tipo === 'sorridente') {
    return `<path d="M83.5 79 Q88 72.5 92.5 79 M107.5 79 Q112 72.5 116.5 79" fill="none" stroke="${TINTA}" stroke-width="2.6" stroke-linecap="round"/>` + cilios;
  }
  const um = (x: number) => {
    if (tipo === 'amendoado') {
      return `<path d="M${x - 6.5} 77 Q${x} 70.5 ${x + 6.5} 77 Q${x} 82.5 ${x - 6.5} 77 Z" fill="#ffffff"/>
        <circle cx="${x}" cy="77" r="3.5" fill="${iris}"/><circle cx="${x}" cy="77" r="1.7" fill="${TINTA}"/><circle cx="${x + 1.3}" cy="75.7" r="1" fill="#ffffff"/>
        <path d="M${x - 7} 77 Q${x} 70 ${x + 7} 77" fill="none" stroke="${TINTA}" stroke-width="1.8" stroke-linecap="round"/>`;
    }
    if (tipo === 'grande') {
      return `<ellipse cx="${x}" cy="77" rx="6" ry="6.6" fill="#ffffff"/>
        <circle cx="${x}" cy="77.6" r="4.6" fill="${iris}"/><circle cx="${x}" cy="77.6" r="2.3" fill="${TINTA}"/>
        <circle cx="${x + 1.8}" cy="75.2" r="1.6" fill="#ffffff"/><circle cx="${x - 1.6}" cy="79.6" r="0.8" fill="#ffffff"/>
        <path d="M${x - 6.6} 75 Q${x} 69 ${x + 6.6} 75" fill="none" stroke="${TINTA}" stroke-width="2" stroke-linecap="round"/>`;
    }
    return `<ellipse cx="${x}" cy="77" rx="3.6" ry="4.4" fill="${TINTA}"/><circle cx="${x + 1.3}" cy="75.4" r="1.3" fill="#ffffff"/>`;
  };
  return um(88) + um(112) + cilios;
}

function sobrancelhas(look: Look, humor: Humor) {
  const cor = mix(look.corCabelo, TINTA, 0.35);
  const tipo = look.sobrancelha ?? (look.corpo === 'feminino' ? 'arqueada' : 'grossa');
  const largura = tipo === 'grossa' ? 3.4 : tipo === 'fina' ? 1.8 : 2.3;
  let e: string, d: string;
  if (humor === 'abatido') {
    e = 'M82 70 Q88 68.5 93.5 65.5'; d = 'M118 70 Q112 68.5 106.5 65.5';
  } else if (tipo === 'arqueada') {
    e = 'M81.5 69 Q86 63 94.5 66.5'; d = 'M118.5 69 Q114 63 105.5 66.5';
  } else {
    e = 'M81.5 68.5 Q88 64.5 94.5 67'; d = 'M118.5 68.5 Q112 64.5 105.5 67';
  }
  const sobe = humor === 'radiante' ? ' transform="translate(0 -1.5)"' : '';
  return `<path d="${e} M${d.slice(1)}" fill="none" stroke="${cor}" stroke-width="${largura}" stroke-linecap="round"${sobe}/>`;
}

function nariz(look: Look) {
  const sombra = mix(look.pele, '#7a2a3a', 0.32);
  const tipo = look.nariz ?? 'pequeno';
  if (tipo === 'redondo') return `<ellipse cx="100" cy="86.5" rx="3.4" ry="2.5" fill="${sombra}" opacity="0.45"/><circle cx="99" cy="85.6" r="0.9" fill="#ffffff" opacity="0.35"/>`;
  if (tipo === 'reto') return `<path d="M100.5 79 L98.6 87 Q100 88.6 102.4 87.6" fill="none" stroke="${sombra}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  return `<path d="M97.6 85.6 Q100 88.2 102.4 85.6" fill="none" stroke="${sombra}" stroke-width="1.8" stroke-linecap="round"/>`;
}

function boca(look: Look, humor: Humor, fechados: boolean) {
  const cor = look.corpo === 'feminino' ? '#B0124F' : BOCA;
  if (humor === 'adormecido') return `<path d="M97 95 Q100 97 103 95" fill="none" stroke="${cor}" stroke-width="2.2" stroke-linecap="round"/>`;
  if (humor === 'abatido') return `<path d="M93 99 Q100 94 107 99" fill="none" stroke="${cor}" stroke-width="2.4" stroke-linecap="round"/>`;
  if (humor === 'radiante' && !fechados) {
    return `<path d="M90 92 Q100 107 110 92 Z" fill="${cor}"/><path d="M95 99.5 Q100 103.5 105 99.5 Q100 97.5 95 99.5 Z" fill="#FF7AA8"/><path d="M92 92.4 H108" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.9"/>`;
  }
  return `<path d="M92.5 93.5 Q100 99.5 107.5 93.5" fill="none" stroke="${cor}" stroke-width="2.4" stroke-linecap="round"/>`;
}

function barba(look: Look, id: string) {
  if (look.corpo === 'feminino' || !look.barba || look.barba === 'nenhuma') return '';
  const forma = look.barba === 'curta'
    ? '<path d="M70 86 C72 104 86 112 100 112 C114 112 128 104 130 86 C126 98 116 104 100 104 C84 104 74 98 70 86 Z"/>'
    : '<path d="M67 78 C66 108 84 120 100 120 C116 120 134 108 133 78 C128 94 118 102 100 102 C82 102 72 94 67 78 Z"/>';
  return `<g fill="url(#${id}h)">${forma}<path d="M89 92 Q100 87 111 92 Q100 96 89 92 Z"/></g>`;
}

const oculos = (look: Look) => (look.oculos
  ? `<g fill="#ffffff" fill-opacity="0.18" stroke="${TINTA}" stroke-width="2.2"><circle cx="88" cy="77" r="8.5"/><circle cx="112" cy="77" r="8.5"/></g>
     <path d="M96.5 76 Q100 73 103.5 76 M79.5 75 L68 72 M120.5 75 L132 72" fill="none" stroke="${TINTA}" stroke-width="2.2" stroke-linecap="round"/>`
  : '');

function cabeca(id: string, look: Look, humor: Humor, fechados: boolean, fones: boolean) {
  const c = CABELOS[look.cabelo] ?? CABELOS.curto;
  const forma = ROSTO_FORMA[look.rosto ?? 'oval'] ?? ROSTO_FORMA.oval;
  const orelha = mix(look.pele, '#7a2a3a', 0.1), dentro = mix(look.pele, '#7a2a3a', 0.3);
  const ox = forma.orelha;
  const opBochecha = humor === 'abatido' ? 0.08 : 0.22;
  const sardas = look.sardas
    ? [[83, 86], [87, 88.5], [79.5, 89], [117, 86], [113, 88.5], [120.5, 89], [97, 84], [103, 84]]
        .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="0.95"/>`).join('')
    : '';
  const brilho = c.brilho ? '<path d="M80 45 Q91 37 106 38" fill="none" stroke="#ffffff" stroke-opacity="0.28" stroke-width="3" stroke-linecap="round"/>' : '';
  const fone = fones
    ? `<path d="M64 74 C62 26 138 26 136 74" fill="none" stroke="${TINTA}" stroke-width="6" stroke-linecap="round"/>
       <rect x="56" y="64" width="13" height="24" rx="6" fill="${LIMA}"/><rect x="131" y="64" width="13" height="24" rx="6" fill="${LIMA}"/>`
    : '';
  return {
    tras: `<g fill="url(#${id}h)">${c.tras}</g>`,
    frente: `<ellipse cx="${ox}" cy="79" rx="6" ry="8" fill="${orelha}"/><ellipse cx="${200 - ox}" cy="79" rx="6" ry="8" fill="${orelha}"/>
      <path d="M${ox + 1.5} 75 Q${ox - 2} 79 ${ox + 1.5} 84 M${200 - ox - 1.5} 75 Q${200 - ox + 2} 79 ${200 - ox - 1.5} 84" fill="none" stroke="${dentro}" stroke-width="1.6" stroke-linecap="round"/>
      <path d="${forma.d}" fill="url(#${id}s)"/>
      ${barba(look, id)}
      <circle cx="80.5" cy="90" r="6" fill="#FE0472" opacity="${opBochecha}"/><circle cx="119.5" cy="90" r="6" fill="#FE0472" opacity="${opBochecha}"/>
      <g fill="${mix(look.pele, '#7a2a3a', 0.45)}" opacity="0.7">${sardas}</g>
      ${olhos(look, humor, fechados)}${sobrancelhas(look, humor)}${nariz(look)}${boca(look, humor, fechados)}${oculos(look)}
      <g fill="url(#${id}h)">${c.frente}</g>${brilho}${fone}`,
  };
}

const estrela = (x: number, y: number, s: number) =>
  `<path d="M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s} Z"/>`;

const grupo = (transform: string, conteudo: string) => (transform ? `<g transform="${transform}">${conteudo}</g>` : conteudo);

type Pt = [number, number];
// Pedaço [t0, t1] de uma curva quadrática (para mangas curtas e punhos)
function trecho(a: Pt, c: Pt, b: Pt, t0: number, t1: number) {
  const q = (t: number): Pt => [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]];
  const m: Pt = [
    (1 - t0) * (1 - t1) * a[0] + ((1 - t0) * t1 + t0 * (1 - t1)) * c[0] + t0 * t1 * b[0],
    (1 - t0) * (1 - t1) * a[1] + ((1 - t0) * t1 + t0 * (1 - t1)) * c[1] + t0 * t1 * b[1],
  ];
  const [p, f] = [q(t0), q(t1)];
  return `M${r1(p[0])} ${r1(p[1])} Q${r1(m[0])} ${r1(m[1])} ${r1(f[0])} ${r1(f[1])}`;
}

export type OpcoesPessoa = {
  forma?: number; humor?: Humor; pose?: Pose; passo?: 0 | 1;
  fones?: boolean; olhosFechados?: boolean; viewBox?: string;
};

export function pessoaSvg(look: Look, op: OpcoesPessoa = {}): string {
  const humor = op.humor ?? 'normal';
  if (humor === 'adormecido') return dormindoSvg(look);
  const pose = op.pose ?? (humor === 'radiante' ? 'cima' : 'baixo');
  const id = 'p' + uid++;
  const f = Math.min(Math.max(op.forma ?? 50, 0), 100) / 100;
  const abatido = humor === 'abatido';
  const fem = look.corpo === 'feminino';
  const topo: Topo = look.topo ?? 'moletom';
  const baixo: Baixo = look.baixo ?? 'calca';
  const calcado: Calcado = look.calcado ?? 'tenis';
  const vestido = topo === 'vestido' || topo === 'vestidoLongo';
  const cima = CORES_ROUPA[abatido ? 'apagado' : look.corTopo ?? look.moletom] ?? CORES_ROUPA.pink;
  const corBaixo = CORES_ROUPA[abatido ? 'apagado' : look.corBaixo ?? 'ameixa'] ?? CORES_ROUPA.ameixa;
  const [claro, base, escuro] = cima;
  const pele = `url(#${id}s)`, peleSolida = mix(look.pele, '#7a2a3a', 0.06);

  // Corpo calculado pela forma física (0 = fora de forma, 100 = atlético); o feminino tem cintura e ombros menores
  const S = lerp(44, 55, f) - (fem ? 5 : 0);
  const M = lerp(70, 35, f) - (fem ? 4 : 0);
  const W = lerp(60, 33, f) + (fem ? 3 : 0);
  const L = lerp(35, 22, f), A = lerp(22, 16, f) - (fem ? 1.5 : 0);
  const X = (v: number) => r1(100 + v);

  const torso = `M${X(-S)} 130 Q${X(-S)} 114 ${X(-S + 14)} 113 L${X(S - 14)} 113 Q${X(S)} 114 ${X(S)} 130 C${X(S)} 150 ${X(M)} 165 ${X(M)} 182 C${X(M)} 200 ${X(W + 4)} 212 ${X(W)} 222 L${X(-W)} 222 C${X(-W - 4)} 212 ${X(-M)} 200 ${X(-M)} 182 C${X(-M)} 165 ${X(-S)} 150 ${X(-S)} 130 Z`;

  /* Pernas e roupa de baixo */
  const andar = pose === 'andar', passo = op.passo ?? 0;
  const sobeE = andar && passo === 0 ? 7 : 0, sobeD = andar && passo === 1 ? 7 : 0;
  const lx = 100 - 3 - L, rx = 100 + 3;
  const rL = r1(L / 2.4);
  const pernasPele = `<rect x="${r1(lx)}" y="226" width="${r1(L)}" height="${80 - sobeE}" rx="${rL}" fill="${peleSolida}"/><rect x="${r1(rx)}" y="226" width="${r1(L)}" height="${80 - sobeD}" rx="${rL}" fill="${peleSolida}"/>`;
  const quadril = `<path d="M${X(-W + 3)} 206 L${X(W - 3)} 206 Q${X(W - 3)} 232 ${r1(rx + L)} 240 L${r1(lx)} 240 Q${X(-W + 3)} 232 ${X(-W + 3)} 206 Z"/>`;
  let roupaBaixo = '';
  if (!vestido) {
    if (baixo === 'calca' || baixo === 'calcaSocial') {
      roupaBaixo = `<g fill="url(#${id}c)">${quadril}<rect x="${r1(lx)}" y="226" width="${r1(L)}" height="${80 - sobeE}" rx="${rL}"/><rect x="${r1(rx)}" y="226" width="${r1(L)}" height="${80 - sobeD}" rx="${rL}"/></g>
        <path d="M${r1(lx + L * 0.55)} 246 V${290 - sobeE} M${r1(rx + L * 0.45)} 246 V${290 - sobeD}" stroke="#000000" stroke-opacity="0.12" stroke-width="1.6"/>`;
      if (baixo === 'calcaSocial') {
        roupaBaixo += `<rect x="${X(-W + 3)}" y="205" width="${r1(2 * W - 6)}" height="6" rx="3" fill="${TINTA}"/><rect x="96" y="204.5" width="8" height="7" rx="2" fill="#C9B6A2"/>`;
      }
    } else if (baixo === 'bermuda') {
      roupaBaixo = `<g fill="url(#${id}c)">${quadril}<rect x="${r1(lx - 1)}" y="226" width="${r1(L + 1)}" height="${38 - sobeE / 2}" rx="5"/><rect x="${r1(rx)}" y="226" width="${r1(L + 1)}" height="${38 - sobeD / 2}" rx="5"/></g>
        <path d="M${r1(lx)} ${262 - sobeE / 2} h${r1(L - 1)} M${r1(rx + 1)} ${262 - sobeD / 2} h${r1(L - 1)}" stroke="#000000" stroke-opacity="0.15" stroke-width="2"/>`;
    } else {
      const longa = baixo === 'saiaLonga', abre = longa ? 16 : 12, barra = longa ? 290 : 258;
      roupaBaixo = `<path d="M${X(-W + 2)} 206 L${X(W - 2)} 206 L${X(W + abre)} ${barra} Q100 ${barra + 7} ${X(-W - abre)} ${barra} Z" fill="url(#${id}c)"/>
        <path d="M${X(-W + 2)} 214 H${X(W - 2)}" stroke="#000000" stroke-opacity="0.14" stroke-width="2"/>`;
    }
  }

  const pe = (x: number, sobe: number) => {
    const y = 296 - sobe, w = r1(L + 10);
    if (calcado === 'sapato') {
      return `<rect x="${r1(x)}" y="${y + 2}" width="${w}" height="12" rx="6" fill="#3A2A30"/><rect x="${r1(x + 4)}" y="${y + 4}" width="${r1(w * 0.35)}" height="2.4" rx="1.2" fill="#ffffff" opacity="0.35"/>`;
    }
    if (calcado === 'botinha') {
      return `<rect x="${r1(x + 3)}" y="${y - 14}" width="${r1(w - 6)}" height="28" rx="6" fill="#8A5A3C"/><rect x="${r1(x)}" y="${y + 6}" width="${w}" height="9" rx="4.5" fill="#8A5A3C"/><rect x="${r1(x)}" y="${y + 11}" width="${w}" height="4" rx="2" fill="#5E3A26"/>`;
    }
    if (calcado === 'sandalia') {
      return `<ellipse cx="${r1(x + w / 2)}" cy="${y + 8}" rx="${r1(w / 2 - 1)}" ry="5.5" fill="${peleSolida}"/><rect x="${r1(x)}" y="${y + 11}" width="${w}" height="3.4" rx="1.7" fill="#C9A88A"/><path d="M${r1(x + 4)} ${y + 6.5} H${r1(x + w - 4)}" stroke="#8E6A9A" stroke-width="2.6" stroke-linecap="round"/>`;
    }
    if (calcado === 'chinelo') {
      return `<ellipse cx="${r1(x + w / 2)}" cy="${y + 8}" rx="${r1(w / 2 - 1)}" ry="5.5" fill="${peleSolida}"/><rect x="${r1(x)}" y="${y + 11.5}" width="${w}" height="3" rx="1.5" fill="${LIMA}"/><path d="M${r1(x + w / 2)} ${y + 11} L${r1(x + w * 0.28)} ${y + 5} M${r1(x + w / 2)} ${y + 11} L${r1(x + w * 0.72)} ${y + 5}" stroke="#FE0472" stroke-width="2.2" stroke-linecap="round"/>`;
    }
    if (calcado === 'sapatilha') {
      return `<rect x="${r1(x + 1)}" y="${y + 4}" width="${r1(w - 2)}" height="10" rx="5" fill="#E79BB9"/><path d="M${r1(x + 4)} ${y + 5} Q${r1(x + w / 2)} ${y + 9} ${r1(x + w - 4)} ${y + 5}" fill="none" stroke="${peleSolida}" stroke-width="2.4"/><circle cx="${r1(x + w / 2)}" cy="${y + 7}" r="2" fill="#C8005A"/>`;
    }
    if (calcado === 'salto') {
      return `<rect x="${r1(x + w / 2 - 1.5)}" y="${y + 9}" width="3" height="6" fill="#8A1E4E"/><rect x="${r1(x + 1)}" y="${y + 3}" width="${r1(w - 2)}" height="9" rx="4.5" fill="#B03A6A"/><path d="M${r1(x + 4)} ${y + 4} Q${r1(x + w / 2)} ${y + 8} ${r1(x + w - 4)} ${y + 4}" fill="none" stroke="${peleSolida}" stroke-width="2.2"/>`;
    }
    return `<rect x="${r1(x)}" y="${y}" width="${w}" height="14" rx="7" fill="${LIMA}"/><rect x="${r1(x)}" y="${y + 10}" width="${w}" height="4" rx="2" fill="#ffffff"/>
      <path d="M${r1(x + w * 0.32)} ${y + 3.5} h5 M${r1(x + w * 0.32)} ${y + 7} h6" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round"/>`;
  };

  /* Braços */
  const larg = Math.max(M, W);
  const ombro: Pt = [-S + 9, 124];
  const poses: Record<Pose, { mao: Pt; ctrl: Pt }> = {
    baixo: { mao: [-larg - A * 0.45 - 2, abatido ? 212 : 206], ctrl: [-Math.max(S, larg) - 10, 152] },
    andar: { mao: [-larg - A * 0.45 - 2, passo === 0 ? 198 : 214], ctrl: [-Math.max(S, larg) - 10, 152] },
    cima: { mao: [-S - 24, 60], ctrl: [-S - 26, 108] },
    orar: { mao: [-5, 150], ctrl: [-S + 4, 182] },
    livro: { mao: [-26, 178], ctrl: [-S - 2, 188] },
    correr: { mao: [-S - 8, 140], ctrl: [-S - 24, 180] },
  };
  const { mao, ctrl } = poses[pose];
  const maoD: Pt = andar ? [mao[0], passo === 0 ? 214 : 198] : mao;
  // Pontos absolutos de cada braço: s = 1 esquerda, s = -1 direita
  const pts = (s: number, m: Pt): [Pt, Pt, Pt] => [[X(s * ombro[0]), ombro[1]], [X(s * ctrl[0]), ctrl[1]], [X(s * m[0]), m[1]]];
  const bE = pts(1, mao), bD = pts(-1, maoD);
  const curva = (b: [Pt, Pt, Pt]) => `M${b[0][0]} ${b[0][1]} Q${b[1][0]} ${b[1][1]} ${b[2][0]} ${b[2][1]}`;
  const ambos = `${curva(bE)} ${curva(bD)}`;
  const curta = topo === 'camiseta' || topo === 'polo' || topo === 'blusa' || vestido;
  const semManga = topo === 'regata';
  let bracos: string;
  if (curta || semManga) {
    const fim = topo === 'blusa' ? 0.34 : 0.38, grossa = topo === 'blusa' ? 6 : 2;
    const manga = semManga ? '' : `${trecho(...bE, 0, fim)} ${trecho(...bD, 0, fim)}`;
    bracos = `<path d="${ambos}" fill="none" stroke="${mix(look.pele, '#7a2a3a', 0.2)}" stroke-width="${r1(A + 1)}" stroke-linecap="round"/>
      <path d="${ambos}" fill="none" stroke="${peleSolida}" stroke-width="${r1(A - 2)}" stroke-linecap="round"/>
      <path d="${manga}" fill="none" stroke="${escuro}" stroke-opacity="0.35" stroke-width="${r1(A + grossa + 2)}" stroke-linecap="round"/>
      <path d="${manga}" fill="none" stroke="url(#${id}r)" stroke-width="${r1(A + grossa)}" stroke-linecap="round"/>`;
  } else {
    const punho = topo === 'camisa' || topo === 'jaqueta' || topo === 'blazer'
      ? `<path d="${trecho(...bE, 0.86, 0.95)} ${trecho(...bD, 0.86, 0.95)}" fill="none" stroke="${topo === 'camisa' ? claro : topo === 'blazer' ? '#FFFFFF' : escuro}" stroke-width="${r1(A + 0.5)}" stroke-linecap="butt"/>`
      : '';
    bracos = `<path d="${ambos}" fill="none" stroke="${escuro}" stroke-opacity="0.35" stroke-width="${r1(A + 3)}" stroke-linecap="round"/>
      <path d="${ambos}" fill="none" stroke="url(#${id}r)" stroke-width="${r1(A)}" stroke-linecap="round"/>${punho}`;
  }
  const livro = pose === 'livro'
    ? `<rect x="72" y="160" width="56" height="36" rx="4" fill="${TINTA}"/><rect x="75" y="193" width="50" height="4" rx="2" fill="#FBF3F8"/>
       <path d="M100 167 L100 187 M93 174 L107 174" stroke="${LIMA}" stroke-width="2.6" stroke-linecap="round"/>`
    : '';
  const maos = `<circle cx="${bE[2][0]}" cy="${bE[2][1]}" r="${r1(A / 2 + 1.5)}" fill="${pele}"/><circle cx="${bD[2][0]}" cy="${bD[2][1]}" r="${r1(A / 2 + 1.5)}" fill="${pele}"/>`;

  /* Roupa de cima */
  let detalhes = '';
  if (topo === 'moletom') {
    detalhes = `<rect x="${X(-M * 0.55)}" y="180" width="${r1(M * 1.1)}" height="24" rx="10" fill="${escuro}" opacity="0.25"/>
      <path d="M80 115 Q100 132 120 115" fill="none" stroke="${mix(claro, '#ffffff', 0.35)}" stroke-width="6" stroke-linecap="round"/>
      <path d="M94 124 L92 146 M106 124 L108 146" stroke="#FFE3F0" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="92" cy="147" r="2.2" fill="#FFE3F0"/><circle cx="108" cy="147" r="2.2" fill="#FFE3F0"/>`;
  } else if (topo === 'camiseta') {
    detalhes = `<path d="M86 113 Q100 130 114 113 Z" fill="${pele}"/><path d="M85 113.5 Q100 131 115 113.5" fill="none" stroke="${escuro}" stroke-opacity="0.35" stroke-width="3"/>
      <path d="M100 150 V166 M93 156 H107" stroke="${mix(claro, '#ffffff', 0.5)}" stroke-width="3" stroke-linecap="round" opacity="0.8"/>`;
  } else if (topo === 'camisa') {
    detalhes = `<path d="M90 113 L100 129 L110 113 Z" fill="${pele}"/>
      <path d="M86 111 L100 129 L91 135 Z M114 111 L100 129 L109 135 Z" fill="${mix(claro, '#ffffff', 0.4)}"/>
      <path d="M100 129 V218" stroke="${escuro}" stroke-opacity="0.4" stroke-width="1.6"/>
      ${[146, 166, 186, 206].map(y => `<circle cx="100" cy="${y}" r="1.8" fill="${mix(claro, '#ffffff', 0.6)}"/>`).join('')}`;
  } else if (topo === 'jaqueta') {
    detalhes = `<path d="M91 114 L109 114 L107 222 L93 222 Z" fill="#FBF3F8"/><path d="M92 113 Q100 123 108 113 Z" fill="${pele}"/>
      <path d="M91 114 L99 146 L86 156 L83 120 Z M109 114 L101 146 L114 156 L117 120 Z" fill="${mix(base, '#000000', 0.18)}"/>
      <rect x="${X(-M * 0.62)}" y="186" width="10" height="3" rx="1.5" fill="${escuro}"/><rect x="${X(M * 0.62 - 10)}" y="186" width="10" height="3" rx="1.5" fill="${escuro}"/>`;
  } else if (topo === 'polo') {
    detalhes = `<path d="M94 113 L100 125 L106 113 Z" fill="${pele}"/>
      <path d="M85 111 L97 120 L91 127 Z M115 111 L103 120 L109 127 Z" fill="${mix(claro, '#ffffff', 0.4)}"/>
      <path d="M100 124 V142" stroke="${escuro}" stroke-opacity="0.4" stroke-width="1.6"/><circle cx="100" cy="130" r="1.6" fill="#ffffff"/><circle cx="100" cy="137" r="1.6" fill="#ffffff"/>`;
  } else if (topo === 'regata') {
    detalhes = `<path d="M82 113 Q100 138 118 113 Z" fill="${pele}"/>
      <ellipse cx="${X(-S + 7)}" cy="124" rx="10" ry="13" fill="${pele}"/><ellipse cx="${X(S - 7)}" cy="124" rx="10" ry="13" fill="${pele}"/>`;
  } else if (topo === 'blazer') {
    detalhes = `<path d="M90 113 L110 113 L104 206 L96 206 Z" fill="#FFFFFF"/><path d="M93 113 Q100 120 107 113 Z" fill="${pele}"/>
      <path d="M98 121 H102 L104 166 L100 173 L96 166 Z" fill="#FE0472"/><rect x="96.5" y="117" width="7" height="6" rx="2" fill="#C8005A"/>
      <path d="M90 113 L98 152 L84 162 L81 121 Z M110 113 L102 152 L116 162 L119 121 Z" fill="${mix(base, '#000000', 0.2)}"/>
      <circle cx="95" cy="188" r="2.2" fill="${escuro}"/><circle cx="95" cy="202" r="2.2" fill="${escuro}"/>
      <path d="M${X(S * 0.36)} 150 h7 l-3.5 -6 Z" fill="${LIMA}"/>`;
  } else if (topo === 'blusa') {
    detalhes = `<path d="M86 113 Q100 128 114 113 Z" fill="${pele}"/>
      <path d="M84 114 q4 6 8 1 q4 6 8 1 q4 6 8 1 q4 6 8 1" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.9"/>
      <path d="M${X(-M * 0.9)} 200 Q100 206 ${X(M * 0.9)} 200" fill="none" stroke="${escuro}" stroke-opacity="0.3" stroke-width="2"/>`;
  } else {
    const longo = topo === 'vestidoLongo', abre = longo ? 22 : 16, barra = longo ? 300 : 264;
    detalhes = `<path d="M84 113 Q100 133 116 113 Z" fill="${pele}"/>
      <path d="M${X(-M * 0.95)} 196 L${X(M * 0.95)} 196 L${X(W + abre)} ${barra} Q100 ${barra + 8} ${X(-W - abre)} ${barra} Z" fill="url(#${id}r)"/>
      <path d="M${X(-M * 0.92)} 197 H${X(M * 0.92)}" stroke="${escuro}" stroke-width="3" stroke-linecap="round"/>`;
  }
  const capuz = topo === 'moletom' ? `<path d="M70 122 C72 104 128 104 130 122 Z" fill="${claro}"/>` : '';
  const corpo = `${capuz}
    <rect x="91" y="96" width="18" height="24" rx="7" fill="${mix(look.pele, '#7a2a3a', 0.18)}"/>
    <ellipse cx="100" cy="106" rx="13" ry="4" fill="${mix(look.pele, '#7a2a3a', 0.35)}" opacity="0.45"/>
    <path d="${torso}" fill="url(#${id}r)"/>
    <ellipse cx="${X(-S * 0.38)}" cy="150" rx="${r1(S * 0.2)}" ry="18" fill="#ffffff" opacity="0.1"/>
    ${!vestido ? `<path d="M${X(-W + 5)} 214 L${X(W - 5)} 214" stroke="${escuro}" stroke-opacity="0.4" stroke-width="2"/>` : ''}
    ${detalhes}
    ${bracos}${livro}${maos}`;

  const c = cabeca(id, look, humor, !!op.olhosFechados, !!op.fones);
  const tCabeca = abatido ? 'translate(0 7) rotate(8 100 104)' : '';
  const radiante = humor === 'radiante';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${op.viewBox ?? '0 0 200 330'}">${defs(id, look, cima, corBaixo)}
    ${radiante ? `<circle cx="100" cy="160" r="100" fill="url(#${id}g)"/>` : ''}
    <ellipse cx="100" cy="312" rx="${r1(lerp(74, 52, f))}" ry="8" fill="#000000" opacity="0.16"/>
    ${grupo(tCabeca, c.tras)}
    ${pernasPele}${roupaBaixo}
    ${pe(lx - 9, sobeE)}${pe(rx - 1, sobeD)}
    ${grupo(abatido ? 'translate(0 4)' : '', corpo)}
    ${grupo(tCabeca, c.frente)}
    ${radiante ? `<g fill="${LIMA}">${estrela(34, 40, 9)}${estrela(168, 70, 7)}${estrela(178, 170, 5)}${estrela(20, 150, 6)}${estrela(150, 22, 5)}</g>` : ''}
  </svg>`;
}

export function dormindoSvg(look: Look): string {
  const id = 'p' + uid++;
  const cor = CORES_ROUPA[look.corTopo ?? look.moletom] ?? CORES_ROUPA.pink;
  const c = cabeca(id, look, 'adormecido', true, false);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 330">${defs(id, look, cor, CORES_ROUPA.ameixa)}
    <path d="M170 34 a16 16 0 1 0 14 22 a12 12 0 1 1 -14 -22 Z" fill="${LIMA}"/>
    <path d="M108 136 h10 l-10 12 h10 M126 108 h14 l-14 17 h14 M146 70 h19 l-19 23 h19" fill="none" stroke="${LIMA}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <ellipse cx="100" cy="300" rx="92" ry="8" fill="#000000" opacity="0.2"/>
    <rect x="10" y="150" width="30" height="146" rx="15" fill="#2A0A31"/>
    <rect x="10" y="222" width="182" height="66" rx="24" fill="#6A2A78"/>
    <rect x="16" y="212" width="170" height="26" rx="13" fill="#FFD1E6"/>
    <ellipse cx="70" cy="208" rx="34" ry="14" fill="#FBF3F8"/>
    <g transform="translate(72 186) rotate(-76) translate(-100 -72)">${c.tras}${c.frente}</g>
    <path d="M100 216 C98 198 112 192 128 194 L176 198 C188 200 190 210 188 222 L188 242 L100 242 Z" fill="url(#${id}b)"/>
    <path d="M124 198 L124 242 M150 198 L150 242" stroke="#FFE3F0" stroke-opacity="0.35" stroke-width="2"/>
  </svg>`;
}

// Só a cabeça, de olhos fechados, para deitar no travesseiro da cama isométrica
export function cabecaDeitada(look: Look): string {
  const id = 'p' + uid++;
  const c = cabeca(id, look, 'adormecido', true, false);
  return `${defs(id, look, CORES_ROUPA.pink, CORES_ROUPA.ameixa)}${c.tras}${c.frente}`;
}

function pegada() {
  return `<path d="M20 14 C32 14 36 28 34 42 C32 54 30 58 31 66 C32 76 26 82 20 82 C13 82 10 75 11 66 C12 56 6 48 6 36 C6 22 10 14 20 14 Z"/>
    <circle cx="30" cy="6" r="4.4"/><circle cx="22" cy="2.6" r="3.5"/><circle cx="15" cy="3.4" r="3"/><circle cx="9.5" cy="6.6" r="2.6"/><circle cx="5.4" cy="11" r="2.2"/>`;
}

export function iconeSvg(): string {
  const id = 'i' + uid++;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
    <defs>
      <linearGradient id="${id}p" gradientUnits="userSpaceOnUse" x1="0" y1="82" x2="14" y2="0">
        <stop offset="0" stop-color="#C8005A"/><stop offset="0.5" stop-color="#FE0472"/><stop offset="1" stop-color="#FF5AA8"/>
      </linearGradient>
      <linearGradient id="${id}l" gradientUnits="userSpaceOnUse" x1="0" y1="82" x2="14" y2="0">
        <stop offset="0" stop-color="#5FD400"/><stop offset="0.5" stop-color="#8AFF00"/><stop offset="1" stop-color="#D2FF8A"/>
      </linearGradient>
      <linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5A1A68"/><stop offset="1" stop-color="#2A0A31"/></linearGradient>
    </defs>
    <rect width="120" height="120" rx="28" fill="url(#${id}b)"/>
    <g transform="translate(26 40) rotate(-10) scale(0.72)" fill="url(#${id}p)">${pegada()}</g>
    <g transform="translate(92 16) rotate(10) scale(-0.72 0.72)" fill="url(#${id}l)">${pegada()}</g>
  </svg>`;
}
