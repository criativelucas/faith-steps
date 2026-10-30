// Regras do jogo. Tudo é calculado a partir do histórico de eventos (que só cresce),
// então celular e computador nunca entram em conflito quando a sincronização chegar.
import type { Humor, Look, Pose } from './personagem';

export type NecessidadeId = 'espirito' | 'palavra' | 'louvor' | 'comunhao' | 'corpo';
export type AtividadeId =
  | 'devocional' | 'oracao' | 'leitura' | 'estudo'
  | 'louvor' | 'igreja' | 'ensaio' | 'exercicio'
  | 'jejum' | 'evangelismo'; // estas duas são desbloqueadas na loja

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
  item?: string; // só aparece depois de comprar este item na loja
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
  { id: 'jejum', nome: 'Jejum', feito: 'Jejum feito', enche: { espirito: 70 }, xp: 40, talentos: 15, limiteDia: 1, pergunta: 'Como foi?', opcoes: [{ rotulo: 'Meio dia', qtd: 0.5 }, { rotulo: 'Dia inteiro', qtd: 1 }], pose: 'orar', olhosFechados: true, item: 'jejum' },
  { id: 'evangelismo', nome: 'Evangelismo', feito: 'Você falou de Jesus', enche: { comunhao: 40, espirito: 30 }, xp: 35, talentos: 12, limiteDia: 2, pose: 'baixo', item: 'evangelismo' },
];
export const ATIVIDADES = Object.fromEntries(LISTA_ATIVIDADES.map(a => [a.id, a])) as Record<AtividadeId, Atividade>;

export const MISSOES: AtividadeId[] = ['devocional', 'leitura', 'exercicio'];
export const BONUS_MISSAO = 30;

export type Peca = 'topo' | 'baixo' | 'calcado';
export type Item = {
  id: string; nome: string; preco: number; nivel: number;
  tipo: 'roupa' | 'movel' | 'papel' | 'piso' | 'fantasia' | 'comodo' | 'atividade' | 'funcao';
  descricao?: string; // fantasias, cômodos, atividades e funções
  peca?: Peca; // roupas: onde veste
  para?: 'feminino' | 'masculino'; // roupas só de um sexo (sem valor = para os dois)
  vaga?: 'parede' | 'chao' | 'tapete'; // móveis: onde pode ficar na casa
};
const roupa = (id: string, nome: string, peca: Peca, preco: number, para?: Item['para'], nivel = 1): Item =>
  ({ id, nome, tipo: 'roupa', peca, preco, nivel, ...(para ? { para } : {}) });
const movel = (id: string, nome: string, vaga: Item['vaga'], preco: number, nivel = 1, para?: Item['para']): Item =>
  ({ id, nome, tipo: 'movel', vaga, preco, nivel, ...(para ? { para } : {}) });
const revestimento = (tipo: 'papel' | 'piso', id: string, nome: string, preco: number, nivel = 1): Item =>
  ({ id, nome, tipo, preco, nivel });
const outro = (tipo: Item['tipo'], id: string, nome: string, preco: number, nivel: number, descricao: string, para?: Item['para']): Item =>
  ({ id, nome, tipo, preco, nivel, descricao, ...(para ? { para } : {}) });
export const LOJA: Item[] = [
  // Para os dois
  roupa('moletom', 'Moletom', 'topo', 0),
  roupa('camiseta', 'Camiseta', 'topo', 0),
  roupa('calca', 'Calça', 'baixo', 0),
  roupa('tenis', 'Tênis', 'calcado', 0),
  roupa('chinelo', 'Chinelo', 'calcado', 20),
  roupa('jaqueta', 'Jaqueta', 'topo', 90, undefined, 2),
  roupa('botinha', 'Botinha', 'calcado', 70, undefined, 2),
  // Masculino
  roupa('regata', 'Regata', 'topo', 30, 'masculino'),
  roupa('polo', 'Camisa polo', 'topo', 45, 'masculino'),
  roupa('camisa', 'Camisa social', 'topo', 60, 'masculino'),
  roupa('blazer', 'Terno para o culto', 'topo', 120, 'masculino', 3),
  roupa('bermuda', 'Bermuda', 'baixo', 40, 'masculino'),
  roupa('calcaSocial', 'Calça social', 'baixo', 60, 'masculino'),
  roupa('sapato', 'Sapato social', 'calcado', 50, 'masculino'),
  // Feminino
  roupa('blusa', 'Blusa', 'topo', 45, 'feminino'),
  roupa('vestido', 'Vestido', 'topo', 60, 'feminino'),
  roupa('vestidoLongo', 'Vestido longo para o culto', 'topo', 120, 'feminino', 3),
  roupa('saia', 'Saia', 'baixo', 45, 'feminino'),
  roupa('saiaLonga', 'Saia longa', 'baixo', 60, 'feminino'),
  roupa('sandalia', 'Sandália', 'calcado', 30, 'feminino'),
  roupa('sapatilha', 'Sapatilha', 'calcado', 40, 'feminino'),
  roupa('salto', 'Salto', 'calcado', 70, 'feminino', 2),
  // Móveis
  movel('planta', 'Planta', 'chao', 30),
  movel('cacto', 'Cacto', 'chao', 25),
  movel('vaso', 'Vaso de flores', 'chao', 35),
  movel('puff', 'Puff', 'chao', 40),
  movel('cesto', 'Cesto com manta', 'chao', 45),
  movel('estantinha', 'Estante pequena', 'chao', 60),
  movel('luminaria', 'Luminária de chão', 'chao', 70, 2),
  movel('teclado', 'Teclado musical', 'chao', 120, 3),
  movel('cruz', 'Cruz de madeira', 'parede', 40),
  movel('versiculo', 'Quadro de versículo', 'parede', 45),
  movel('quadro', 'Quadro "Fé"', 'parede', 50),
  movel('relogio', 'Relógio', 'parede', 45),
  movel('poster', 'Pôster de louvor', 'parede', 35),
  movel('paisagem', 'Quadro de paisagem', 'parede', 55),
  movel('espelhoRedondo', 'Espelho redondo', 'parede', 55),
  movel('luzinhas', 'Varal de luzinhas', 'parede', 50, 2),
  movel('prateleira', 'Prateleira com plantas', 'parede', 60, 2),
  movel('tapeteRedondo', 'Tapete redondo', 'tapete', 45),
  movel('tapeteListrado', 'Tapete listrado', 'tapete', 55),
  movel('tapete', 'Tapete', 'tapete', 70, 2),
  movel('girassol', 'Vaso de girassol', 'chao', 40),
  movel('bau', 'Baú de madeira', 'chao', 55),
  movel('cadeiraBalanco', 'Cadeira de balanço', 'chao', 90, 2),
  movel('arvoreNatal', 'Árvore de Natal', 'chao', 110, 2),
  movel('neon', 'Neon "Jesus"', 'parede', 90, 2),
  movel('pomba', 'Quadro da pomba', 'parede', 50),
  movel('tv', 'TV', 'parede', 130, 3),
  movel('calendario', 'Calendário', 'parede', 30),
  movel('tapeteFelpudo', 'Tapete felpudo', 'tapete', 60),
  movel('tapeteColorido', 'Tapete colorido', 'tapete', 65, 2),
  // Papéis de parede
  revestimento('papel', 'papelCreme', 'Pintura creme', 0),
  revestimento('papel', 'papelListras', 'Listras suaves', 35),
  revestimento('papel', 'papelPoa', 'Bolinhas pastel', 40),
  revestimento('papel', 'papelSalvia', 'Verde sálvia', 45),
  revestimento('papel', 'papelAzulejo', 'Azulejo metrô', 50),
  revestimento('papel', 'papelTijolo', 'Tijolinho rústico', 55),
  revestimento('papel', 'papelFloral', 'Jardim florido', 60, 2),
  revestimento('papel', 'papelCeu', 'Noite estrelada', 70, 2),
  revestimento('papel', 'papelBoiserie', 'Painel clássico', 75, 2),
  revestimento('papel', 'papelMadeira', 'Ripado de madeira', 85, 3),
  // Pisos
  revestimento('piso', 'pisoClareira', 'Madeira clara', 0),
  revestimento('piso', 'pisoPorcelanato', 'Porcelanato marfim', 0),
  revestimento('piso', 'pisoTerracota', 'Lajota terracota', 45),
  revestimento('piso', 'pisoCimento', 'Cimento queimado', 50),
  revestimento('piso', 'pisoNogueira', 'Madeira nogueira', 55),
  revestimento('piso', 'pisoXadrez', 'Ladrilho xadrez', 60),
  revestimento('piso', 'pisoCarpete', 'Carpete macio', 60),
  revestimento('piso', 'pisoEspinha', 'Parquet espinha', 70, 2),
  revestimento('piso', 'pisoHidraulico', 'Ladrilho português', 80, 2),
  revestimento('piso', 'pisoMarmore', 'Mármore Carrara', 95, 3),
  // Fantasias (vestem o personagem inteiro)
  outro('fantasia', 'pescador', 'Pescador Pedro', 90, 2, 'Chapéu, colete e vara com peixe.'),
  outro('fantasia', 'pastor', 'Pastor Davi', 90, 2, 'Manto, colete de lã e cajado de pastor.'),
  outro('fantasia', 'mineiro', 'Mineiro', 90, 2, 'Capacete com lanterna, suspensório e picareta.'),
  outro('fantasia', 'pirata', 'Pirata', 110, 2, 'Chapéu, tapa-olho, casaco e espada.'),
  outro('fantasia', 'anjo', 'Anjo', 120, 2, 'Auréola, asas e túnica branca.', 'feminino'),
  outro('fantasia', 'viking', 'Viking', 130, 3, 'Capacete com chifres, escudo e machado.'),
  outro('fantasia', 'cavaleiro', 'Cavaleiro da Fé', 150, 3, 'A armadura de Deus: capacete, couraça, escudo e espada.'),
  outro('fantasia', 'robo', 'Robô', 160, 3, 'Cabeça de robô com olhos que brilham.'),
  outro('fantasia', 'rei', 'Rei Davi', 200, 4, 'Coroa, manto real e harpa.', 'masculino'),
  outro('fantasia', 'ester', 'Rainha Ester', 200, 4, 'Coroa, vestido real, manto e cetro.', 'feminino'),
  // Cômodos novos
  outro('comodo', 'jardim', 'Jardim com horta', 200, 2, 'Canteiros, banco e fonte no quintal dos fundos.'),
  outro('comodo', 'piscina', 'Área da Piscina', 280, 2, 'Piscina cristalina com deck, espreguiçadeiras, ducha e mesa bistrô.'),
  outro('comodo', 'academia', 'Academia', 250, 3, 'Esteira, bicicleta e halteres para treinar em casa.'),
  outro('comodo', 'estudio', 'Estúdio de louvor', 300, 3, 'Bateria, teclado e microfone para ensaiar.'),
  // Atividades e funções
  outro('atividade', 'jejum', 'Jejum', 80, 2, 'Nova atividade para registrar: dia de jejum.'),
  outro('atividade', 'evangelismo', 'Evangelismo', 80, 2, 'Nova atividade para registrar: falar de Jesus para alguém.'),
  outro('funcao', 'versiculoDia', 'Versículo do dia', 50, 1, 'Um versículo novo todo dia, num botão na tela da casa.'),
  outro('funcao', 'cachorro', 'Cachorro', 120, 1, 'Um cachorrinho que segue você pela casa.'),
  outro('funcao', 'gato', 'Gato', 120, 1, 'Um gatinho que passeia pela casa com você.'),
];
// Roupa que serve para o sexo do avatar (sem sexo definido = masculino, como nos perfis antigos)
export const servePara = (item: Item, corpo: 'feminino' | 'masculino' | undefined) => !item.para || item.para === (corpo ?? 'masculino');

export type Evento =
  | { id: string; tipo: 'registro'; atividade: AtividadeId; qtd: number; grupo?: boolean; quando: number }
  | { id: string; tipo: 'compra'; item: string; preco: number; quando: number }
  | { id: string; tipo: 'achado'; item: string; quando: number };

// Easter eggs que dão talentos (uma vez só)
export const ACHADOS: Record<string, number> = { dracma: 10 };

// mobilia: posição 3D livre dos móveis e quadros (drag and drop); casa: formato antigo por vaga
// acabamentos: papel de parede e piso escolhidos para cada cômodo
// cor: cor dos móveis e detalhes da casa (o que era rosa). Sem escolha, segue o avatar: azul ou rosa
export type Mobilia = { item: string; x: number; y?: number; z: number; giro?: number; parede?: boolean };
export type Acabamento = { papel?: string; piso?: string };
export type Perfil = {
  nome: string;
  criadoEm: number;
  atualizadoEm: number;
  look: Look;
  casa?: Record<string, string>;
  mobilia?: Mobilia[];
  acabamentos?: Record<string, Acabamento>;
  cor?: string;
};

export const CORES_CASA: [string, string][] = [
  ['#FE0472', 'Rosa'], ['#2F7DF6', 'Azul'], ['#14B8A6', 'Turquesa'], ['#6CC000', 'Verde'],
  ['#F5B700', 'Amarelo'], ['#FF6B4A', 'Coral'], ['#A07BE0', 'Lilás'], ['#7A2A8C', 'Ameixa'],
];
export const corDaCasa = (p: Pick<Perfil, 'cor' | 'look'>) => p.cor ?? (p.look.corpo === 'feminino' ? '#FE0472' : '#2F7DF6');

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
  const dInicio = Math.max(inicioDoDia(criadoEm), inicioDoDia(agora) - 730 * DIA);
  for (let d = dInicio, i = 0; d <= agora; d = somarDias(d, 1), i++) {
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
// Atividade que já aparece para registrar (as da loja só depois de comprar)
export const liberada = (e: Pick<Estado, 'itens'>, a: Atividade) => !a.item || e.itens.includes(a.item);

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

// Desempenho: semanas recentes (domingo a sábado, a mais antiga primeiro) e totais de cada atividade.
// Dia com Deus = dia com devocional, oração ou igreja (o mesmo que conta para a ofensiva).
export type Semana = { inicio: number; dias: number; registros: number };
export type Desempenho = {
  semanas: Semana[];
  vezes: Record<AtividadeId, number>;
  capitulos: number;
  minutos: number;
  esteMes: number;
  mesPassado: number;
};
export function desempenho(eventos: Evento[], agora: number, quantas = 8): Desempenho {
  const hoje = inicioDoDia(agora);
  const domingo = somarDias(hoje, -new Date(hoje).getDay());
  const semanas: Semana[] = Array.from({ length: quantas }, (_, i) => ({ inicio: somarDias(domingo, (i - quantas + 1) * 7), dias: 0, registros: 0 }));
  const diasComDeus = new Set<string>();
  const vezes = Object.fromEntries(LISTA_ATIVIDADES.map(a => [a.id, 0])) as Record<AtividadeId, number>;
  let capitulos = 0, minutos = 0, esteMes = 0, mesPassado = 0;
  const mes = (t: number) => { const d = new Date(t); return d.getFullYear() * 12 + d.getMonth(); };
  for (const ev of eventos) {
    if (ev.tipo !== 'registro' || ev.quando > agora) continue;
    const a = ATIVIDADES[(ev.atividade as string) === 'meditacao' ? 'devocional' : ev.atividade];
    if (!a) continue;
    vezes[a.id]++;
    if (a.id === 'leitura') capitulos += ev.qtd;
    if (a.id === 'exercicio') minutos += ev.qtd * 30;
    const m = mes(agora) - mes(ev.quando);
    if (m === 0) esteMes++;
    if (m === 1) mesPassado++;
    const s = semanas.findLast(x => ev.quando >= x.inicio);
    if (!s || ev.quando >= somarDias(s.inicio, 7)) continue;
    s.registros++;
    const dia = diaDe(ev.quando);
    if (a.enche.espirito && !diasComDeus.has(dia)) { diasComDeus.add(dia); s.dias++; }
  }
  return { semanas, vezes, capitulos, minutos, esteMes, mesPassado };
}

export type Versiculo = { texto: string; referencia: string };
export const VERSICULOS_DIA: Versiculo[] = [
  { texto: 'O Senhor é o meu pastor; nada me faltará.', referencia: 'Salmos 23:1' },
  { texto: 'Lâmpada para os meus pés é a tua palavra e luz para o meu caminho.', referencia: 'Salmos 119:105' },
  { texto: 'Tudo posso naquele que me fortalece.', referencia: 'Filipenses 4:13' },
  { texto: 'Entrega o teu caminho ao Senhor; confia nele, e o mais ele fará.', referencia: 'Salmos 37:5' },
  { texto: 'Seja forte e corajoso! Não se apavore nem desanime, pois o Senhor, o seu Deus, estará com você por onde você andar.', referencia: 'Josué 1:9' },
  { texto: 'Busquem, pois, em primeiro lugar o Reino de Deus e a sua justiça, e todas essas coisas lhes serão acrescentadas.', referencia: 'Mateus 6:33' },
  { texto: 'As misericórdias do Senhor são a causa de não sermos consumidos; renovam-se cada manhã. Grande é a tua fidelidade!', referencia: 'Lamentações 3:22-23' },
  { texto: 'Confie no Senhor de todo o seu coração e não se apoie em seu próprio entendimento.', referencia: 'Provérbios 3:5' },
  { texto: 'Aqueles que esperam no Senhor renovam as suas forças. Voam alto como águias; correm e não ficam exaustos.', referencia: 'Isaías 40:31' },
  { texto: 'Venham a mim, todos os que estão cansados e sobrecarregados, e eu lhes darei descanso.', referencia: 'Mateus 11:28' },
  { texto: 'Sabemos que Deus age em todas as coisas para o bem daqueles que o amam.', referencia: 'Romanos 8:28' },
  { texto: 'Não andem ansiosos por coisa alguma, mas em tudo, pela oração e súplicas, e com ação de graças, apresentem seus pedidos a Deus.', referencia: 'Filipenses 4:6' },
  { texto: 'Porque sou eu que conheço os planos que tenho para vocês, diz o Senhor, planos de fazê-los prosperar e não de causar dano, planos de dar a vocês esperança e um futuro.', referencia: 'Jeremias 29:11' },
  { texto: 'Alegrem-se sempre no Senhor. Novamente direi: alegrem-se!', referencia: 'Filipenses 4:4' },
  { texto: 'O Senhor te abençoe e te guarde; o Senhor faça resplandecer o seu rosto sobre ti e tenha misericórdia de ti.', referencia: 'Números 6:24-25' },
  { texto: 'Mas o fruto do Espírito é amor, alegria, paz, paciência, amabilidade, bondade, fidelidade, mansidão e domínio próprio.', referencia: 'Gálatas 5:22-23' },
  { texto: 'Deixo a paz a vocês; a minha paz dou a vocês. Não a dou como o mundo a dá. Não se perturbe o seu coração, nem tenham medo.', referencia: 'João 14:27' },
  { texto: 'Se Deus é por nós, quem será contra nós?', referencia: 'Romanos 8:31' },
  { texto: 'Porque pela graça vocês são salvos, por meio da fé, e isto não vem de vocês, é dom de Deus.', referencia: 'Efésios 2:8' },
  { texto: 'Revesti-vos de toda a armadura de Deus, para que possais estar firmes contra as astutas ciladas do diabo.', referencia: 'Efésios 6:11' },
  { texto: 'Cria em mim um coração puro, ó Deus, e renova dentro de mim um espírito estável.', referencia: 'Salmos 51:10' },
  { texto: 'Este é o dia em que o Senhor agiu; alegremo-nos e exultemos neste dia.', referencia: 'Salmos 118:24' },
  { texto: 'O amor é paciente, o amor é bondoso. Não inveja, não se vangloria, não se orgulha.', referencia: '1 Coríntios 13:4' },
  { texto: 'Clame a mim e eu responderei e direi a você coisas grandiosas e insondáveis que você não conhece.', referencia: 'Jeremias 33:3' },
  { texto: 'A tua palavra escondi no meu coração, para eu não pecar contra ti.', referencia: 'Salmos 119:11' },
  { texto: 'Aquietai-vos e sabei que eu sou Deus.', referencia: 'Salmos 46:10' },
  { texto: 'Pois Deus não nos deu espírito de covardia, mas de poder, de amor e de equilíbrio.', referencia: '2 Timóteo 1:7' },
  { texto: 'Tudo o que fizerem, façam de todo o coração, como para o Senhor, e não para os homens.', referencia: 'Colossenses 3:23' },
  { texto: 'Cheguem perto de Deus, e ele se chegará a vocês.', referencia: 'Tiago 4:8' },
  { texto: 'Eu sou o caminho, a verdade e a vida. Ninguém vem ao Pai, a não ser por mim.', referencia: 'João 14:6' },
  { texto: 'Provem e vejam como o Senhor é bom. Como é feliz o homem que nele se refugia!', referencia: 'Salmos 34:8' },
];

export function versiculoDoDia(agora: number): Versiculo {
  const dias = Math.round(inicioDoDia(agora) / DIA);
  return VERSICULOS_DIA[((dias % VERSICULOS_DIA.length) + VERSICULOS_DIA.length) % VERSICULOS_DIA.length];
}
