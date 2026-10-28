// Casa isométrica do Faith Steps: quatro cômodos desenhados em código, num terreno com a cidade em volta.
// Cada cômodo é um "palco" de 10 × 10 unidades com duas paredes ao fundo.
// O personagem anda só na parte da frente do chão, então sempre fica na frente dos móveis.
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

/* ---------- Terreno e cidade ---------- */

function arvore(d: Desenho, x: number, y: number, tamanho = 1) {
  caixa(d, x - 0.15, y - 0.15, 0, 0.3, 0.3, 1.3 * tamanho, '#9C7A62');
  const t = tamanho;
  figura(d, x, y, 1.3 * t + 0.9 * t,
    `<circle cx="${-9 * t}" cy="${4 * t}" r="${15 * t}" fill="#93C06C"/><circle cx="${10 * t}" cy="${2 * t}" r="${16 * t}" fill="#88B862"/>` +
    `<circle cy="${-10 * t}" r="${18 * t}" fill="#A9CF86"/><circle cx="${-6 * t}" cy="${-16 * t}" r="${7 * t}" fill="#C4E0A6"/>`,
    [-26 * t, -28 * t, 52 * t, 50 * t]);
}
const arbusto = (d: Desenho, x: number, y: number) =>
  figura(d, x, y, 0, `<ellipse cx="-5" cy="-6" rx="8" ry="7" fill="#93C06C"/><ellipse cx="5" cy="-7" rx="8" ry="8" fill="#A9CF86"/><circle cx="2" cy="-11" r="2" fill="#FFD1E6"/>`, [-13, -15, 26, 15]);

function predio(d: Desenho, x: number, y: number, w: number, dd: number, h: number, cor: string) {
  caixa(d, x, y, 0, w, dd, h, cor);
  caixa(d, x - 0.05, y - 0.05, h, w + 0.1, dd + 0.1, 0.25, sombra(cor, 0.08));
  const janela = (i: number, j: number) => ((i * 7 + j * 3 + Math.round(x * 3)) % 5 === 0 ? '#FFE9A8' : '#FFFFFF');
  for (let zz = 0.8, j = 0; zz < h - 0.6; zz += 1.3, j++) {
    for (let u = x + 0.4, i = 0; u < x + w - 0.5; u += 0.95, i++) {
      poly(d, [iso(u, y + dd + 0.01, zz), iso(u + 0.5, y + dd + 0.01, zz), iso(u + 0.5, y + dd + 0.01, zz + 0.7), iso(u, y + dd + 0.01, zz + 0.7)], janela(i, j), ' opacity="0.85"');
    }
    for (let v = y + 0.4, i = 0; v < y + dd - 0.5; v += 0.95, i++) {
      poly(d, [iso(x + w + 0.01, v, zz), iso(x + w + 0.01, v + 0.5, zz), iso(x + w + 0.01, v + 0.5, zz + 0.7), iso(x + w + 0.01, v, zz + 0.7)], janela(j, i), ' opacity="0.7"');
    }
  }
}

function igreja(d: Desenho, x: number, y: number) {
  const w = 4.2, dd = 3, h = 3.4, branco = '#FBF8F4', telhado = '#A88AB2';
  caixa(d, x, y, 0, w, dd, h, branco);
  // Telhado de duas águas
  poly(d, [iso(x, y + dd, h), iso(x + w, y + dd, h), iso(x + w, y + dd / 2, h + 1.6), iso(x, y + dd / 2, h + 1.6)], telhado);
  poly(d, [iso(x + w, y, h), iso(x + w, y + dd, h), iso(x + w, y + dd / 2, h + 1.6)], sombra(branco, 0.18));
  // Porta e vitrais
  poly(d, [iso(x + w + 0.01, y + 1.1, 0), iso(x + w + 0.01, y + 1.9, 0), iso(x + w + 0.01, y + 1.9, 1.7), iso(x + w + 0.01, y + 1.5, 2.1), iso(x + w + 0.01, y + 1.1, 1.7)], AMEIXA_SUAVE);
  for (const u of [x + 0.9, x + 2.1, x + 3.3]) {
    poly(d, [iso(u, y + dd + 0.01, 1.3), iso(u + 0.5, y + dd + 0.01, 1.3), iso(u + 0.5, y + dd + 0.01, 2.6), iso(u, y + dd + 0.01, 2.6)], '#F2B8CF');
  }
  // Torre com cruz
  const tx = x + 3.0, ty = y - 1.4;
  caixa(d, tx, ty, 0, 1.3, 1.3, 6.2, branco);
  poly(d, [iso(tx, ty + 1.3, 6.2), iso(tx + 1.3, ty + 1.3, 6.2), iso(tx + 0.65, ty + 0.65, 8.2)], telhado);
  poly(d, [iso(tx + 1.3, ty, 6.2), iso(tx + 1.3, ty + 1.3, 6.2), iso(tx + 0.65, ty + 0.65, 8.2)], sombra(telhado, 0.2));
  const [cx, cy] = iso(tx + 0.65, ty + 0.65, 8.2);
  d.svg += `<path d="M${r1(cx)} ${r1(cy)} V${r1(cy - 16)} M${r1(cx - 5)} ${r1(cy - 11)} H${r1(cx + 5)}" stroke="${PINK}" stroke-width="2.6" stroke-linecap="round"/>`;
}

function carro(d: Desenho, x: number, y: number) {
  caixa(d, x, y, 0.25, 2.2, 1.1, 0.55, '#F2B8CF');
  caixa(d, x + 0.5, y + 0.1, 0.8, 1.2, 0.9, 0.45, claro('#F2B8CF', 0.3));
  for (const [u, v] of [[x + 0.45, y + 1.1], [x + 1.75, y + 1.1]]) figura(d, u, v, 0.25, `<ellipse rx="4.5" ry="4" fill="${NOITE}"/>`, [-5, -4, 10, 8]);
}

function vizinhanca(d: Desenho) {
  // Chão da cidade, ruas, calçada e o terreno da casa
  poly(d, [iso(-14, -14), iso(20, -14), iso(20, 20), iso(-14, 20)], '#E9E0D6');
  noChao(d, -14, 13.7, 34, 2.1, '#D3C8CE');
  noChao(d, 13.7, -14, 2.1, 27.7, '#D3C8CE');
  for (let u = -12; u < 18; u += 1.6) linha(d, iso(u, 14.75, 0.02), iso(u + 0.7, 14.75, 0.02), '#FFFFFF', 1.6, ' opacity="0.8"');
  for (let v = -12; v < 13; v += 1.6) linha(d, iso(14.75, v, 0.02), iso(14.75, v + 0.7, 0.02), '#FFFFFF', 1.6, ' opacity="0.8"');
  noChao(d, -3.6, -3.6, 17.2, 17.2, '#F3ECE3');
  noChao(d, -3, -3, 16, 16, '#D9E8C6', '', 0.02);
  // Textura da grama
  for (let i = 0; i < 40; i++) {
    const gx = -2.6 + ((i * 37) % 155) / 10, gy = -2.6 + ((i * 53) % 155) / 10;
    if (gx > -0.5 && gx < 10.5 && gy > -0.5 && gy < 10.5) continue;
    const [sx, sy] = iso(gx, gy, 0.03);
    d.svg += `<path d="M${r1(sx)} ${r1(sy)} l-1.5 -3 M${r1(sx)} ${r1(sy)} l1.5 -3.4" stroke="#B9D19E" stroke-width="1.2" stroke-linecap="round"/>`;
  }
  // Prédios ao fundo e dos lados, do mais distante para o mais perto
  predio(d, -10, -10, 4, 4, 10.5, '#DCCFD9');
  predio(d, -10, -4.5, 4, 3.6, 7.5, '#E6D9E3');
  predio(d, -4.5, -10, 3.6, 4, 6, '#EFE4D6');
  igreja(d, 1.2, -8.6);
  predio(d, 7.5, -10, 3.4, 4, 8.5, '#E9DCCB');
  predio(d, -10, 1, 4, 3.4, 5.5, '#EFE4D6');
  predio(d, 12, -10, 3.4, 4, 5, '#DCCFD9');
  predio(d, -10, 6, 4, 4, 9, '#D6C6CF');
  // Árvores nos cantos do terreno e caminho de pedras até a casa
  arvore(d, -1.6, -1.6, 1.1);
  arvore(d, -1.9, 11.2, 1);
  arvore(d, 11.3, -1.8, 1);
  for (let i = 0; i < 4; i++) circulo(d, (a, b) => iso(10.8 + i * 0.6 + a, 10.8 + i * 0.6 + b, 0.03), 0.28, '#F3ECE3');
  for (const [x, y] of [[12.4, 2.5], [12.4, 6.5], [2.5, 12.4], [6.5, 12.4], [12.3, 9.6], [9.6, 12.3]]) arbusto(d, x, y);
  // Poste e carro na rua
  caixa(d, -2.5, 12.6, 0, 0.18, 0.18, 3.4, AMEIXA_SUAVE);
  figura(d, -2.4, 12.7, 3.6, `<circle r="14" fill="${LIMA}" opacity="0.18"/><circle r="4" fill="#FFF6C8"/>`, [-14, -14, 28, 28]);
  carro(d, 3.2, 14.2);
}

/* ---------- Casca do cômodo ---------- */

type Piso = 'madeira' | 'azulejo' | 'carpete';
function casca(d: Desenho, paredeE: string, paredeD: string, chao: string, piso: Piso) {
  const borda = '#FFFFFF';
  poly(d, [iso(0, 0, 0), iso(0, D, 0), iso(0, D, H), iso(0, 0, H)], paredeE);
  poly(d, [iso(0, 0, 0), iso(W, 0, 0), iso(W, 0, H), iso(0, 0, H)], paredeD);
  // Luz suave vinda do canto do fundo
  poly(d, [iso(0, 0, 0), iso(0, 3, 0), iso(0, 3, H), iso(0, 0, H)], '#FFFFFF', ' opacity="0.08"');
  poly(d, [iso(-E, -E, H), iso(-E, D, H), iso(0, D, H), iso(0, 0, H)], borda);
  poly(d, [iso(-E, -E, H), iso(W, -E, H), iso(W, 0, H), iso(0, 0, H)], borda);
  poly(d, [iso(-E, D, -E), iso(0, D, -E), iso(0, D, H), iso(-E, D, H)], sombra(borda, 0.1));
  poly(d, [iso(W, -E, -E), iso(W, 0, -E), iso(W, 0, H), iso(W, -E, H)], sombra(borda, 0.22));
  naParedeE(d, 0, 0, D, 0.22, sombra(paredeE, 0.2));
  naParedeD(d, 0, 0, W, 0.22, sombra(paredeD, 0.2));
  poly(d, [iso(-E, D, 0), iso(W, D, 0), iso(W, D, -E), iso(-E, D, -E)], sombra(borda, 0.1));
  poly(d, [iso(W, -E, 0), iso(W, D, 0), iso(W, D, -E), iso(W, -E, -E)], sombra(borda, 0.22));
  poly(d, [iso(0, 0, 0), iso(W, 0, 0), iso(W, D, 0), iso(0, D, 0)], chao);
  const traco = sombra(chao, 0.09);
  if (piso === 'madeira') {
    for (let i = 1; i < 10; i++) linha(d, iso(0, i), iso(W, i), traco, 1);
    for (let i = 0; i < 10; i++) { const u = ((i * 3.7) % 9) + 0.5; linha(d, iso(u, i), iso(u, i + 1), traco, 1); }
  }
  if (piso === 'azulejo') for (let i = 1; i < 10; i++) { linha(d, iso(0, i), iso(W, i), traco, 1); linha(d, iso(i, 0), iso(i, D), traco, 1); }
}

/* ---------- Tipos, cômodos e easter eggs ---------- */

export type ComodoId = 'quarto' | 'estudo' | 'sala' | 'banheiro';
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
  { id: 'estudo', nome: 'Sala de estudo', dica: 'Leitura, estudo e meditação' },
  { id: 'sala', nome: 'Sala', dica: 'Louvor, ensaio, igreja e exercício' },
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

/* ---------- Montagem dos cômodos ---------- */

type Montagem = { cena: Desenho; objetos: Objeto[] };
function objeto(m: Montagem, id: string, rotulo: string, alvo: Alvo, ponto: P, desenhar: (d: Desenho) => void) {
  const d = novo();
  desenhar(d);
  m.cena.svg += d.svg;
  const xs = d.pts.map(p => p[0]), ys = d.pts.map(p => p[1]);
  const x = Math.min(...xs) - 4, y = Math.min(...ys) - 4;
  m.objetos.push({ id, rotulo, alvo, ponto, caixa: [x, y, Math.max(...xs) + 4 - x, Math.max(...ys) + 4 - y] });
}
const enfeite = (m: Montagem, desenhar: (d: Desenho) => void) => desenhar(m.cena);

export type OpcoesCasa = { itens: string[]; casa?: Record<string, string>; achados: string[]; dormindo?: Look };

export function montarComodo(id: ComodoId, op: OpcoesCasa): Comodo {
  const m: Montagem = { cena: novo(), objetos: [] };
  const casa = op.casa ?? casaPadrao(op.itens);
  // Desenha o móvel colocado numa vaga (se a pessoa tem o item)
  const vaga = (vagaId: string) => {
    const v = VAGAS.find(x => x.id === vagaId), item = casa[vagaId];
    if (!v || !item || !op.itens.includes(item) || !MOVEIS[item] || MOVEIS[item].tipo !== v.tipo) return;
    MOVEIS[item].desenhar(m.cena, v.ancora);
  };

  vizinhanca(m.cena);
  let area: Comodo['area'] = [3.2, 9.0, 3.2, 8.8];
  let entrada: P = [6.5, 9.4];

  if (id === 'quarto') {
    casca(m.cena, '#F4E8EC', '#EADBE2', '#F3EAE1', 'carpete');
    vaga('quarto-tapete');
    enfeite(m, d => {
      // Janela com cortinas e sol
      naParedeD(d, 5.5, 2.3, 2.8, 2.8, '#FFFFFF');
      naParedeD(d, 5.7, 2.5, 2.4, 2.4, '#DDEFFF', 0.03);
      figura(d, 7.4, 0.04, 4.3, `<circle r="8" fill="#FFE9A8"/>`, [-8, -8, 16, 16]);
      linha(d, iso(6.9, 0.04, 2.5), iso(6.9, 0.04, 4.9), '#FFFFFF', 3);
      linha(d, iso(5.7, 0.04, 3.7), iso(8.1, 0.04, 3.7), '#FFFFFF', 3);
      caixa(d, 5.4, 0.02, 2.15, 3.0, 0.35, 0.15, '#FFFFFF');
      naParedeD(d, 5.1, 2.0, 0.55, 3.6, ROSA, 0.06);
      naParedeD(d, 8.15, 2.0, 0.55, 3.6, ROSA, 0.06);
      linha(d, iso(5.0, 0.07, 5.65), iso(8.8, 0.07, 5.65), MADEIRA, 2.5);
    });
    vaga('quarto-parede');
    vaga('quarto-parede2');
    objeto(m, 'guarda-roupa', 'Guarda-roupa: trocar de roupa', { tipo: 'roupas' }, [4.5, 2.8], d => {
      sombraChao(d, 3.6, 0.1, 1.7, 1.0);
      for (const dx of [3.7, 5.1]) caixa(d, dx, 0.95, 0, 0.12, 0.12, 0.25, sombra(MADEIRA_CLARA, 0.3));
      caixa(d, 3.6, 0.1, 0.25, 1.7, 1.0, 4.05, MADEIRA_CLARA);
      caixa(d, 3.5, 0.0, 4.3, 1.9, 1.2, 0.15, sombra(MADEIRA_CLARA, 0.08));
      // Duas portas com moldura
      poly(d, [iso(3.75, 1.11, 0.45), iso(4.38, 1.11, 0.45), iso(4.38, 1.11, 4.1), iso(3.75, 1.11, 4.1)], claro(MADEIRA_CLARA, 0.2));
      poly(d, [iso(4.52, 1.11, 0.45), iso(5.15, 1.11, 0.45), iso(5.15, 1.11, 4.1), iso(4.52, 1.11, 4.1)], claro(MADEIRA_CLARA, 0.2));
      figura(d, 4.3, 1.12, 2.3, `<rect x="-1.2" y="-5" width="2.4" height="10" rx="1.2" fill="${AMEIXA_SUAVE}"/>`, [-2, -5, 4, 10]);
      figura(d, 4.6, 1.12, 2.3, `<rect x="-1.2" y="-5" width="2.4" height="10" rx="1.2" fill="${AMEIXA_SUAVE}"/>`, [-2, -5, 4, 10]);
    });
    enfeite(m, d => {
      // Cama: pés, estrado, colchão, dois travesseiros e coberta com dobra
      sombraChao(d, 0.2, 0.9, 3.3, 4.6);
      caixa(d, 0.15, 0.9, 0, 3.4, 0.3, 2.3, AMEIXA_SUAVE);
      poly(d, [iso(0.4, 1.21, 0.9), iso(3.3, 1.21, 0.9), iso(3.3, 1.21, 2.1), iso(0.4, 1.21, 2.1)], claro(AMEIXA_SUAVE, 0.12));
      for (const [x, y] of [[0.25, 5.3], [3.3, 5.3], [3.3, 1.3]]) caixa(d, x, y, 0, 0.15, 0.15, 0.3, sombra(MADEIRA_CLARA, 0.3));
      caixa(d, 0.2, 1.2, 0.3, 3.3, 4.3, 0.45, MADEIRA_CLARA);
      caixa(d, 0.3, 1.25, 0.75, 3.1, 4.2, 0.4, '#FFFFFF');
      caixa(d, 0.55, 1.4, 1.15, 1.35, 0.85, 0.3, NEVOA);
      caixa(d, 2.0, 1.4, 1.15, 1.35, 0.85, 0.3, NEVOA);
      if (op.dormindo) {
        const [sx, sy] = iso(1.85, 1.75, 1.55);
        d.svg += `<g transform="translate(${r1(sx)} ${r1(sy)}) rotate(-58) scale(0.26) translate(-100 -72)">${cabecaDeitada(op.dormindo)}</g>`;
        caixa(d, 0.25, 2.25, 1.15, 3.2, 3.3, 0.22, PINK);
        caixa(d, 0.25, 2.25, 1.37, 3.2, 0.45, 0.04, claro(PINK, 0.4));
        figura(d, 3.2, 1.0, 3.6,
          `<path d="M0 0 h7 l-7 9 h7 M11 -18 h10 l-10 12 h10 M26 -40 h13 l-13 16 h13" fill="none" stroke="${AMEIXA_SUAVE}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
          [0, -40, 40, 50]);
      } else {
        caixa(d, 0.25, 2.5, 1.15, 3.2, 3.05, 0.14, PINK);
        caixa(d, 0.25, 2.5, 1.29, 3.2, 0.5, 0.04, claro(PINK, 0.4));
      }
    });
    objeto(m, 'almofada', 'Almofada: oração', { tipo: 'atividade', atividade: 'oracao' }, [6.5, 3.6], d => {
      sombraChao(d, 5.7, 1.4, 1.6, 1.6);
      caixa(d, 5.7, 1.4, 0, 1.6, 1.6, 0.32, PINK);
      caixa(d, 5.85, 1.55, 0.32, 1.3, 1.3, 0.06, '#FF5AA8');
      figura(d, 6.5, 2.2, 0.39, `<circle r="2" fill="#C8005A"/>`, [-2, -2, 4, 4]);
    });
    vaga('quarto-canto');
    objeto(m, 'biblia', 'Bíblia: devocional', { tipo: 'atividade', atividade: 'devocional' }, [2.6, 7.1], d => {
      sombraChao(d, 0.3, 5.8, 1.4, 1.3);
      caixa(d, 0.3, 5.8, 0, 1.4, 1.3, 1.05, MADEIRA_CLARA);
      linha(d, iso(0.35, 7.11, 0.55), iso(1.65, 7.11, 0.55), sombra(MADEIRA_CLARA, 0.25), 1.2);
      figura(d, 1.0, 7.12, 0.8, `<circle r="1.8" fill="${AMEIXA_SUAVE}"/>`, [-2, -2, 4, 4]);
      caixa(d, 0.5, 6.0, 1.05, 0.95, 0.8, 0.2, NOITE);
      caixa(d, 0.52, 6.02, 1.07, 0.9, 0.76, 0.12, '#FFFFFF');
      caixa(d, 0.5, 6.0, 1.19, 0.95, 0.8, 0.07, NOITE);
      linha(d, iso(0.98, 6.18, 1.27), iso(0.98, 6.65, 1.27), LIMA, 2);
      linha(d, iso(0.78, 6.36, 1.27), iso(1.18, 6.36, 1.27), LIMA, 2);
      // Abajur
      caixa(d, 1.28, 6.55, 1.05, 0.08, 0.08, 0.6, AMEIXA_SUAVE);
      caixa(d, 1.08, 6.35, 1.6, 0.48, 0.48, 0.4, ROSA);
    });
    if (!op.achados.includes('dracma')) {
      objeto(m, 'moeda', 'Algo brilha aqui...', { tipo: 'segredo', segredo: 'dracma' }, [4.3, 5.4], d => {
        figura(d, 3.75, 4.9, 0.02,
          `<circle r="12" fill="#FFE9A8" opacity="0.5"/><ellipse rx="5" ry="3" fill="#F2C94C"/><path d="M7 -9 l1.3 3.6 3.6 1.3 -3.6 1.3 -1.3 3.6 -1.3 -3.6 -3.6 -1.3 3.6 -1.3 Z" fill="#ffffff"/>`,
          [-13, -13, 26, 26]);
      });
    }
    area = [4.0, 9.2, 3.6, 9.2];
    entrada = [7.0, 9.6];
  }

  if (id === 'estudo') {
    casca(m.cena, '#EFE5D8', '#E5D8C8', '#D9C2AA', 'madeira');
    vaga('estudo-tapete');
    vaga('estudo-parede');
    vaga('estudo-parede2');
    objeto(m, 'estante', 'Estante: leitura bíblica', { tipo: 'atividade', atividade: 'leitura' }, [2.4, 3.4], d => {
      sombraChao(d, 0.15, 0.6, 1.0, 4.8);
      caixa(d, 0.15, 0.6, 0, 1.0, 4.8, 5.4, MADEIRA);
      poly(d, [iso(1.16, 0.75, 0.15), iso(1.16, 5.25, 0.15), iso(1.16, 5.25, 5.25), iso(1.16, 0.75, 5.25)], sombra(MADEIRA, 0.35));
      const cores = ['#42124C', ROSA, PINK, NEVOA, '#8E6A9A', '#F2B8CF', '#A9CF86'];
      [0.3, 1.6, 2.9, 4.2].forEach((z, fila) => {
        poly(d, [iso(1.17, 0.75, z - 0.12), iso(1.17, 5.25, z - 0.12), iso(1.17, 5.25, z), iso(1.17, 0.75, z)], claro(MADEIRA, 0.15));
        for (let i = 0, y = 0.85; y < 5.0; i++, y += 0.36) {
          if ((i + fila) % 7 === 6) { y += 0.3; continue; } // espaço vazio na prateleira
          const h = 0.78 + ((i * 7 + fila * 3) % 4) * 0.08;
          const inclinado = (i + fila * 2) % 9 === 4 ? 0.12 : 0;
          poly(d, [iso(1.18, y, z), iso(1.18, y + 0.28, z), iso(1.18, y + 0.28 + inclinado, z + h), iso(1.18, y + inclinado, z + h)], cores[(i + fila) % cores.length]);
          linha(d, iso(1.19, y + 0.04, z + h * 0.75), iso(1.19, y + 0.24, z + h * 0.75), '#FFFFFF', 1, ' opacity="0.5"');
        }
      });
      figura(d, 0.65, 3.0, 5.4, `<rect x="-6" y="-10" width="12" height="10" rx="2" fill="${PINK}"/><ellipse cx="-3" cy="-15" rx="4.5" ry="7" fill="#93C06C"/><ellipse cx="3" cy="-16" rx="4.5" ry="8" fill="#A9CF86"/>`, [-8, -24, 16, 24]);
    });
    objeto(m, 'pergaminho', 'Pergaminho', { tipo: 'segredo', segredo: 'pergaminho' }, [8.2, 2.6], d => {
      caixa(d, 7.4, 0.05, 3.0, 1.8, 0.5, 0.1, MADEIRA);
      figura(d, 8.3, 0.3, 3.1,
        `<circle cy="-7" r="16" fill="#FFE9A8" opacity="0.45"/><rect x="-13" y="-11" width="26" height="9" rx="4.5" fill="#FBF8F4"/><circle cx="-13" cy="-6.5" r="5" fill="${MADEIRA}"/><circle cx="13" cy="-6.5" r="5" fill="${MADEIRA}"/><path d="M-6 -4 h4 M1 -4 h5" stroke="${MADEIRA}" stroke-width="1"/>`,
        [-18, -23, 36, 24]);
    });
    objeto(m, 'mesa', 'Mesa: estudo bíblico', { tipo: 'atividade', atividade: 'estudo' }, [4.9, 4.4], d => {
      sombraChao(d, 3.3, 0.4, 3.1, 1.75);
      for (const [x, y] of [[3.4, 0.5], [6.25, 0.5], [3.4, 1.95], [6.25, 1.95]]) caixa(d, x, y, 0, 0.15, 0.15, 1.3, '#FFFFFF');
      caixa(d, 5.2, 0.55, 0.95, 1.1, 1.5, 0.35, '#FBF8F4');
      linha(d, iso(5.45, 2.06, 1.12), iso(6.05, 2.06, 1.12), AMEIXA_SUAVE, 1.6);
      caixa(d, 3.3, 0.4, 1.3, 3.1, 1.75, 0.16, '#FFFFFF');
      caixa(d, 3.9, 0.8, 1.46, 1.0, 0.75, 0.07, PINK);
      caixa(d, 5.0, 0.75, 1.46, 1.1, 0.8, 0.05, '#FFFFFF');
      linha(d, iso(5.55, 0.75, 1.52), iso(5.55, 1.55, 1.52), '#C8B6C4', 1.5);
      for (let k = 0; k < 3; k++) { linha(d, iso(5.1, 0.95 + k * 0.18, 1.52), iso(5.45, 0.95 + k * 0.18, 1.52), '#C8B6C4', 0.8); linha(d, iso(5.65, 0.95 + k * 0.18, 1.52), iso(6.0, 0.95 + k * 0.18, 1.52), '#C8B6C4', 0.8); }
      // Caneca e luminária de mesa
      caixa(d, 6.3, 1.5, 1.46, 0.25, 0.25, 0.3, '#E79BB9');
      caixa(d, 3.55, 0.55, 1.46, 0.3, 0.3, 0.05, AMEIXA_SUAVE);
      caixa(d, 3.66, 0.66, 1.51, 0.08, 0.08, 0.9, AMEIXA_SUAVE);
      caixa(d, 3.5, 0.5, 2.3, 0.45, 0.45, 0.25, ROSA);
      for (const [x, y] of [[4.35, 2.55], [5.3, 2.55], [4.35, 3.4], [5.3, 3.4]]) caixa(d, x, y, 0, 0.1, 0.1, 0.75, AMEIXA_SUAVE);
      caixa(d, 4.3, 2.5, 0.75, 1.1, 1.0, 0.14, PINK);
      caixa(d, 4.3, 3.35, 0.89, 1.1, 0.15, 1.1, PINK);
      caixa(d, 4.4, 3.33, 1.25, 0.9, 0.03, 0.6, claro(PINK, 0.25));
    });
    objeto(m, 'poltrona', 'Poltrona: meditação', { tipo: 'atividade', atividade: 'meditacao' }, [3.6, 7.0], d => {
      sombraChao(d, 1.0, 6.0, 1.9, 1.9);
      for (const [x, y] of [[1.05, 7.7], [2.7, 7.7], [2.7, 6.05]]) caixa(d, x, y, 0, 0.12, 0.12, 0.2, NOITE);
      caixa(d, 1.0, 6.0, 0.2, 1.9, 1.9, 0.5, '#8E6A9A');
      caixa(d, 1.0, 6.0, 0.7, 0.45, 1.9, 1.15, '#7A5686');
      caixa(d, 1.45, 6.35, 0.7, 1.4, 1.2, 0.14, '#A88AB2');
      caixa(d, 1.45, 6.0, 0.7, 1.45, 0.35, 0.42, '#7A5686');
      caixa(d, 1.45, 7.55, 0.7, 1.45, 0.35, 0.42, '#7A5686');
      caixa(d, 1.5, 6.7, 0.84, 0.25, 0.6, 0.5, ROSA);
    });
    vaga('estudo-canto');
    area = [3.8, 9.2, 4.3, 9.2];
  }

  if (id === 'sala') {
    casca(m.cena, '#F2EAE0', '#E8DCCF', '#DCC6B0', 'madeira');
    vaga('sala-tapete');
    vaga('sala-parede');
    vaga('sala-parede2');
    objeto(m, 'aquario', 'Aquário', { tipo: 'segredo', segredo: 'peixe' }, [2.8, 2.6], d => {
      sombraChao(d, 0.3, 0.3, 1.7, 0.9);
      caixa(d, 0.3, 0.3, 0, 1.7, 0.9, 1.0, AMEIXA_SUAVE);
      caixa(d, 0.4, 0.35, 1.0, 1.5, 0.8, 1.0, '#BFE6FF', ' opacity="0.85"');
      noChao(d, 0.45, 0.4, 1.4, 0.7, '#E9DCCB', '', 1.03);
      figura(d, 1.25, 0.75, 1.45,
        `<path d="M-10 0 Q0 -8 10 0 Q0 8 -10 0 Z M9 0 L16 -6 L16 6 Z" fill="${PINK}"/><circle cx="-5" cy="-1" r="1.2" fill="#ffffff"/><circle cx="-14" cy="-14" r="2.5" fill="#ffffff" opacity="0.8"/><circle cx="-10" cy="-22" r="1.8" fill="#ffffff" opacity="0.8"/><path d="M14 10 q3 -8 0 -14 M18 10 q-3 -6 0 -12" stroke="#88B862" stroke-width="2" fill="none"/>`,
        [-16, -24, 36, 36]);
    });
    objeto(m, 'som', 'Caixa de som: louvor', { tipo: 'atividade', atividade: 'louvor' }, [5.0, 2.7], d => {
      sombraChao(d, 3.0, 0.2, 4.2, 1.0);
      caixa(d, 3.0, 0.25, 0, 0.55, 0.6, 1.9, NOITE);
      caixa(d, 3.6, 0.2, 0, 3.0, 0.95, 0.85, MADEIRA);
      linha(d, iso(3.7, 1.16, 0.42), iso(6.5, 1.16, 0.42), sombra(MADEIRA, 0.25), 1.2);
      // Discos na estante do rack
      for (let k = 0; k < 6; k++) poly(d, [iso(3.9 + k * 0.18, 1.16, 0.08), iso(4.02 + k * 0.18, 1.16, 0.08), iso(4.02 + k * 0.18, 1.16, 0.38), iso(3.9 + k * 0.18, 1.16, 0.38)], [PINK, NOITE, ROSA, LIMA, '#8E6A9A', NEVOA][k]);
      caixa(d, 6.65, 0.25, 0, 0.55, 0.6, 1.9, NOITE);
      for (const [x, z] of [[3.27, 1.4], [3.27, 0.6], [6.92, 1.4], [6.92, 0.6]]) {
        figura(d, x, 0.85, z, `<ellipse rx="4.5" ry="5.5" fill="${AMEIXA_SUAVE}"/><ellipse rx="2" ry="2.4" fill="${LIMA}"/>`, [-5, -6, 10, 12]);
      }
      caixa(d, 4.4, 0.35, 0.85, 1.3, 0.7, 0.12, NEVOA);
      figura(d, 5.05, 0.7, 0.98, `<ellipse rx="13" ry="6.5" fill="${NOITE}"/><ellipse rx="4" ry="2" fill="${PINK}"/><path d="M10 -8 l-6 6" stroke="${AMEIXA_SUAVE}" stroke-width="1.6"/>`, [-13, -9, 26, 16]);
    });
    vaga('sala-canto');
    objeto(m, 'violao', 'Violão: ensaio', { tipo: 'atividade', atividade: 'ensaio' }, [7.6, 2.5], d => {
      figura(d, 8.1, 0.45, 0,
        `<rect x="-3" y="-90" width="6" height="52" rx="2" fill="${sombra(MADEIRA, 0.3)}"/><rect x="-5.5" y="-99" width="11" height="12" rx="3" fill="${NOITE}"/>` +
        `<circle cy="-40" r="10.5" fill="${MADEIRA}"/><circle cy="-19" r="15" fill="${MADEIRA}"/><circle cy="-27" r="4" fill="${NOITE}"/><rect x="-5" y="-12" width="10" height="2.5" rx="1" fill="${NOITE}"/>` +
        `<path d="M-1.2 -88 V-10 M1.2 -88 V-10" stroke="#FFFFFF" stroke-width="0.6" opacity="0.8"/>`,
        [-16, -100, 32, 100]);
    });
    enfeite(m, d => {
      // Sofá com almofadas e manta
      sombraChao(d, 0.3, 2.3, 1.9, 4.1);
      for (const [x, y] of [[0.35, 6.25], [2.05, 6.25], [2.05, 2.35]]) caixa(d, x, y, 0, 0.12, 0.12, 0.2, NOITE);
      caixa(d, 0.3, 2.3, 0.2, 1.9, 4.1, 0.55, '#F2B8CF');
      caixa(d, 0.3, 2.3, 0.75, 0.5, 4.1, 1.05, '#E79BB9');
      caixa(d, 0.8, 2.75, 0.75, 1.35, 1.55, 0.18, ROSA);
      caixa(d, 0.8, 4.4, 0.75, 1.35, 1.55, 0.18, ROSA);
      caixa(d, 0.85, 3.1, 0.93, 0.25, 0.8, 0.55, PINK);
      caixa(d, 0.85, 4.9, 0.93, 0.25, 0.8, 0.55, NEVOA);
      caixa(d, 0.8, 2.3, 0.75, 1.4, 0.42, 0.45, '#E79BB9');
      caixa(d, 0.8, 5.98, 0.75, 1.4, 0.42, 0.45, '#E79BB9');
      caixa(d, 1.2, 5.0, 0.93, 0.95, 0.98, 0.03, '#A88AB2');
    });
    objeto(m, 'porta', 'Porta: ir à igreja', { tipo: 'atividade', atividade: 'igreja' }, [1.5, 8.4], d => {
      naParedeE(d, 7.35, 0, 2.2, 4.55, '#FFFFFF');
      naParedeE(d, 7.5, 0, 1.9, 4.3, AMEIXA_SUAVE, 0.03);
      naParedeE(d, 7.7, 0.3, 1.5, 1.8, '#5A3D60', 0.04);
      naParedeE(d, 7.7, 2.3, 1.5, 1.7, '#5A3D60', 0.04);
      figura(d, 0.06, 9.15, 2.1, `<circle r="3" fill="#F2C94C"/>`, [-3, -3, 6, 6]);
      noChao(d, 0.1, 7.5, 1.0, 1.9, '#D9C3CD');
      figura(d, 0.05, 8.45, 4.75, `<path d="M0 -10 V2 M-4 -6 H4" stroke="${PINK}" stroke-width="2" stroke-linecap="round"/>`, [-5, -11, 10, 14]);
    });
    objeto(m, 'exercicio', 'Tapete de treino: exercício', { tipo: 'atividade', atividade: 'exercicio' }, [7.4, 6.8], d => {
      noChao(d, 6.3, 6.2, 2.8, 1.2, '#C7F28A', '', 0.03);
      linha(d, iso(6.4, 6.4, 0.04), iso(9.0, 6.4, 0.04), '#FFFFFF', 1.4, ' opacity="0.7"');
      caixa(d, 8.4, 7.9, 0, 0.9, 0.18, 0.18, NOITE);
      caixa(d, 8.3, 7.8, 0, 0.16, 0.38, 0.38, PINK);
      caixa(d, 9.24, 7.8, 0, 0.16, 0.38, 0.38, PINK);
      caixa(d, 8.9, 6.5, 0, 0.45, 0.45, 0.45, '#E79BB9');
    });
    area = [3.0, 9.0, 3.6, 8.6];
  }

  if (id === 'banheiro') {
    casca(m.cena, '#FBF8F4', '#F1EAE2', '#EFE3DA', 'azulejo');
    vaga('banheiro-tapete');
    enfeite(m, d => {
      for (let z = 1; z < 6.5; z += 1) {
        linha(d, iso(0.02, 0, z), iso(0.02, D, z), '#E8DDD2', 1);
        linha(d, iso(0, 0.02, z), iso(W, 0.02, z), '#E8DDD2', 1);
      }
      // Banheira com pés, borda e torneira
      sombraChao(d, 0.2, 1.0, 2.3, 4.4);
      for (const [x, y] of [[0.3, 5.2], [2.3, 5.2], [2.3, 1.1]]) caixa(d, x, y, 0, 0.15, 0.15, 0.25, '#C9B6A2');
      caixa(d, 0.2, 1.0, 0.25, 2.3, 4.4, 0.9, '#FFFFFF');
      poly(d, [iso(0.45, 1.25, 1.15), iso(2.25, 1.25, 1.15), iso(2.25, 5.15, 1.15), iso(0.45, 5.15, 1.15)], '#BFE6FF');
      poly(d, [iso(0.6, 1.4, 1.16), iso(1.4, 1.4, 1.16), iso(1.4, 2.4, 1.16), iso(0.6, 2.4, 1.16)], '#FFFFFF', ' opacity="0.45"');
      caixa(d, 0.3, 1.1, 1.15, 0.3, 0.3, 0.55, '#E8DDD2');
      caixa(d, 0.55, 1.15, 1.55, 0.5, 0.18, 0.1, '#E8DDD2');
      // Varão e cortina de banho
      linha(d, iso(0.05, 1.0, 5.4), iso(0.05, 5.4, 5.4), '#C9B6A2', 2.4);
      naParedeE(d, 1.0, 2.4, 0.8, 3.0, ROSA, 0.08);
    });
    vaga('banheiro-parede');
    objeto(m, 'patinho', 'Patinho de borracha', { tipo: 'segredo', segredo: 'patinho' }, [3.3, 3.7], d => {
      figura(d, 1.4, 3.3, 1.15,
        `<ellipse cy="-6" rx="10" ry="6.5" fill="#F2C94C"/><circle cx="5.5" cy="-14" r="6" fill="#F2C94C"/><path d="M11 -15 l6 1.4 -6 2 Z" fill="${PINK}"/><circle cx="7" cy="-16" r="1.3" fill="${NOITE}"/><ellipse cx="-3" cy="-7" rx="4" ry="2.4" fill="#E2B33A"/>`,
        [-11, -21, 29, 22]);
    });
    objeto(m, 'espelho', 'Espelho: rosto e cabelo', { tipo: 'visual' }, [5.1, 2.6], d => {
      sombraChao(d, 4.1, 0.15, 2.0, 1.05);
      caixa(d, 4.1, 0.15, 0, 2.0, 1.05, 1.35, '#F2B8CF');
      linha(d, iso(5.1, 1.21, 0.15), iso(5.1, 1.21, 1.2), sombra('#F2B8CF', 0.25), 1.2);
      figura(d, 4.9, 1.22, 0.75, `<circle r="1.6" fill="${AMEIXA_SUAVE}"/>`, [-2, -2, 4, 4]);
      figura(d, 5.3, 1.22, 0.75, `<circle r="1.6" fill="${AMEIXA_SUAVE}"/>`, [-2, -2, 4, 4]);
      caixa(d, 4.05, 0.1, 1.35, 2.1, 1.15, 0.08, '#FFFFFF');
      circulo(d, (a, b) => iso(5.1 + a, 0.7 + b * 0.7, 1.44), 0.5, '#E8F4FF');
      caixa(d, 5.05, 0.25, 1.43, 0.12, 0.12, 0.4, '#C9B6A2');
      naParedeD(d, 4.15, 2.0, 1.9, 2.4, '#E79BB9', 0.03);
      naParedeD(d, 4.3, 2.15, 1.6, 2.1, '#DDF0FF', 0.04);
      linha(d, iso(4.6, 0.05, 3.7), iso(5.0, 0.05, 4.1), '#ffffff', 3);
      linha(d, iso(4.6, 0.05, 3.2), iso(4.75, 0.05, 3.35), '#ffffff', 2);
    });
    enfeite(m, d => {
      // Vaso sanitário, toalha e tapetinho
      sombraChao(d, 7.55, 0.12, 1.0, 1.25);
      caixa(d, 7.55, 0.12, 0.85, 1.0, 0.35, 0.95, '#FFFFFF');
      caixa(d, 7.6, 0.35, 0, 0.9, 1.0, 0.85, '#FFFFFF');
      caixa(d, 7.65, 0.45, 0.85, 0.8, 0.85, 0.06, '#F1EAE2');
      caixa(d, 7.9, 0.15, 1.8, 0.4, 0.2, 0.06, '#E8DDD2');
      linha(d, iso(0.05, 6.2, 3.8), iso(0.05, 7.5, 3.8), '#C9B6A2', 2.4);
      naParedeE(d, 6.3, 2.0, 1.1, 1.75, '#C7F28A', 0.04);
      naParedeE(d, 6.3, 2.2, 1.1, 0.12, '#FFFFFF', 0.05);
      noChao(d, 4.2, 1.6, 1.8, 0.9, '#F2B8CF');
    });
    vaga('banheiro-canto');
    area = [3.2, 9.0, 3.4, 8.6];
  }

  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LARG} ${ALT}">${m.cena.svg}</svg>`, objetos: m.objetos, area, entrada };
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
