// Arte do Faith Steps desenhada em código. Cada função devolve um SVG em texto,
// que o app desenha com <SvgXml> (react-native-svg) no celular e no navegador.

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rgb = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
export const mix = (a: string, b: string, t: number) =>
  '#' + rgb(a).map((v, i) => Math.round(lerp(v, rgb(b)[i], t)).toString(16).padStart(2, '0')).join('');
const r1 = (v: number) => Math.round(v * 10) / 10;

export type Cabelo = 'curto' | 'raspado' | 'longo' | 'chanel' | 'rabo' | 'coque' | 'trancas' | 'cacheado' | 'black';
export type Corpo = 'feminino' | 'masculino';
export type Barba = 'nenhuma' | 'curta' | 'cheia';
export type Humor = 'radiante' | 'normal' | 'abatido' | 'adormecido';
export type Pose = 'baixo' | 'cima' | 'orar' | 'livro' | 'correr' | 'andar';
export type Look = {
  pele: string;
  cabelo: Cabelo;
  corCabelo: string;
  moletom: string;
  corpo?: Corpo; // sem valor = masculino (perfis antigos)
  barba?: Barba;
  oculos?: boolean;
};

export const PELES = ['#F6D3B3', '#E9B48C', '#C98B62', '#A66A43', '#7A4A2E', '#55311D'];
export const CORES_CABELO = ['#2A1530', '#120A12', '#6B3A1C', '#B8813A', '#E2BC6E', '#A0432A', '#B9B2B8', '#FF8CC4'];
export const CABELOS_LISTA: { id: Cabelo; nome: string }[] = [
  { id: 'curto', nome: 'Curto' },
  { id: 'raspado', nome: 'Raspado' },
  { id: 'longo', nome: 'Longo' },
  { id: 'chanel', nome: 'Chanel' },
  { id: 'rabo', nome: 'Rabo de cavalo' },
  { id: 'coque', nome: 'Coque' },
  { id: 'trancas', nome: 'Tranças' },
  { id: 'cacheado', nome: 'Cacheado' },
  { id: 'black', nome: 'Black power' },
];

// Moletons: [claro, base, escuro]. Pink e lima nunca no mesmo degradê.
export const MOLETONS: Record<string, [string, string, string]> = {
  pink: ['#FF5AA8', '#FE0472', '#C8005A'],
  noite: ['#7A2D8C', '#4E1659', '#2A0A31'],
  rosa: ['#FFF0F7', '#FFD1E6', '#F2A6C8'],
  nevoa: ['#FFFFFF', '#FBF3F8', '#E3D3E0'],
  lima: ['#D2FF8A', '#8AFF00', '#5FD400'],
  apagado: ['#C98AA8', '#A2587E', '#7A3D5E'],
};

const TINTA = '#2A0A31', BOCA = '#7A1E3A', LIMA = '#8AFF00';
let uid = 0;

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
  return { tras, frente };
}

const TOPO = '<path d="M67 74 C63 44 84 34 100 34 C116 34 137 44 133 74 C128 56 116 48 100 48 C84 48 72 56 67 74 Z"/>';
const CABELOS: Record<Cabelo, { tras: string; frente: string }> = {
  curto: {
    tras: '',
    frente: '<path d="M66 76 C60 44 82 30 104 31 C126 32 140 50 134 78 C131 64 124 56 116 53 C106 58 90 58 80 54 C72 58 68 66 66 76 Z"/>',
  },
  raspado: {
    tras: '',
    frente: '<path d="M67 70 C65 44 84 37 100 37 C116 37 135 44 133 70 C127 56 115 50 100 50 C85 50 73 56 67 70 Z" opacity="0.92"/>',
  },
  longo: {
    tras: '<path d="M62 72 C58 36 142 36 138 72 C142 100 142 120 140 138 C120 146 80 146 60 138 C58 118 58 100 62 72 Z"/>',
    frente:
      '<path d="M67 74 C63 44 84 33 100 33 C118 33 137 44 133 74 C126 58 112 50 94 50 C82 52 72 60 67 74 Z"/>' +
      '<path d="M66 70 C62 90 64 110 70 128 L78 126 C72 108 72 90 74 72 Z"/><path d="M134 70 C138 90 136 110 130 128 L122 126 C128 108 128 90 126 72 Z"/>',
  },
  chanel: {
    tras: '<path d="M60 72 C56 34 144 34 140 72 L142 106 C128 114 72 114 58 106 Z"/>',
    frente: '<path d="M66 64 C62 36 86 30 100 30 C114 30 138 36 134 64 C120 57 80 57 66 64 Z"/>',
  },
  rabo: {
    tras: '<path d="M118 40 C150 36 160 84 148 124 C144 136 130 134 134 118 C142 90 136 64 114 54 Z"/>',
    frente: TOPO + '<circle cx="124" cy="46" r="6"/>',
  },
  coque: {
    tras: '<circle cx="100" cy="30" r="15"/>',
    frente: TOPO,
  },
  trancas: {
    tras:
      '<path d="M62 72 C58 36 142 36 138 72 C144 104 144 136 140 160 C120 168 80 168 60 160 C56 136 56 104 62 72 Z"/>' +
      '<path d="M68 100 V158 M78 104 V162 M122 104 V162 M132 100 V158" stroke="#000000" stroke-opacity="0.2" stroke-width="3" fill="none"/>',
    frente: '<path d="M67 74 C63 44 84 33 100 37 C116 33 137 44 133 74 C126 58 112 50 100 50 C88 50 74 58 67 74 Z"/>',
  },
  cacheado: cachos(41, 12),
  black: cachos(52, 15),
};

function defs(id: string, look: Look, moletom: [string, string, string]) {
  const [claro, base, escuro] = moletom;
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
      <stop offset="0" stop-color="#3A1044"/><stop offset="1" stop-color="#22072A"/>
    </linearGradient>
    <radialGradient id="${id}g" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${LIMA}" stop-opacity="0.55"/><stop offset="0.55" stop-color="${LIMA}" stop-opacity="0.14"/><stop offset="1" stop-color="${LIMA}" stop-opacity="0"/>
    </radialGradient>
  </defs>`;
}

function rosto(look: Look, humor: Humor, olhosFechados: boolean) {
  const fem = look.corpo === 'feminino';
  const corBoca = fem ? '#B0124F' : BOCA;
  const opac = humor === 'abatido' ? 0.08 : 0.22;
  const bochecha = `<circle cx="81" cy="88" r="6" fill="#FE0472" opacity="${opac}"/><circle cx="119" cy="88" r="6" fill="#FE0472" opacity="${opac}"/>`;
  let olhos: string, boca: string;
  if (olhosFechados || humor === 'adormecido') {
    olhos = `<path d="M84 77 Q88 81 92 77 M108 77 Q112 81 116 77" fill="none" stroke="${TINTA}" stroke-width="2.4" stroke-linecap="round"/>`;
    boca = humor === 'adormecido'
      ? `<path d="M97 93 Q100 95 103 93" fill="none" stroke="${corBoca}" stroke-width="2.2" stroke-linecap="round"/>`
      : `<path d="M93 92 Q100 96 107 92" fill="none" stroke="${corBoca}" stroke-width="2.4" stroke-linecap="round"/>`;
  } else if (humor === 'abatido') {
    olhos = `<ellipse cx="88" cy="79" rx="3.4" ry="2.6" fill="${TINTA}"/><ellipse cx="112" cy="79" rx="3.4" ry="2.6" fill="${TINTA}"/>
      <path d="M83 71 L93 67 M117 71 L107 67" stroke="${TINTA}" stroke-width="2.2" stroke-linecap="round"/>`;
    boca = `<path d="M93 96 Q100 91 107 96" fill="none" stroke="${corBoca}" stroke-width="2.4" stroke-linecap="round"/>`;
  } else {
    const olho = (x: number) => `<ellipse cx="${x}" cy="77" rx="3.6" ry="4.4" fill="${TINTA}"/><circle cx="${x + 1.3}" cy="75.4" r="1.3" fill="#ffffff"/>`;
    olhos = olho(88) + olho(112) +
      (fem ? `<path d="M84.6 73.6 L81.6 71.4 M115.4 73.6 L118.4 71.4" stroke="${TINTA}" stroke-width="1.6" stroke-linecap="round"/>` : '');
    boca = humor === 'radiante'
      ? `<path d="M90 89 Q100 104 110 89 Z" fill="${corBoca}"/><path d="M95 96.5 Q100 100.5 105 96.5 Q100 94.5 95 96.5 Z" fill="#FF7AA8"/>`
      : `<path d="M92 91 Q100 97 108 91" fill="none" stroke="${corBoca}" stroke-width="2.4" stroke-linecap="round"/>`;
  }
  return bochecha + olhos + boca;
}

function barba(look: Look, id: string) {
  if (look.corpo === 'feminino' || !look.barba || look.barba === 'nenhuma') return '';
  const forma = look.barba === 'curta'
    ? '<path d="M70 84 C72 104 86 112 100 112 C114 112 128 104 130 84 C126 96 116 102 100 102 C84 102 74 96 70 84 Z"/>'
    : '<path d="M67 76 C66 108 84 120 100 120 C116 120 134 108 133 76 C128 92 118 100 100 100 C82 100 72 92 67 76 Z"/>';
  return `<g fill="url(#${id}h)">${forma}<path d="M89 91 Q100 86 111 91 Q100 95 89 91 Z"/></g>`;
}

const oculos = (look: Look) => (look.oculos
  ? `<g fill="#ffffff" fill-opacity="0.15" stroke="${TINTA}" stroke-width="2.2"><circle cx="88" cy="77" r="8"/><circle cx="112" cy="77" r="8"/></g>
     <path d="M96 76 Q100 73 104 76 M80 75 L68 72 M120 75 L132 72" fill="none" stroke="${TINTA}" stroke-width="2.2" stroke-linecap="round"/>`
  : '');

function cabeca(id: string, look: Look, humor: Humor, olhosFechados: boolean, fones: boolean) {
  const c = CABELOS[look.cabelo] ?? CABELOS.curto;
  const orelha = mix(look.pele, '#7a2a3a', 0.1);
  const fone = fones
    ? `<path d="M64 74 C62 26 138 26 136 74" fill="none" stroke="${TINTA}" stroke-width="6" stroke-linecap="round"/>
       <rect x="56" y="64" width="13" height="24" rx="6" fill="${LIMA}"/><rect x="131" y="64" width="13" height="24" rx="6" fill="${LIMA}"/>`
    : '';
  return {
    tras: `<g fill="url(#${id}h)">${c.tras}</g>`,
    frente: `<ellipse cx="67" cy="78" rx="6" ry="8" fill="${orelha}"/><ellipse cx="133" cy="78" rx="6" ry="8" fill="${orelha}"/>
      <ellipse cx="100" cy="72" rx="33" ry="36" fill="url(#${id}s)"/>${barba(look, id)}${rosto(look, humor, olhosFechados)}${oculos(look)}
      <g fill="url(#${id}h)">${c.frente}</g>${fone}`,
  };
}

const estrela = (x: number, y: number, s: number) =>
  `<path d="M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s} Z"/>`;

const grupo = (transform: string, conteudo: string) => (transform ? `<g transform="${transform}">${conteudo}</g>` : conteudo);

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
  const moletom = MOLETONS[abatido ? 'apagado' : look.moletom] ?? MOLETONS.pink;
  const [claro, , escuro] = moletom;

  // Corpo calculado pela forma física (0 = fora de forma, 100 = atlético); o feminino tem cintura e ombros menores
  const S = lerp(44, 55, f) - (fem ? 5 : 0);
  const M = lerp(70, 35, f) - (fem ? 4 : 0);
  const W = lerp(60, 33, f) + (fem ? 3 : 0);
  const L = lerp(35, 22, f), A = lerp(22, 16, f) - (fem ? 1.5 : 0);
  const X = (v: number) => r1(100 + v);

  const torso = `M${X(-S)} 130 Q${X(-S)} 114 ${X(-S + 14)} 113 L${X(S - 14)} 113 Q${X(S)} 114 ${X(S)} 130 C${X(S)} 150 ${X(M)} 165 ${X(M)} 182 C${X(M)} 200 ${X(W + 4)} 212 ${X(W)} 222 L${X(-W)} 222 C${X(-W - 4)} 212 ${X(-M)} 200 ${X(-M)} 182 C${X(-M)} 165 ${X(-S)} 150 ${X(-S)} 130 Z`;

  // Andando: uma perna sobe de cada vez
  const andar = pose === 'andar', passo = op.passo ?? 0;
  const sobeE = andar && passo === 0 ? 7 : 0, sobeD = andar && passo === 1 ? 7 : 0;
  const lx = 100 - 3 - L, rx = 100 + 3;
  const pernas = `<path d="M${X(-W + 3)} 206 L${X(W - 3)} 206 Q${X(W - 3)} 232 ${r1(rx + L)} 240 L${r1(lx)} 240 Q${X(-W + 3)} 232 ${X(-W + 3)} 206 Z"/>
    <rect x="${r1(lx)}" y="226" width="${r1(L)}" height="${80 - sobeE}" rx="${r1(L / 2.4)}"/><rect x="${r1(rx)}" y="226" width="${r1(L)}" height="${80 - sobeD}" rx="${r1(L / 2.4)}"/>`;
  const sapato = (x: number, sobe: number) =>
    `<rect x="${r1(x)}" y="${296 - sobe}" width="${r1(L + 10)}" height="14" rx="7" fill="${LIMA}"/><rect x="${r1(x)}" y="${306 - sobe}" width="${r1(L + 10)}" height="4" rx="2" fill="#ffffff"/>`;

  const larg = Math.max(M, W);
  const ombro: [number, number] = [-S + 9, 124];
  const poses: Record<Pose, { mao: [number, number]; ctrl: [number, number] }> = {
    baixo: { mao: [-larg - A * 0.45 - 2, abatido ? 212 : 206], ctrl: [-Math.max(S, larg) - 10, 152] },
    andar: { mao: [-larg - A * 0.45 - 2, passo === 0 ? 198 : 214], ctrl: [-Math.max(S, larg) - 10, 152] },
    cima: { mao: [-S - 24, 60], ctrl: [-S - 26, 108] },
    orar: { mao: [-5, 150], ctrl: [-S + 4, 182] },
    livro: { mao: [-26, 178], ctrl: [-S - 2, 188] },
    correr: { mao: [-S - 8, 140], ctrl: [-S - 24, 180] },
  };
  const { mao, ctrl } = poses[pose];
  const maoD: [number, number] = andar ? [mao[0], passo === 0 ? 214 : 198] : mao;
  const braco = (s: number, m: [number, number]) => `M${X(s * ombro[0])} ${ombro[1]} Q${X(s * ctrl[0])} ${ctrl[1]} ${X(s * m[0])} ${m[1]}`;
  const tracos = `${braco(1, mao)} ${braco(-1, maoD)}`;
  const livro = pose === 'livro'
    ? `<rect x="72" y="160" width="56" height="36" rx="4" fill="${TINTA}"/><rect x="75" y="193" width="50" height="4" rx="2" fill="#FBF3F8"/>
       <path d="M100 167 L100 187 M93 174 L107 174" stroke="${LIMA}" stroke-width="2.6" stroke-linecap="round"/>`
    : '';
  const maos = `<circle cx="${X(mao[0])}" cy="${mao[1]}" r="${r1(A / 2 + 1.5)}" fill="url(#${id}s)"/><circle cx="${X(-maoD[0])}" cy="${maoD[1]}" r="${r1(A / 2 + 1.5)}" fill="url(#${id}s)"/>`;
  const bracos = `<path d="${tracos}" fill="none" stroke="${escuro}" stroke-opacity="0.35" stroke-width="${r1(A + 3)}" stroke-linecap="round"/>
    <path d="${tracos}" fill="none" stroke="url(#${id}r)" stroke-width="${r1(A)}" stroke-linecap="round"/>${livro}${maos}`;

  const corpo = `<path d="M70 122 C72 104 128 104 130 122 Z" fill="${claro}"/>
    <rect x="91" y="96" width="18" height="24" rx="7" fill="${mix(look.pele, '#7a2a3a', 0.18)}"/>
    <path d="${torso}" fill="url(#${id}r)"/>
    <rect x="${X(-M * 0.55)}" y="180" width="${r1(M * 1.1)}" height="24" rx="10" fill="${escuro}" opacity="0.25"/>
    <path d="M${X(-W + 5)} 214 L${X(W - 5)} 214" stroke="${escuro}" stroke-opacity="0.4" stroke-width="2"/>
    <path d="M80 115 Q100 132 120 115" fill="none" stroke="${mix(claro, '#ffffff', 0.35)}" stroke-width="6" stroke-linecap="round"/>
    <path d="M94 124 L92 146 M106 124 L108 146" stroke="#FFE3F0" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="92" cy="147" r="2.2" fill="#FFE3F0"/><circle cx="108" cy="147" r="2.2" fill="#FFE3F0"/>
    ${bracos}`;

  const c = cabeca(id, look, humor, !!op.olhosFechados, !!op.fones);
  const tCabeca = abatido ? 'translate(0 7) rotate(8 100 104)' : '';
  const radiante = humor === 'radiante';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${op.viewBox ?? '0 0 200 330'}">${defs(id, look, moletom)}
    ${radiante ? `<circle cx="100" cy="160" r="100" fill="url(#${id}g)"/>` : ''}
    <ellipse cx="100" cy="312" rx="${r1(lerp(74, 52, f))}" ry="8" fill="#000000" opacity="0.18"/>
    ${grupo(tCabeca, c.tras)}
    <g fill="url(#${id}c)">${pernas}</g>
    ${sapato(lx - 9, sobeE)}${sapato(rx - 1, sobeD)}
    ${grupo(abatido ? 'translate(0 4)' : '', corpo)}
    ${grupo(tCabeca, c.frente)}
    ${radiante ? `<g fill="${LIMA}">${estrela(34, 40, 9)}${estrela(168, 70, 7)}${estrela(178, 170, 5)}${estrela(20, 150, 6)}${estrela(150, 22, 5)}</g>` : ''}
  </svg>`;
}

export function dormindoSvg(look: Look): string {
  const id = 'p' + uid++;
  const moletom = MOLETONS[look.moletom] ?? MOLETONS.pink;
  const c = cabeca(id, look, 'adormecido', true, false);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 330">${defs(id, look, moletom)}
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
  return `${defs(id, look, MOLETONS.pink)}${c.tras}${c.frente}`;
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
