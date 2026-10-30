// Dados da casa (cômodos, vagas de decoração, easter eggs) e as miniaturas isométricas dos móveis da loja.
// A casa jogável é 3D e fica em Casa3D.tsx.
import { cabecaDeitada, mix, type Look } from './personagem.ts';
import type { AtividadeId, Mobilia, Perfil } from './jogo.ts';

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

export type ComodoId =
  | 'quarto' | 'estudo' | 'sala' | 'cozinha' | 'banheiro'
  | 'estudio' | 'academia' | 'jardim' | 'piscina' | 'garagem' | 'varanda';
export type Segredo = 'dracma' | 'pergaminho' | 'peixe' | 'patinho';
export type Alvo =
  | { tipo: 'atividade'; atividade: AtividadeId }
  | { tipo: 'visual' }
  | { tipo: 'roupas' }
  | { tipo: 'segredo'; segredo: Segredo };
export type Objeto = { id: string; rotulo: string; alvo: Alvo; ponto: P; caixa: [number, number, number, number] };
export type Comodo = { svg: string; objetos: Objeto[]; area: [number, number, number, number]; entrada: P };

export const LISTA_COMODOS: { id: ComodoId; nome: string; dica: string; item?: string }[] = [
  { id: 'quarto', nome: 'Quarto', dica: 'Devocional, caderno de intercessão e guarda-roupa' },
  { id: 'estudo', nome: 'Sala de estudo', dica: 'Leitura, memorização de versículos e estudo' },
  { id: 'sala', nome: 'Sala', dica: 'Louvor, pote da gratidão, TV e descanso sabático' },
  { id: 'cozinha', nome: 'Cozinha', dica: 'Momento de comunhão, geladeira, chá e oração' },
  { id: 'banheiro', nome: 'Banheiro', dica: 'Espelho interativo, banho e cuidados' },
  { id: 'estudio', nome: 'Estúdio de louvor', dica: 'Bateria, teclado e microfone', item: 'estudio' },
  { id: 'academia', nome: 'Academia', dica: 'Esteira, bicicleta e halteres', item: 'academia' },
  { id: 'jardim', nome: 'Jardim de Oração & Pergolado', dica: 'Pergolado, banco suspenso, fonte, pássaros e horta', item: 'jardim' },
  { id: 'piscina', nome: 'Área da Piscina & Deck', dica: 'Natação, espreguiçadeiras, água de coco, ducha e boia', item: 'piscina' },
  { id: 'garagem', nome: 'Garagem / Oficina Criativa', dica: 'Marcenaria, restauração e bicicleta para passeio', item: 'garagem' },
  { id: 'varanda', nome: 'Varanda Gourmet & Horta', dica: 'Mesa rústica de comunhão, expresso, chás e almoço', item: 'varanda' },
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
type Vaga = { id: string; comodo: ComodoId; tipo: TipoVaga; nome: string; ancora: Ancora; item?: string };

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
  { id: 'estudio-parede', comodo: 'estudio', item: 'estudio', tipo: 'parede', nome: 'Parede do estúdio', ancora: { parede: 'D', u: 5, z: 4 } },
  { id: 'estudio-canto', comodo: 'estudio', item: 'estudio', tipo: 'chao', nome: 'Canto do estúdio', ancora: { x: 5, y: 5 } },
  { id: 'academia-parede', comodo: 'academia', item: 'academia', tipo: 'parede', nome: 'Parede da academia', ancora: { parede: 'D', u: 5, z: 4 } },
  { id: 'academia-canto', comodo: 'academia', item: 'academia', tipo: 'chao', nome: 'Canto da academia', ancora: { x: 5, y: 5 } },
  { id: 'academia-tapete', comodo: 'academia', item: 'academia', tipo: 'tapete', nome: 'Chão da academia', ancora: { x: 5, y: 5 } },
  { id: 'piscina-canto', comodo: 'piscina', item: 'piscina', tipo: 'chao', nome: 'Deck da piscina', ancora: { x: 5, y: 5 } },
  { id: 'garagem-canto', comodo: 'garagem', item: 'garagem', tipo: 'chao', nome: 'Canto da oficina', ancora: { x: 5, y: 5 } },
  { id: 'varanda-canto', comodo: 'varanda', item: 'varanda', tipo: 'chao', nome: 'Canto da varanda', ancora: { x: 5, y: 5 } },
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
  girassol: {
    nome: 'Vaso de girassol', tipo: 'chao',
    desenhar: (d, { x, y }: { x: number; y: number }) => {
      sombraChao(d, x - 0.35, y - 0.35, 0.7, 0.7);
      caixa(d, x - 0.35, y - 0.35, 0, 0.7, 0.7, 0.85, '#C98B4A');
      caixa(d, x - 0.4, y - 0.4, 0.85, 0.8, 0.8, 0.1, '#A96B30');
      const petalas = Array.from({ length: 10 }, (_, k) => {
        const a = k * 36;
        return `<ellipse cx="0" cy="-34" rx="3.2" ry="7.5" fill="#F5B700" transform="rotate(${a} 0 -27)"/>`;
      }).join('');
      figura(d, x, y, 0.95,
        `<path d="M0 0 V-26" stroke="#6FA84A" stroke-width="3"/><ellipse cx="-7" cy="-12" rx="6" ry="3.5" fill="#88B862" transform="rotate(-25 -7 -12)"/><ellipse cx="7" cy="-16" rx="6" ry="3.5" fill="#88B862" transform="rotate(25 7 -16)"/>${petalas}<circle cy="-27" r="5.5" fill="#5A3420"/>`,
        [-16, -42, 32, 42]);
    },
  },
  bau: {
    nome: 'Baú de madeira', tipo: 'chao',
    desenhar: (d, { x, y }: { x: number; y: number }) => {
      sombraChao(d, x - 0.75, y - 0.45, 1.5, 0.9);
      caixa(d, x - 0.75, y - 0.45, 0, 1.5, 0.9, 0.75, '#A97850');
      caixa(d, x - 0.78, y - 0.48, 0.75, 1.56, 0.96, 0.28, MADEIRA);
      for (const dx of [-0.5, 0.4]) caixa(d, x + dx, y - 0.49, 0, 0.1, 0.98, 1.04, '#6B4E36');
      caixa(d, x - 0.08, y + 0.46, 0.62, 0.16, 0.06, 0.24, '#E8B83A');
    },
  },
  cadeiraBalanco: {
    nome: 'Cadeira de balanço', tipo: 'chao',
    desenhar: (d, { x, y }: { x: number; y: number }) => {
      sombraChao(d, x - 0.65, y - 0.7, 1.3, 1.4);
      for (const dx of [-0.52, 0.44]) {
        caixa(d, x + dx, y - 0.7, 0, 0.08, 1.4, 0.08, '#8A5A3C');
        caixa(d, x + dx, y - 0.45, 0.08, 0.08, 0.08, 0.65, MADEIRA);
        caixa(d, x + dx, y + 0.35, 0.08, 0.08, 0.08, 0.65, MADEIRA);
        caixa(d, x + dx, y - 0.45, 1.02, 0.1, 0.9, 0.08, MADEIRA);
      }
      caixa(d, x - 0.52, y - 0.45, 0.72, 1.04, 0.9, 0.08, MADEIRA);
      caixa(d, x - 0.44, y - 0.38, 0.8, 0.88, 0.76, 0.08, ROSA);
      caixa(d, x - 0.52, y - 0.48, 0.8, 1.04, 0.08, 0.95, MADEIRA);
    },
  },
  arvoreNatal: {
    nome: 'Árvore de Natal', tipo: 'chao',
    desenhar: (d, { x, y }: { x: number; y: number }) => {
      sombraChao(d, x - 0.55, y - 0.55, 1.1, 1.1);
      caixa(d, x - 0.28, y - 0.28, 0, 0.56, 0.56, 0.45, '#8A5A3C');
      figura(d, x, y, 0.45,
        `<polygon points="-24,0 24,0 0,-30" fill="#4E8C45"/><polygon points="-20,-18 20,-18 0,-46" fill="#5FA354"/><polygon points="-15,-34 15,-34 0,-60" fill="#73B865"/><polygon points="0,-69 2.5,-63 9,-63 4,-59 6,-53 0,-57 -6,-53 -4,-59 -9,-63 -2.5,-63" fill="#F5B700"/><circle cx="-9" cy="-12" r="2.8" fill="${PINK}"/><circle cx="10" cy="-15" r="2.8" fill="#F5B700"/><circle cx="-6" cy="-29" r="2.6" fill="#E63B2E"/><circle cx="7" cy="-32" r="2.6" fill="${PINK}"/><circle cx="0" cy="-45" r="2.5" fill="#F5B700"/>`,
        [-26, -71, 52, 72]);
    },
  },
  neon: {
    nome: 'Neon "Jesus"', tipo: 'parede',
    desenhar: (d, a: NaParede) => {
      quadroParede(d, a, -1.45, -0.65, 2.9, 1.3, NOITE);
      quadroParede(d, a, -1.35, -0.55, 2.7, 1.1, '#3A1244', 0.04);
      // Cruz luminosa + traços de neon na cor do tema
      linha(d, naParede(a, -0.85, -0.32, 0.06), naParede(a, -0.85, 0.35, 0.06), PINK, 3.2);
      linha(d, naParede(a, -1.08, 0.1, 0.06), naParede(a, -0.62, 0.1, 0.06), PINK, 3.2);
      linha(d, naParede(a, -0.32, 0.22, 0.06), naParede(a, 1.05, 0.22, 0.06), ROSA, 2.6);
      linha(d, naParede(a, -0.32, -0.12, 0.06), naParede(a, 0.85, -0.12, 0.06), PINK, 3);
    },
  },
  pomba: {
    nome: 'Quadro da pomba', tipo: 'parede',
    desenhar: (d, a: NaParede) => {
      quadroParede(d, a, -1.05, -0.95, 2.1, 1.9, '#FFFFFF');
      quadroParede(d, a, -0.9, -0.8, 1.8, 1.6, '#CFEAFF', 0.04);
      circulo(d, (u, z) => naParede(a, u, z - 0.08, 0.06), 0.34, '#FFFFFF');
      poly(d, [naParede(a, -0.05, 0.0, 0.07), naParede(a, -0.55, 0.52, 0.07), naParede(a, 0.15, 0.28, 0.07)], '#F7FAFF');
      poly(d, [naParede(a, 0.05, 0.02, 0.07), naParede(a, 0.52, 0.45, 0.07), naParede(a, 0.25, -0.05, 0.07)], '#FFFFFF');
      linha(d, naParede(a, 0.28, -0.08, 0.08), naParede(a, 0.56, -0.22, 0.08), '#6FA84A', 2);
    },
  },
  tv: {
    nome: 'TV', tipo: 'parede',
    desenhar: (d, a: NaParede) => {
      quadroParede(d, a, -1.65, -0.95, 3.3, 1.9, '#1E1624');
      quadroParede(d, a, -1.52, -0.82, 3.04, 1.64, '#5AA9E6', 0.04);
      poly(d, [naParede(a, -1.52, -0.82, 0.05), naParede(a, 1.52, -0.82, 0.05), naParede(a, 1.52, -0.28, 0.05), naParede(a, 0.2, 0.05, 0.05), naParede(a, -1.52, -0.35, 0.05)], '#7EC26B');
      circulo(d, (u, z) => naParede(a, 0.9 + u, 0.38 + z, 0.06), 0.22, '#FFE27A');
    },
  },
  calendario: {
    nome: 'Calendário', tipo: 'parede',
    desenhar: (d, a: NaParede) => {
      quadroParede(d, a, -0.85, -1.0, 1.7, 2.0, '#FFFFFF');
      quadroParede(d, a, -0.85, 0.52, 1.7, 0.48, PINK, 0.04);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
        quadroParede(d, a, -0.68 + c * 0.37, -0.78 + r * 0.38, 0.24, 0.24, r === 1 && c === 2 ? LIMA : '#EADFD3', 0.05);
      }
    },
  },
  tapeteFelpudo: {
    nome: 'Tapete felpudo', tipo: 'tapete',
    desenhar: (d, { x, y }: { x: number; y: number }) => {
      for (const [dx, dy, r] of [[0, 0, 1.45], [-0.85, 0.1, 1.0], [0.85, -0.1, 1.0], [0.1, 0.75, 0.95], [-0.15, -0.75, 0.95]]) {
        circulo(d, (a, b) => iso(x + dx + a, y + dy + b, 0.015), r, '#FAF4EE', ' opacity="0.92"');
      }
      circulo(d, (a, b) => iso(x + a, y + b, 0.025), 0.95, ROSA, ' opacity="0.45"');
    },
  },
  tapeteColorido: {
    nome: 'Tapete colorido', tipo: 'tapete',
    desenhar: (d, { x, y }: { x: number; y: number }) => {
      noChao(d, x - 1.8, y - 1.35, 3.6, 2.7, NEVOA, ' opacity="0.92"');
      noChao(d, x - 1.6, y - 1.15, 1.5, 1.05, PINK, ' opacity="0.65"', 0.02);
      noChao(d, x + 0.1, y - 1.15, 1.5, 1.05, '#FFD27A', ' opacity="0.8"', 0.02);
      noChao(d, x - 1.6, y + 0.1, 1.5, 1.05, '#7EC8E3', ' opacity="0.75"', 0.02);
      noChao(d, x + 0.1, y + 0.1, 1.5, 1.05, LIMA, ' opacity="0.6"', 0.02);
    },
  },
  quadroJosue: {
    nome: 'Quadro Lettering Josué 24:15', tipo: 'parede',
    desenhar: (d, a: NaParede) => {
      quadroParede(d, a, -1.2, -0.9, 2.4, 1.8, '#8A5A3C');
      quadroParede(d, a, -1.05, -0.75, 2.1, 1.5, '#FBF8F4', 0.04);
      linha(d, naParede(a, -0.7, 0.25, 0.05), naParede(a, 0.7, 0.25, 0.05), NOITE, 2.2);
      linha(d, naParede(a, -0.5, -0.05, 0.05), naParede(a, 0.5, -0.05, 0.05), PINK, 2.4);
      linha(d, naParede(a, -0.35, -0.35, 0.05), naParede(a, 0.35, -0.35, 0.05), '#C9A88A', 1.8);
    },
  },
  mapaPaulo: {
    nome: 'Mapa Viagens de Paulo', tipo: 'parede',
    desenhar: (d, a: NaParede) => {
      quadroParede(d, a, -1.35, -0.95, 2.7, 1.9, '#6B4E36');
      quadroParede(d, a, -1.2, -0.8, 2.4, 1.6, '#F3E5C8', 0.04);
      poly(d, [naParede(a, -1.1, -0.4, 0.05), naParede(a, 0.6, -0.4, 0.05), naParede(a, 0.8, 0.3, 0.05), naParede(a, -0.8, 0.4, 0.05)], '#9ED8F0');
      linha(d, naParede(a, 0.6, -0.2, 0.06), naParede(a, -0.5, 0.2, 0.06), '#E63B2E', 2);
    },
  },
  painelBotanico: {
    nome: 'Painel Árvores da Bíblia', tipo: 'parede',
    desenhar: (d, a: NaParede) => {
      quadroParede(d, a, -1.2, -0.95, 2.4, 1.9, MADEIRA);
      for (const du of [-0.6, 0.6]) {
        quadroParede(d, a, du - 0.45, -0.75, 0.9, 1.5, '#FBF8F4', 0.04);
        circulo(d, (u, z) => naParede(a, du + u, 0.1 + z, 0.05), 0.28, '#6FA84A');
        linha(d, naParede(a, du, -0.45, 0.05), naParede(a, du, 0.1, 0.05), '#7A5236', 2);
      }
    },
  },
  quadroSalmo23: {
    nome: 'Moldura Rústica Salmo 23', tipo: 'parede',
    desenhar: (d, a: NaParede) => {
      quadroParede(d, a, -1.05, -1.05, 2.1, 2.1, '#6B4E36');
      quadroParede(d, a, -0.88, -0.88, 1.76, 1.76, '#FFFDF7', 0.04);
      linha(d, naParede(a, -0.55, 0.3, 0.05), naParede(a, 0.55, 0.3, 0.05), '#6FA84A', 2.2);
      linha(d, naParede(a, -0.6, -0.05, 0.05), naParede(a, 0.6, -0.05, 0.05), AMEIXA_SUAVE, 1.8);
      linha(d, naParede(a, -0.4, -0.35, 0.05), naParede(a, 0.4, -0.35, 0.05), '#E8B83A', 2);
    },
  },
  poltronaCostela: {
    nome: 'Poltrona Costela Caramelo', tipo: 'chao',
    desenhar: (d, { x, y }: { x: number; y: number }) => {
      sombraChao(d, x - 0.65, y - 0.65, 1.3, 1.3);
      caixa(d, x - 0.55, y - 0.55, 0, 1.1, 1.1, 0.25, '#3A2A20');
      caixa(d, x - 0.6, y - 0.5, 0.25, 1.2, 1.0, 0.35, '#C67D3B');
      caixa(d, x - 0.6, y - 0.55, 0.6, 1.2, 0.28, 0.75, '#B56B2B');
    },
  },
  lustreNordico: {
    nome: 'Lustre Pendente Industrial', tipo: 'parede',
    desenhar: (d, a: NaParede) => {
      linha(d, naParede(a, 0, 0.9, 0.05), naParede(a, 0, 0.1, 0.05), NOITE, 2.4);
      quadroParede(d, a, -0.45, -0.1, 0.9, 0.3, '#2A2A30', 0.05);
      circulo(d, (u, z) => naParede(a, u, z - 0.2, 0.06), 0.22, '#FFD27A');
    },
  },
  estanteArvore: {
    nome: 'Estante Árvore de Livros', tipo: 'chao',
    desenhar: (d, { x, y }: { x: number; y: number }) => {
      sombraChao(d, x - 0.5, y - 0.35, 1.0, 0.7);
      caixa(d, x - 0.12, y - 0.25, 0, 0.24, 0.5, 2.1, '#8A5A3C');
      for (const [z, dx] of [[0.45, -0.45], [0.95, 0.1], [1.45, -0.45]] as const) {
        caixa(d, x + dx, y - 0.25, z, 0.55, 0.5, 0.1, MADEIRA);
      }
    },
  },
  tapeteNordico: {
    nome: 'Tapete Nórdico Geométrico', tipo: 'tapete',
    desenhar: (d, { x, y }: { x: number; y: number }) => {
      noChao(d, x - 1.7, y - 1.3, 3.4, 2.6, '#F5EFE6');
      noChao(d, x - 1.3, y - 0.9, 2.6, 1.8, '#D9C3B0', '', 0.015);
      noChao(d, x - 0.7, y - 0.45, 1.4, 0.9, '#C67D3B', '', 0.02);
    },
  },
  plantasVivas: {
    nome: 'Kit Plantas Vivas (Costela-de-Adão)', tipo: 'chao',
    desenhar: (d, { x, y }: { x: number; y: number }) => {
      sombraChao(d, x - 0.45, y - 0.45, 0.9, 0.9);
      caixa(d, x - 0.4, y - 0.4, 0, 0.8, 0.8, 0.75, '#E0CDBE');
      figura(d, x, y, 0.75,
        `<ellipse cx="-12" cy="-22" rx="11" ry="18" fill="#3B7A47" transform="rotate(-22 -12 -22)"/><ellipse cx="12" cy="-24" rx="11" ry="19" fill="#4E945B" transform="rotate(20 12 -24)"/><ellipse cx="0" cy="-32" rx="10" ry="22" fill="#5FA86D"/>`,
        [-24, -56, 48, 56]);
    },
  },
  poteGratidao: {
    nome: 'Pote da Gratidão Iluminado', tipo: 'chao',
    desenhar: (d, { x, y }: { x: number; y: number }) => {
      sombraChao(d, x - 0.3, y - 0.3, 0.6, 0.6);
      caixa(d, x - 0.3, y - 0.3, 0, 0.6, 0.6, 0.7, MADEIRA);
      caixa(d, x - 0.18, y - 0.18, 0.7, 0.36, 0.36, 0.45, '#FFE57F');
    },
  },
};

// Ilustrações dos cômodos, atividades e funções da loja (120 × 120)
const ILUSTRACOES: Record<string, string> = {
  piscina: `<rect x="12" y="32" width="96" height="64" rx="14" fill="#C9A88A"/><rect x="16" y="36" width="88" height="56" rx="10" fill="#FAF7F2"/><rect x="22" y="42" width="76" height="44" rx="8" fill="#0B5278"/><rect x="24" y="44" width="72" height="40" rx="6" fill="#28C5E6"/><path d="M28 56 Q38 52 48 56 T68 56 T88 56" fill="none" stroke="#FFFFFF" stroke-width="2.5" opacity="0.6"/><path d="M32 68 Q42 64 52 68 T72 68 T92 68" fill="none" stroke="#FFFFFF" stroke-width="2" opacity="0.4"/><ellipse cx="74" cy="62" rx="11" ry="8" fill="#FF4081"/><circle cx="74" cy="62" r="4.5" fill="#28C5E6"/><path d="M78 58 Q82 50 82 46" fill="none" stroke="#FF4081" stroke-width="3.5" stroke-linecap="round"/><circle cx="83" cy="45" r="3.5" fill="#FF4081"/><polygon points="86,44 91,46 86,48" fill="#FFD54F"/><line x1="28" y1="36" x2="28" y2="52" stroke="#E0E5EC" stroke-width="3" stroke-linecap="round"/><line x1="36" y1="36" x2="36" y2="52" stroke="#E0E5EC" stroke-width="3" stroke-linecap="round"/><line x1="28" y1="44" x2="36" y2="44" stroke="#E0E5EC" stroke-width="2.5"/><line x1="28" y1="50" x2="36" y2="50" stroke="#E0E5EC" stroke-width="2.5"/><circle cx="98" cy="22" r="10" fill="#FFD27A"/>`,
  jardim: `<rect x="14" y="68" width="92" height="36" rx="12" fill="#B8DC96"/><rect x="20" y="56" width="50" height="22" rx="4" fill="#C9A88A"/><rect x="24" y="53" width="42" height="6" rx="2" fill="#7A5236"/><circle cx="33" cy="50" r="7" fill="#7FB65A"/><circle cx="45" cy="48" r="8" fill="#6FA84A"/><circle cx="57" cy="50" r="7" fill="#7FB65A"/><circle cx="45" cy="46" r="3" fill="#E63B2E"/><circle cx="59" cy="48" r="2.8" fill="#E63B2E"/><ellipse cx="86" cy="78" rx="14" ry="7" fill="#D9D2CC"/><ellipse cx="86" cy="76" rx="11" ry="5" fill="#9ED8F0"/><rect x="83" y="60" width="6" height="16" rx="2" fill="#D9D2CC"/><ellipse cx="86" cy="60" rx="8" ry="3.5" fill="#9ED8F0"/><circle cx="92" cy="30" r="11" fill="#FFD27A"/>`,
  garagem: `<rect x="14" y="64" width="92" height="40" rx="8" fill="#B0B5BA"/><rect x="20" y="42" width="52" height="28" rx="4" fill="#A97850"/><rect x="24" y="36" width="44" height="8" rx="2" fill="#C9A88A"/><circle cx="82" cy="76" r="12" fill="none" stroke="#2A0A31" stroke-width="3.5"/><circle cx="102" cy="76" r="12" fill="none" stroke="#2A0A31" stroke-width="3.5"/><path d="M82 76 L92 60 L102 76 M92 60 L88 54" stroke="#FE0472" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  varanda: `<rect x="12" y="66" width="96" height="38" rx="10" fill="#CFA67B"/><rect x="22" y="52" width="54" height="22" rx="4" fill="#8A5A3C"/><rect x="18" y="48" width="62" height="7" rx="3" fill="#A97850"/><rect x="82" y="42" width="20" height="32" rx="4" fill="#3A3A40"/><circle cx="92" cy="34" r="5" fill="#FFD27A"/><path d="M42 42 Q45 34 42 28 M54 42 Q57 34 54 28" stroke="#FFFFFF" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  academia: `<rect x="16" y="78" width="88" height="18" rx="8" fill="${LIMA}" opacity="0.55"/><rect x="24" y="64" width="46" height="10" rx="4" fill="${NOITE}"/><rect x="62" y="34" width="6" height="34" rx="3" fill="#8E96A0"/><rect x="54" y="30" width="20" height="9" rx="3" fill="${NOITE}"/><circle cx="88" cy="62" r="16" fill="${PINK}"/><ellipse cx="83" cy="56" rx="5" ry="3" fill="#FFFFFF" opacity="0.45"/><rect x="26" y="38" width="22" height="5" rx="2.5" fill="${NOITE}"/><rect x="22" y="32" width="6" height="17" rx="3" fill="${NOITE}"/><rect x="46" y="32" width="6" height="17" rx="3" fill="${NOITE}"/>`,
  estudio: `<ellipse cx="60" cy="88" rx="44" ry="12" fill="#5A3D6A" opacity="0.35"/><circle cx="46" cy="66" r="18" fill="${PINK}"/><circle cx="46" cy="66" r="13" fill="#FFFFFF"/><rect x="66" y="54" width="36" height="12" rx="3" fill="${NOITE}"/><rect x="69" y="57" width="30" height="5" rx="1" fill="#FFFFFF"/><line x1="74" y1="66" x2="74" y2="86" stroke="${NOITE}" stroke-width="3"/><line x1="94" y1="66" x2="94" y2="86" stroke="${NOITE}" stroke-width="3"/><line x1="26" y1="36" x2="26" y2="84" stroke="#8E96A0" stroke-width="3"/><ellipse cx="26" cy="36" rx="11" ry="4" fill="#E8B83A"/><line x1="84" y1="26" x2="84" y2="50" stroke="#8E96A0" stroke-width="2.5"/><circle cx="84" cy="24" r="5" fill="${NOITE}"/>`,
  jejum: `<circle cx="60" cy="58" r="34" fill="#FFE9A8" opacity="0.65"/><circle cx="60" cy="58" r="24" fill="#FFD27A" opacity="0.7"/><path d="M58 84 C52 72 48 60 54 42 C56 36 59 36 59 43 L59 62" fill="#E9B48C" stroke="${NOITE}" stroke-width="2.2" stroke-linecap="round"/><path d="M62 84 C68 72 72 60 66 42 C64 36 61 36 61 43 L61 62" fill="#E9B48C" stroke="${NOITE}" stroke-width="2.2" stroke-linecap="round"/><path d="M60 18v8M32 30l6 6M88 30l-6 6" stroke="${PINK}" stroke-width="3" stroke-linecap="round"/>`,
  evangelismo: `<rect x="22" y="24" width="52" height="38" rx="14" fill="${PINK}"/><polygon points="38,62 48,62 36,74" fill="${PINK}"/><line x1="48" y1="33" x2="48" y2="53" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/><line x1="40" y1="41" x2="56" y2="41" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/><path d="M84 56c-5-7-15-5-15 4 0 8 15 17 15 17s15-9 15-17c0-9-10-11-15-4z" fill="${LIMA}" stroke="${NOITE}" stroke-width="2"/><circle cx="34" cy="88" r="9" fill="#C98B62"/><circle cx="82" cy="90" r="9" fill="#E9B48C"/>`,
  versiculoDia: `<circle cx="60" cy="48" r="28" fill="#FFE9A8" opacity="0.7"/><path d="M60 14v9M34 24l6 6M86 24l-6 6M24 48h8M88 48h8" stroke="#E8B83A" stroke-width="3" stroke-linecap="round"/><path d="M24 46 C36 42 50 44 60 50 L60 88 C50 82 36 80 24 84 Z" fill="#FFFFFF" stroke="${AMEIXA_SUAVE}" stroke-width="2.5" stroke-linejoin="round"/><path d="M96 46 C84 42 70 44 60 50 L60 88 C70 82 84 80 96 84 Z" fill="#FBF8F4" stroke="${AMEIXA_SUAVE}" stroke-width="2.5" stroke-linejoin="round"/><line x1="33" y1="58" x2="52" y2="60" stroke="${PINK}" stroke-width="2.5" stroke-linecap="round"/><line x1="33" y1="67" x2="50" y2="69" stroke="${AMEIXA_SUAVE}" stroke-width="2" stroke-linecap="round" opacity="0.6"/><line x1="68" y1="60" x2="87" y2="58" stroke="${AMEIXA_SUAVE}" stroke-width="2" stroke-linecap="round" opacity="0.6"/><line x1="68" y1="69" x2="85" y2="67" stroke="${AMEIXA_SUAVE}" stroke-width="2" stroke-linecap="round" opacity="0.6"/>`,
  cachorro: `<ellipse cx="32" cy="56" rx="10" ry="20" fill="#6B4226" transform="rotate(18 32 56)"/><ellipse cx="88" cy="56" rx="10" ry="20" fill="#6B4226" transform="rotate(-18 88 56)"/><circle cx="60" cy="56" r="26" fill="#C98B4A"/><ellipse cx="60" cy="65" rx="15" ry="12" fill="#F3E3CC"/><circle cx="50" cy="50" r="3.8" fill="${NOITE}"/><circle cx="70" cy="50" r="3.8" fill="${NOITE}"/><ellipse cx="60" cy="61" rx="5.5" ry="4" fill="${NOITE}"/><path d="M55 68 Q60 73 65 68" fill="none" stroke="${NOITE}" stroke-width="2.2" stroke-linecap="round"/><rect x="42" y="80" width="36" height="8" rx="4" fill="${PINK}"/><circle cx="60" cy="90" r="4" fill="#F5B700"/>`,
  gato: `<polygon points="34,46 40,20 56,36" fill="#9A94A6"/><polygon points="86,46 80,20 64,36" fill="#9A94A6"/><polygon points="38,42 42,26 52,37" fill="#E58A7A"/><polygon points="82,42 78,26 68,37" fill="#E58A7A"/><circle cx="60" cy="58" r="25" fill="#9A94A6"/><ellipse cx="60" cy="66" rx="13" ry="10" fill="#F4F1F6"/><ellipse cx="50" cy="53" rx="3.5" ry="4.5" fill="#3F7F00"/><ellipse cx="70" cy="53" rx="3.5" ry="4.5" fill="#3F7F00"/><polygon points="56,62 64,62 60,67" fill="#E58A7A"/><path d="M55 70 Q60 74 65 70" fill="none" stroke="${NOITE}" stroke-width="2" stroke-linecap="round"/><path d="M26 60h14M26 66h14M80 60h14M80 66h14" stroke="${AMEIXA_SUAVE}" stroke-width="1.8" stroke-linecap="round"/>`,
};
export const itemExtraSvg = (id: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">${ILUSTRACOES[id] ?? ''}</svg>`;

// Amostras 120 × 120 dos papéis de parede e pisos para a loja e a bandeja de decoração
const REVESTIMENTOS_SVG: Record<string, string> = {
  papelCreme: `<rect x="14" y="14" width="92" height="84" rx="10" fill="#F6EFE6"/><rect x="14" y="88" width="92" height="14" rx="4" fill="#FFFFFF"/><line x1="14" y1="88" x2="106" y2="88" stroke="#E2D5C6" stroke-width="2"/>`,
  papelListras: `<rect x="14" y="14" width="92" height="88" rx="10" fill="#FCF5F8"/>${[22, 38, 54, 70, 86].map(x => `<rect x="${x}" y="14" width="8" height="76" fill="${ROSA}"/>`).join('')}<rect x="14" y="88" width="92" height="14" rx="4" fill="#FFFFFF"/>`,
  papelPoa: `<rect x="14" y="14" width="92" height="88" rx="10" fill="#FBF4EC"/>${[[28, 30], [52, 26], [76, 32], [94, 26], [38, 52], [64, 50], [88, 54], [26, 72], [52, 74], [78, 72]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="4.5" fill="${i % 2 ? '#FFD27A' : ROSA}"/>`).join('')}<rect x="14" y="88" width="92" height="14" rx="4" fill="#FFFFFF"/>`,
  papelSalvia: `<rect x="14" y="14" width="92" height="88" rx="10" fill="#D5E3D0"/><path d="M36 42c6-10 16-10 16 0-6 10-16 10-16 0zm34 18c6-10 16-10 16 0-6 10-16 10-16 0z" fill="#B8CEB1"/><rect x="14" y="88" width="92" height="14" rx="4" fill="#FFFFFF"/>`,
  papelAzulejo: `<rect x="14" y="14" width="92" height="88" rx="10" fill="#F4F7FA"/>${[32, 50, 68, 86].map(y => `<line x1="14" y1="${y}" x2="106" y2="${y}" stroke="#CFD9E2" stroke-width="2"/>`).join('')}${[0, 1, 2, 3, 4].map(r => [34, 62, 90].map(x => `<line x1="${x + (r % 2) * 14 - 7}" y1="${14 + r * 18}" x2="${x + (r % 2) * 14 - 7}" y2="${32 + r * 18}" stroke="#CFD9E2" stroke-width="2"/>`).join('')).join('')}`,
  papelTijolo: `<rect x="14" y="14" width="92" height="88" rx="10" fill="#EADFD5"/>${[0, 1, 2, 3].map(r => [0, 1, 2].map(c => `<rect x="${18 + c * 30 + (r % 2) * 10}" y="${18 + r * 20}" width="25" height="15" rx="2" fill="${(r + c) % 2 ? '#C86D51' : '#B95B40'}"/>`).join('')).join('')}`,
  papelFloral: `<rect x="14" y="14" width="92" height="88" rx="10" fill="#FDF7F2"/>${[[34, 34], [78, 32], [56, 58], [32, 74], [82, 72]].map(([x, y]) => `<circle cx="${x}" cy="${y - 5}" r="4" fill="${ROSA}"/><circle cx="${x + 5}" cy="${y}" r="4" fill="${ROSA}"/><circle cx="${x}" cy="${y + 5}" r="4" fill="${ROSA}"/><circle cx="${x - 5}" cy="${y}" r="4" fill="${ROSA}"/><circle cx="${x}" cy="${y}" r="3" fill="#F5B700"/>`).join('')}<rect x="14" y="88" width="92" height="14" rx="4" fill="#FFFFFF"/>`,
  papelCeu: `<rect x="14" y="14" width="92" height="88" rx="10" fill="#2A3558"/>${[[32, 30, 3], [68, 26, 2.2], [88, 42, 3.2], [44, 54, 2.4], [74, 66, 3], [30, 74, 2], [58, 36, 1.8]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#FFE27A"/>`).join('')}<path d="M84 24a8 8 0 1 1-6 13 6.5 6.5 0 0 0 6-13z" fill="#FFE9A8"/><rect x="14" y="88" width="92" height="14" rx="4" fill="#E8ECF5"/>`,
  papelBoiserie: `<rect x="14" y="14" width="92" height="88" rx="10" fill="#EFEAE2"/><rect x="22" y="22" width="34" height="56" rx="2" fill="none" stroke="#CFC4B4" stroke-width="3"/><rect x="64" y="22" width="34" height="56" rx="2" fill="none" stroke="#CFC4B4" stroke-width="3"/><rect x="14" y="84" width="92" height="18" rx="4" fill="#FAF7F2"/>`,
  papelMadeira: `<rect x="14" y="14" width="92" height="88" rx="10" fill="#C89B72"/>${[22, 32, 42, 52, 62, 72, 82, 92, 100].map(x => `<line x1="${x}" y1="14" x2="${x}" y2="102" stroke="#9B6E48" stroke-width="2.5"/>`).join('')}`,
  pisoClareira: `<polygon points="60,22 106,48 60,74 14,48" fill="#E2CCB2"/><polygon points="14,48 60,74 60,84 14,58" fill="#C4AD93"/><polygon points="106,48 60,74 60,84 106,58" fill="#B0987E"/><line x1="30" y1="39" x2="76" y2="65" stroke="#C5AE94" stroke-width="1.8"/><line x1="45" y1="30" x2="91" y2="56" stroke="#C5AE94" stroke-width="1.8"/>`,
  pisoPorcelanato: `<polygon points="60,22 106,48 60,74 14,48" fill="#F5EFE6"/><polygon points="14,48 60,74 60,84 14,58" fill="#DDD4C7"/><polygon points="106,48 60,74 60,84 106,58" fill="#C9BFB1"/><line x1="37" y1="35" x2="83" y2="61" stroke="#DFD7CB" stroke-width="1.6"/><line x1="83" y1="35" x2="37" y2="61" stroke="#DFD7CB" stroke-width="1.6"/>`,
  pisoTerracota: `<polygon points="60,22 106,48 60,74 14,48" fill="#CE7654"/><polygon points="14,48 60,74 60,84 14,58" fill="#AD5B3C"/><polygon points="106,48 60,74 60,84 106,58" fill="#954B30"/><line x1="37" y1="35" x2="83" y2="61" stroke="#EBCDAC" stroke-width="2"/><line x1="83" y1="35" x2="37" y2="61" stroke="#EBCDAC" stroke-width="2"/>`,
  pisoCimento: `<polygon points="60,22 106,48 60,74 14,48" fill="#C7C9CC"/><polygon points="14,48 60,74 60,84 14,58" fill="#A8AAAC"/><polygon points="106,48 60,74 60,84 106,58" fill="#929598"/><ellipse cx="54" cy="46" rx="16" ry="7" fill="#D5D7DA" opacity="0.6"/>`,
  pisoNogueira: `<polygon points="60,22 106,48 60,74 14,48" fill="#7D5538"/><polygon points="14,48 60,74 60,84 14,58" fill="#634129"/><polygon points="106,48 60,74 60,84 106,58" fill="#513420"/><line x1="30" y1="39" x2="76" y2="65" stroke="#5E3D26" stroke-width="2"/><line x1="45" y1="30" x2="91" y2="56" stroke="#5E3D26" stroke-width="2"/>`,
  pisoXadrez: `<polygon points="60,22 106,48 60,74 14,48" fill="#FAF6F0"/><polygon points="60,22 83,35 60,48 37,35" fill="#3B2344"/><polygon points="83,35 106,48 83,61 60,48" fill="#FAF6F0"/><polygon points="37,35 60,48 37,61 14,48" fill="#FAF6F0"/><polygon points="60,48 83,61 60,74 37,61" fill="#3B2344"/><polygon points="14,48 60,74 60,84 14,58" fill="#D7CFC4"/><polygon points="106,48 60,74 60,84 106,58" fill="#BEB5A8"/>`,
  pisoCarpete: `<polygon points="60,22 106,48 60,74 14,48" fill="${ROSA}"/><polygon points="14,48 60,74 60,84 14,58" fill="#DFB4C8"/><polygon points="106,48 60,74 60,84 106,58" fill="#CCA0B4"/><circle cx="52" cy="46" r="2" fill="#FFFFFF" opacity="0.6"/><circle cx="68" cy="52" r="2" fill="#FFFFFF" opacity="0.6"/>`,
  pisoEspinha: `<polygon points="60,22 106,48 60,74 14,48" fill="#CFA67B"/><polygon points="14,48 60,74 60,84 14,58" fill="#B18960"/><polygon points="106,48 60,74 60,84 106,58" fill="#9A744E"/><path d="M40 44l10-6 10 6 10-6 10 6M40 54l10-6 10 6 10-6 10 6" fill="none" stroke="#9E764F" stroke-width="2"/>`,
  pisoHidraulico: `<polygon points="60,22 106,48 60,74 14,48" fill="#F7F3EB"/><polygon points="60,32 78,48 60,64 42,48" fill="#3B7EA8" opacity="0.85"/><circle cx="60" cy="48" r="6" fill="#E8B83A"/><polygon points="14,48 60,74 60,84 14,58" fill="#DDD6CA"/><polygon points="106,48 60,74 60,84 106,58" fill="#C7BFB2"/>`,
  pisoMarmore: `<polygon points="60,22 106,48 60,74 14,48" fill="#FAF9F7"/><path d="M32 46c14-4 20 6 34 2s14-8 22-4M46 58c10-3 18 2 28-2" fill="none" stroke="#C5C2CC" stroke-width="2" stroke-linecap="round"/><polygon points="14,48 60,74 60,84 14,58" fill="#E2E0E5"/><polygon points="106,48 60,74 60,84 106,58" fill="#CECCD2"/>`,
};
export const revestimentoSvg = (id: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">${REVESTIMENTOS_SVG[id] ?? ''}</svg>`;

// Posição 3D inicial das vagas antigas (usada para migrar casas salvas e achar lugar livre ao comprar)
export const VAGAS_3D: Record<string, { comodo: ComodoId; tipo: TipoVaga; x: number; y?: number; z: number; giro?: number; extra?: string }> = {
  'quarto-parede': { comodo: 'quarto', tipo: 'parede', x: 2.1, y: 1.75, z: 0.08, giro: 0 },
  'quarto-parede2': { comodo: 'quarto', tipo: 'parede', x: 0.08, y: 1.6, z: 1.6, giro: Math.PI / 2 },
  'quarto-canto': { comodo: 'quarto', tipo: 'chao', x: 4.55, z: 3.95 },
  'quarto-tapete': { comodo: 'quarto', tipo: 'tapete', x: 2.6, z: 3.2 },
  'estudo-parede': { comodo: 'estudo', tipo: 'parede', x: 11.92, y: 1.6, z: 3.7, giro: -Math.PI / 2 },
  'estudo-parede2': { comodo: 'estudo', tipo: 'parede', x: 8.08, y: 1.7, z: 2.0, giro: Math.PI / 2 },
  'estudo-canto': { comodo: 'estudo', tipo: 'chao', x: 8.45, z: 4.15 },
  'estudo-tapete': { comodo: 'estudo', tipo: 'tapete', x: 10.0, z: 3.0 },
  'sala-parede': { comodo: 'sala', tipo: 'parede', x: 0.08, y: 1.75, z: 6.7, giro: Math.PI / 2 },
  'sala-parede2': { comodo: 'sala', tipo: 'parede', x: 4.7, y: 1.75, z: 4.58, giro: 0 },
  'sala-canto': { comodo: 'sala', tipo: 'chao', x: 6.55, z: 5.0 },
  'sala-tapete': { comodo: 'sala', tipo: 'tapete', x: 3.4, z: 6.6 },
  'banheiro-parede': { comodo: 'banheiro', tipo: 'parede', x: 5.08, y: 1.75, z: 1.9, giro: Math.PI / 2 },
  'banheiro-canto': { comodo: 'banheiro', tipo: 'chao', x: 5.4, z: 4.1 },
  'banheiro-tapete': { comodo: 'banheiro', tipo: 'tapete', x: 6.5, z: 3.3 },
  'cozinha-parede': { comodo: 'cozinha', tipo: 'parede', x: 8.3, y: 1.75, z: 4.58, giro: 0 },
  'cozinha-canto': { comodo: 'cozinha', tipo: 'chao', x: 7.45, z: 8.6 },
  'cozinha-tapete': { comodo: 'cozinha', tipo: 'tapete', x: 10.2, z: 7.6 },
  'estudio-parede': { comodo: 'estudio', tipo: 'parede', x: 18.12, y: 1.65, z: 3.0, giro: -Math.PI / 2, extra: 'estudio' },
  'estudio-canto': { comodo: 'estudio', tipo: 'chao', x: 13.85, z: 0.75, extra: 'estudio' },
  'academia-parede': { comodo: 'academia', tipo: 'parede', x: 18.12, y: 1.65, z: 6.1, giro: -Math.PI / 2, extra: 'academia' },
  'academia-canto': { comodo: 'academia', tipo: 'chao', x: 17.65, z: 5.35, extra: 'academia' },
  'academia-tapete': { comodo: 'academia', tipo: 'tapete', x: 16.0, z: 6.85, extra: 'academia' },
  'piscina-canto': { comodo: 'piscina', tipo: 'chao', x: -4.8, z: 8.0, extra: 'piscina' },
  'garagem-canto': { comodo: 'garagem', tipo: 'chao', x: -2.2, z: 11.5, extra: 'garagem' },
  'varanda-canto': { comodo: 'varanda', tipo: 'chao', x: 8.0, z: -3.4, extra: 'varanda' },
};

export type LayoutMovel = {
  x: number;
  z: number;
  rotacaoY: number; // 0, PI/2, PI, 3PI/2
  comodo: string;
};
export type LayoutCasa = Record<string, LayoutMovel>;

export const LIMITES_COMODOS_3D: Record<ComodoId, { xMin: number; xMax: number; zMin: number; zMax: number }> = {
  quarto:   { xMin: 0.35,  xMax: 4.75,  zMin: 0.35, zMax: 4.25 },
  banheiro: { xMin: 5.25,  xMax: 7.75,  zMin: 0.35, zMax: 4.25 },
  estudo:   { xMin: 8.25,  xMax: 11.75, zMin: 0.35, zMax: 4.25 },
  sala:     { xMin: 0.35,  xMax: 6.75,  zMin: 4.75, zMax: 8.75 },
  cozinha:  { xMin: 7.25,  xMax: 11.75, zMin: 4.75, zMax: 8.75 },
  jardim:   { xMin: 0.65,  xMax: 11.35, zMin: -5.95, zMax: -0.95 },
  piscina:  { xMin: -5.25, xMax: -0.55, zMin: 0.75, zMax: 8.45 },
  estudio:  { xMin: 13.75, xMax: 17.85, zMin: 0.55, zMax: 4.05 },
  academia: { xMin: 13.75, xMax: 17.85, zMin: 5.15, zMax: 8.65 },
  garagem:  { xMin: -5.25, xMax: -0.55, zMin: 9.55, zMax: 11.85 },
  varanda:  { xMin: 7.55, xMax: 11.85, zMin: -3.85, zMax: -0.55 },
};

// Portas para evitar bloqueio de passagem
const PORTAS_3D: { x: number; z: number; r: number }[] = [
  { x: 3.05, z: 4.5, r: 0.65 },
  { x: 6.5, z: 4.5, r: 0.65 },
  { x: 10.0, z: 4.5, r: 0.65 },
  { x: 7.0, z: 6.8, r: 0.65 },
  { x: 2.5, z: 9.0, r: 0.75 },
];

export function snapGrid(valor: number, passo: 0.25 | 0.5 = 0.5): number {
  return Math.round(valor / passo) * passo;
}

export function detectarComodoPorPosicao(x: number, z: number): ComodoId | null {
  for (const [id, lim] of Object.entries(LIMITES_COMODOS_3D).sort(([a],[b])=>Number(b==='varanda')-Number(a==='varanda')) as [ComodoId, typeof LIMITES_COMODOS_3D[ComodoId]][]) {
    if (x >= lim.xMin && x <= lim.xMax && z >= lim.zMin && z <= lim.zMax) return id;
  }
  return null;
}

export function validarPosicaoMovel(
  x: number,
  z: number,
  indiceIgnorado: number,
  mobilia: Mobilia[],
  parede = false,
): { valido: boolean; comodo: ComodoId | null; motivo?: string } {
  const comodo = detectarComodoPorPosicao(x, z);
  if (!comodo && !parede) return { valido: false, comodo: null, motivo: 'Fora dos limites do cômodo' };
  if (!parede) {
    for (const p of PORTAS_3D) {
      if (Math.hypot(x - p.x, z - p.z) < p.r) {
        return { valido: false, comodo, motivo: 'Bloqueia a passagem da porta' };
      }
    }
    for (let i = 0; i < mobilia.length; i++) {
      if (i === indiceIgnorado || mobilia[i].parede) continue;
      if (Math.hypot(mobilia[i].x - x, mobilia[i].z - z) < 0.65) {
        return { valido: false, comodo, motivo: 'Colide com outro móvel' };
      }
    }
  }
  return { valido: true, comodo };
}

export function mobiliaParaLayoutCasa(mobilia: Mobilia[]): LayoutCasa {
  const layout: LayoutCasa = {};
  mobilia.forEach((m, idx) => {
    const comodo = detectarComodoPorPosicao(m.x, m.z) ?? 'sala';
    layout[`${m.item}_${idx}`] = {
      x: m.x,
      z: m.z,
      rotacaoY: m.giro ?? 0,
      comodo,
    };
  });
  return layout;
}

// Onde ficam os móveis de quem comprou antes da decoração existir
export function casaPadrao(itens: string[]): Record<string, string> {
  const padrao: Record<string, string> = { quadro: 'quarto-parede', luminaria: 'estudo-canto', planta: 'sala-canto', tapete: 'sala-tapete' };
  return Object.fromEntries(Object.entries(padrao).filter(([item]) => itens.includes(item)).map(([item, vaga]) => [vaga, item]));
}

// Converte o formato antigo (vaga -> item) na lista 3D livre, filtrando pelo que a pessoa possui
export function mobiliaDePerfil(perfil: Pick<Perfil, 'mobilia' | 'casa'>, itens: string[]): Mobilia[] {
  if (perfil.mobilia) return perfil.mobilia.filter(m => itens.includes(m.item) && !!MOVEIS[m.item]).map(m => m.x===-4.2 && m.z===-2 ? {...m,x:-2.2,z:11.5} : m.x===15 && m.z===-2.8 ? {...m,x:8,z:-3.4} : m);
  const legado = perfil.casa ?? casaPadrao(itens);
  const lista: Mobilia[] = [];
  for (const [vaga, item] of Object.entries(legado)) {
    const v = VAGAS_3D[vaga];
    if (!v || !itens.includes(item) || !MOVEIS[item]) continue;
    lista.push({ item, x: v.x, ...(v.y !== undefined ? { y: v.y } : {}), z: v.z, ...(v.giro ? { giro: v.giro } : {}), ...(v.tipo === 'parede' ? { parede: true } : {}) });
  }
  return lista;
}

export function lugarLivreMovel(tipo: TipoVaga, atual: Mobilia[], itens: string[], foco?: string): Omit<Mobilia, 'item'> | null {
  const candidatos = Object.values(VAGAS_3D).filter(v => v.tipo === tipo && (!v.extra || itens.includes(v.extra)));
  const ordenados = [...candidatos.filter(v => v.comodo === foco), ...candidatos.filter(v => v.comodo !== foco)];
  const livre = ordenados.find(v => !atual.some(m => Math.hypot(m.x - v.x, m.z - v.z) < 0.45));
  if (!livre) return null;
  return { x: livre.x, ...(livre.y !== undefined ? { y: livre.y } : {}), z: livre.z, ...(livre.giro ? { giro: livre.giro } : {}), ...(tipo === 'parede' ? { parede: true } : {}) };
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
