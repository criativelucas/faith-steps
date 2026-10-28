// Dados da casa (cômodos, vagas de decoração, easter eggs) e as miniaturas isométricas dos móveis da loja.
// A casa jogável é 3D e fica em Casa3D.tsx.
import { cabecaDeitada, mix, type Look } from './personagem';
import type { AtividadeId } from './jogo';

type P = [number, number];
const r1 = (v: number) => Math.round(v * 10) / 10;

export const LARG = 600, ALT = 480; // viewBox da cena
export const ESCALA = 20;
const S = ESCALA, OX = 300, OY = 190, W = 10, D = 10, H = 6.5, E = 0.35;
const C30 = Math.cos(Math.PI / 6);

// Projeção isométrica: x vai para a direita-baixo, y para a esquerda-baixo, z para cima
export const iso = (x: number, y: number, z = 0): P => [OX + (x - y) * C30 * S, OY + (x + y) * 0.5 * S - z * S];
// Volta da tela para o chão (z = 0)
export const doChao = (sx: number, sy: number): P => {
  const a = (sx - OX) / (C30 * S), b = (sy - OY) / (0.5 * S);
  return [(a + b) / 2, (b - a) / 2];
};

const pts = (ps: P[]) => ps.map(p => `${r1(p[0])},${r1(p[1])}`).join(' ');
const sombra = (c: string, t: number) => mix(c, '#1A0420', t);
const claro = (c: string, t: number) => mix(c, '#FFFFFF', t);

type Desenho = { svg: string; pts: P[] };
const novo = (): Desenho => ({ svg: '', pts: [] });

function poly(d: Desenho, ps: P[], cor: string, extra = '') {
  d.svg += `<polygon points="${pts(ps)}" fill="${cor}"${extra}/>`;
  d.pts.push(...ps);
}
function linha(d: Desenho, a: P, b: P, cor: string, largura = 2, extra = '') {
  d.svg += `<line x1="${r1(a[0])}" y1="${r1(a[1])}" x2="${r1(b[0])}" y2="${r1(b[1])}" stroke="${cor}" stroke-width="${largura}" stroke-linecap="round"${extra}/>`;
}
// Caixa: as três faces visíveis
function caixa(d: Desenho, x: number, y: number, z: number, w: number, dd: number, h: number, cor: string, extra = '') {
  poly(d, [iso(x, y + dd, z), iso(x + w, y + dd, z), iso(x + w, y + dd, z + h), iso(x, y + dd, z + h)], sombra(cor, 0.1), extra);
  poly(d, [iso(x + w, y, z), iso(x + w, y + dd, z), iso(x + w, y + dd, z + h), iso(x + w, y, z + h)], sombra(cor, 0.24), extra);
  poly(d, [iso(x, y, z + h), iso(x + w, y, z + h), iso(x + w, y + dd, z + h), iso(x, y + dd, z + h)], cor, extra);
}
// Sombra suave no chão embaixo de um móvel
const sombraChao = (d: Desenho, x: number, y: number, w: number, dd: number) =>
  poly(d, [iso(x - 0.1, y - 0.1), iso(x + w + 0.25, y - 0.1), iso(x + w + 0.25, y + dd + 0.25), iso(x - 0.1, y + dd + 0.25)], '#1A0420', ' opacity="0.07"');
// Retângulo na parede esquerda (plano x = 0), na direita (plano y = 0) ou no chão
const naParedeE = (d: Desenho, y: number, z: number, dd: number, h: number, cor: string, x = 0.02, extra = '') =>
  poly(d, [iso(x, y, z), iso(x, y + dd, z), iso(x, y + dd, z + h), iso(x, y, z + h)], cor, extra);
const naParedeD = (d: Desenho, x: number, z: number, w: number, h: number, cor: string, y = 0.02, extra = '') =>
  poly(d, [iso(x, y, z), iso(x + w, y, z), iso(x + w, y, z + h), iso(x, y, z + h)], cor, extra);
const noChao = (d: Desenho, x: number, y: number, w: number, dd: number, cor: string, extra = '', z = 0.01) =>
  poly(d, [iso(x, y, z), iso(x + w, y, z), iso(x + w, y + dd, z), iso(x, y + dd, z)], cor, extra);
// Elipse no chão ou numa parede (polígono, já com a perspectiva certa)
function circulo(d: Desenho, centro: (a: number, b: number) => P, r: number, cor: string, extra = '') {
  const ps: P[] = [];
  for (let i = 0; i < 24; i++) { const t = (i / 24) * Math.PI * 2; ps.push(centro(Math.cos(t) * r, Math.sin(t) * r)); }
  poly(d, ps, cor, extra);
}
// Desenho 2D preso num ponto da casa (plantas, violão, peixe...). caixa = [esquerda, topo, largura, altura] relativa
function figura(d: Desenho, x: number, y: number, z: number, svg: string, [l, t, w, h]: [number, number, number, number]) {
  const [sx, sy] = iso(x, y, z);
  d.svg += `<g transform="translate(${r1(sx)} ${r1(sy)})">${svg}</g>`;
  d.pts.push([sx + l, sy + t], [sx + l + w, sy + t + h]);
}

const LIMA = '#8AFF00', PINK = '#FE0472', NOITE = '#2A0A31', NEVOA = '#FBF3F8', ROSA = '#FFD1E6';
const MADEIRA = '#C9A88A', MADEIRA_CLARA = '#E0CDBE', AMEIXA_SUAVE = '#6A4A6E';

/* ---------- Tipos, cômodos e easter eggs ---------- */

export type ComodoId = 'quarto' | 'estudo' | 'sala' | 'cozinha' | 'banheiro';
export type Segredo = 'dracma' | 'pergaminho' | 'peixe' | 'patinho';
export type Alvo =
  | { tipo: 'atividade'; atividade: AtividadeId }
  | { tipo: 'visual' }
  | { tipo: 'roupas' }
  | { tipo: 'segredo'; segredo: Segredo };
export type Objeto = { id: string; rotulo: string; alvo: Alvo; ponto: P; caixa: [number, number, number, number] };
export type Comodo = { svg: string; objetos: Objeto[]; area: [number, number, number, number]; entrada: P };

export const LISTA_COMODOS: { id: ComodoId; nome: string; dica: string }[] = [
  { id: 'quarto', nome: 'Quarto', dica: 'Devocional, oração e guarda-roupa' },
  { id: 'estudo', nome: 'Sala de estudo', dica: 'Leitura, estudo e devocional' },
  { id: 'sala', nome: 'Sala', dica: 'Louvor, ensaio, igreja e exercício' },
  { id: 'cozinha', nome: 'Cozinha', dica: 'Louça, comida e oração à mesa' },
  { id: 'banheiro', nome: 'Banheiro', dica: 'Espelho: rosto e cabelo' },
];

export const SEGREDOS: Record<Segredo, string> = {
  dracma: 'Você achou a moeda perdida debaixo da cama, como na parábola da dracma (Lucas 15:8). +10 talentos!',
  pergaminho: '"Lâmpada para os meus pés é a tua palavra." Salmos 119:105',
  peixe: 'O peixe era o sinal secreto dos primeiros cristãos. Em grego, ichthys: Jesus Cristo, Filho de Deus, Salvador.',
  patinho: 'Quack! Tudo o que tem fôlego louve ao Senhor. Salmos 150:6',
};

/* ---------- Decoração: vagas onde os móveis comprados podem ficar ---------- */

export type TipoVaga = 'parede' | 'chao' | 'tapete';
type Ancora = { parede: 'E' | 'D'; u: number; z: number } | { x: number; y: number };
type Vaga = { id: string; comodo: ComodoId; tipo: TipoVaga; nome: string; ancora: Ancora };

export const VAGAS: Vaga[] = [
  { id: 'quarto-parede', comodo: 'quarto', tipo: 'parede', nome: 'Parede acima da cama', ancora: { parede: 'E', u: 3.1, z: 4.1 } },
  { id: 'quarto-parede2', comodo: 'quarto', tipo: 'parede', nome: 'Parede do fundo', ancora: { parede: 'D', u: 2.0, z: 4.1 } },
  { id: 'quarto-canto', comodo: 'quarto', tipo: 'chao', nome: 'Canto do quarto', ancora: { x: 9.1, y: 1.0 } },
  { id: 'quarto-tapete', comodo: 'quarto', tipo: 'tapete', nome: 'Chão do quarto', ancora: { x: 6.4, y: 6.4 } },
  { id: 'estudo-parede', comodo: 'estudo', tipo: 'parede', nome: 'Parede do fundo', ancora: { parede: 'D', u: 2.1, z: 3.9 } },
  { id: 'estudo-parede2', comodo: 'estudo', tipo: 'parede', nome: 'Parede acima da poltrona', ancora: { parede: 'E', u: 7.0, z: 4.0 } },
  { id: 'estudo-canto', comodo: 'estudo', tipo: 'chao', nome: 'Ao lado da poltrona', ancora: { x: 1.4, y: 8.7 } },
  { id: 'estudo-tapete', comodo: 'estudo', tipo: 'tapete', nome: 'Chão da sala de estudo', ancora: { x: 6.5, y: 6.6 } },
  { id: 'sala-parede', comodo: 'sala', tipo: 'parede', nome: 'Parede acima do sofá', ancora: { parede: 'E', u: 4.3, z: 3.7 } },
  { id: 'sala-parede2', comodo: 'sala', tipo: 'parede', nome: 'Parede do som', ancora: { parede: 'D', u: 5.1, z: 3.3 } },
  { id: 'sala-canto', comodo: 'sala', tipo: 'chao', nome: 'Canto da sala', ancora: { x: 9.3, y: 0.9 } },
  { id: 'sala-tapete', comodo: 'sala', tipo: 'tapete', nome: 'Chão da sala', ancora: { x: 5.1, y: 4.8 } },
  { id: 'banheiro-parede', comodo: 'banheiro', tipo: 'parede', nome: 'Parede da banheira', ancora: { parede: 'E', u: 3.2, z: 3.9 } },
  { id: 'banheiro-canto', comodo: 'banheiro', tipo: 'chao', nome: 'Canto do banheiro', ancora: { x: 9.3, y: 2.3 } },
  { id: 'banheiro-tapete', comodo: 'banheiro', tipo: 'tapete', nome: 'Chão do banheiro', ancora: { x: 6.3, y: 5.8 } },
  { id: 'cozinha-parede', comodo: 'cozinha', tipo: 'parede', nome: 'Parede da cozinha', ancora: { parede: 'D', u: 5, z: 4 } },
  { id: 'cozinha-canto', comodo: 'cozinha', tipo: 'chao', nome: 'Canto da cozinha', ancora: { x: 5, y: 5 } },
  { id: 'cozinha-tapete', comodo: 'cozinha', tipo: 'tapete', nome: 'Chão da cozinha', ancora: { x: 5, y: 5 } },
];

// Desenhos dos móveis da loja. Parede: (parede, u, z) é o centro; chão e tapete: (x, y) é o centro.
type NaParede = { parede: 'E' | 'D'; u: number; z: number };
const naParede = (a: NaParede, du: number, dz: number, off = 0.03): P =>
  a.parede === 'E' ? iso(off, a.u + du, a.z + dz) : iso(a.u + du, off, a.z + dz);
const quadroParede = (d: Desenho, a: NaParede, du0: number, dz0: number, w: number, h: number, cor: string, off = 0.03) =>
  poly(d, [naParede(a, du0, dz0, off), naParede(a, du0 + w, dz0, off), naParede(a, du0 + w, dz0 + h, off), naParede(a, du0, dz0 + h, off)], cor);
// Para paredes, "u" cresce para a esquerda na parede E e para a direita na parede D; os desenhos são simétricos

type Movel = { nome: string; tipo: TipoVaga; desenhar: (d: Desenho, a: any) => void };
export const MOVEIS: Record<string, Movel> = {
  quadro: {
    nome: 'Quadro "Fé"', tipo: 'parede',
    desenhar: (d, a: NaParede) => {
      quadroParede(d, a, -1.1, -0.9, 2.2, 1.8, MADEIRA);
      quadroParede(d, a, -0.95, -0.75, 1.9, 1.5, NEVOA, 0.04);
      linha(d, naParede(a, 0, -0.5, 0.05), naParede(a, 0, 0.5, 0.05), PINK, 3);
      linha(d, naParede(a, -0.38, 0.15, 0.05), naParede(a, 0.38, 0.15, 0.05), PINK, 3);
    },
  },
  cruz: {
    nome: 'Cruz de madeira', tipo: 'parede',
    desenhar: (d, a: NaParede) => {
      quadroParede(d, a, -0.17, -1.2, 0.34, 2.4, MADEIRA);
      quadroParede(d, a, -0.75, 0.25, 1.5, 0.34, MADEIRA);
      quadroParede(d, a, -0.1, -1.1, 0.12, 2.2, claro(MADEIRA, 0.25), 0.04);
    },
  },
  relogio: {
    nome: 'Relógio', tipo: 'parede',
    desenhar: (d, a: NaParede) => {
      circulo(d, (u, z) => naParede(a, u, z), 0.85, AMEIXA_SUAVE);
      circulo(d, (u, z) => naParede(a, u, z, 0.04), 0.7, '#FFFFFF');
      linha(d, naParede(a, 0, 0, 0.05), naParede(a, 0, 0.5, 0.05), NOITE, 2);
      linha(d, naParede(a, 0, 0, 0.05), naParede(a, 0.35, 0, 0.05), PINK, 2);
    },
  },
  prateleira: {
    nome: 'Prateleira com plantas', tipo: 'parede',
    desenhar: (d, a: NaParede) => {
      if (a.parede === 'D') caixa(d, a.u - 1.1, 0.03, a.z - 0.4, 2.2, 0.55, 0.12, MADEIRA);
      else caixa(d, 0.03, a.u - 1.1, a.z - 0.4, 0.55, 2.2, 0.12, MADEIRA);
      for (const du of [-0.6, 0.55]) {
        const [sx, sy] = naParede(a, du, -0.28, 0.3);
        d.svg += `<g transform="translate(${r1(sx)} ${r1(sy)})"><rect x="-5" y="-9" width="10" height="9" rx="2" fill="${PINK}"/><ellipse cx="-3" cy="-13" rx="4" ry="6" fill="#93C06C"/><ellipse cx="3" cy="-14" rx="4" ry="7" fill="#A9CF86"/></g>`;
        d.pts.push([sx - 8, sy - 21], [sx + 8, sy + 1]);
      }
    },
  },
  espelhoRedondo: {
    nome: 'Espelho redondo', tipo: 'parede',
    desenhar: (d, a: NaParede) => {
      circulo(d, (u, z) => naParede(a, u, z), 0.95, '#E79BB9');
      circulo(d, (u, z) => naParede(a, u, z, 0.04), 0.8, '#DDF0FF');
      linha(d, naParede(a, -0.35, 0.1, 0.05), naParede(a, 0, 0.45, 0.05), '#FFFFFF', 2.4);
    },
  },
  poster: {
    nome: 'Pôster de louvor', tipo: 'parede',
    desenhar: (d, a: NaParede) => {
      quadroParede(d, a, -0.8, -1.1, 1.6, 2.2, NOITE);
      circulo(d, (u, z) => naParede(a, u - 0.15, z - 0.35, 0.04), 0.3, LIMA);
      linha(d, naParede(a, 0.13, -0.35, 0.05), naParede(a, 0.13, 0.5, 0.05), LIMA, 2.4);
      linha(d, naParede(a, 0.13, 0.5, 0.05), naParede(a, 0.45, 0.3, 0.05), LIMA, 2.4);
    },
  },
  planta: {
    nome: 'Planta', tipo: 'chao',
    desenhar: (d, { x, y }: { x: number; y: number }) => {
      sombraChao(d, x - 0.4, y - 0.4, 0.8, 0.8);
      caixa(d, x - 0.4, y - 0.4, 0, 0.8, 0.8, 0.8, PINK);
      caixa(d, x - 0.45, y - 0.45, 0.8, 0.9, 0.9, 0.1, '#C8005A');
      figura(d, x, y, 0.9,
        `<ellipse cx="-9" cy="-20" rx="9" ry="20" fill="#88B862" transform="rotate(-20 -9 -20)"/><ellipse cx="9" cy="-22" rx="9" ry="22" fill="#A9CF86" transform="rotate(18 9 -22)"/><ellipse cy="-30" rx="8" ry="24" fill="#93C06C"/>`,
        [-20, -56, 40, 56]);
    },
  },
  luminaria: {
    nome: 'Luminária de chão', tipo: 'chao',
    desenhar: (d, { x, y }: { x: number; y: number }) => {
      figura(d, x, y, 3.3, `<circle r="40" fill="${LIMA}" opacity="0.12"/>`, [-40, -40, 80, 80]);
      caixa(d, x - 0.3, y - 0.3, 0, 0.6, 0.6, 0.08, NOITE);
      caixa(d, x - 0.06, y - 0.06, 0.08, 0.12, 0.12, 3.0, NOITE);
      caixa(d, x - 0.42, y - 0.42, 3.05, 0.85, 0.85, 0.7, PINK);
    },
  },
  puff: {
    nome: 'Puff', tipo: 'chao',
    desenhar: (d, { x, y }: { x: number; y: number }) => {
      sombraChao(d, x - 0.55, y - 0.55, 1.1, 1.1);
      caixa(d, x - 0.55, y - 0.55, 0, 1.1, 1.1, 0.65, '#E79BB9');
      caixa(d, x - 0.5, y - 0.5, 0.65, 1.0, 1.0, 0.08, ROSA);
      figura(d, x, y, 0.74, `<circle r="2" fill="#C8005A"/>`, [-2, -2, 4, 4]);
    },
  },
  estantinha: {
    nome: 'Estante pequena', tipo: 'chao',
    desenhar: (d, { x, y }: { x: number; y: number }) => {
      sombraChao(d, x - 0.5, y - 0.3, 1.0, 0.6);
      caixa(d, x - 0.5, y - 0.3, 0, 1.0, 0.6, 1.7, MADEIRA);
      for (const [z, cor] of [[0.25, PINK], [0.95, '#42124C']] as const) {
        poly(d, [iso(x - 0.4, y + 0.31, z), iso(x + 0.4, y + 0.31, z), iso(x + 0.4, y + 0.31, z + 0.55), iso(x - 0.4, y + 0.31, z + 0.55)], cor);
      }
    },
  },
  teclado: {
    nome: 'Teclado musical', tipo: 'chao',
    desenhar: (d, { x, y }: { x: number; y: number }) => {
      for (const dx of [-0.6, 0.5]) caixa(d, x + dx, y - 0.2, 0, 0.1, 0.5, 1.1, NOITE);
      caixa(d, x - 0.8, y - 0.35, 1.1, 1.6, 0.7, 0.18, NOITE);
      noChao(d, x - 0.75, y, 1.5, 0.3, '#FFFFFF', '', 1.29);
      for (let k = 0; k < 6; k++) linha(d, iso(x - 0.6 + k * 0.25, y, 1.3), iso(x - 0.6 + k * 0.25, y + 0.15, 1.3), NOITE, 1.2);
    },
  },
  vaso: {
    nome: 'Vaso de flores', tipo: 'chao',
    desenhar: (d, { x, y }: { x: number; y: number }) => {
      sombraChao(d, x - 0.3, y - 0.3, 0.6, 0.6);
      caixa(d, x - 0.3, y - 0.3, 0, 0.6, 0.6, 1.1, '#FBF8F4');
      figura(d, x, y, 1.1,
        `<path d="M0 0 V-18 M-5 0 L-10 -16 M5 0 L10 -14" stroke="#88B862" stroke-width="2"/><circle cy="-20" r="5" fill="${PINK}"/><circle cx="-10" cy="-18" r="4.5" fill="${ROSA}"/><circle cx="10" cy="-16" r="4.5" fill="#E79BB9"/><circle cy="-20" r="1.8" fill="#FFE9A8"/>`,
        [-15, -26, 30, 26]);
    },
  },
  versiculo: {
    nome: 'Quadro de versículo', tipo: 'parede',
    desenhar: (d, a: NaParede) => {
      quadroParede(d, a, -1.0, -1.1, 2.0, 2.2, MADEIRA);
      quadroParede(d, a, -0.85, -0.95, 1.7, 1.9, '#FBF8F4', 0.04);
      linha(d, naParede(a, 0, 0.45, 0.05), naParede(a, 0, 0.75, 0.05), PINK, 2);
      linha(d, naParede(a, -0.12, 0.62, 0.05), naParede(a, 0.12, 0.62, 0.05), PINK, 2);
      for (const [dz, w] of [[0.15, 0.6], [-0.15, 0.5], [-0.45, 0.6], [-0.7, 0.3]]) linha(d, naParede(a, -w, dz, 0.05), naParede(a, w, dz, 0.05), AMEIXA_SUAVE, 1.6, ' opacity="0.7"');
    },
  },
  paisagem: {
    nome: 'Quadro de paisagem', tipo: 'parede',
    desenhar: (d, a: NaParede) => {
      quadroParede(d, a, -1.3, -0.95, 2.6, 1.9, '#FFFFFF');
      quadroParede(d, a, -1.15, -0.8, 2.3, 1.6, '#FFE3EF', 0.04);
      poly(d, [naParede(a, -1.15, -0.8, 0.05), naParede(a, 1.15, -0.8, 0.05), naParede(a, 1.15, -0.2, 0.05), naParede(a, 0.3, 0.25, 0.05), naParede(a, -0.4, -0.15, 0.05), naParede(a, -1.15, 0.1, 0.05)], '#A9CF86');
      poly(d, [naParede(a, -1.15, -0.8, 0.06), naParede(a, 1.15, -0.8, 0.06), naParede(a, 1.15, -0.45, 0.06), naParede(a, 0.2, -0.3, 0.06), naParede(a, -1.15, -0.5, 0.06)], '#88B862');
      circulo(d, (u, z) => naParede(a, 0.65 + u, 0.4 + z, 0.06), 0.22, '#FFD27A');
    },
  },
  luzinhas: {
    nome: 'Varal de luzinhas', tipo: 'parede',
    desenhar: (d, a: NaParede) => {
      const ps: P[] = [];
      for (let i = 0; i <= 12; i++) { const u = -1.8 + i * 0.3; ps.push(naParede(a, u, 0.4 - 0.35 * Math.sin((i / 12) * Math.PI), 0.06)); }
      d.svg += `<polyline points="${pts(ps)}" fill="none" stroke="${AMEIXA_SUAVE}" stroke-width="1.4"/>`;
      d.pts.push(...ps);
      ps.forEach((p, i) => { if (i % 2) d.svg += `<circle cx="${r1(p[0])}" cy="${r1(p[1] + 3)}" r="3" fill="${['#FFD27A', PINK, LIMA][i % 3]}"/><circle cx="${r1(p[0])}" cy="${r1(p[1] + 3)}" r="7" fill="${['#FFD27A', PINK, LIMA][i % 3]}" opacity="0.18"/>`; });
    },
  },
  cacto: {
    nome: 'Cacto', tipo: 'chao',
    desenhar: (d, { x, y }: { x: number; y: number }) => {
      sombraChao(d, x - 0.3, y - 0.3, 0.6, 0.6);
      caixa(d, x - 0.3, y - 0.3, 0, 0.6, 0.6, 0.55, '#E0CDBE');
      figura(d, x, y, 0.55,
        `<rect x="-5" y="-34" width="10" height="34" rx="5" fill="#88B862"/><path d="M-5 -16 h-5 a3 3 0 0 1 -3 -3 v-7 a3 3 0 0 1 6 0 v4 h2 Z M5 -22 h5 a3 3 0 0 0 3 -3 v-6 a3 3 0 0 0 -6 0 v3 h-2 Z" fill="#93C06C"/><circle cy="-36" r="3" fill="${PINK}"/>`,
        [-13, -40, 26, 40]);
    },
  },
  cesto: {
    nome: 'Cesto com manta', tipo: 'chao',
    desenhar: (d, { x, y }: { x: number; y: number }) => {
      sombraChao(d, x - 0.5, y - 0.5, 1.0, 1.0);
      caixa(d, x - 0.5, y - 0.5, 0, 1.0, 1.0, 0.75, '#C9A88A');
      for (const z of [0.2, 0.42, 0.62]) linha(d, iso(x - 0.5, y + 0.51, z), iso(x + 0.5, y + 0.51, z), sombra('#C9A88A', 0.2), 1);
      caixa(d, x - 0.35, y - 0.35, 0.75, 0.7, 0.7, 0.25, ROSA);
      caixa(d, x - 0.2, y - 0.4, 0.75, 0.25, 0.8, 0.35, '#E79BB9');
    },
  },
  tapete: {
    nome: 'Tapete', tipo: 'tapete',
    desenhar: (d, { x, y }: { x: number; y: number }) => {
      noChao(d, x - 1.9, y - 1.6, 3.8, 3.2, '#E79BB9', ' opacity="0.6"');
      noChao(d, x - 1.5, y - 1.2, 3.0, 2.4, ROSA, ' opacity="0.55"', 0.02);
    },
  },
  tapeteRedondo: {
    nome: 'Tapete redondo', tipo: 'tapete',
    desenhar: (d, { x, y }: { x: number; y: number }) => {
      circulo(d, (a, b) => iso(x + a, y + b, 0.01), 1.8, '#C9B6D9', ' opacity="0.75"');
      circulo(d, (a, b) => iso(x + a, y + b, 0.02), 1.2, NEVOA, ' opacity="0.7"');
    },
  },
  tapeteListrado: {
    nome: 'Tapete listrado', tipo: 'tapete',
    desenhar: (d, { x, y }: { x: number; y: number }) => {
      noChao(d, x - 1.6, y - 1.2, 3.2, 2.4, NEVOA, ' opacity="0.85"');
      for (let i = 0; i < 4; i++) noChao(d, x - 1.6, y - 1.0 + i * 0.6, 3.2, 0.28, i % 2 ? LIMA : PINK, ' opacity="0.45"', 0.02);
    },
  },
};

// Onde ficam os móveis de quem comprou antes da decoração existir
export function casaPadrao(itens: string[]): Record<string, string> {
  const padrao: Record<string, string> = { quadro: 'quarto-parede', luminaria: 'estudo-canto', planta: 'sala-canto', tapete: 'sala-tapete' };
  return Object.fromEntries(Object.entries(padrao).filter(([item]) => itens.includes(item)).map(([item, vaga]) => [vaga, item]));
}

// Miniatura de um móvel para a loja
export function movelSvg(item: string): string {
  const mv = MOVEIS[item];
  if (!mv) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"/>`;
  const d = novo();
  mv.desenhar(d, mv.tipo === 'parede' ? { parede: 'D', u: 5, z: 3 } : { x: 5, y: 5 });
  const xs = d.pts.map(p => p[0]), ys = d.pts.map(p => p[1]);
  const x = Math.min(...xs), y = Math.min(...ys), w = Math.max(...xs) - x, h = Math.max(...ys) - y;
  const lado = Math.max(w, h) * 1.3;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r1(x + w / 2 - lado / 2)} ${r1(y + h / 2 - lado / 2)} ${r1(lado)} ${r1(lado)}">${d.svg}</svg>`;
}
