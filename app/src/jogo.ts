// Regras do jogo. Tudo é calculado a partir do histórico de eventos (que só cresce),
// então celular e computador nunca entram em conflito quando a sincronização chegar.
import type { Humor, Look, Pose } from './personagem';

export type NecessidadeId = 'espirito' | 'palavra' | 'louvor' | 'comunhao' | 'corpo';
export type AtividadeId =
  | 'devocional' | 'oracao' | 'leitura' | 'estudo'
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

export type Peca = 'topo' | 'baixo' | 'calcado';
export type Item = {
  id: string; nome: string; preco: number; nivel: number;
  tipo: 'roupa' | 'movel';
  peca?: Peca; // roupas: onde veste
  vaga?: 'parede' | 'chao' | 'tapete'; // móveis: onde pode ficar na casa
};
const roupa = (id: string, nome: string, peca: Peca, preco: number, nivel = 1): Item => ({ id, nome, tipo: 'roupa', peca, preco, nivel });
const movel = (id: string, nome: string, vaga: Item['vaga'], preco: number, nivel = 1): Item => ({ id, nome, tipo: 'movel', vaga, preco, nivel });
export const LOJA: Item[] = [
  roupa('moletom', 'Moletom', 'topo', 0),
  roupa('camiseta', 'Camiseta', 'topo', 0),
  roupa('calca', 'Calça', 'baixo', 0),
  roupa('tenis', 'Tênis', 'calcado', 0),
  roupa('vestido', 'Vestido', 'topo', 60),
  roupa('camisa', 'Camisa social', 'topo', 60),
  roupa('jaqueta', 'Jaqueta', 'topo', 90, 2),
  roupa('bermuda', 'Bermuda', 'baixo', 40),
  roupa('saia', 'Saia', 'baixo', 45),
  roupa('sandalia', 'Sandália', 'calcado', 30),
  roupa('sapato', 'Sapato social', 'calcado', 50),
  roupa('botinha', 'Botinha', 'calcado', 70, 2),
  movel('planta', 'Planta', 'chao', 30),
  movel('vaso', 'Vaso de flores', 'chao', 35),
  movel('puff', 'Puff', 'chao', 40),
  movel('estantinha', 'Estante pequena', 'chao', 60),
  movel('luminaria', 'Luminária de chão', 'chao', 70, 2),
  movel('teclado', 'Teclado musical', 'chao', 120, 3),
  movel('cruz', 'Cruz de madeira', 'parede', 40),
  movel('quadro', 'Quadro "Fé"', 'parede', 50),
  movel('relogio', 'Relógio', 'parede', 45),
  movel('poster', 'Pôster de louvor', 'parede', 35),
  movel('espelhoRedondo', 'Espelho redondo', 'parede', 55),
  movel('prateleira', 'Prateleira com plantas', 'parede', 60, 2),
  movel('tapeteRedondo', 'Tapete redondo', 'tapete', 45),
  movel('tapeteListrado', 'Tapete listrado', 'tapete', 55),
  movel('tapete', 'Tapete', 'tapete', 70, 2),
];

export type Evento =
  | { id: string; tipo: 'registro'; atividade: AtividadeId; qtd: number; grupo?: boolean; quando: number }
  | { id: string; tipo: 'compra'; item: string; preco: number; quando: number }
  | { id: string; tipo: 'achado'; item: string; quando: number };

// Easter eggs que dão talentos (uma vez só)
export const ACHADOS: Record<string, number> = { dracma: 10 };

// casa: vaga da casa -> móvel colocado nela
export type Perfil = { nome: string; criadoEm: number; atualizadoEm: number; look: Look; casa?: Record<string, string> };

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
  achados: string[];
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
  const achados = new Set<string>();
  let xp = 0, talentos = 0, capitulos = 0, cultos = 0, totalRegistros = 0;
  const hojeK = diaDe(agora);
  const hoje: Partial<Record<AtividadeId, number>> = {};

  for (const ev of [...eventos].sort((a, b) => a.quando - b.quando)) {
    if (ev.tipo === 'achado') {
      if (!achados.has(ev.item)) talentos += ACHADOS[ev.item] ?? 0;
      achados.add(ev.item);
      continue;
    }
    if (ev.tipo === 'compra') {
      talentos -= ev.preco;
      itens.push(ev.item);
      continue;
    }
    decair(ev.quando);
    // Meditação virou parte do devocional: registros antigos contam como devocional
    const a = ATIVIDADES[(ev.atividade as string) === 'meditacao' ? 'devocional' : ev.atividade];
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
    capitulos, cultos, totalRegistros, itens, achados: [...achados],
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

// Sincronização do perfil: vale o editado por último; a data de início é a mais antiga dos dois
export function juntarPerfil(local: Perfil | null, remoto: Perfil | null): Perfil | null {
  if (!local && !remoto) return null;
  const base = !local || (remoto && remoto.atualizadoEm > local.atualizadoEm) ? remoto! : local;
  return { ...base, criadoEm: Math.min(local?.criadoEm ?? Infinity, remoto?.criadoEm ?? Infinity) };
}
