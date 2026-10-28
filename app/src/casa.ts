// Casa isométrica do Faith Steps: quatro cômodos desenhados em código.
// Cada cômodo é um "palco" de 10 × 10 unidades com duas paredes ao fundo.
// O personagem anda só na parte da frente do chão, então sempre fica na frente dos móveis.
import { cabecaDeitada, mix, type Look } from './personagem';
import type { AtividadeId } from './jogo';

type P = [number, number];
const r1 = (v: number) => Math.round(v * 10) / 10;

export const LARG = 600, ALT = 480; // viewBox da cena
const S = 27, OX = 300, OY = 191, W = 10, D = 10, H = 6.5, E = 0.35;
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

type Desenho = { svg: string; pts: P[] };
const novo = (): Desenho => ({ svg: '', pts: [] });

function poly(d: Desenho, ps: P[], cor: string, extra = '') {
  d.svg += `<polygon points="${pts(ps)}" fill="${cor}"${extra}/>`;
  d.pts.push(...ps);
}
function linha(d: Desenho, a: P, b: P, cor: string, largura = 2) {
  d.svg += `<line x1="${r1(a[0])}" y1="${r1(a[1])}" x2="${r1(b[0])}" y2="${r1(b[1])}" stroke="${cor}" stroke-width="${largura}" stroke-linecap="round"/>`;
}
// Caixa: desenha as três faces visíveis
function caixa(d: Desenho, x: number, y: number, z: number, w: number, dd: number, h: number, cor: string, extra = '') {
  poly(d, [iso(x, y + dd, z), iso(x + w, y + dd, z), iso(x + w, y + dd, z + h), iso(x, y + dd, z + h)], sombra(cor, 0.12), extra);
  poly(d, [iso(x + w, y, z), iso(x + w, y + dd, z), iso(x + w, y + dd, z + h), iso(x + w, y, z + h)], sombra(cor, 0.28), extra);
  poly(d, [iso(x, y, z + h), iso(x + w, y, z + h), iso(x + w, y + dd, z + h), iso(x, y + dd, z + h)], cor, extra);
}
// Retângulo na parede esquerda (plano x = 0), na direita (plano y = 0) ou no chão
const naParedeE = (d: Desenho, y: number, z: number, dd: number, h: number, cor: string, x = 0.02) =>
  poly(d, [iso(x, y, z), iso(x, y + dd, z), iso(x, y + dd, z + h), iso(x, y, z + h)], cor);
const naParedeD = (d: Desenho, x: number, z: number, w: number, h: number, cor: string, y = 0.02) =>
  poly(d, [iso(x, y, z), iso(x + w, y, z), iso(x + w, y, z + h), iso(x, y, z + h)], cor);
const noChao = (d: Desenho, x: number, y: number, w: number, dd: number, cor: string, extra = '', z = 0.01) =>
  poly(d, [iso(x, y, z), iso(x + w, y, z), iso(x + w, y + dd, z), iso(x, y + dd, z)], cor, extra);
// Desenho 2D preso num ponto da casa (plantas, violão, peixe...). caixa = [esquerda, topo, largura, altura] relativa
function figura(d: Desenho, x: number, y: number, z: number, svg: string, [l, t, w, h]: [number, number, number, number]) {
  const [sx, sy] = iso(x, y, z);
  d.svg += `<g transform="translate(${r1(sx)} ${r1(sy)})">${svg}</g>`;
  d.pts.push([sx + l, sy + t], [sx + l + w, sy + t + h]);
}

type Piso = 'madeira' | 'azulejo' | 'carpete';
function casca(d: Desenho, paredeE: string, paredeD: string, chao: string, piso: Piso) {
  const borda = '#FFFFFF';
  // Paredes do fundo, com espessura no topo e nas pontas (como uma maquete)
  poly(d, [iso(0, 0, 0), iso(0, D, 0), iso(0, D, H), iso(0, 0, H)], paredeE);
  poly(d, [iso(0, 0, 0), iso(W, 0, 0), iso(W, 0, H), iso(0, 0, H)], paredeD);
  poly(d, [iso(-E, -E, H), iso(-E, D, H), iso(0, D, H), iso(0, 0, H)], borda);
  poly(d, [iso(-E, -E, H), iso(W, -E, H), iso(W, 0, H), iso(0, 0, H)], borda);
  poly(d, [iso(-E, D, -E), iso(0, D, -E), iso(0, D, H), iso(-E, D, H)], sombra(borda, 0.12));
  poly(d, [iso(W, -E, -E), iso(W, 0, -E), iso(W, 0, H), iso(W, -E, H)], sombra(borda, 0.25));
  // Rodapé
  naParedeE(d, 0, 0, D, 0.22, sombra(paredeE, 0.25));
  naParedeD(d, 0, 0, W, 0.22, sombra(paredeD, 0.25));
  // Chão com espessura
  poly(d, [iso(-E, D, 0), iso(W, D, 0), iso(W, D, -E), iso(-E, D, -E)], sombra(borda, 0.12));
  poly(d, [iso(W, -E, 0), iso(W, D, 0), iso(W, D, -E), iso(W, -E, -E)], sombra(borda, 0.25));
  poly(d, [iso(0, 0, 0), iso(W, 0, 0), iso(W, D, 0), iso(0, D, 0)], chao);
  const traco = sombra(chao, 0.1);
  if (piso !== 'carpete') for (let i = 1; i < 10; i++) linha(d, iso(0, i), iso(W, i), traco, 1);
  if (piso === 'azulejo') for (let i = 1; i < 10; i++) linha(d, iso(i, 0), iso(i, D), traco, 1);
}

export type ComodoId = 'quarto' | 'estudo' | 'sala' | 'banheiro';
export type Segredo = 'dracma' | 'pergaminho' | 'peixe' | 'patinho';
export type Alvo =
  | { tipo: 'atividade'; atividade: AtividadeId }
  | { tipo: 'visual' }
  | { tipo: 'segredo'; segredo: Segredo };
export type Objeto = { id: string; rotulo: string; alvo: Alvo; ponto: P; caixa: [number, number, number, number] };
export type Comodo = { svg: string; objetos: Objeto[]; area: [number, number, number, number]; entrada: P };

export const LISTA_COMODOS: { id: ComodoId; nome: string; dica: string }[] = [
  { id: 'quarto', nome: 'Quarto', dica: 'Devocional, oração e guarda-roupa' },
  { id: 'estudo', nome: 'Sala de estudo', dica: 'Leitura, estudo e meditação' },
  { id: 'sala', nome: 'Sala', dica: 'Louvor, ensaio, igreja e exercício' },
  { id: 'banheiro', nome: 'Banheiro', dica: 'Espelho para mudar o visual' },
];

// Easter eggs: a moeda dá talentos uma vez; os outros só mostram uma mensagem
export const SEGREDOS: Record<Segredo, string> = {
  dracma: 'Você achou a moeda perdida debaixo da cama, como na parábola da dracma (Lucas 15:8). +10 talentos!',
  pergaminho: '"Lâmpada para os meus pés é a tua palavra." Salmos 119:105',
  peixe: 'O peixe era o sinal secreto dos primeiros cristãos. Em grego, ichthys: Jesus Cristo, Filho de Deus, Salvador.',
  patinho: 'Quack! Tudo o que tem fôlego louve ao Senhor. Salmos 150:6',
};

const LIMA = '#8AFF00', PINK = '#FE0472', NOITE = '#2A0A31', NEVOA = '#FBF3F8', ROSA = '#FFD1E6';

type Montagem = { cena: Desenho; objetos: Objeto[] };
// Adiciona um objeto clicável: desenha e guarda a área de toque
function objeto(m: Montagem, id: string, rotulo: string, alvo: Alvo, ponto: P, desenhar: (d: Desenho) => void) {
  const d = novo();
  desenhar(d);
  m.cena.svg += d.svg;
  const xs = d.pts.map(p => p[0]), ys = d.pts.map(p => p[1]);
  const x = Math.min(...xs) - 4, y = Math.min(...ys) - 4;
  m.objetos.push({ id, rotulo, alvo, ponto, caixa: [x, y, Math.max(...xs) + 4 - x, Math.max(...ys) + 4 - y] });
}
const enfeite = (m: Montagem, desenhar: (d: Desenho) => void) => desenhar(m.cena);

// Móveis da loja, cada um no seu cômodo
const MOVEIS: Record<string, { comodo: ComodoId; desenhar: (d: Desenho) => void }> = {
  quadro: {
    comodo: 'quarto',
    desenhar: d => {
      naParedeE(d, 2.0, 3.2, 2.2, 1.8, NEVOA, 0.03);
      naParedeE(d, 2.2, 3.4, 1.8, 1.4, ROSA, 0.04);
      linha(d, iso(0.05, 3.1, 3.6), iso(0.05, 3.1, 4.6), PINK, 3);
      linha(d, iso(0.05, 2.7, 4.25), iso(0.05, 3.5, 4.25), PINK, 3);
    },
  },
  luminaria: {
    comodo: 'estudo',
    desenhar: d => {
      figura(d, 1.3, 8.55, 3.3, `<circle r="46" fill="${LIMA}" opacity="0.13"/>`, [-46, -46, 92, 92]);
      caixa(d, 1.0, 8.25, 0, 0.6, 0.6, 0.08, NOITE);
      caixa(d, 1.25, 8.5, 0.08, 0.12, 0.12, 3.0, NOITE);
      caixa(d, 0.9, 8.15, 3.05, 0.85, 0.85, 0.7, PINK);
    },
  },
  tapete: {
    comodo: 'sala',
    desenhar: d => {
      noChao(d, 3.2, 3.0, 3.8, 3.2, '#E79BB9', ' opacity="0.55"');
      noChao(d, 3.6, 3.4, 3.0, 2.4, ROSA, ' opacity="0.45"', 0.02);
    },
  },
  planta: {
    comodo: 'sala',
    desenhar: d => {
      caixa(d, 8.9, 0.35, 0, 0.8, 0.8, 0.8, PINK);
      figura(d, 9.3, 0.75, 0.8,
        `<ellipse cx="-9" cy="-20" rx="9" ry="20" fill="#5FD400" transform="rotate(-20 -9 -20)"/><ellipse cx="9" cy="-22" rx="9" ry="22" fill="${LIMA}" transform="rotate(18 9 -22)"/><ellipse cx="0" cy="-30" rx="8" ry="24" fill="#6FE000"/>`,
        [-20, -56, 40, 56]);
    },
  },
};
export const COMODO_DO_MOVEL: Record<string, ComodoId> = Object.fromEntries(Object.entries(MOVEIS).map(([k, v]) => [k, v.comodo]));

export function montarComodo(id: ComodoId, op: { itens: string[]; achados: string[]; dormindo?: Look }): Comodo {
  const m: Montagem = { cena: novo(), objetos: [] };
  const comprado = (k: string) => op.itens.includes(k) && MOVEIS[k].comodo === id;
  const movel = (k: string) => { if (comprado(k)) MOVEIS[k].desenhar(m.cena); };

  let area: Comodo['area'] = [3.2, 9.0, 3.2, 8.8];
  let entrada: P = [6.5, 9.4];

  if (id === 'quarto') {
    casca(m.cena, '#F4E8EC', '#EADBE2', '#F3EAE1', 'carpete');
    enfeite(m, d => {
      // Janela com sol
      naParedeD(d, 5.5, 2.3, 2.8, 2.8, NEVOA);
      naParedeD(d, 5.7, 2.5, 2.4, 2.4, ROSA, 0.03);
      figura(d, 7.4, 0.04, 4.3, `<circle r="9" fill="${LIMA}"/>`, [-9, -9, 18, 18]);
      linha(d, iso(6.9, 0.04, 2.5), iso(6.9, 0.04, 4.9), '#D9C3CD', 3);
      linha(d, iso(5.7, 0.04, 3.7), iso(8.1, 0.04, 3.7), '#D9C3CD', 3);
      caixa(d, 5.4, 0.02, 2.15, 3.0, 0.35, 0.15, NEVOA);
    });
    movel('quadro');
    objeto(m, 'guarda-roupa', 'Guarda-roupa: mudar visual', { tipo: 'visual' }, [4.5, 2.7], d => {
      caixa(d, 3.6, 0.1, 0, 1.7, 1.0, 4.3, '#E0CDBE');
      linha(d, iso(4.45, 1.1, 0.25), iso(4.45, 1.1, 4.05), '#C4AE9C', 2);
      figura(d, 4.25, 1.1, 2.2, `<circle r="2.6" fill="#6A4A6E"/>`, [-3, -3, 6, 6]);
      figura(d, 4.65, 1.1, 2.2, `<circle r="2.6" fill="#6A4A6E"/>`, [-3, -3, 6, 6]);
    });
    enfeite(m, d => {
      // Cama
      caixa(d, 0.15, 0.9, 0, 3.4, 0.3, 2.1, '#6A4A6E');
      caixa(d, 0.2, 1.2, 0, 3.3, 4.3, 0.75, '#E0CDBE');
      caixa(d, 0.3, 1.25, 0.75, 3.1, 4.2, 0.4, NEVOA);
      caixa(d, 0.7, 1.4, 1.15, 2.3, 0.9, 0.32, '#FFFFFF');
      if (op.dormindo) {
        const [sx, sy] = iso(1.85, 1.75, 1.55);
        d.svg += `<g transform="translate(${r1(sx)} ${r1(sy)}) rotate(-58) scale(0.34) translate(-100 -72)">${cabecaDeitada(op.dormindo)}</g>`;
        caixa(d, 0.25, 2.25, 1.15, 3.2, 3.3, 0.22, PINK);
        figura(d, 3.2, 1.0, 3.4,
          `<path d="M0 0 h9 l-9 11 h9 M14 -22 h12 l-12 15 h12 M32 -50 h16 l-16 20 h16" fill="none" stroke="${LIMA}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`,
          [0, -50, 50, 62]);
      } else {
        caixa(d, 0.25, 2.5, 1.15, 3.2, 3.05, 0.14, PINK);
      }
    });
    objeto(m, 'almofada', 'Almofada: oração', { tipo: 'atividade', atividade: 'oracao' }, [6.5, 3.5], d => {
      caixa(d, 5.7, 1.4, 0, 1.6, 1.6, 0.32, PINK);
      caixa(d, 5.85, 1.55, 0.32, 1.3, 1.3, 0.06, '#FF5AA8');
    });
    objeto(m, 'biblia', 'Bíblia: devocional', { tipo: 'atividade', atividade: 'devocional' }, [2.6, 7.0], d => {
      caixa(d, 0.3, 5.8, 0, 1.4, 1.3, 1.05, '#E0CDBE');
      caixa(d, 0.55, 6.05, 1.05, 0.9, 0.75, 0.2, NOITE);
      linha(d, iso(1.0, 6.18, 1.26), iso(1.0, 6.68, 1.26), LIMA, 2.2);
      linha(d, iso(0.78, 6.36, 1.26), iso(1.22, 6.36, 1.26), LIMA, 2.2);
    });
    if (!op.achados.includes('dracma')) {
      objeto(m, 'moeda', 'Algo brilha aqui...', { tipo: 'segredo', segredo: 'dracma' }, [4.3, 5.4], d => {
        figura(d, 3.75, 4.9, 0.02,
          `<circle r="13" fill="${LIMA}" opacity="0.2"/><ellipse rx="6" ry="3.4" fill="#E9FF9A"/><path d="M8 -10 l1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5 Z" fill="#ffffff"/>`,
          [-14, -14, 28, 28]);
      });
    }
    area = [4.0, 9.2, 3.4, 9.2];
    entrada = [7.0, 9.6];
  }

  if (id === 'estudo') {
    casca(m.cena, '#EFE5D8', '#E5D8C8', '#D9C2AA', 'madeira');
    objeto(m, 'estante', 'Estante: leitura bíblica', { tipo: 'atividade', atividade: 'leitura' }, [2.4, 3.4], d => {
      caixa(d, 0.15, 0.6, 0, 1.0, 4.8, 5.4, '#C9A88A');
      const cores = ['#42124C', ROSA, PINK, NEVOA, '#8E6A9A', '#F2B8CF'];
      [0.42, 1.72, 3.02, 4.32].forEach((z, fila) => {
        linha(d, iso(1.16, 0.6, z - 0.06), iso(1.16, 5.4, z - 0.06), '#A8876B', 3);
        for (let i = 0, y = 0.8; y < 5.1; i++, y += 0.38) {
          const h = 0.8 + ((i * 7 + fila * 3) % 4) * 0.08;
          poly(d, [iso(1.17, y, z), iso(1.17, y + 0.3, z), iso(1.17, y + 0.3, z + h), iso(1.17, y, z + h)], cores[(i + fila) % cores.length]);
        }
      });
    });
    objeto(m, 'pergaminho', 'Pergaminho', { tipo: 'segredo', segredo: 'pergaminho' }, [8.2, 2.6], d => {
      caixa(d, 7.4, 0.05, 3.0, 1.8, 0.5, 0.1, '#C9A88A');
      figura(d, 8.3, 0.3, 3.1,
        `<circle cy="-7" r="18" fill="${LIMA}" opacity="0.16"/><rect x="-14" y="-12" width="28" height="10" rx="5" fill="${NEVOA}"/><circle cx="-14" cy="-7" r="5.5" fill="${ROSA}"/><circle cx="14" cy="-7" r="5.5" fill="${ROSA}"/>`,
        [-19, -25, 38, 26]);
    });
    objeto(m, 'mesa', 'Mesa: estudo bíblico', { tipo: 'atividade', atividade: 'estudo' }, [4.9, 4.3], d => {
      for (const [x, y] of [[3.4, 0.5], [6.25, 0.5], [3.4, 1.95], [6.25, 1.95]]) caixa(d, x, y, 0, 0.15, 0.15, 1.3, NEVOA);
      caixa(d, 3.3, 0.4, 1.3, 3.1, 1.75, 0.16, NEVOA);
      caixa(d, 3.9, 0.8, 1.46, 1.0, 0.75, 0.07, PINK);
      caixa(d, 5.1, 0.75, 1.46, 1.0, 0.8, 0.05, '#FFFFFF');
      linha(d, iso(5.6, 0.75, 1.52), iso(5.6, 1.55, 1.52), '#C8B6C4', 1.5);
      for (const [x, y] of [[4.35, 2.55], [5.3, 2.55], [4.35, 3.4], [5.3, 3.4]]) caixa(d, x, y, 0, 0.1, 0.1, 0.75, NOITE);
      caixa(d, 4.3, 2.5, 0.75, 1.1, 1.0, 0.14, PINK);
      caixa(d, 4.3, 3.35, 0.89, 1.1, 0.15, 1.1, PINK);
    });
    objeto(m, 'poltrona', 'Poltrona: meditação', { tipo: 'atividade', atividade: 'meditacao' }, [3.6, 7.0], d => {
      caixa(d, 1.0, 6.0, 0, 1.9, 1.9, 0.65, '#8E6A9A');
      caixa(d, 1.0, 6.0, 0.65, 0.45, 1.9, 1.2, '#7A5686');
      caixa(d, 1.45, 6.35, 0.65, 1.4, 1.2, 0.12, '#A88AB2');
      caixa(d, 1.45, 6.0, 0.65, 1.45, 0.35, 0.42, '#7A5686');
      caixa(d, 1.45, 7.55, 0.65, 1.45, 0.35, 0.42, '#7A5686');
    });
    movel('luminaria');
    area = [3.8, 9.2, 4.2, 9.2];
  }

  if (id === 'sala') {
    casca(m.cena, '#F2EAE0', '#E8DCCF', '#DCC6B0', 'madeira');
    movel('tapete');
    objeto(m, 'aquario', 'Aquário', { tipo: 'segredo', segredo: 'peixe' }, [2.8, 2.6], d => {
      caixa(d, 0.3, 0.3, 0, 1.7, 0.9, 1.0, NOITE);
      caixa(d, 0.4, 0.35, 1.0, 1.5, 0.8, 1.0, '#9FD8FF', ' opacity="0.9"');
      figura(d, 1.25, 0.75, 1.45,
        `<path d="M-10 0 Q0 -8 10 0 Q0 8 -10 0 Z M9 0 L16 -6 L16 6 Z" fill="${LIMA}"/><circle cx="-14" cy="-14" r="2.5" fill="#ffffff" opacity="0.8"/><circle cx="-10" cy="-22" r="1.8" fill="#ffffff" opacity="0.8"/>`,
        [-16, -24, 33, 32]);
    });
    objeto(m, 'som', 'Caixa de som: louvor', { tipo: 'atividade', atividade: 'louvor' }, [5.0, 2.6], d => {
      caixa(d, 3.0, 0.25, 0, 0.55, 0.6, 1.9, NOITE);
      caixa(d, 3.6, 0.2, 0, 3.0, 0.95, 0.85, NOITE);
      caixa(d, 6.65, 0.25, 0, 0.55, 0.6, 1.9, NOITE);
      for (const [x, z] of [[3.27, 1.4], [3.27, 0.6], [6.92, 1.4], [6.92, 0.6]]) {
        figura(d, x, 0.85, z, `<ellipse rx="5" ry="6" fill="${LIMA}"/><ellipse rx="2" ry="2.4" fill="${NOITE}"/>`, [-5, -6, 10, 12]);
      }
      caixa(d, 4.4, 0.35, 0.85, 1.3, 0.7, 0.12, NEVOA);
      figura(d, 5.05, 0.7, 0.98, `<ellipse rx="15" ry="7.5" fill="${NOITE}"/><ellipse rx="4.5" ry="2.3" fill="${PINK}"/>`, [-15, -8, 30, 16]);
    });
    movel('planta');
    objeto(m, 'violao', 'Violão: ensaio', { tipo: 'atividade', atividade: 'ensaio' }, [7.6, 2.4], d => {
      figura(d, 8.1, 0.45, 0,
        `<rect x="-3" y="-104" width="6" height="60" rx="2" fill="${NOITE}"/><rect x="-6" y="-114" width="12" height="13" rx="3" fill="${NOITE}"/><circle cy="-46" r="12" fill="#C8005A"/><circle cy="-22" r="17" fill="${PINK}"/><circle cy="-30" r="4.5" fill="${NOITE}"/>`,
        [-17, -114, 34, 114]);
    });
    enfeite(m, d => {
      // Sofá
      caixa(d, 0.3, 2.3, 0, 1.9, 4.1, 0.75, '#F2B8CF');
      caixa(d, 0.3, 2.3, 0.75, 0.5, 4.1, 1.05, '#E79BB9');
      caixa(d, 0.8, 2.75, 0.75, 1.35, 1.55, 0.15, ROSA);
      caixa(d, 0.8, 4.4, 0.75, 1.35, 1.55, 0.15, ROSA);
      caixa(d, 0.8, 2.3, 0.75, 1.4, 0.42, 0.45, '#E79BB9');
      caixa(d, 0.8, 5.98, 0.75, 1.4, 0.42, 0.45, '#E79BB9');
    });
    objeto(m, 'porta', 'Porta: ir à igreja', { tipo: 'atividade', atividade: 'igreja' }, [1.5, 8.4], d => {
      naParedeE(d, 7.5, 0, 1.9, 4.3, '#6A4A6E');
      naParedeE(d, 7.7, 0.3, 1.5, 1.8, '#5A3D60', 0.03);
      naParedeE(d, 7.7, 2.3, 1.5, 1.7, '#5A3D60', 0.03);
      figura(d, 0.05, 9.15, 2.1, `<circle r="3.5" fill="${LIMA}"/>`, [-4, -4, 8, 8]);
      noChao(d, 0.1, 7.5, 1.0, 1.9, '#D9C3CD');
    });
    objeto(m, 'exercicio', 'Tapete de treino: exercício', { tipo: 'atividade', atividade: 'exercicio' }, [7.4, 6.8], d => {
      noChao(d, 6.3, 6.2, 2.8, 1.2, LIMA, '', 0.03);
      caixa(d, 8.4, 7.9, 0, 0.9, 0.18, 0.18, NOITE);
      caixa(d, 8.3, 7.8, 0, 0.16, 0.38, 0.38, PINK);
      caixa(d, 9.24, 7.8, 0, 0.16, 0.38, 0.38, PINK);
    });
    area = [3.0, 9.0, 3.4, 8.6];
  }

  if (id === 'banheiro') {
    casca(m.cena, '#FBF8F4', '#F1EAE2', '#EFE3DA', 'azulejo');
    enfeite(m, d => {
      for (let z = 1; z < 6.5; z += 1) {
        linha(d, iso(0.02, 0, z), iso(0.02, D, z), '#E8DDD2', 1);
        linha(d, iso(0, 0.02, z), iso(W, 0.02, z), '#E8DDD2', 1);
      }
      // Banheira
      caixa(d, 0.2, 1.0, 0, 2.3, 4.4, 1.1, '#FFFFFF');
      poly(d, [iso(0.45, 1.25, 1.1), iso(2.25, 1.25, 1.1), iso(2.25, 5.15, 1.1), iso(0.45, 5.15, 1.1)], '#9FD8FF');
      caixa(d, 0.3, 1.1, 1.1, 0.3, 0.3, 0.55, '#E3D3E0');
    });
    objeto(m, 'patinho', 'Patinho de borracha', { tipo: 'segredo', segredo: 'patinho' }, [3.3, 3.6], d => {
      figura(d, 1.4, 3.3, 1.1,
        `<ellipse cy="-6" rx="11" ry="7" fill="${LIMA}"/><circle cx="6" cy="-15" r="6.5" fill="${LIMA}"/><path d="M12 -16 l6 1.5 -6 2 Z" fill="${PINK}"/><circle cx="7.5" cy="-17" r="1.3" fill="${NOITE}"/>`,
        [-12, -23, 31, 24]);
    });
    objeto(m, 'espelho', 'Espelho: mudar visual', { tipo: 'visual' }, [5.1, 2.5], d => {
      caixa(d, 4.1, 0.15, 0, 2.0, 1.05, 1.35, '#F2B8CF');
      caixa(d, 4.3, 0.3, 1.35, 1.6, 0.75, 0.08, '#FFFFFF');
      naParedeD(d, 4.15, 2.0, 1.9, 2.4, '#E79BB9', 0.03);
      naParedeD(d, 4.3, 2.15, 1.6, 2.1, '#CDEBFF', 0.04);
      linha(d, iso(4.6, 0.05, 3.7), iso(5.0, 0.05, 4.1), '#ffffff', 3);
    });
    enfeite(m, d => {
      // Vaso sanitário, toalha e tapetinho
      caixa(d, 7.55, 0.12, 0.85, 1.0, 0.35, 0.95, '#FFFFFF');
      caixa(d, 7.6, 0.35, 0, 0.9, 1.0, 0.85, '#FFFFFF');
      caixa(d, 7.65, 0.45, 0.85, 0.8, 0.85, 0.06, '#F0E2EC');
      naParedeE(d, 6.3, 2.0, 1.1, 1.7, LIMA, 0.03);
      noChao(d, 4.2, 1.6, 1.8, 0.9, '#F2B8CF');
    });
    area = [3.2, 9.0, 3.2, 8.6];
  }

  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LARG} ${ALT}">${m.cena.svg}</svg>`, objetos: m.objetos, area, entrada };
}

// Miniatura de um móvel para a loja
export function movelSvg(item: string): string {
  const mv = MOVEIS[item];
  if (!mv) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"/>`;
  const d = novo();
  mv.desenhar(d);
  const xs = d.pts.map(p => p[0]), ys = d.pts.map(p => p[1]);
  const x = Math.min(...xs), y = Math.min(...ys), w = Math.max(...xs) - x, h = Math.max(...ys) - y;
  const lado = Math.max(w, h) * 1.25;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r1(x + w / 2 - lado / 2)} ${r1(y + h / 2 - lado / 2)} ${r1(lado)} ${r1(lado)}">${d.svg}</svg>`;
}
