// Cor de destaque escolhida pela pessoa: tudo que é rosa no app (menus, casa, miniaturas) segue essa cor.
// O rosa forte vira a cor exata; os outros tons de rosa mantêm a claridade e ganham o matiz da cor.
export const ROSA_PADRAO = '#FE0472';

type Hsl = [number, number, number];
function paraHsl(hex: string): Hsl {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return [0, 0, l];
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, d / (1 - Math.abs(2 * l - 1)), l];
}
function deHsl([h, s, l]: Hsl) {
  const f = (n: number) => { const k = (n + h * 12) % 12; return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return '#' + [0, 8, 4].map(n => Math.round(f(n) * 255).toString(16).padStart(2, '0')).join('');
}
const BASE = paraHsl(ROSA_PADRAO);
const igual = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export const rosado = (hex: string) => { const [h, s] = paraHsl(hex); return s > 0.25 && h > 0.86 && h < 0.98; };

// Troca um tom de rosa pela cor escolhida; outras cores voltam iguais
export function tingir(hex: string, cor: string) {
  if (!rosado(hex) || igual(cor, ROSA_PADRAO)) return hex;
  if (igual(hex, ROSA_PADRAO) || igual(hex, vivo(ROSA_PADRAO))) return cor;
  const alvo = paraHsl(cor);
  return deHsl([alvo[0], Math.min(1, (paraHsl(hex)[1] * alvo[1]) / BASE[1]), paraHsl(hex)[2]]);
}

// Tom do jogo: mais vivo e um pouco mais escuro que as cores de origem (o visual estava pastel demais).
// Satura e baixa os tons muito claros; brancos e cinzas só escurecem de leve.
export function vivo(hex: string) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  const [h, s, l] = paraHsl(hex);
  if (s < 0.05) return deHsl([h, s, l * 0.95]);
  return deHsl([h, Math.min(1, s * 1.45 + 0.06), l > 0.55 ? l - (l - 0.55) * 0.5 : l * 0.94]);
}

export const tingirSvg = (svg: string, cor: string) => svg.replace(/#[0-9a-fA-F]{6}\b/g, h => tingir(h, cor));
