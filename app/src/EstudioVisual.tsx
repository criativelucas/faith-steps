'use dom';
import { useEffect, useRef, useState } from 'react';
import type { Props, CategoriaEstudio } from './EstudioPersonagem';
import { LOJA, servePara } from './jogo';
import { CORES_CABELO, CORES_OLHOS, CORES_ROUPA, CORES_ROUPA_LISTA, PELES, ROSTOS, OLHOS_LISTA, SOBRANCELHAS, NARIZES, cabelosPara, type Look } from './personagem';
import { itensDoLook, lookComCorpo, lookComItem, paraOcasiao, type Ocasiao } from './estudio';
import VitrineCanvas from './VitrineCanvas';
import Miniaturas3D, { type OpcaoVisual, type Recorte } from './Miniaturas3D';
import { ESTUDIO_CSS } from './estudioEstilos';

const CATEGORIAS: { id: CategoriaEstudio; nome: string; dica: string }[] = [
  { id: 'rosto', nome: 'Rosto', dica: 'Traços que fazem você' }, { id: 'cabelo', nome: 'Cabelo', dica: 'Um novo jeito de ser' },
  { id: 'cima', nome: 'Parte de cima', dica: 'Encontre sua peça favorita' }, { id: 'baixo', nome: 'Parte de baixo', dica: 'Combine do seu jeito' },
  { id: 'calcado', nome: 'Calçados', dica: 'Pronto para o próximo passo' }, { id: 'fantasia', nome: 'Fantasias', dica: 'Uma história para vestir' },
];
const OCASIOES: [Ocasiao, string, string][] = [['dia', 'Dia a dia', 'sol'], ['culto', 'Culto e festa', 'estrela'], ['treino', 'Treino', 'treino'], ['dormir', 'Dormir', 'lua'], ['piscina', 'Piscina', 'agua'], ['fantasia', 'Fantasias', 'fantasia']];
const PATHS: Record<string, string> = {
  rosto: 'M8 10a4 4 0 1 1 8 0v3a4 4 0 0 1-8 0z M5 22v-2a7 7 0 0 1 14 0v2 M10 11h.01M14 11h.01M10 14q2 2 4 0',
  cabelo: 'M5 17V9a7 7 0 0 1 14 0v8 M5 10q7 0 9-6 0 5 5 6 M8 10v3a4 4 0 0 0 8 0v-3 M5 14l-2 5h5 M19 14l2 5h-5',
  cima: 'M8 4l-5 3-2 5 5 2 1-3v10h10V11l1 3 5-2-2-5-5-3q-4 4-8 0z',
  baixo: 'M6 3h12l2 18h-6l-2-12-2 12H4z M6 6h12',
  calcado: 'M4 6h6l1 6 8 3q3 1 3 5H3V9z M3 17h18 M12 12l-2 3 M15 13l-2 3',
  fantasia: 'M4 5l4 3 4-5 4 5 4-3-2 11H6z M6 19h12',
  sol: 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M12 1v3M12 20v3M1 12h3M20 12h3M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2',
  estrela: 'M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z',
  treino: 'M3 8v8M6 5v14M18 5v14M21 8v8M6 12h12',
  lua: 'M20 15A9 9 0 0 1 9 3 9 9 0 1 0 20 15z',
  agua: 'M2 11q3-4 6 0t6 0t6 0 M2 17q3-4 6 0t6 0t6 0 M8 7V3h7',
  dados: 'M5 3h14q2 0 2 2v14q0 2-2 2H5q-2 0-2-2V5q0-2 2-2z M7 7h.01M17 7h.01M12 12h.01M7 17h.01M17 17h.01',
  voltar: 'M9 5l-6 6 6 6 M3 11h10a7 7 0 0 1 7 7',
  girar: 'M4 9a8 8 0 1 1 0 7M4 3v6h6',
  check: 'M5 12l4 4L20 5', fechar: 'M6 6l12 12M6 18L18 6',
  corpo: 'M14.5 4a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0 M4 9l8 2 8-2 M12 7v8M12 15l-4 7M12 15l4 7',
  editar: 'M4 16L16 4l4 4L8 20H4zM14 6l4 4',
};
function Icone({ nome, size = 24 }: { nome: string; size?: number }) { return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={PATHS[nome] ?? PATHS.estrela} /></svg>; }
function Paleta({ titulo, cores, valor, onChange }: { titulo: string; cores: [string, string, string][]; valor?: string; onChange: (id: string) => void }) {
  return <section className="cas-palette"><h3>{titulo}</h3><div>{cores.map(([id, cor, nome]) => <button key={id} style={{ background: cor }} className={valor === id ? 'active' : ''} onClick={() => onChange(id)} aria-label={`${titulo}: ${nome}`} aria-pressed={valor === id} title={nome}>{valor === id && <span>✓</span>}</button>)}</div></section>;
}
function Escolhas<T extends string>({ titulo, opcoes, valor, onChange }: { titulo: string; opcoes: [T, string][]; valor?: T; onChange: (id: T) => void }) {
  return <section className="cas-traits"><h3>{titulo}</h3><div>{opcoes.map(([id, nome]) => <button key={id} className={valor === id ? 'active' : ''} aria-pressed={valor === id} onClick={() => onChange(id)}>{nome}</button>)}</div></section>;
}

type VisualProps = Omit<Props, 'onSalvar' | 'onFechar' | 'onComprar' | 'onEntrar'> & {
  onSalvar: (look: Look, nome?: string) => Promise<void>; onFechar: () => Promise<void>;
  onComprar?: (id: string) => Promise<void>; onEntrar?: () => Promise<void>; dom?: import('expo/dom').DOMProps;
};
export default function EstudioVisual({ look, forma = 50, estado, itens = [], talentos = 0, nivel = 1, modoCriacao = false, nomeInicial = '', categoriaInicial = 'cima', buscando, onComprar, onSalvar, onFechar, onEntrar }: VisualProps) {
  const [rascunho, setRascunho] = useState<Look>({ ...look });
  const [nome, setNome] = useState(nomeInicial);
  const [cat, setCat] = useState<CategoriaEstudio>(categoriaInicial);
  const [ocasiao, setOcasiao] = useState<Ocasiao>('dia');
  const [zoom, setZoom] = useState<'corpo' | 'busto' | 'rosto'>('corpo');
  const [giro, setGiro] = useState(0);
  const [armario, setArmario] = useState(false);
  const [aviso, setAviso] = useState('');
  const [comprando, setComprando] = useState(false);
  const travaCompra = useRef(false);
  const corpo = rascunho.corpo ?? 'masculino';
  const saldo = estado?.talentos ?? talentos, nivelAtual = estado?.nivel ?? nivel;
  const tem = (id: string) => LOJA.some(i => i.id === id && i.preco === 0) || (estado?.itens ?? itens).includes(id);
  const mudar = (p: Partial<Look>) => setRascunho(l => ({ ...l, ...p }));
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(''), 4500); return () => clearTimeout(t); }, [aviso]);
  const categoria = CATEGORIAS.find(c => c.id === cat)!;
  const selecionarCategoria = (id: CategoriaEstudio) => { setCat(id); setZoom(id === 'rosto' || id === 'cabelo' ? 'rosto' : 'corpo'); if (id === 'fantasia') setOcasiao('fantasia'); else if (ocasiao === 'fantasia') setOcasiao('dia'); };
  const pecas = LOJA.filter(i => servePara(i, corpo) && (cat === 'fantasia' ? i.tipo === 'fantasia' : i.tipo === 'roupa' && i.peca === ({ cima: 'topo', baixo: 'baixo', calcado: 'calcado' } as Record<string, string>)[cat])).filter(i => paraOcasiao(i, ocasiao) && (!armario || tem(i.id)));
  const opcoes: OpcaoVisual[] = cat === 'cabelo' ? cabelosPara(corpo).map(c => ({ id: c.id, nome: c.nome, look: { ...rascunho, fantasia: undefined, cabelo: c.id } })) : pecas.map(i => ({ id: i.id, nome: i.nome, look: lookComItem(rascunho, i), legenda: tem(i.id) ? 'No seu armário' : `${i.preco} talentos${i.nivel > nivelAtual && saldo < 999000 ? ` · nível ${i.nivel}` : ''}`, bloqueado: !tem(i.id) && saldo < 999000 && (saldo < i.preco || nivelAtual < i.nivel) }));
  const selecionado = cat === 'cabelo' ? rascunho.cabelo : cat === 'fantasia' ? rascunho.fantasia : rascunho.fantasia ? undefined : cat === 'cima' ? rascunho.topo ?? 'moletom' : cat === 'baixo' ? rascunho.baixo ?? 'calca' : rascunho.calcado ?? 'tenis';
  const pendentes = itensDoLook(rascunho).filter(i => !tem(i.id));
  const proximaCompra = pendentes[0];
  const comprar = async () => {
    if (!proximaCompra || !onComprar || travaCompra.current) return;
    if (saldo < 999000 && (saldo < proximaCompra.preco || nivelAtual < proximaCompra.nivel)) { setAviso('Você ainda não tem saldo ou nível para esta peça.'); return; }
    travaCompra.current = true; setComprando(true);
    try { await onComprar(proximaCompra.id); } catch { setAviso('Não foi possível comprar. Tente novamente.'); }
    finally { travaCompra.current = false; setComprando(false); }
  };
  const sortear = () => {
    const escolher = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
    const cabelo = escolher(cabelosPara(corpo)).id;
    let novo: Look = { ...rascunho, cabelo, corCabelo: escolher(CORES_CABELO), fantasia: undefined };
    for (const peca of ['topo', 'baixo', 'calcado'] as const) { const validos = LOJA.filter(i => i.peca === peca && servePara(i, corpo) && tem(i.id)); if (validos.length) novo = lookComItem(novo, escolher(validos)); }
    novo.corTopo = escolher(CORES_ROUPA_LISTA)[0]; novo.corBaixo = escolher(CORES_ROUPA_LISTA)[0];
    setRascunho(novo); setZoom('corpo');
  };
  const recorte: Recorte = cat === 'cabelo' ? 'rosto' : cat === 'fantasia' ? 'corpo' : cat === 'rosto' ? 'rosto' : cat;
  const corChave = cat === 'cima' ? 'corTopo' : cat === 'baixo' ? 'corBaixo' : 'corCalcado';
  return <main className="cas" aria-label="Estúdio de personagem">
    <style>{ESTUDIO_CSS}</style>
    <header className="cas-header">
      <div className="cas-identity"><span className="cas-emblem">✦</span><div><span className="cas-eyebrow">FAITH STEPS / SEU PERSONAGEM</span><label className="cas-name"><input aria-label="Nome do personagem" maxLength={26} placeholder="Seu nome aqui" value={nome} onChange={e => setNome(e.target.value)} /><Icone nome="editar" size={16} /></label></div></div>
      <div className="cas-header-actions"><span className="cas-balance"><span>✦</span> {saldo >= 999000 ? '999k+ (∞)' : saldo} <small>talentos</small></span>{onEntrar && <button className="cas-link" onClick={() => void onEntrar()}>Já tenho uma conta</button>}<button className="cas-round" title="Sortear visual" aria-label="Sortear visual" onClick={sortear}><Icone nome="dados" /></button>{!modoCriacao && <button className="cas-round" aria-label="Fechar sem salvar" onClick={() => void onFechar()}><Icone nome="fechar" /></button>}</div>
    </header>
    <div className="cas-workspace">
      <section className="cas-stage" aria-label="Prévia do personagem">
        <div className="cas-stage-caption"><span className="cas-eyebrow">{modoCriacao ? 'UMA NOVA HISTÓRIA' : 'DO SEU JEITO'}</span><h1>{modoCriacao ? 'Começa com você.' : 'Seu próximo visual.'}</h1><p>Pequenos detalhes. Sua personalidade.</p></div>
        <div className="cas-body-controls"><span className="cas-control-label">CORPO</span><button className={corpo === 'feminino' ? 'active' : ''} aria-pressed={corpo === 'feminino'} aria-label="Corpo feminino" onClick={() => setRascunho(l => lookComCorpo(l, 'feminino'))}>♀</button><button className={corpo === 'masculino' ? 'active' : ''} aria-pressed={corpo === 'masculino'} aria-label="Corpo masculino" onClick={() => setRascunho(l => lookComCorpo(l, 'masculino'))}>♂</button><span className="cas-control-divider" /><Icone nome="treino" size={18} /><meter aria-label="Forma física" min={0} max={100} value={forma} /><span className="cas-control-label">{Math.round(forma)}%</span></div>
        <div className="cas-avatar"><VitrineCanvas look={rascunho} forma={forma} humor="normal" rosto={zoom === 'rosto'} busto={zoom === 'busto'} giroOffset={giro} /></div>
        <nav className="cas-orbit" aria-label="Categorias de aparência">{CATEGORIAS.map((c, i) => <button key={c.id} className={cat === c.id ? 'active' : ''} style={{ '--arc': `${Math.sin(i / 5 * Math.PI) * 34}px` } as React.CSSProperties} onClick={() => selecionarCategoria(c.id)} title={c.nome} aria-label={c.nome} aria-pressed={cat === c.id}><Icone nome={c.id} size={25} /><span>{c.nome}</span></button>)}</nav>
        <div className="cas-stage-tools"><div className="cas-rotate"><button aria-label="Girar para a esquerda" onClick={() => setGiro(g => g - Math.PI / 4)}><Icone nome="girar" size={28} /></button><span>Arraste para girar</span><button aria-label="Girar para a direita" onClick={() => setGiro(g => g + Math.PI / 4)}><span style={{ display: 'flex', transform: 'scaleX(-1)' }}><Icone nome="girar" size={28} /></span></button></div><div className="cas-zoom">{([['corpo', 'corpo', 'Corpo inteiro'], ['busto', 'cima', 'Busto'], ['rosto', 'rosto', 'Rosto']] as const).map(([id, ic, rotulo]) => <button key={id} className={zoom === id ? 'active' : ''} aria-pressed={zoom === id} onClick={() => setZoom(id)}><Icone nome={ic} size={17} />{rotulo}</button>)}</div></div>
      </section>
      <aside className="cas-catalogue" aria-label="Personalizar aparência">
        <nav className="cas-occasions" aria-label="Ocasiões">{OCASIOES.map(([id, label, ic]) => <button key={id} title={label} aria-label={label} aria-pressed={ocasiao === id} className={ocasiao === id ? 'active' : ''} onClick={() => { setOcasiao(id); if (id === 'fantasia') setCat('fantasia'); else if (cat === 'fantasia') setCat('cima'); }}><Icone nome={ic} size={22} /></button>)}</nav>
        <div className="cas-catalogue-heading"><div><span className="cas-eyebrow">{OCASIOES.find(o => o[0] === ocasiao)?.[1]}</span><h2>{categoria.nome}</h2><p>{categoria.dica}</p></div><span className="cas-count">{cat === 'rosto' ? '✦' : opcoes.length}</span></div>
        {cat !== 'rosto' && cat !== 'cabelo' && <div className="cas-filters"><button className={!armario ? 'active' : ''} aria-pressed={!armario} onClick={() => setArmario(false)}>Todas as peças</button><button className={armario ? 'active' : ''} aria-pressed={armario} onClick={() => setArmario(true)}>Meu armário</button></div>}
        <div className="cas-catalogue-scroll">
          {cat === 'rosto' ? <>
            <Paleta titulo="Tom de pele" cores={PELES.map((c, i) => [c, c, `Tom ${i + 1}`])} valor={rascunho.pele} onChange={pele => mudar({ pele })} />
            <Escolhas titulo="Formato do rosto" opcoes={ROSTOS} valor={rascunho.rosto ?? 'oval'} onChange={rosto => mudar({ rosto })} />
            <Escolhas titulo="Olhos" opcoes={OLHOS_LISTA} valor={rascunho.olhos ?? 'pontinho'} onChange={olhos => mudar({ olhos })} />
            <Paleta titulo="Cor dos olhos" cores={CORES_OLHOS.map((c, i) => [c, c, `Cor ${i + 1}`])} valor={rascunho.corOlhos ?? CORES_OLHOS[0]} onChange={corOlhos => mudar({ corOlhos })} />
            <Escolhas titulo="Sobrancelhas" opcoes={SOBRANCELHAS} valor={rascunho.sobrancelha ?? 'grossa'} onChange={sobrancelha => mudar({ sobrancelha })} />
            <Escolhas titulo="Nariz" opcoes={NARIZES} valor={rascunho.nariz ?? 'pequeno'} onChange={nariz => mudar({ nariz })} />
            <div className="cas-toggles"><label><input type="checkbox" checked={!!rascunho.oculos} onChange={e => mudar({ oculos: e.target.checked })} />Óculos</label><label><input type="checkbox" checked={!!rascunho.sardas} onChange={e => mudar({ sardas: e.target.checked })} />Sardas</label></div>
          </> : <>
            {cat === 'cabelo' && <Paleta titulo="Cor do cabelo" cores={CORES_CABELO.map((c, i) => [c, c, `Cor ${i + 1}`])} valor={rascunho.corCabelo} onChange={corCabelo => mudar({ corCabelo })} />}
            {['cima', 'baixo', 'calcado'].includes(cat) && <Paleta titulo="Cores da peça" cores={CORES_ROUPA_LISTA.map(([id, label]) => [id, CORES_ROUPA[id][1], label])} valor={rascunho[corChave] ?? (cat === 'cima' ? rascunho.moletom : 'ameixa')} onChange={id => mudar({ [corChave]: id })} />}
            {cat === 'fantasia' && <button className="cas-remove" onClick={() => mudar({ fantasia: undefined })}>Voltar para a roupa do dia a dia</button>}
            <Miniaturas3D opcoes={opcoes} recorte={recorte} selecionado={selecionado} onEscolher={id => { if (cat === 'cabelo') mudar({ cabelo: id as Look['cabelo'], fantasia: undefined }); else { const item = LOJA.find(i => i.id === id); if (item) setRascunho(l => lookComItem(l, item)); } }} />
            {cat === 'cabelo' && corpo === 'masculino' && <Escolhas titulo="Barba" opcoes={[[ 'nenhuma', 'Sem barba' ], ['curta', 'Curta'], ['cheia', 'Cheia']]} valor={rascunho.barba ?? 'nenhuma'} onChange={barba => mudar({ barba })} />}
          </>}
        </div>
        {proximaCompra && <div className="cas-purchase"><div><strong>Experimentando: {proximaCompra.nome}</strong><span>{modoCriacao ? 'Esta peça pode ser comprada depois de criar seu personagem.' : `${proximaCompra.preco} talentos · nível ${proximaCompra.nivel}`}</span></div>{onComprar && <button disabled={comprando || (saldo < 999000 && (saldo < proximaCompra.preco || nivelAtual < proximaCompra.nivel))} onClick={() => void comprar()}>{comprando ? 'Comprando…' : 'Comprar'}</button>}<button className="cas-undo-item" onClick={() => setRascunho({ ...look })}>Desfazer</button></div>}
        <div className="cas-catalogue-note">{pendentes.length ? 'Compre ou retire as peças em prévia para salvar.' : 'Cada passo conta. Cada detalhe é seu.'}</div>
      </aside>
    </div>
    <footer className="cas-footer"><button className="cas-reset" onClick={() => { setRascunho({ ...look }); setNome(nomeInicial); setGiro(0); setZoom('corpo'); }}><Icone nome="voltar" size={18} />Restaurar visual</button><span className="cas-footer-tip">{modoCriacao ? 'Seu primeiro passo de fé começa aqui.' : 'As mudanças são aplicadas ao confirmar.'}</span><button className="cas-confirm" disabled={buscando || comprando || pendentes.length > 0} onClick={() => void onSalvar(rascunho, nome.trim() || 'Peregrino')}><span>{buscando ? 'Aguarde…' : modoCriacao ? 'Começar minha história' : 'Confirmar visual'}</span><span className="cas-confirm-icon"><Icone nome="check" size={26} /></span></button></footer>
    {aviso && <div className="cas-toast" role="status">{aviso}</div>}
  </main>;
}
