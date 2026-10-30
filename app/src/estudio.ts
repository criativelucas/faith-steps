import { LOJA, servePara, type Item } from './jogo.ts';
import { cabelosPara, type Corpo, type Look } from './personagem.ts';

export type Ocasiao = 'dia' | 'culto' | 'treino' | 'dormir' | 'fantasia' | 'piscina';
const OCASIOES: Record<Ocasiao, string[] | null> = {
  dia: null,
  culto: ['camisa', 'polo', 'blazer', 'blusa', 'vestido', 'vestidoLongo', 'calca', 'calcaSocial', 'saia', 'saiaLonga', 'sapato', 'sandalia', 'sapatilha', 'salto'],
  treino: ['camiseta', 'regata', 'moletom', 'calca', 'bermuda', 'tenis'],
  dormir: ['camiseta', 'regata', 'moletom', 'calca', 'bermuda', 'chinelo'],
  fantasia: null,
  piscina: ['camiseta', 'regata', 'bermuda', 'chinelo', 'sandalia'],
};
export const paraOcasiao = (item: Item, ocasiao: Ocasiao) => !OCASIOES[ocasiao] || OCASIOES[ocasiao]!.includes(item.id);
export function lookComItem(look: Look, item: Item): Look {
  return item.tipo === 'fantasia' ? { ...look, fantasia: item.id } : { ...look, fantasia: undefined, [item.peca!]: item.id };
}
export function lookComCorpo(look: Look, corpo: Corpo): Look {
  const cabelos = cabelosPara(corpo);
  const compativel = (id: string | undefined, fallback: string) => LOJA.some(i => i.id === id && servePara(i, corpo)) ? id : fallback;
  return { ...look, corpo, cabelo: cabelos.some(c => c.id === look.cabelo) ? look.cabelo : cabelos[0].id,
    barba: corpo === 'feminino' ? 'nenhuma' : look.barba,
    topo: compativel(look.topo, 'moletom') as Look['topo'], baixo: compativel(look.baixo, 'calca') as Look['baixo'],
    calcado: compativel(look.calcado, 'tenis') as Look['calcado'], fantasia: undefined };
}
export function itensDoLook(look: Look): Item[] {
  const ids = look.fantasia ? [look.fantasia] : [look.topo ?? 'moletom', look.baixo ?? 'calca', look.calcado ?? 'tenis'];
  return LOJA.filter(i => ids.includes(i.id));
}
