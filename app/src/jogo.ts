// Regras do jogo. Tudo é calculado a partir do histórico de eventos (que só cresce),
// então celular e computador nunca entram em conflito quando a sincronização chegar.
import type { Humor, Pose } from './personagem';

export type NecessidadeId = 'espirito' | 'palavra' | 'louvor' | 'comunhao' | 'corpo';
export type AtividadeId =
  | 'devocional' | 'oracao' | 'meditacao' | 'leitura' | 'estudo'
  | 'louvor' | 'igreja' | 'ensaio' | 'exercicio';

export const NECESSIDADES: { id: NecessidadeId; nome: string; quedaDia: number; falta: string }[] = [
  { id: 'espirito', nome: 'Espírito', quedaDia: 50, falta: 'Sinto falta de orar' },
  { id: 'palavra', nome: 'Palavra', quedaDia: 35, falta: 'Bora ler a Palavra?' },
  { id: 'louvor', nome: 'Louvor', quedaDia: 30, falta: 'Tá silencioso aqui...' },
  { id: 'comunhao', nome: 'Comunhão', quedaDia: 15, falta: 'Saudade da igreja' },
  { id: 'corpo', nome: 'Corpo', quedaDia: 35, falta: 'Preciso me mexer' },
];

export type Opcao = { rotulo: string; qtd: number; grupo?: boolean };
export type Atividade = {
  id: AtividadeId;
  nome: string;
  feito: string;
  enche: Partial<Record<NecessidadeId, number>>; // por unidade
  xp: number; // por unidade
  talentos: number; // por unidade
  limiteDia: number; // unidades que rendem pontos por dia
  pergunta?: string;
  opcoes?: Opcao[];
  pose: Pose;
  fones?: boolean;
  olhosFechados?: boolean;
};

// 1 unidade = 30 minutos
const MINUTOS: Opcao[] = [
  { rotulo: '15 min', qtd: 0.5 },
  { rotulo: '30 min', qtd: 1 },
  { rotulo: '45 min', qtd: 1.5 },
  { rotulo: '1 hora', qtd: 2 },
];
const CAPITULOS: Opcao[] = [1, 2, 3, 4]
  .map(n => ({ rotulo: n === 1 ? '1 capítulo' : `${n} capítulos`, qtd: n }))
  .concat({ rotulo: '5 ou mais', qtd: 5 });

export const LISTA_ATIVIDADES: Atividade[] = [
  { id: 'devocional', nome: 'Devocional', feito: 'Devocional feito', enche: { espirito: 60, palavra: 20 }, xp: 30, talentos: 10, limiteDia: 2, pose: 'livro' },
  { id: 'oracao', nome: 'Oração', feito: 'Você orou', enche: { espirito: 40 }, xp: 15, talentos: 5, limiteDia: 3, pose: 'orar', olhosFechados: true },
  { id: 'meditacao', nome: 'Meditação', feito: 'Você meditou na Palavra', enche: { espirito: 40 }, xp: 15, talentos: 5, limiteDia: 2, pose: 'orar', olhosFechados: true },
  { id: 'leitura', nome: 'Leitura bíblica', feito: 'Leitura feita', enche: { palavra: 25 }, xp: 10, talentos: 3, limiteDia: 10, pergunta: 'Quantos capítulos?', opcoes: CAPITULOS, pose: 'livro' },
  { id: 'estudo', nome: 'Estudo bíblico', feito: 'Estudo feito', enche: { palavra: 60 }, xp: 40, talentos: 15, limiteDia: 1, pergunta: 'Como foi?', opcoes: [{ rotulo: 'Sozinho', qtd: 1 }, { rotulo: 'Em grupo', qtd: 1, grupo: true }], pose: 'livro' },
  { id: 'louvor', nome: 'Ouvir louvor', feito: 'Louvor no coração', enche: { louvor: 30 }, xp: 10, talentos: 3, limiteDia: 3, pergunta: 'Por quanto tempo?', opcoes: [MINUTOS[0], MINUTOS[1], MINUTOS[3]], pose: 'cima', fones: true },
  { id: 'igreja', nome: 'Igreja / culto', feito: 'Você foi à igreja', enche: { comunhao: 80, espirito: 20 }, xp: 50, talentos: 20, limiteDia: 2, pose: 'baixo' },
  { id: 'ensaio', nome: 'Ensaio / ministério', feito: 'Ensaio feito', enche: { louvor: 40, comunhao: 30 }, xp: 30, talentos: 10, limiteDia: 1, pose: 'cima' },
  { id: 'exercicio', nome: 'Exercício', feito: 'Corpo em movimento', enche: { corpo: 50 }, xp: 20, talentos: 8, limiteDia: 3, pergunta: 'Por quanto tempo?', opcoes: MINUTOS, pose: 'correr' },
];
export const ATIVIDADES = Object.fromEntries(LISTA_ATIVIDADES.map(a => [a.id, a])) as Record<AtividadeId, Atividade>;

export const MISSOES: AtividadeId[] = ['devocional', 'leitura', 'exercicio'];
export const BONUS_MISSAO = 30;

export type Item = { id: string; nome: string; tipo: 'moletom' | 'movel'; preco: number; nivel: number; cor?: string };
export const LOJA: Item[] = [
  { id: 'moletom-pink', nome: 'Moletom pink', tipo: 'moletom', preco: 0, nivel: 1, cor: 'pink' },
  { id: 'moletom-noite', nome: 'Moletom noite', tipo: 'moletom', preco: 40, nivel: 1, cor: 'noite' },
  { id: 'moletom-rosa', nome: 'Moletom rosa claro', tipo: 'moletom', preco: 60, nivel: 1, cor: 'rosa' },
  { id: 'moletom-nevoa', nome: 'Moletom névoa', tipo: 'moletom', preco: 80, nivel: 2, cor: 'nevoa' },
  { id: 'moletom-lima', nome: 'Moletom lima', tipo: 'moletom', preco: 150, nivel: 3, cor: 'lima' },
  { id: 'planta', nome: 'Planta', tipo: 'movel', preco: 30, nivel: 1 },
  { id: 'quadro', nome: 'Quadro "Fé"', tipo: 'movel', preco: 50, nivel: 1 },
  { id: 'luminaria', nome: 'Luminária', tipo: 'movel', preco: 70, nivel: 2 },
  { id: 'tapete', nome: 'Tapete', tipo: 'movel', preco: 90, nivel: 2 },
];

export type Evento =
  | { tipo: 'registro'; atividade: AtividadeId; qtd: number; grupo?: boolean; quando: number }
  | { tipo: 'compra'; item: string; preco: number; quando: number };

export type Estado = {
  necessidades: Record<NecessidadeId, number>;
  humor: Humor;
  xp: number;
  nivel: number;
  xpNoNivel: number;
  xpParaProximo: number;
  talentos: number;
  ofensiva: number;
  recorde: number;
  gracas: number;
  forma: number;
  diasAtivos: string[];
  hoje: Partial<Record<AtividadeId, number>>;
  missaoCompleta: boolean;
  capitulos: number;
  cultos: number;
  totalRegistros: number;
  itens: string[];
};

const HORA = 3600e3;
export const DIA = 24 * HORA;

export function diaDe(t: number) {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function inicioDoDia(t: number) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function somarDias(t: number, n: number) {
  const d = new Date(t);
  d.setDate(d.getDate() + n);
  return d.getTime();
}

// ponytail: recalcula tudo do zero a cada chamada. Rápido até milhares de eventos;
// depois disso, guardar um resumo periódico e calcular só a partir dele.
export function calcular(criadoEm: number, eventos: Evento[], agora: number): Estado {
  const nec: Record<NecessidadeId, number> = { espirito: 55, palavra: 55, louvor: 55, comunhao: 55, corpo: 55 };
  let t = criadoEm;
  let espiritoZerouEm: number | null = null;

  const decair = (ate: number) => {
    const dias = Math.max(0, ate - t) / DIA;
    for (const n of NECESSIDADES) {
      const antes = nec[n.id];
      nec[n.id] = Math.max(0, antes - n.quedaDia * dias);
      if (n.id === 'espirito' && antes > 0 && nec.espirito === 0) espiritoZerouEm = t + (antes / n.quedaDia) * DIA;
    }
    t = Math.max(t, ate);
  };
  const radiante = () => NECESSIDADES.every(n => nec[n.id] >= 60);

  const usado: Record<string, number> = {};
  const missao: Record<string, Set<AtividadeId>> = {};
  const minutosDia: Record<string, number> = {};
  const ativos = new Set<string>();
  const itens: string[] = [];
  let xp = 0, talentos = 0, capitulos = 0, cultos = 0, totalRegistros = 0;
  const hojeK = diaDe(agora);
  const hoje: Partial<Record<AtividadeId, number>> = {};

  for (const ev of [...eventos].sort((a, b) => a.quando - b.quando)) {
    if (ev.tipo === 'compra') {
      talentos -= ev.preco;
      itens.push(ev.item);
      continue;
    }
    decair(ev.quando);
    const a = ATIVIDADES[ev.atividade];
    if (!a) continue;
    const dia = diaDe(ev.quando);
    const chave = `${dia}|${a.id}`;
    const ja = usado[chave] ?? 0;
    const valendo = Math.max(0, Math.min(ev.qtd, a.limiteDia - ja));
    usado[chave] = ja + ev.qtd;
    if (dia === hojeK) hoje[a.id] = (hoje[a.id] ?? 0) + ev.qtd;

    totalRegistros++;
    if (a.id === 'leitura') capitulos += ev.qtd;
    if (a.id === 'igreja') cultos++;
    if (a.id === 'exercicio') minutosDia[dia] = (minutosDia[dia] ?? 0) + ev.qtd * 30;
    if (a.enche.espirito) {
      ativos.add(dia);
      espiritoZerouEm = null;
    }

    if (valendo > 0) {
      const mult = radiante() ? 1.5 : 1;
      for (const [id, v] of Object.entries(a.enche) as [NecessidadeId, number][]) nec[id] = Math.min(100, nec[id] + v * valendo);
      if (a.id === 'estudo' && ev.grupo) nec.comunhao = Math.min(100, nec.comunhao + 20);
      xp += Math.round(a.xp * valendo);
      talentos += Math.round(a.talentos * valendo * mult);
    }

    if (MISSOES.includes(a.id)) {
      const feitas = (missao[dia] ??= new Set());
      const antes = feitas.size;
      feitas.add(a.id);
      if (antes < MISSOES.length && feitas.size === MISSOES.length) talentos += BONUS_MISSAO;
    }
  }
  decair(agora);

  // Dia a dia: ofensiva, Graça (1 por semana, no máximo 2) e forma física
  let ofensiva = 0, recorde = 0, gracas = 1, forma = 50;
  for (let d = inicioDoDia(criadoEm), i = 0; d <= agora; d = somarDias(d, 1), i++) {
    const k = diaDe(d);
    if (i > 0 && i % 7 === 0) gracas = Math.min(2, gracas + 1);
    if (ativos.has(k)) ofensiva++;
    else if (k !== hojeK) {
      if (gracas > 0) gracas--;
      else ofensiva = 0;
    }
    recorde = Math.max(recorde, ofensiva);

    if (k !== hojeK) {
      let semana = 0;
      for (let j = 0; j < 7; j++) semana += minutosDia[diaDe(somarDias(d, -j))] ?? 0;
      const meta = (150 * Math.min(7, i + 1)) / 7;
      if (semana >= meta) forma += 3;
      else if (semana < meta / 2) forma -= 3;
      forma = Math.min(100, Math.max(0, forma));
    }
  }

  const zerou: number | null = espiritoZerouEm;
  const humor: Humor =
    nec.espirito === 0 && zerou !== null && agora - zerou >= 3 * DIA ? 'adormecido'
    : nec.espirito === 0 ? 'abatido'
    : radiante() ? 'radiante'
    : 'normal';

  let nivel = 1, resto = xp;
  while (resto >= 100 * nivel) {
    resto -= 100 * nivel;
    nivel++;
  }

  return {
    necessidades: nec, humor, xp, nivel, xpNoNivel: resto, xpParaProximo: 100 * nivel,
    talentos, ofensiva, recorde, gracas, forma,
    diasAtivos: [...ativos], hoje,
    missaoCompleta: (missao[hojeK]?.size ?? 0) === MISSOES.length,
    capitulos, cultos, totalRegistros, itens,
  };
}

export const possui = (e: Estado, item: Item) => item.preco === 0 || e.itens.includes(item.id);

export function bloqueio(e: Estado, item: Item): string | null {
  if (e.humor === 'adormecido') return 'Acorde seu personagem primeiro';
  if (e.nivel < item.nivel) return `Libera no nível ${item.nivel}`;
  if (e.talentos < item.preco) return `Faltam ${item.preco - e.talentos} talentos`;
  return null;
}

export const CONQUISTAS: { id: string; nome: string; descricao: string; ok: (e: Estado) => boolean }[] = [
  { id: 'primeiro', nome: 'Primeiro passo', descricao: 'Fez o primeiro registro', ok: e => e.totalRegistros > 0 },
  { id: 'semana', nome: 'Semana fiel', descricao: '7 dias seguidos de ofensiva', ok: e => e.recorde >= 7 },
  { id: 'mes', nome: 'Mês fiel', descricao: '30 dias seguidos de ofensiva', ok: e => e.recorde >= 30 },
  { id: 'leitor', nome: 'Leitor da Palavra', descricao: '50 capítulos lidos', ok: e => e.capitulos >= 50 },
  { id: 'igreja', nome: 'Casa do Pai', descricao: '10 idas à igreja', ok: e => e.cultos >= 10 },
  { id: 'nivel5', nome: 'Crescendo', descricao: 'Chegou ao nível 5', ok: e => e.nivel >= 5 },
  { id: 'atleta', nome: 'Templo cuidado', descricao: 'Forma física em 80', ok: e => e.forma >= 80 },
];
