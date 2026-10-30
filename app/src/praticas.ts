export type Pratica = 'memorizacao' | 'gratidao' | 'intercessao';
export type PaginaDiario = { id: string; tipo: Pratica; quando: number; textos: string[]; respondida?: boolean };
export const PRATICAS = new Set<string>(['memorizacao','gratidao','intercessao']);
export const VERSOS_DESAFIO = [
  { referencia: '1 João 4:8', texto: 'Deus é amor.' },
  { referencia: 'Salmo 23:1', texto: 'O Senhor é o meu pastor; nada me faltará.' },
  { referencia: '1 Tessalonicenses 5:17', texto: 'Orai sem cessar.' },
  { referencia: 'Salmo 119:105', texto: 'Lâmpada para os meus pés é tua palavra, e luz para o meu caminho.' },
  { referencia: 'Filipenses 4:4', texto: 'Regozijai-vos sempre no Senhor; outra vez digo, regozijai-vos.' },
];
export function desafioDoDia(data = new Date()) {
  const dia = Math.floor(Date.UTC(data.getFullYear(),data.getMonth(),data.getDate())/86400000);
  return VERSOS_DESAFIO[dia % VERSOS_DESAFIO.length];
}
export function lerDiario(raw: string | null): PaginaDiario[] {
  if (!raw) return [];
  const valor: unknown = JSON.parse(raw);
  if (!Array.isArray(valor) || !valor.every(p => p && typeof p.id === 'string' && PRATICAS.has(p.tipo) && Number.isFinite(p.quando) && Array.isArray(p.textos) && p.textos.every((t: unknown) => typeof t === 'string'))) throw new Error('Não foi possível ler seu caderno. Os dados originais foram preservados.');
  return valor;
}
export const gratidaoValida = (textos: string[]) => textos.length === 3 && textos.every(t => t.trim().length >= 3) && new Set(textos.map(t=>t.trim().toLocaleLowerCase('pt-BR'))).size === 3;
export const ordemCorreta = (indices: number[], quantidade: number) => indices.length === quantidade && indices.every((n,i)=>n===i);
