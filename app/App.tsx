import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AppState, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View, useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SvgXml } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import type { Session } from '@supabase/supabase-js';
import Casa3D from './src/Casa3D';
import Vitrine3D from './src/Vitrine3D';
import { icone } from './src/icones';
import { ROSA_PADRAO, tingirSvg } from './src/cores';
import { apagarNuvem, confirmarCodigo, enviarCodigo, erroDoLink, mensagemErro, sair, sincronizar, supabase } from './src/nuvem';
import { useFonts } from 'expo-font';
// Importa só os pesos usados, para não publicar a família inteira
import { BarlowCondensed_800ExtraBold } from '@expo-google-fonts/barlow-condensed/800ExtraBold';
import { BarlowCondensed_900Black } from '@expo-google-fonts/barlow-condensed/900Black';
import { Archivo_400Regular } from '@expo-google-fonts/archivo/400Regular';
import { Archivo_600SemiBold } from '@expo-google-fonts/archivo/600SemiBold';
import { Archivo_700Bold } from '@expo-google-fonts/archivo/700Bold';
import {
  ATIVIDADES, BONUS_MISSAO, CONQUISTAS, CORES_CASA, LISTA_ATIVIDADES, LOJA, MISSOES, NECESSIDADES,
  bloqueio, calcular, corDaCasa, desempenho, diaDe, possui, servePara,
  type AtividadeId, type Estado, type Evento, type Item, type Opcao, type Perfil,
} from './src/jogo';
import {
  BAIXOS, CALCADOS, CORES_CABELO, CORES_OLHOS, CORES_ROUPA, CORES_ROUPA_LISTA, NARIZES, OLHOS_LISTA, PELES, ROSTOS,
  SOBRANCELHAS, TOPOS, cabelosPara, iconeSvg, mix, pessoaSvg, type Corpo, type Look,
} from './src/personagem';
import { LISTA_COMODOS, MOVEIS, SEGREDOS, VAGAS, casaPadrao, movelSvg, type Segredo } from './src/casa';

// Base clara em linho (bege quase branco); ameixa no texto; pink e lima só nos detalhes
const C = {
  fundo: '#FAF6F0', areia: '#F1E8DD', areiaEscura: '#E4D6C6', branco: '#FFFFFF',
  ameixa: '#42124C', noite: '#2A0A31', pink: '#FE0472', pinkEscuro: '#C8005A', limaEscuro: '#3F7F00',
  lima: '#8AFF00', rosa: '#FFD1E6', suave: '#7D6A7F', linha: '#EADFD3',
};
// ponytail: tema global mutável. Trocar a cor muda C e recria os estilos; o App inteiro redesenha e pega a cor nova.
// Se um dia precisar de dois temas na mesma tela, trocar por um contexto.
let corTema = ROSA_PADRAO;
function aplicarTema(cor: string) {
  if (cor === corTema) return;
  corTema = cor;
  Object.assign(C, { pink: cor, pinkEscuro: mix(cor, '#1A0420', 0.22), rosa: mix(cor, '#FFFFFF', 0.8) });
  s = criarEstilos();
}
const F = { titulo: 'BarlowCondensed_900Black', subtitulo: 'BarlowCondensed_800ExtraBold', texto: 'Archivo_400Regular', medio: 'Archivo_600SemiBold', forte: 'Archivo_700Bold' };
const K = {
  perfil: 'faithsteps:perfil',
  eventos: 'faithsteps:eventos',
  pendentes: 'faithsteps:pendentes',
  cursor: 'faithsteps:cursor',
  conta: 'faithsteps:conta',
};
const TELA_CHEIA = { style: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } } as const;
const ICONE = iconeSvg();
const NUVEM = !!supabase;

type Recompensa = { atividade: AtividadeId; antes: Estado; depois: Estado };
type Sinc = 'local' | 'sincronizando' | 'ok' | 'offline';
type Conta = { email: string | null; sinc: Sinc; pendentes: number };

export default function App() {
  const [fontes] = useFonts({ BarlowCondensed_800ExtraBold, BarlowCondensed_900Black, Archivo_400Regular, Archivo_600SemiBold, Archivo_700Bold });
  const [carregado, setCarregado] = useState(false);
  const [perfil, setPerfilEstado] = useState<Perfil | null>(null);
  const [eventos, setEventosEstado] = useState<Evento[]>([]);
  const [pendentes, setPendentesEstado] = useState<string[]>([]);
  const [sessao, setSessao] = useState<Session | null>(null);
  const [sinc, setSinc] = useState<Sinc>('local');
  const [agora, setAgora] = useState(Date.now());
  const [erroSalvar, setErroSalvar] = useState(false);
  const [entrando, setEntrando] = useState(false);
  const [espelho, setEspelho] = useState(false);
  const [guardaRoupa, setGuardaRoupa] = useState(false);
  const [decorando, setDecorando] = useState(false);
  const [lojaAberta, setLojaAberta] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const timerAviso = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [registrando, setRegistrando] = useState<{ inicial: AtividadeId | null } | null>(null);
  const [recompensa, setRecompensa] = useState<Recompensa | null>(null);
  const [acao, setAcao] = useState<AtividadeId | null>(null);
  const timerAcao = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Cópia sempre atual dos dados, para a sincronização nunca ler valores velhos
  const dados = useRef({
    pronto: false,
    userId: null as string | null,
    perfil: null as Perfil | null,
    eventos: [] as Evento[],
    pendentes: [] as string[],
    cursor: null as string | null,
    conta: null as string | null,
  });
  const sincronizando = useRef(false);

  const guardar = (chave: string, valor: unknown) =>
    AsyncStorage.setItem(chave, JSON.stringify(valor)).then(() => setErroSalvar(false), () => setErroSalvar(true));
  const setPerfil = (p: Perfil) => { dados.current.perfil = p; setPerfilEstado(p); guardar(K.perfil, p); };
  const setEventos = (e: Evento[]) => { dados.current.eventos = e; setEventosEstado(e); guardar(K.eventos, e); };
  const setPendentes = (p: string[]) => { dados.current.pendentes = p; setPendentesEstado(p); guardar(K.pendentes, p); };
  const setCursor = (c: string | null) => { dados.current.cursor = c; guardar(K.cursor, c); };
  const setConta = (c: string | null) => { dados.current.conta = c; guardar(K.conta, c); };

  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [p, e, pd, c, ct] = await Promise.all([K.perfil, K.eventos, K.pendentes, K.cursor, K.conta].map(k => AsyncStorage.getItem(k)));
        // Registros de antes da nuvem ganham um id
        const evs: Evento[] = (e ? JSON.parse(e) : []).map((x: Evento) => (x.id ? x : { ...x, id: Crypto.randomUUID() }));
        const pf = p ? JSON.parse(p) : null;
        if (pf) setPerfil({ atualizadoEm: pf.criadoEm, ...pf });
        setEventos(evs);
        setPendentes(pd ? JSON.parse(pd) : evs.map(x => x.id));
        dados.current.cursor = c ? JSON.parse(c) : null;
        dados.current.conta = ct ? JSON.parse(ct) : null;
      } catch {
        setErroSalvar(true);
      }
      dados.current.pronto = true;
      setCarregado(true);
    })();
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const erro = erroDoLink();
    if (erro) setAviso(erro);
    const sb = supabase;
    const conferir = () => sb.auth.getSession().then(({ data }) => setSessao(data.session));
    conferir();
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSessao(s));
    // O link do e-mail pode abrir em outra aba: ao voltar para esta, ela pega a sessão nova
    const web = Platform.OS === 'web' && typeof window !== 'undefined';
    if (web) window.addEventListener('focus', conferir);
    return () => { data.subscription.unsubscribe(); if (web) window.removeEventListener('focus', conferir); };
  }, []);
  useEffect(() => { if (sessao) setEntrando(false); }, [sessao]);

  const sincronizarAgora = async () => {
    const d = dados.current;
    if (!d.pronto || !d.userId || sincronizando.current) return;
    const userId = d.userId;
    sincronizando.current = true;
    setSinc('sincronizando');
    try {
      if (d.conta !== userId) {
        // Primeira vez desta conta neste aparelho: envia tudo e baixa tudo
        setPendentes(d.eventos.map(e => e.id));
        setCursor(null);
        setConta(userId);
      }
      const r = await sincronizar(userId, { perfil: d.perfil, eventos: d.eventos, pendentes: d.pendentes, cursor: d.cursor });
      const atual = dados.current;
      if (r.recebidos.length) setEventos([...atual.eventos, ...r.recebidos]);
      const enviados = new Set(r.enviados);
      setPendentes(atual.pendentes.filter(id => !enviados.has(id)));
      setCursor(r.cursor);
      if (r.perfil && JSON.stringify(r.perfil) !== JSON.stringify(atual.perfil)) setPerfil(r.perfil);
      setSinc('ok');
    } catch {
      setSinc('offline');
    } finally {
      sincronizando.current = false;
    }
  };

  // Sincroniza ao entrar, a cada minuto, depois de cada registro e quando o app volta para a frente
  useEffect(() => {
    dados.current.userId = sessao?.user.id ?? null;
    if (sessao) sincronizarAgora();
    else setSinc('local');
  }, [sessao, carregado]);
  useEffect(() => { if (sessao) sincronizarAgora(); }, [agora]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => { if (s === 'active') sincronizarAgora(); });
    return () => sub.remove();
  }, []);

  const estado = useMemo(() => (perfil ? calcular(perfil.criadoEm, eventos, agora) : null), [perfil, eventos, agora]);
  aplicarTema(perfil ? corDaCasa(perfil) : ROSA_PADRAO);

  if (!fontes || !carregado) return <View style={{ flex: 1, backgroundColor: C.fundo }} />;

  const entrar = <Entrar aberto={entrando} onFechar={() => setEntrando(false)} />;
  if (!perfil || !estado) {
    return (
      <>
        <CriarPersonagem
          onCriar={p => { setPerfil(p); setAgora(Date.now()); }}
          onEntrar={NUVEM && !sessao ? () => setEntrando(true) : undefined}
          buscando={!!sessao && sinc === 'sincronizando'}
        />
        {entrar}
      </>
    );
  }

  const adicionar = (ev: Evento) => {
    setEventos([...dados.current.eventos, ev]);
    setPendentes([...dados.current.pendentes, ev.id]);
  };

  const registrar = (atividade: AtividadeId, qtd: number, grupo?: boolean) => {
    const quando = Date.now();
    const ev: Evento = { id: Crypto.randomUUID(), tipo: 'registro', atividade, qtd, quando, ...(grupo ? { grupo } : {}) };
    const antes = calcular(perfil.criadoEm, eventos, quando);
    const depois = calcular(perfil.criadoEm, [...eventos, ev], quando);
    adicionar(ev);
    setAgora(quando);
    setRegistrando(null);
    setRecompensa({ atividade, antes, depois });
    setAcao(atividade);
    if (timerAcao.current) clearTimeout(timerAcao.current);
    timerAcao.current = setTimeout(() => setAcao(null), 9000);
  };

  const mudarLook = (look: Look) => { setPerfil({ ...perfil, look, atualizadoEm: Date.now() }); setAgora(Date.now()); };
  const casaAtual = perfil.casa ?? casaPadrao(estado.itens);
  const mudarCasa = (casa: Record<string, string>) => { setPerfil({ ...perfil, casa, atualizadoEm: Date.now() }); setAgora(Date.now()); };
  const mudarCor = (cor: string) => { setPerfil({ ...perfil, cor, atualizadoEm: Date.now() }); setAgora(Date.now()); };
  const vestir = (item: Item) => { if (item.peca) mudarLook({ ...perfil.look, [item.peca]: item.id } as Look); };
  const comprar = (item: Item) => {
    adicionar({ id: Crypto.randomUUID(), tipo: 'compra', item: item.id, preco: item.preco, quando: Date.now() });
    if (item.tipo === 'roupa') return vestir(item);
    // Móvel novo vai para a primeira vaga livre do tipo certo; em "Decorar" dá para mudar de lugar
    const livre = VAGAS.find(v => v.tipo === item.vaga && !casaAtual[v.id]);
    if (livre) mudarCasa({ ...casaAtual, [livre.id]: item.id });
    else setAgora(Date.now());
    mostrarAviso(livre ? `${item.nome} foi para: ${livre.nome}. Toque em Decorar para mudar de lugar.` : `${item.nome} está guardado. Toque em Decorar para colocar na casa.`);
  };

  const mostrarAviso = (texto: string) => {
    setAviso(texto);
    if (timerAviso.current) clearTimeout(timerAviso.current);
    timerAviso.current = setTimeout(() => setAviso(null), 6000);
  };
  const achar = (segredo: Segredo) => {
    if (segredo === 'dracma') {
      if (estado.achados.includes('dracma')) return;
      adicionar({ id: Crypto.randomUUID(), tipo: 'achado', item: 'dracma', quando: Date.now() });
      setAgora(Date.now());
    }
    mostrarAviso(SEGREDOS[segredo]);
  };
  // O que acontece ao usar um objeto da casa: "atividade:devocional", "visual", "roupas", "segredo:dracma"
  const usarObjeto = (alvo: string) => {
    const [tipo, valor] = alvo.split(':');
    if (tipo === 'atividade') setRegistrando({ inicial: valor as AtividadeId });
    else if (tipo === 'visual') setEspelho(true);
    else if (tipo === 'roupas') setGuardaRoupa(true);
    else if (tipo === 'segredo') achar(valor as Segredo);
  };

  const limparLocal = () => {
    AsyncStorage.multiRemove(Object.values(K)).catch(() => {});
    Object.assign(dados.current, { perfil: null, eventos: [], pendentes: [], cursor: null, conta: null });
    setPerfilEstado(null);
    setEventosEstado([]);
    setPendentesEstado([]);
  };
  const sairDaConta = async () => {
    try { await sair(); } catch { /* a sessão some do aparelho mesmo sem internet */ }
    limparLocal();
  };
  const apagarTudo = async (): Promise<string | null> => {
    if (sessao) {
      try { await apagarNuvem(sessao.user.id); } catch (e) { return mensagemErro(e); }
      await sairDaConta();
    } else limparLocal();
    return null;
  };

  const conta: Conta = { email: sessao?.user.email ?? null, sinc, pendentes: pendentes.length };

  return (
    <>
      <StatusBar style="dark" />
      <Casa
        eventos={eventos}
        perfil={perfil}
        estado={estado}
        acao={acao}
        conta={conta}
        erroSalvar={erroSalvar}
        onAbrirRegistro={inicial => setRegistrando({ inicial })}
        onUsar={usarObjeto}
        onLoja={() => setLojaAberta(true)}
        onDecorar={() => setDecorando(true)}
        onEntrar={() => setEntrando(true)}
        onSair={sairDaConta}
        onApagar={apagarTudo}
        onCor={mudarCor}
      />
      <Registrar
        aberto={!!registrando}
        inicial={registrando?.inicial ?? null}
        estado={estado}
        onFechar={() => setRegistrando(null)}
        onRegistrar={registrar}
      />
      {recompensa && <RecompensaModal r={recompensa} look={perfil.look} onFechar={() => setRecompensa(null)} />}
      <Provador titulo="Espelho" aberto={espelho} look={perfil.look} forma={estado.forma} onSalvar={l => { mudarLook(l); setEspelho(false); }} onFechar={() => setEspelho(false)}>
        {(l, set) => <EditorVisual look={l} onChange={set} />}
      </Provador>
      <Provador titulo="Guarda-roupa" aberto={guardaRoupa} look={perfil.look} forma={estado.forma} onSalvar={l => { mudarLook(l); setGuardaRoupa(false); }} onFechar={() => setGuardaRoupa(false)}>
        {(l, set) => <EditorRoupas look={l} onChange={set} estado={estado} />}
      </Provador>
      <LojaModal
        aberto={lojaAberta}
        onFechar={() => setLojaAberta(false)}
        perfil={perfil}
        estado={estado}
        onComprar={comprar}
        onVestir={vestir}
        onDecorar={() => { setLojaAberta(false); setDecorando(true); }}
      />
      <Decorar aberto={decorando} casa={casaAtual} estado={estado} cor={corDaCasa(perfil)} onMudar={mudarCasa} onCor={mudarCor} onFechar={() => setDecorando(false)} />
      {entrar}
      {aviso && (
        <Pressable style={s.toast} onPress={() => setAviso(null)} accessibilityRole="alert">
          <Text style={s.toastTexto}>{aviso}</Text>
        </Pressable>
      )}
    </>
  );
}

/* ---------- Tela principal ---------- */

function Casa(props: {
  perfil: Perfil; estado: Estado; eventos: Evento[]; acao: AtividadeId | null; conta: Conta; erroSalvar: boolean;
  onAbrirRegistro: (inicial: AtividadeId | null) => void; onUsar: (alvo: string) => void;
  onLoja: () => void; onDecorar: () => void;
  onEntrar: () => void; onSair: () => void; onApagar: () => Promise<string | null>; onCor: (cor: string) => void;
}) {
  const { perfil, estado } = props;
  const { width, height } = useWindowDimensions();
  const largo = width >= 900;
  const [foco, setFoco] = useState('casa');
  const [painel, setPainel] = useState<'necessidades' | 'missao' | 'jornada' | 'conta' | null>(null);
  const fechar = () => setPainel(null);

  return (
    <View style={{ flex: 1, backgroundColor: '#EFE7EF' }}>
      <Casa3D
        look={perfil.look}
        forma={estado.forma}
        humor={estado.humor}
        nome={perfil.nome}
        itens={estado.itens}
        casa={perfil.casa ?? casaPadrao(estado.itens)}
        achados={estado.achados}
        acao={props.acao}
        foco={foco}
        cor={corDaCasa(perfil)}
        onUsar={async alvo => props.onUsar(alvo)}
        dom={TELA_CHEIA}
      />
      <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { padding: 12, gap: 10 }]}>
        <HudTopo perfil={perfil} estado={estado} conta={props.conta} compacto={!largo} onConta={() => setPainel('conta')} />
        {props.erroSalvar && <Aviso texto="Não foi possível salvar neste aparelho. Seus últimos registros podem se perder se você fechar o app." />}
        {estado.humor === 'adormecido' && (
          <Aviso texto={`${perfil.nome} adormeceu depois de dias sem devocional. Faça um devocional para acordar.`} acao="Fazer devocional" onAcao={() => props.onAbrirRegistro('devocional')} />
        )}
        <HudComodos foco={foco} onFoco={setFoco} vertical={largo && height >= 760} />
        <View style={{ flex: 1 }} pointerEvents="none" />
        <View pointerEvents="box-none" style={largo ? s.hudBaseLargo : s.hudBase}>
          <HudAvatar perfil={perfil} estado={estado} compacto={!largo} onPress={() => setPainel('necessidades')} />
          <HudAcoes
            missaoCompleta={estado.missaoCompleta}
            onMissao={() => setPainel('missao')}
            onJornada={() => setPainel('jornada')}
            onDecorar={props.onDecorar}
            onLoja={props.onLoja}
            onRegistrar={() => props.onAbrirRegistro(null)}
          />
        </View>
      </View>

      <Folha aberto={painel === 'necessidades'} titulo="Necessidades" onFechar={fechar}><Barras estado={estado} /></Folha>
      <Folha aberto={painel === 'missao'} titulo="Missão do dia" onFechar={fechar}>
        <Missao estado={estado} onAbrir={a => { fechar(); props.onAbrirRegistro(a); }} />
      </Folha>
      <Folha aberto={painel === 'jornada'} titulo="Jornada" onFechar={fechar}><Jornada estado={estado} eventos={props.eventos} /></Folha>
      <Folha aberto={painel === 'conta'} titulo="Conta" onFechar={fechar}>
        <ContaPainel conta={props.conta} cor={corDaCasa(perfil)} onCor={props.onCor} onEntrar={() => { fechar(); props.onEntrar(); }} onSair={props.onSair} onApagar={props.onApagar} />
      </Folha>
    </View>
  );
}

const STATUS: Record<Sinc, string> = { local: '', sincronizando: 'sincronizando...', ok: 'salvo na nuvem', offline: 'sem conexão' };

const Icone = ({ nome, cor = C.ameixa, tamanho = 22, largura = 2 }: { nome: string; cor?: string; tamanho?: number; largura?: number }) => (
  <SvgXml xml={icone(nome, cor, largura)} width={tamanho} height={tamanho} />
);

function HudTopo({ perfil, estado, conta, compacto, onConta }: { perfil: Perfil; estado: Estado; conta: Conta; compacto: boolean; onConta: () => void }) {
  // Tocar num ícone abre um cartão com o nome, a quantidade e como ganhar mais
  const [aberto, setAberto] = useState<string | null>(null);
  const INFO: Record<string, { icone?: string; cor: string; titulo: string; valor: string; texto: string }> = {
    nivel: {
      cor: C.ameixa, titulo: `Nível ${estado.nivel}`, valor: `${estado.xpNoNivel} / ${estado.xpParaProximo} XP`,
      texto: 'Cada atividade registrada dá XP. Subir de nível libera roupas e móveis novos na loja.',
    },
    talentos: {
      icone: 'talento', cor: '#E2B33A', titulo: 'Talentos', valor: String(estado.talentos),
      texto: `Moeda da loja. Ganhe registrando atividades e completando a missão do dia (+${BONUS_MISSAO}). Com o personagem Radiante, você ganha 50% a mais.`,
    },
    ofensiva: {
      icone: 'ofensiva', cor: C.pink, titulo: 'Dias de ofensiva', valor: String(estado.ofensiva),
      texto: `Dias seguidos com devocional, oração ou igreja. Seu recorde: ${estado.recorde} ${estado.recorde === 1 ? 'dia' : 'dias'}.`,
    },
    gracas: {
      icone: 'graca', cor: '#8E6A9A', titulo: 'Graças', valor: String(estado.gracas),
      texto: 'Uma Graça cobre um dia sem devocional, oração ou igreja, e a ofensiva não zera. Você ganha 1 por semana (no máximo 2).',
    },
  };
  const tocar = (id: string) => setAberto(a => (a === id ? null : id));
  const chip = (id: string) => {
    const i = INFO[id];
    return (
      <Pressable onPress={() => tocar(id)} style={[s.hudChip, compacto && s.hudChipCompacto, aberto === id && s.hudChipAberto]}
        accessibilityRole="button" accessibilityState={{ expanded: aberto === id }} accessibilityLabel={`${i.titulo}: ${i.valor}`}>
        <View style={[s.hudChipIcone, { backgroundColor: i.cor }]}><Icone nome={i.icone!} cor="#fff" tamanho={16} largura={2.4} /></View>
        <Text style={s.hudChipValor}>{i.valor}</Text>
      </Pressable>
    );
  };
  const info = aberto ? INFO[aberto] : null;
  return (
    <View style={s.hudTopo} pointerEvents="box-none">
      {compacto ? (
        <SvgXml xml={ICONE} width={40} height={40} />
      ) : (
        <View style={s.hudMarca}>
          <SvgXml xml={ICONE} width={34} height={34} />
          <View>
            <Text style={s.hudMarcaNome}>Faith Steps</Text>
            <Text style={s.hudMarcaSub}>{perfil.nome}{conta.email ? `, ${STATUS[conta.sinc]}` : ''}</Text>
          </View>
        </View>
      )}
      <View style={[s.hudChips, compacto && { flexWrap: 'nowrap', flexBasis: 0, gap: 4 }]} pointerEvents="box-none">
        <Pressable onPress={() => tocar('nivel')} style={[s.hudChip, { paddingRight: 14 }, compacto && s.hudChipCompacto, aberto === 'nivel' && s.hudChipAberto]}
          accessibilityRole="button" accessibilityState={{ expanded: aberto === 'nivel' }} accessibilityLabel={`Nível ${estado.nivel}, ${estado.xpNoNivel} de ${estado.xpParaProximo} XP`}>
          <View style={[s.hudChipIcone, { backgroundColor: C.ameixa }]}><Text style={s.hudNivel}>{estado.nivel}</Text></View>
          <View style={{ gap: 3 }}>
            {!compacto && <Text style={s.hudChipRotulo}>{estado.xpNoNivel} / {estado.xpParaProximo} XP</Text>}
            <View style={[s.trilhoMini, { minWidth: compacto ? 34 : 90, marginVertical: 0 }]}><View style={[s.preenchMini, { width: `${(estado.xpNoNivel / estado.xpParaProximo) * 100}%` }]} /></View>
          </View>
        </Pressable>
        {chip('talentos')}
        {chip('ofensiva')}
        {chip('gracas')}
        {info && (
          <View style={s.hudInfoLugar} pointerEvents="box-none">
            <Pressable onPress={() => setAberto(null)} style={s.hudInfo} accessibilityRole="button" accessibilityLabel="Fechar explicação" accessibilityLiveRegion="polite">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[s.hudChipIcone, { backgroundColor: info.cor }]}>
                  {info.icone ? <Icone nome={info.icone} cor="#fff" tamanho={16} largura={2.4} /> : <Text style={s.hudNivel}>{estado.nivel}</Text>}
                </View>
                <Text style={[s.hudInfoTitulo, { flex: 1 }]}>{info.titulo}</Text>
                <Text style={s.hudChipValor}>{info.valor}</Text>
              </View>
              <Text style={s.hudInfoTexto}>{info.texto}</Text>
            </Pressable>
          </View>
        )}
      </View>
      <Pressable onPress={onConta} style={s.hudBotaoPequeno} accessibilityRole="button" accessibilityLabel="Conta e ajustes">
        <Icone nome="conta" />
      </Pressable>
    </View>
  );
}

const FOCOS: { id: string; nome: string; icone: string }[] = [
  { id: 'casa', nome: 'Casa toda', icone: 'casa' },
  { id: 'quarto', nome: 'Quarto', icone: 'quarto' },
  { id: 'estudo', nome: 'Estudo', icone: 'estudo' },
  { id: 'sala', nome: 'Sala', icone: 'sala' },
  { id: 'cozinha', nome: 'Cozinha', icone: 'cozinha' },
  { id: 'banheiro', nome: 'Banheiro', icone: 'banheiro' },
];

function HudComodos({ foco, onFoco, vertical }: { foco: string; onFoco: (f: string) => void; vertical: boolean }) {
  const itens = FOCOS.map(f => {
    const ativo = f.id === foco;
    return (
      <Pressable key={f.id} onPress={() => onFoco(f.id)} accessibilityRole="tab" accessibilityState={{ selected: ativo }} accessibilityLabel={f.nome} style={s.hudComodo}>
        <View style={[s.hudRedondo, ativo && { backgroundColor: C.ameixa, borderColor: C.ameixa }]}>
          <Icone nome={f.icone} cor={ativo ? '#fff' : C.ameixa} />
        </View>
        <Text style={[s.hudRotulo, ativo && { color: C.ameixa }]}>{f.nome}</Text>
      </Pressable>
    );
  });
  return vertical
    ? <View style={s.hudComodosV} accessibilityRole="tablist">{itens}</View>
    : <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 6 }}>{itens}</ScrollView>;
}

function HudAvatar({ perfil, estado, compacto, onPress }: { perfil: Perfil; estado: Estado; compacto: boolean; onPress: () => void }) {
  const humor = { radiante: 'Radiante', normal: 'Bem', abatido: 'Abatido', adormecido: 'Adormecido' }[estado.humor];
  return (
    <Pressable onPress={onPress} style={[s.hudAvatar, compacto && s.hudAvatarCompacto]} accessibilityRole="button" accessibilityLabel="Ver necessidades">
      <View style={[s.hudRetrato, compacto && { width: 50, height: 50, borderRadius: 25 }]}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Vitrine3D rosto look={perfil.look} forma={estado.forma} humor={estado.humor === 'adormecido' ? 'normal' : estado.humor} olhosFechados={estado.humor === 'adormecido'} dom={TELA_CHEIA} />
        </View>
      </View>
      <View style={{ flex: 1, gap: compacto ? 3 : 5, minWidth: 120 }}>
        {!compacto && <Text style={s.hudAvatarNome}>{perfil.nome} <Text style={s.hudAvatarHumor}>{humor}</Text></Text>}
        {NECESSIDADES.map(n => {
          const v = Math.round(estado.necessidades[n.id]);
          const cor = v >= 60 ? '#7BD400' : v >= 30 ? C.pink : C.pinkEscuro;
          return (
            <View key={n.id} style={s.hudBarra} accessibilityLabel={`${n.nome}: ${v}`}>
              <Icone nome={n.id} cor={C.suave} tamanho={13} largura={2.4} />
              <View style={s.hudTrilho}><View style={[s.hudPreench, { width: `${v}%`, backgroundColor: cor }]} /></View>
            </View>
          );
        })}
      </View>
    </Pressable>
  );
}

function HudAcoes(props: { missaoCompleta: boolean; onMissao: () => void; onJornada: () => void; onDecorar: () => void; onLoja: () => void; onRegistrar: () => void }) {
  const botao = (nome: string, rotulo: string, onPress: () => void, marca = false) => (
    <Pressable onPress={onPress} style={s.hudComodo} accessibilityRole="button" accessibilityLabel={rotulo}>
      <View style={s.hudRedondo}>
        <Icone nome={nome} />
        {marca && <View style={s.hudMarcaPonto} />}
      </View>
      <Text style={s.hudRotulo}>{rotulo}</Text>
    </Pressable>
  );
  return (
    <View style={s.hudAcoes} pointerEvents="box-none">
      {botao('missao', 'Missão', props.onMissao, !props.missaoCompleta)}
      {botao('jornada', 'Jornada', props.onJornada)}
      {botao('decorar', 'Decorar', props.onDecorar)}
      {botao('loja', 'Loja', props.onLoja)}
      <Pressable onPress={props.onRegistrar} style={s.hudComodo} accessibilityRole="button" accessibilityLabel="Registrar atividade">
        <View style={s.hudRegistrar}><Icone nome="mais" cor="#fff" tamanho={30} largura={3} /></View>
        <Text style={[s.hudRotulo, { color: C.pink }]}>Registrar</Text>
      </Pressable>
    </View>
  );
}

// Painel que abre por cima do jogo (necessidades, missão, jornada, conta)
function Folha({ aberto, titulo, onFechar, children }: { aberto: boolean; titulo: string; onFechar: () => void; children: ReactNode }) {
  return (
    <Modal transparent visible={aberto} animationType="fade" onRequestClose={onFechar}>
      <View style={s.fundoModal}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onFechar} accessibilityLabel="Fechar" />
        <ScrollView style={{ width: '100%', maxWidth: 560, maxHeight: '92%' }} contentContainerStyle={s.folha}>
          <Text style={s.folhaTitulo}>{titulo}</Text>
          {children}
          <Pressable onPress={onFechar} style={{ alignSelf: 'center' }} accessibilityRole="button"><Text style={s.link}>Fechar</Text></Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

/* ---------- Painéis ---------- */

function Barras({ estado }: { estado: Estado }) {
  return (
    <View style={{ gap: 12 }}>
      {NECESSIDADES.map(n => {
        const v = Math.round(estado.necessidades[n.id]);
        const cor = v >= 60 ? C.lima : v >= 30 ? C.pink : C.pinkEscuro;
        return (
          <View key={n.id} accessibilityLabel={`${n.nome}: ${v} de 100`}>
            <View style={s.barraTopo}>
              <Text style={s.barraNome}>{n.nome}</Text>
              <Text style={[s.barraValor, v < 30 && { color: C.pinkEscuro }]}>{v}</Text>
            </View>
            <View style={s.trilho}><View style={[s.preench, { width: `${v}%`, backgroundColor: cor }]} /></View>
          </View>
        );
      })}
      <Text style={s.legenda}>
        {estado.humor === 'radiante' ? 'Radiante: talentos rendem 1,5×.' : 'Com todas as barras em 60 ou mais, seu personagem fica Radiante.'}
      </Text>
    </View>
  );
}

function Missao({ estado, onAbrir }: { estado: Estado; onAbrir: (a: AtividadeId) => void }) {
  return (
    <View style={{ gap: 10 }}>
      {MISSOES.map(id => {
        const feito = (estado.hoje[id] ?? 0) > 0;
        return (
          <Pressable key={id} onPress={() => onAbrir(id)} style={s.missao} accessibilityRole="button" accessibilityState={{ checked: feito }}>
            <View style={[s.check, feito && s.checkFeito]}>{feito && <Text style={s.checkMarca}>✓</Text>}</View>
            <Text style={[s.missaoTexto, feito && { color: C.suave, textDecorationLine: 'line-through' }]}>{ATIVIDADES[id].nome}</Text>
          </Pressable>
        );
      })}
      <Text style={s.legenda}>
        {estado.missaoCompleta ? `Missão completa. +${BONUS_MISSAO} talentos.` : `Complete as 3 hoje e ganhe +${BONUS_MISSAO} talentos.`}
      </Text>
    </View>
  );
}

function Jornada({ estado, eventos }: { estado: Estado; eventos: Evento[] }) {
  const hoje = new Date();
  const ano = hoje.getFullYear(), mes = hoje.getMonth();
  const primeiro = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const ativos = new Set(estado.diasAtivos);
  const celulas: (number | null)[] = [...Array(primeiro).fill(null), ...Array.from({ length: diasNoMes }, (_, i) => i + 1)];
  const nomeMes = hoje.toLocaleDateString('pt-BR', { month: 'long' });

  return (
    <View style={{ gap: 18 }}>
      <View style={s.ofensivaLinha}>
        <Text style={s.ofensivaNumero}>{estado.ofensiva}</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.ofensivaRotulo}>{estado.ofensiva === 1 ? 'dia de ofensiva' : 'dias de ofensiva'}</Text>
          <Text style={s.legenda}>Recorde: {estado.recorde}. Graças guardadas: {estado.gracas} (cobrem um dia esquecido).</Text>
        </View>
      </View>

      <PainelDesempenho eventos={eventos} />

      <View>
        <Text style={s.mes}>{nomeMes}</Text>
        <View style={s.calendario}>
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <Text key={'c' + i} style={s.calCabeca}>{d}</Text>)}
          {celulas.map((d, i) => {
            const ativo = d !== null && ativos.has(diaDe(new Date(ano, mes, d).getTime()));
            const eHoje = d === hoje.getDate();
            return (
              <View key={i} style={s.calCelula}>
                {d !== null && (
                  <View style={[s.calDia, ativo && s.calAtivo, eHoje && !ativo && s.calHoje]}>
                    <Text style={[s.calTexto, ativo && { color: C.ameixa }]}>{d}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={s.mes}>Conquistas</Text>
        {CONQUISTAS.map(c => {
          const ok = c.ok(estado);
          return (
            <View key={c.id} style={[s.conquista, !ok && { opacity: 0.45 }]}>
              <View style={[s.selo, ok && { backgroundColor: C.lima }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.conquistaNome}>{c.nome}</Text>
                <Text style={s.legenda}>{c.descricao}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// Gráfico de dias com Deus por semana (toque numa barra para ver a semana) e totais de cada atividade
function PainelDesempenho({ eventos }: { eventos: Evento[] }) {
  const d = useMemo(() => desempenho(eventos, Date.now()), [eventos]);
  const ultima = d.semanas.length - 1;
  const [sel, setSel] = useState(ultima);
  const semana = d.semanas[sel];
  const data = (t: number) => new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
  const total = (id: AtividadeId) =>
    id === 'leitura' ? plural(d.capitulos, 'capítulo', 'capítulos') : id === 'exercicio' ? `${d.minutos} min` : plural(d.vezes[id], 'vez', 'vezes');
  return (
    <View style={{ gap: 12 }}>
      <View>
        <Text style={s.mes}>Desempenho</Text>
        <Text style={s.legenda}>
          Este mês: {plural(d.esteMes, 'registro', 'registros')}{d.mesPassado ? `. No mês passado: ${d.mesPassado}.` : '.'}
        </Text>
      </View>
      <View style={s.desCartao}>
        <Text style={s.desTitulo}>Dias com Deus por semana</Text>
        <Text style={s.legenda}>
          {sel === ultima ? 'Esta semana' : `Semana de ${data(semana.inicio)}`}: {semana.dias} de 7 dias, {plural(semana.registros, 'registro', 'registros')}
        </Text>
        <View style={s.desBarras}>
          {d.semanas.map((w, i) => (
            <Pressable key={w.inicio} onPress={() => setSel(i)} style={s.desColuna} accessibilityRole="button"
              accessibilityState={{ selected: i === sel }} accessibilityLabel={`Semana de ${data(w.inicio)}: ${w.dias} de 7 dias`}>
              <View style={s.desTrilho}>
                <View style={[s.desBarra, { height: `${(w.dias / 7) * 100}%`, backgroundColor: i === sel ? C.pink : mix(C.pink, '#FFFFFF', 0.5) }]} />
              </View>
              <Text style={[s.desData, i === sel && { color: C.ameixa, fontFamily: F.forte }]}>{data(w.inicio)}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={s.legenda}>Conta o dia com devocional, oração ou igreja.</Text>
      </View>
      <View style={s.desCartao}>
        <Text style={s.desTitulo}>Desde o começo</Text>
        {LISTA_ATIVIDADES.map(a => (
          <View key={a.id} style={s.desLinha}>
            <Text style={s.desNome}>{a.nome}</Text>
            <Text style={s.desValor}>{total(a.id)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

type PropsLoja = { perfil: Perfil; estado: Estado; onComprar: (i: Item) => void; onVestir: (i: Item) => void; onDecorar: () => void };

function LojaModal({ aberto, onFechar, ...props }: PropsLoja & { aberto: boolean; onFechar: () => void }) {
  return (
    <Modal transparent visible={aberto} animationType="fade" onRequestClose={onFechar}>
      <View style={s.fundoModal}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onFechar} accessibilityLabel="Fechar" />
        <ScrollView style={{ width: '100%', maxWidth: 1040, maxHeight: '94%' }} contentContainerStyle={[s.folha, { maxWidth: 1040 }]}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <Text style={s.folhaTitulo}>Loja</Text>
            <View style={s.stat}><Text style={s.statRotulo}>Seus talentos</Text><Text style={s.statValor}>{props.estado.talentos}</Text></View>
          </View>
          <Loja {...props} />
          <Pressable onPress={onFechar} style={{ alignSelf: 'center' }} accessibilityRole="button"><Text style={s.link}>Fechar</Text></Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

// Recorte da miniatura de cada roupa (área do personagem que mostra a peça)
const RECORTE: Record<string, string> = { topo: '10 18 180 230', baixo: '25 186 150 140', calcado: '35 250 130 80' };

function Loja({ perfil, estado, onComprar, onVestir, onDecorar }: {
  perfil: Perfil; estado: Estado; onComprar: (i: Item) => void; onVestir: (i: Item) => void; onDecorar: () => void;
}) {
  const [aba, setAba] = useState<'roupa' | 'movel'>('roupa');
  const casa = perfil.casa ?? casaPadrao(estado.itens);
  return (
    <View style={{ gap: 14 }}>
      <Opcoes valores={[['roupa', 'Roupas'], ['movel', 'Móveis e decoração']]} atual={aba} onEscolher={setAba} />
      <View style={s.lojaGrade}>
        {LOJA.filter(i => i.tipo === aba && (i.tipo === 'movel' || servePara(i, perfil.look.corpo))).map(item => {
          const tem = possui(estado, item);
          const motivo = tem ? null : bloqueio(estado, item);
          const vestindo = item.peca ? (perfil.look[item.peca] ?? { topo: 'moletom', baixo: 'calca', calcado: 'tenis' }[item.peca]) === item.id : false;
          const preview = item.peca
            ? pessoaSvg({ ...perfil.look, [item.peca]: item.id } as Look, { forma: estado.forma, viewBox: RECORTE[item.peca] })
            : tingirSvg(movelSvg(item.id), C.pink);
          const vaga = item.tipo === 'movel' ? VAGAS.find(v => casa[v.id] === item.id) : undefined;
          let texto: string, onPress: (() => void) | undefined, primario = false;
          if (tem) {
            if (item.tipo === 'roupa') {
              texto = vestindo ? 'Vestindo' : 'Vestir';
              onPress = vestindo ? undefined : () => onVestir(item);
            } else {
              texto = vaga ? 'Mudar de lugar' : 'Colocar na casa';
              onPress = onDecorar;
            }
          } else if (motivo) texto = motivo;
          else { texto = `Comprar por ${item.preco}`; onPress = () => onComprar(item); primario = true; }

          return (
            <View key={item.id} style={s.item}>
              <View style={s.itemArte}><SvgXml xml={preview} width="100%" height="100%" /></View>
              <Text style={s.itemNome}>{item.nome}</Text>
              <Text style={s.legenda}>
                {item.preco === 0 ? 'Grátis' : `${item.preco} talentos`}{item.nivel > 1 ? `, nível ${item.nivel}` : ''}
                {vaga ? `\nNa casa: ${vaga.nome.toLowerCase()}` : ''}
              </Text>
              <Pressable
                onPress={onPress}
                disabled={!onPress}
                accessibilityRole="button"
                style={[s.itemBotao, primario && { backgroundColor: C.pink }, !onPress && { opacity: 0.6 }]}
              >
                <Text style={[s.itemBotaoTexto, primario && { color: '#fff' }]}>{texto}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ContaPainel({ conta, cor, onCor, onEntrar, onSair, onApagar }: {
  conta: Conta; cor: string; onCor: (cor: string) => void; onEntrar: () => void; onSair: () => void; onApagar: () => Promise<string | null>;
}) {
  const [confirmarApagar, setConfirmarApagar] = useState(false);
  const [confirmarSair, setConfirmarSair] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const esperando = `${conta.pendentes} ${conta.pendentes === 1 ? 'registro ainda não enviado' : 'registros ainda não enviados'}`;
  const status: Record<Sinc, string> = {
    local: '',
    sincronizando: 'Sincronizando...',
    ok: 'Tudo salvo na nuvem.',
    offline: `Sem conexão agora. ${esperando}; eles sobem sozinhos quando a internet voltar.`,
  };
  const centro = [s.legenda, { textAlign: 'center' as const, maxWidth: 560 }];

  return (
    <View style={s.ajustes}>
      <EscolherCor cor={cor} onCor={onCor} />
      {!NUVEM && <Text style={centro}>Por enquanto seus dados ficam só neste aparelho.</Text>}
      {NUVEM && !conta.email && (
        <>
          <Text style={centro}>Entre com seu e-mail para salvar seu personagem na nuvem e usar o mesmo no celular e no computador.</Text>
          <Botao texto="Entrar" onPress={onEntrar} />
        </>
      )}
      {conta.email && (
        <>
          <Text style={centro}>Conectado como {conta.email}. {status[conta.sinc]}</Text>
          <Pressable onPress={() => (conta.pendentes > 0 && !confirmarSair ? setConfirmarSair(true) : onSair())} accessibilityRole="button">
            <Text style={[s.link, confirmarSair && { color: C.pink }]}>
              {confirmarSair ? `Toque de novo para sair. ${esperando} vão se perder.` : 'Sair da conta'}
            </Text>
          </Pressable>
        </>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={async () => {
          if (!confirmarApagar) return setConfirmarApagar(true);
          setErro(await onApagar());
        }}
      >
        <Text style={[s.link, confirmarApagar && { color: C.pink }]}>
          {confirmarApagar
            ? conta.email ? 'Toque de novo para apagar tudo, inclusive da nuvem (não dá para desfazer)' : 'Toque de novo para apagar tudo (não dá para desfazer)'
            : 'Apagar meus dados'}
        </Text>
      </Pressable>
      {erro && <Text style={[s.legenda, { color: C.pinkEscuro }]}>{erro}</Text>}
    </View>
  );
}

function Entrar({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [etapa, setEtapa] = useState<'email' | 'codigo'>('email');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    if (aberto) { setEtapa('email'); setCodigo(''); setErro(null); }
  }, [aberto]);

  const tentar = async (acao: () => Promise<void>) => {
    setOcupado(true);
    setErro(null);
    try { await acao(); } catch (e) { setErro(mensagemErro(e)); }
    setOcupado(false);
  };
  const emailOk = /^\S+@\S+\.\S+$/.test(email.trim());
  const pedir = () => emailOk && !ocupado && tentar(async () => { await enviarCodigo(email.trim()); setEtapa('codigo'); });
  const confirmar = () => codigo.length >= 6 && !ocupado && tentar(async () => { await confirmarCodigo(email.trim(), codigo); onFechar(); });

  return (
    <Modal transparent visible={aberto} animationType="fade" onRequestClose={onFechar}>
      <View style={s.fundoModal}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onFechar} accessibilityLabel="Fechar" />
        <View style={s.folha}>
          <Text style={s.folhaTitulo}>Entrar</Text>
          {etapa === 'email' ? (
            <>
              <Text style={s.legenda}>Seu personagem fica salvo na nuvem, e você usa o mesmo no celular e no computador. Sem senha: mandamos um link de entrada para o seu e-mail.</Text>
              <TextInput
                value={email} onChangeText={setEmail} onSubmitEditing={pedir}
                placeholder="seu@email.com" placeholderTextColor="#A893A6" style={s.input}
                autoCapitalize="none" autoCorrect={false} autoComplete="email" keyboardType="email-address" inputMode="email"
                accessibilityLabel="E-mail"
              />
              <Botao texto={ocupado ? 'Enviando...' : 'Receber link por e-mail'} onPress={pedir} desativado={!emailOk || ocupado} />
            </>
          ) : (
            <>
              <Text style={s.legenda}>Enviamos um e-mail para {email.trim()}. Abra neste aparelho e toque no link: o Faith Steps abre já conectado. Pode levar um minuto; confira também o spam.</Text>
              <Text style={s.legenda}>Se o e-mail trouxer um código de números, digite aqui:</Text>
              <TextInput
                value={codigo} onChangeText={t => setCodigo(t.replace(/\D/g, ''))} onSubmitEditing={confirmar}
                placeholder="Código do e-mail" placeholderTextColor="#A893A6" style={[s.input, { letterSpacing: 4 }]}
                keyboardType="number-pad" inputMode="numeric" autoComplete="one-time-code" maxLength={10}
                accessibilityLabel="Código do e-mail"
              />
              <Botao texto={ocupado ? 'Entrando...' : 'Entrar'} onPress={confirmar} desativado={codigo.length < 6 || ocupado} />
              <Pressable onPress={() => setEtapa('email')} accessibilityRole="button">
                <Text style={s.link}>Usar outro e-mail ou pedir um link novo</Text>
              </Pressable>
            </>
          )}
          {erro && <Text style={[s.legenda, { color: C.pinkEscuro }]}>{erro}</Text>}
          <Pressable onPress={onFechar} style={{ alignSelf: 'center' }} accessibilityRole="button"><Text style={s.link}>Fechar</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

/* ---------- Registrar e recompensa ---------- */

function resumoEnche(id: AtividadeId) {
  const a = ATIVIDADES[id];
  return Object.entries(a.enche).map(([n, v]) => `${NECESSIDADES.find(x => x.id === n)!.nome} +${v}`).join(', ');
}

function Registrar({ aberto, inicial, estado, onFechar, onRegistrar }: {
  aberto: boolean; inicial: AtividadeId | null; estado: Estado;
  onFechar: () => void; onRegistrar: (a: AtividadeId, qtd: number, grupo?: boolean) => void;
}) {
  const [sel, setSel] = useState<AtividadeId | null>(inicial);
  useEffect(() => { if (aberto) setSel(inicial); }, [aberto, inicial]);
  const a = sel ? ATIVIDADES[sel] : null;

  return (
    <Modal transparent visible={aberto} animationType="fade" onRequestClose={onFechar}>
      <View style={s.fundoModal}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onFechar} accessibilityLabel="Fechar" />
        <View style={s.folha}>
          <Text style={s.folhaTitulo}>{a ? a.nome : 'O que você fez?'}</Text>
          {!a && (
            <View style={s.gradeAtiv}>
              {LISTA_ATIVIDADES.map(x => {
                const feitoHoje = estado.hoje[x.id] ?? 0;
                return (
                  <Pressable key={x.id} style={s.ativ} accessibilityRole="button" onPress={() => (x.opcoes ? setSel(x.id) : onRegistrar(x.id, 1))}>
                    <Text style={s.ativNome}>{x.nome}</Text>
                    <Text style={s.ativInfo}>{resumoEnche(x.id)}</Text>
                    {feitoHoje > 0 && <Text style={s.ativHoje}>Feito hoje</Text>}
                  </Pressable>
                );
              })}
            </View>
          )}
          {a && (
            <View style={{ gap: 14 }}>
              <Text style={s.legenda}>{resumoEnche(a.id)}. Rende {a.xp} XP e {a.talentos} talentos{a.opcoes && a.id !== 'estudo' ? ' por unidade' : ''}.</Text>
              {a.opcoes ? (
                <>
                  <Text style={s.pergunta}>{a.pergunta}</Text>
                  <View style={s.chips}>
                    {a.opcoes.map((o: Opcao) => (
                      <Pressable key={o.rotulo} style={s.chip} accessibilityRole="button" onPress={() => onRegistrar(a.id, o.qtd, o.grupo)}>
                        <Text style={s.chipTexto}>{o.rotulo}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : (
                <Botao texto={`Registrar ${a.nome.toLowerCase()}`} onPress={() => onRegistrar(a.id, 1)} />
              )}
              {!inicial && <Pressable onPress={() => setSel(null)}><Text style={s.link}>Ver todas as atividades</Text></Pressable>}
            </View>
          )}
          <Pressable onPress={onFechar} style={{ alignSelf: 'center', marginTop: 8 }}><Text style={s.link}>Fechar</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

function RecompensaModal({ r, look, onFechar }: { r: Recompensa; look: Look; onFechar: () => void }) {
  const a = ATIVIDADES[r.atividade];
  const xp = r.depois.xp - r.antes.xp;
  const talentos = r.depois.talentos - r.antes.talentos;
  const subiu = r.depois.nivel > r.antes.nivel;
  const acordou = r.antes.humor === 'adormecido' && r.depois.humor !== 'adormecido';
  const ganhos = NECESSIDADES
    .map(n => ({ nome: n.nome, d: Math.round(r.depois.necessidades[n.id] - r.antes.necessidades[n.id]) }))
    .filter(g => g.d > 0);

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onFechar}>
      <View style={s.fundoModal}>
        <View style={[s.folha, { alignItems: 'center' }]}>
          <View style={{ width: 170, aspectRatio: 200 / 330 }}>
            <Vitrine3D look={look} forma={r.depois.forma} humor={r.depois.humor} pose={a.pose} fones={a.fones} olhosFechados={a.olhosFechados} dom={TELA_CHEIA} />
          </View>
          <Text style={[s.folhaTitulo, { textAlign: 'center' }]}>{a.feito}</Text>
          {xp > 0 || talentos > 0 ? (
            <Text style={s.ganho}>+{xp} XP   +{talentos} talentos</Text>
          ) : (
            <Text style={[s.legenda, { textAlign: 'center' }]}>Registro salvo. Você já atingiu o limite de pontos desta atividade hoje.</Text>
          )}
          {ganhos.length > 0 && <Text style={[s.legenda, { textAlign: 'center' }]}>{ganhos.map(g => `${g.nome} +${g.d}`).join('   ')}</Text>}
          {subiu && <Text style={s.destaque}>Subiu para o nível {r.depois.nivel}</Text>}
          {r.depois.missaoCompleta && !r.antes.missaoCompleta && <Text style={s.destaque}>Missão do dia completa: +{BONUS_MISSAO} talentos</Text>}
          {acordou && <Text style={[s.legenda, { textAlign: 'center' }]}>"Desperta, ó tu que dormes." Efésios 5:14. Seu personagem acordou.</Text>}
          <Botao texto="Continuar" onPress={onFechar} />
        </View>
      </View>
    </Modal>
  );
}

/* ---------- Criar personagem ---------- */

function CriarPersonagem({ onCriar, onEntrar, buscando }: { onCriar: (p: Perfil) => void; onEntrar?: () => void; buscando: boolean }) {
  const [nome, setNome] = useState('');
  const [look, setLook] = useState<Look>({ corpo: 'feminino', pele: PELES[2], cabelo: 'longo', corCabelo: CORES_CABELO[0], moletom: 'pink', barba: 'nenhuma', oculos: false });
  const largo = useWindowDimensions().width >= 760;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.fundo }} contentContainerStyle={s.onb}>
      <StatusBar style="dark" />
      <SvgXml xml={ICONE} width={64} height={64} />
      <Text style={s.onbMarca}>Faith Steps</Text>
      <Text style={s.onbLead}>Crie seu personagem. Ele cresce a cada passo de fé que você dá na vida real.</Text>
      <View style={[s.onbGrade, largo && { flexDirection: 'row', alignItems: 'flex-start' }]}>
        <View style={[s.onbPreview, largo && { alignSelf: 'flex-start' }]}><Vitrine3D look={look} forma={50} humor="radiante" dom={TELA_CHEIA} /></View>
        <View style={{ flex: 1, gap: 20, minWidth: 260 }}>
          <Campo rotulo="Nome do personagem">
            <TextInput value={nome} onChangeText={setNome} placeholder="Ex.: Davi" placeholderTextColor="#A893A6" style={s.input} maxLength={20} accessibilityLabel="Nome do personagem" />
          </Campo>
          <EditorVisual look={look} onChange={setLook} escolherCorpo />
          {buscando ? (
            <Text style={s.legenda}>Buscando seu personagem na nuvem...</Text>
          ) : (
            <Botao texto="Começar" onPress={() => onCriar({ nome: nome.trim() || 'Peregrino', criadoEm: Date.now(), atualizadoEm: Date.now(), look })} />
          )}
          {onEntrar && (
            <Pressable onPress={onEntrar} accessibilityRole="button">
              <Text style={s.link}>Já tenho conta: entrar</Text>
            </Pressable>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function Opcoes<T extends string>({ valores, atual, onEscolher }: { valores: [T, string][]; atual: T; onEscolher: (v: T) => void }) {
  return (
    <View style={s.chips}>
      {valores.map(([v, nome]) => (
        <Pressable key={v} onPress={() => onEscolher(v)} style={[s.chip, atual === v && s.chipAtivo]} accessibilityRole="button" accessibilityState={{ selected: atual === v }}>
          <Text style={[s.chipTexto, atual === v && { color: '#fff' }]}>{nome}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function EditorVisual({ look, onChange, escolherCorpo }: { look: Look; onChange: (l: Look) => void; escolherCorpo?: boolean }) {
  const mudar = (p: Partial<Look>) => onChange({ ...look, ...p });
  const fem = look.corpo === 'feminino';
  const trocarCorpo = (corpo: Corpo) => {
    const cabelos = cabelosPara(corpo);
    // Ao trocar o sexo, o que não serve volta para o básico
    const serve = (id: string | undefined, padrao: string) => { const item = LOJA.find(i => i.id === id); return item && servePara(item, corpo) ? id : padrao; };
    mudar({
      corpo,
      cabelo: cabelos.some(c => c.id === look.cabelo) ? look.cabelo : cabelos[0].id,
      barba: corpo === 'feminino' ? 'nenhuma' : look.barba,
      topo: serve(look.topo, 'moletom'), baixo: serve(look.baixo, 'calca'), calcado: serve(look.calcado, 'tenis'),
    } as Partial<Look>);
  };
  return (
    <View style={{ gap: 18 }}>
      {escolherCorpo && (
        <Campo rotulo="Avatar (só dá para escolher agora)">
          <Opcoes valores={[['feminino', 'Feminino'], ['masculino', 'Masculino']]} atual={fem ? 'feminino' : 'masculino'} onEscolher={trocarCorpo} />
        </Campo>
      )}
      <Campo rotulo="Tom de pele">
        <View style={s.chips}>{PELES.map(p => <Bolinha key={p} cor={p} ativo={look.pele === p} rotulo="Tom de pele" onPress={() => mudar({ pele: p })} />)}</View>
      </Campo>
      <Campo rotulo="Formato do rosto">
        <Opcoes valores={ROSTOS} atual={look.rosto ?? 'oval'} onEscolher={v => mudar({ rosto: v })} />
      </Campo>
      <Campo rotulo="Olhos">
        <Opcoes valores={OLHOS_LISTA} atual={look.olhos ?? 'pontinho'} onEscolher={v => mudar({ olhos: v })} />
      </Campo>
      {(look.olhos === 'amendoado' || look.olhos === 'grande') && (
        <Campo rotulo="Cor dos olhos">
          <View style={s.chips}>{CORES_OLHOS.map(c => <Bolinha key={c} cor={c} ativo={(look.corOlhos ?? CORES_OLHOS[0]) === c} rotulo="Cor dos olhos" onPress={() => mudar({ corOlhos: c })} />)}</View>
        </Campo>
      )}
      <Campo rotulo="Sobrancelha">
        <Opcoes valores={SOBRANCELHAS} atual={look.sobrancelha ?? (fem ? 'arqueada' : 'grossa')} onEscolher={v => mudar({ sobrancelha: v })} />
      </Campo>
      <Campo rotulo="Nariz">
        <Opcoes valores={NARIZES} atual={look.nariz ?? 'pequeno'} onEscolher={v => mudar({ nariz: v })} />
      </Campo>
      <Campo rotulo="Cabelo">
        <Opcoes valores={cabelosPara(fem ? 'feminino' : 'masculino').map(c => [c.id, c.nome])} atual={look.cabelo} onEscolher={v => mudar({ cabelo: v })} />
      </Campo>
      <Campo rotulo="Cor do cabelo">
        <View style={s.chips}>{CORES_CABELO.map(c => <Bolinha key={c} cor={c} ativo={look.corCabelo === c} rotulo="Cor do cabelo" onPress={() => mudar({ corCabelo: c })} />)}</View>
      </Campo>
      {!fem && (
        <Campo rotulo="Barba">
          <Opcoes valores={[['nenhuma', 'Sem barba'], ['curta', 'Curta'], ['cheia', 'Cheia']]} atual={look.barba ?? 'nenhuma'} onEscolher={v => mudar({ barba: v })} />
        </Campo>
      )}
      <Campo rotulo="Detalhes">
        <View style={s.chips}>
          <Opcoes valores={[['nao', 'Sem óculos'], ['sim', 'Com óculos']]} atual={look.oculos ? 'sim' : 'nao'} onEscolher={v => mudar({ oculos: v === 'sim' })} />
          <Opcoes valores={[['nao', 'Sem sardas'], ['sim', 'Com sardas']]} atual={look.sardas ? 'sim' : 'nao'} onEscolher={v => mudar({ sardas: v === 'sim' })} />
        </View>
      </Campo>
    </View>
  );
}

const CorRoupa = ({ atual, rotulo, onEscolher }: { atual: string; rotulo: string; onEscolher: (c: string) => void }) => (
  <View style={s.chips}>
    {CORES_ROUPA_LISTA.map(([id, nome]) => (
      <Bolinha key={id} cor={CORES_ROUPA[id][1]} ativo={atual === id} rotulo={`${rotulo}: ${nome}`} onPress={() => onEscolher(id)} />
    ))}
  </View>
);

// Guarda-roupa: só as peças que a pessoa tem (as outras ficam na loja)
function EditorRoupas({ look, onChange, estado }: { look: Look; onChange: (l: Look) => void; estado: Estado }) {
  const mudar = (p: Partial<Look>) => onChange({ ...look, ...p });
  const tem = (id: string) => { const item = LOJA.find(i => i.id === id); return !!item && possui(estado, item) && servePara(item, look.corpo); };
  const topo = look.topo ?? 'moletom';
  return (
    <View style={{ gap: 18 }}>
      <Campo rotulo="Parte de cima">
        <Opcoes valores={TOPOS.filter(([id]) => tem(id))} atual={topo} onEscolher={v => mudar({ topo: v })} />
      </Campo>
      <Campo rotulo="Cor da parte de cima">
        <CorRoupa atual={look.corTopo ?? look.moletom} rotulo="Cor da parte de cima" onEscolher={c => mudar({ corTopo: c })} />
      </Campo>
      {topo !== 'vestido' && (
        <>
          <Campo rotulo="Parte de baixo">
            <Opcoes valores={BAIXOS.filter(([id]) => tem(id))} atual={look.baixo ?? 'calca'} onEscolher={v => mudar({ baixo: v })} />
          </Campo>
          <Campo rotulo="Cor da parte de baixo">
            <CorRoupa atual={look.corBaixo ?? 'ameixa'} rotulo="Cor da parte de baixo" onEscolher={c => mudar({ corBaixo: c })} />
          </Campo>
        </>
      )}
      <Campo rotulo="Calçado">
        <Opcoes valores={CALCADOS.filter(([id]) => tem(id))} atual={look.calcado ?? 'tenis'} onEscolher={v => mudar({ calcado: v })} />
      </Campo>
      <Campo rotulo="Cor do calçado">
        <CorRoupa atual={look.corCalcado ?? ''} rotulo="Cor do calçado" onEscolher={c => mudar({ corCalcado: c })} />
        {look.corCalcado && (
          <Pressable onPress={() => mudar({ corCalcado: undefined })} accessibilityRole="button" style={{ alignSelf: 'flex-start' }}>
            <Text style={s.link}>Voltar à cor original</Text>
          </Pressable>
        )}
      </Campo>
      <Text style={s.legenda}>Mais roupas na loja, compradas com talentos.</Text>
    </View>
  );
}

// Espelho e guarda-roupa: mostra a prévia e só salva ao confirmar
function Provador({ titulo, aberto, look, forma, onSalvar, onFechar, children }: {
  titulo: string; aberto: boolean; look: Look; forma: number; onSalvar: (l: Look) => void; onFechar: () => void;
  children: (look: Look, mudar: (l: Look) => void) => ReactNode;
}) {
  const [rascunho, setRascunho] = useState(look);
  useEffect(() => { if (aberto) setRascunho(look); }, [aberto]);
  return (
    <Modal transparent visible={aberto} animationType="fade" onRequestClose={onFechar}>
      <View style={s.fundoModal}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onFechar} accessibilityLabel="Fechar" />
        <ScrollView style={{ width: '100%', maxWidth: 640, maxHeight: '92%' }} contentContainerStyle={[s.folha, { maxWidth: 640 }]}>
          <Text style={s.folhaTitulo}>{titulo}</Text>
          <View style={{ width: 180, aspectRatio: 200 / 300, alignSelf: 'center' }}><Vitrine3D look={rascunho} forma={forma} humor="normal" dom={TELA_CHEIA} /></View>
          {children(rascunho, setRascunho)}
          <Botao texto="Salvar" onPress={() => onSalvar(rascunho)} />
          <Pressable onPress={onFechar} style={{ alignSelf: 'center' }} accessibilityRole="button"><Text style={s.link}>Cancelar</Text></Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

// Decorar: escolher que móvel fica em cada vaga da casa
function Decorar({ aberto, casa, estado, cor, onMudar, onCor, onFechar }: {
  aberto: boolean; casa: Record<string, string>; estado: Estado; cor: string;
  onMudar: (c: Record<string, string>) => void; onCor: (cor: string) => void; onFechar: () => void;
}) {
  const colocar = (vaga: string, item: string | null) => {
    const nova = Object.fromEntries(Object.entries(casa).filter(([v, i]) => v !== vaga && i !== item));
    onMudar(item ? { ...nova, [vaga]: item } : nova);
  };
  const meus = LOJA.filter(i => i.tipo === 'movel' && possui(estado, i));
  return (
    <Modal transparent visible={aberto} animationType="fade" onRequestClose={onFechar}>
      <View style={s.fundoModal}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onFechar} accessibilityLabel="Fechar" />
        <ScrollView style={{ width: '100%', maxWidth: 680, maxHeight: '92%' }} contentContainerStyle={[s.folha, { maxWidth: 680 }]}>
          <Text style={s.folhaTitulo}>Decorar a casa</Text>
          <EscolherCor cor={cor} onCor={onCor} />
          {!meus.length && <Text style={s.legenda}>Você ainda não tem móveis. Compre na loja com seus talentos e depois escolha aqui onde cada um fica.</Text>}
          {LISTA_COMODOS.map(cm => (
            <View key={cm.id} style={{ gap: 12 }}>
              <Text style={s.pergunta}>{cm.nome}</Text>
              {VAGAS.filter(v => v.comodo === cm.id).map(v => {
                const opcoes = meus.filter(i => MOVEIS[i.id]?.tipo === v.tipo);
                return (
                  <View key={v.id} style={{ gap: 8 }}>
                    <Text style={s.campoRotulo}>{v.nome}</Text>
                    {opcoes.length ? (
                      <Opcoes
                        valores={[['', 'Vazio'], ...opcoes.map(i => [i.id, i.nome] as [string, string])]}
                        atual={casa[v.id] ?? ''}
                        onEscolher={id => colocar(v.id, id || null)}
                      />
                    ) : (
                      <Text style={s.legenda}>Nenhum móvel deste tipo ({v.tipo === 'parede' ? 'de parede' : v.tipo === 'tapete' ? 'tapete' : 'de chão'}) ainda.</Text>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
          <Botao texto="Pronto" onPress={onFechar} />
        </ScrollView>
      </View>
    </Modal>
  );
}

/* ---------- Peças pequenas ---------- */

const Cartao = ({ titulo, children }: { titulo: string; children: ReactNode }) => (
  <View style={s.cartao}>
    <Text style={s.cartaoTitulo}>{titulo}</Text>
    {children}
  </View>
);

const Campo = ({ rotulo, children }: { rotulo: string; children: ReactNode }) => (
  <View style={{ gap: 8 }}>
    <Text style={s.campoRotulo}>{rotulo}</Text>
    {children}
  </View>
);

const Botao = ({ texto, onPress, desativado, secundario }: { texto: string; onPress: () => void; desativado?: boolean; secundario?: boolean }) => (
  <Pressable
    onPress={onPress}
    disabled={desativado}
    accessibilityRole="button"
    accessibilityState={{ disabled: !!desativado }}
    style={({ pressed }) => [s.botao, secundario && s.botaoSecundario, pressed && { opacity: 0.85 }, desativado && { opacity: 0.45 }]}
  >
    <Text style={[s.botaoTexto, secundario && { color: C.ameixa }]}>{texto}</Text>
  </Pressable>
);

const Bolinha = ({ cor, ativo, rotulo, onPress }: { cor: string; ativo: boolean; rotulo: string; onPress: () => void }) => (
  <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={rotulo} accessibilityState={{ selected: ativo }} style={[s.bolinha, { backgroundColor: cor }, ativo && s.bolinhaAtiva]} />
);

const EscolherCor = ({ cor, onCor }: { cor: string; onCor: (c: string) => void }) => (
  <Campo rotulo="Cor do tema">
    <View style={s.chips}>{CORES_CASA.map(([c, nome]) => <Bolinha key={c} cor={c} ativo={cor === c} rotulo={`Cor do tema: ${nome}`} onPress={() => onCor(c)} />)}</View>
    <Text style={s.legenda}>Muda botões e menus, e os detalhes rosados da casa: cama, almofadas, cadeiras e enfeites.</Text>
  </Campo>
);

const Aviso = ({ texto, acao, onAcao }: { texto: string; acao?: string; onAcao?: () => void }) => (
  <View style={s.aviso}>
    <Text style={s.avisoTexto}>{texto}</Text>
    {acao && onAcao && <Botao texto={acao} onPress={onAcao} />}
  </View>
);

const criarEstilos = () => StyleSheet.create({
  pagina: { width: '100%', maxWidth: 1360, alignSelf: 'center', padding: 16, paddingBottom: 48, gap: 16 },

  topo: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingVertical: 8 },
  marcaLinha: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  marca: { fontFamily: F.titulo, fontSize: 34, color: C.ameixa, lineHeight: 40 },
  marcaSub: { fontFamily: F.medio, fontSize: 14, color: C.suave },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, flexGrow: 1, flexShrink: 1, flexBasis: 360, justifyContent: 'center' },
  stat: { backgroundColor: C.branco, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10, minWidth: 104, gap: 2, borderWidth: 1, borderColor: C.linha },
  statRotulo: { fontFamily: F.medio, fontSize: 12, color: C.suave },
  statValor: { fontFamily: F.subtitulo, fontSize: 24, color: C.ameixa, lineHeight: 30 },
  statDetalhe: { fontFamily: F.texto, fontSize: 11, color: C.suave },
  trilhoMini: { height: 6, borderRadius: 3, backgroundColor: C.areia, overflow: 'hidden', marginVertical: 4, minWidth: 120 },
  preenchMini: { height: 6, backgroundColor: C.lima, borderRadius: 3 },

  tresColunas: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  lateral: { width: 320, gap: 16 },
  centro: { flex: 1 },

  cartao: { backgroundColor: C.branco, borderRadius: 28, padding: 20, gap: 14, borderWidth: 1, borderColor: C.linha },
  cartaoTitulo: { fontFamily: F.titulo, fontSize: 30, color: C.ameixa, lineHeight: 36 },

  cena: { width: '100%', aspectRatio: 600 / 480, borderRadius: 32, overflow: 'hidden', backgroundColor: C.areia },
  comodo: { backgroundColor: C.branco, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, gap: 2, maxWidth: 220, borderWidth: 1, borderColor: C.linha },
  comodoAtivo: { backgroundColor: C.ameixa, borderColor: C.ameixa },
  comodoNome: { fontFamily: F.subtitulo, fontSize: 20, color: C.ameixa, lineHeight: 25 },
  comodoDica: { fontFamily: F.texto, fontSize: 12, color: C.suave, lineHeight: 16 },
  balaoCena: { position: 'absolute', bottom: '100%', left: -60, right: -60, alignItems: 'center' },
  balaoTexto: { fontFamily: F.forte, fontSize: 12, color: C.ameixa, backgroundColor: C.branco, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: C.linha },
  toast: { position: 'absolute', top: 16, left: 16, right: 16, alignSelf: 'center', maxWidth: 560, marginHorizontal: 'auto', backgroundColor: C.ameixa, borderRadius: 20, padding: 16 },
  toastTexto: { fontFamily: F.forte, fontSize: 15, color: '#fff', textAlign: 'center' },
  objeto: { position: 'absolute', borderRadius: 12, alignItems: 'center', justifyContent: 'flex-start' },
  objetoAtivo: { backgroundColor: 'rgba(138,255,0,0.16)', borderWidth: 2, borderColor: C.lima },
  legendaCena: { position: 'absolute', left: 12, right: 12, bottom: 12, alignItems: 'center' },
  legendaCenaTexto: { backgroundColor: 'rgba(255,255,255,0.92)', color: C.ameixa, fontFamily: F.forte, fontSize: 13, lineHeight: 18, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, overflow: 'hidden', textAlign: 'center' },
  botaoDecorar: { position: 'absolute', top: 12, right: 12, backgroundColor: C.branco, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: C.linha },
  botaoDecorarTexto: { fontFamily: F.forte, fontSize: 14, lineHeight: 18, color: C.ameixa },
  dica: { position: 'absolute', bottom: 10, alignSelf: 'center', fontFamily: F.medio, fontSize: 12, color: C.ameixa, backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },

  barraTopo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  barraNome: { fontFamily: F.forte, fontSize: 15, color: C.ameixa },
  barraValor: { fontFamily: F.forte, fontSize: 15, color: C.suave },
  trilho: { height: 12, borderRadius: 6, backgroundColor: C.areia, overflow: 'hidden' },
  preench: { height: 12, borderRadius: 6 },
  legenda: { fontFamily: F.texto, fontSize: 13, color: C.suave, lineHeight: 19 },

  missao: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.fundo, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: C.linha },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: C.areiaEscura, alignItems: 'center', justifyContent: 'center' },
  checkFeito: { backgroundColor: C.lima, borderColor: C.lima },
  checkMarca: { color: C.ameixa, fontFamily: F.forte, fontSize: 15 },
  missaoTexto: { fontFamily: F.forte, fontSize: 15, color: C.ameixa },

  ofensivaLinha: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  ofensivaNumero: { fontFamily: F.titulo, fontSize: 72, color: C.pink, lineHeight: 82 },
  ofensivaRotulo: { fontFamily: F.subtitulo, fontSize: 22, lineHeight: 28, color: C.ameixa },
  mes: { fontFamily: F.subtitulo, fontSize: 20, lineHeight: 26, color: C.ameixa, textTransform: 'capitalize', marginBottom: 8 },
  calendario: { flexDirection: 'row', flexWrap: 'wrap' },
  calCabeca: { width: `${100 / 7}%`, textAlign: 'center', fontFamily: F.medio, fontSize: 11, color: C.suave, marginBottom: 4 },
  calCelula: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  calDia: { width: '82%', height: '82%', borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  calAtivo: { backgroundColor: C.lima },
  calHoje: { borderWidth: 2, borderColor: C.pink },
  calTexto: { fontFamily: F.medio, fontSize: 12, color: C.ameixa },
  conquista: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  desCartao: { backgroundColor: C.fundo, borderRadius: 18, padding: 14, gap: 10, borderWidth: 1, borderColor: C.linha },
  desTitulo: { fontFamily: F.forte, fontSize: 15, lineHeight: 20, color: C.ameixa },
  desBarras: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 128 },
  desColuna: { flex: 1, alignItems: 'center', gap: 6, height: '100%' },
  desTrilho: { flex: 1, width: '100%', maxWidth: 30, justifyContent: 'flex-end', backgroundColor: C.areia, borderRadius: 6, overflow: 'hidden' },
  desBarra: { width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  desData: { fontFamily: F.medio, fontSize: 11, lineHeight: 14, color: C.suave },
  desLinha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: C.linha },
  desNome: { fontFamily: F.medio, fontSize: 14, lineHeight: 20, color: C.ameixa, flexShrink: 1 },
  desValor: { fontFamily: F.forte, fontSize: 14, lineHeight: 20, color: C.ameixa },
  selo: { width: 14, height: 14, borderRadius: 7, backgroundColor: C.areia, borderWidth: 2, borderColor: C.areiaEscura },
  conquistaNome: { fontFamily: F.forte, fontSize: 14, color: C.ameixa },

  lojaGrade: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  item: { width: 135, flexGrow: 1, maxWidth: 220, backgroundColor: C.fundo, borderRadius: 22, padding: 12, gap: 6, borderWidth: 1, borderColor: C.linha },
  itemArte: { width: '100%', aspectRatio: 1, borderRadius: 16, backgroundColor: C.areia, overflow: 'hidden' },
  itemNome: { fontFamily: F.forte, fontSize: 14, lineHeight: 19, color: C.ameixa },
  itemBotao: { marginTop: 4, borderRadius: 999, paddingVertical: 10, alignItems: 'center', backgroundColor: C.areia },
  itemBotaoTexto: { fontFamily: F.forte, fontSize: 13, lineHeight: 18, color: C.suave, textAlign: 'center', paddingHorizontal: 6 },

  ajustes: { alignItems: 'center', gap: 10, paddingVertical: 16 },
  link: { fontFamily: F.forte, fontSize: 14, color: C.suave, textDecorationLine: 'underline', textAlign: 'center' },

  fundoModal: { flex: 1, backgroundColor: 'rgba(42,10,49,0.45)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  folha: { width: '100%', maxWidth: 560, backgroundColor: C.branco, borderRadius: 32, padding: 24, gap: 16, borderWidth: 1, borderColor: C.linha },
  folhaTitulo: { fontFamily: F.titulo, fontSize: 40, color: C.ameixa, lineHeight: 48 },
  gradeAtiv: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  ativ: { width: '48%', flexGrow: 1, backgroundColor: C.fundo, borderRadius: 18, padding: 14, gap: 4, borderWidth: 1, borderColor: C.linha },
  ativNome: { fontFamily: F.forte, fontSize: 15, color: C.ameixa },
  ativInfo: { fontFamily: F.texto, fontSize: 12, color: C.suave },
  ativHoje: { fontFamily: F.forte, fontSize: 11, color: C.limaEscuro },
  pergunta: { fontFamily: F.subtitulo, fontSize: 22, lineHeight: 28, color: C.ameixa },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { borderRadius: 999, borderWidth: 1.5, borderColor: C.areiaEscura, backgroundColor: C.branco, paddingHorizontal: 18, paddingVertical: 10 },
  chipAtivo: { backgroundColor: C.ameixa, borderColor: C.ameixa },
  chipTexto: { fontFamily: F.forte, fontSize: 14, lineHeight: 19, color: C.ameixa },
  ganho: { fontFamily: F.titulo, fontSize: 32, lineHeight: 40, color: C.pink, textAlign: 'center' },
  destaque: { fontFamily: F.forte, fontSize: 15, color: C.limaEscuro, textAlign: 'center' },

  hudTopo: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, zIndex: 5 },
  hudMarca: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 999, paddingLeft: 6, paddingRight: 16, paddingVertical: 6, borderWidth: 1, borderColor: C.linha },
  hudMarcaNome: { fontFamily: F.titulo, fontSize: 22, lineHeight: 26, color: C.ameixa },
  hudMarcaSub: { fontFamily: F.medio, fontSize: 12, lineHeight: 16, color: C.suave },
  hudChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', flexGrow: 1, flexShrink: 1, flexBasis: 300 },
  hudChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 999, paddingLeft: 5, paddingRight: 16, paddingVertical: 5, borderWidth: 1, borderColor: C.linha },
  hudChipCompacto: { paddingLeft: 3, paddingRight: 9, paddingVertical: 3, gap: 5 },
  hudChipAberto: { borderColor: C.ameixa, borderWidth: 2 },
  hudInfoLugar: { position: 'absolute', top: '100%', left: 0, right: 0, alignItems: 'center', paddingTop: 8 },
  hudInfo: { width: '100%', maxWidth: 340, gap: 8, backgroundColor: C.branco, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: C.linha, shadowColor: '#42124C', shadowOpacity: 0.16, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  hudInfoTitulo: { fontFamily: F.forte, fontSize: 15, lineHeight: 20, color: C.ameixa },
  hudInfoTexto: { fontFamily: F.texto, fontSize: 14, lineHeight: 20, color: C.suave },
  hudChipIcone: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  hudChipValor: { fontFamily: F.subtitulo, fontSize: 20, lineHeight: 25, color: C.ameixa },
  hudChipRotulo: { fontFamily: F.medio, fontSize: 11, lineHeight: 14, color: C.suave },
  hudNivel: { fontFamily: F.subtitulo, fontSize: 16, lineHeight: 20, color: '#fff' },
  hudBotaoPequeno: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.94)', borderWidth: 1, borderColor: C.linha, alignItems: 'center', justifyContent: 'center' },
  hudComodosV: { position: 'absolute', left: 12, top: 96, gap: 8 },
  hudComodo: { alignItems: 'center', gap: 4, minWidth: 64 },
  hudRedondo: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.96)', borderWidth: 1.5, borderColor: C.linha, alignItems: 'center', justifyContent: 'center', shadowColor: '#2A0A31', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  hudRotulo: { fontFamily: F.forte, fontSize: 12, lineHeight: 16, color: C.ameixa, backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 8, borderRadius: 8, overflow: 'hidden' },
  hudMarcaPonto: { position: 'absolute', top: 6, right: 6, width: 11, height: 11, borderRadius: 6, backgroundColor: C.pink, borderWidth: 2, borderColor: '#fff' },
  hudRegistrar: { width: 68, height: 68, borderRadius: 34, backgroundColor: C.pink, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#fff', shadowColor: '#C8005A', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  hudBase: { gap: 10 },
  hudBaseLargo: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  hudAcoes: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 4, flexWrap: 'wrap' },
  hudAvatar: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 26, padding: 10, paddingRight: 16, borderWidth: 1, borderColor: C.linha, maxWidth: 420 },
  hudAvatarCompacto: { alignSelf: 'stretch', maxWidth: 9999, padding: 6, paddingRight: 12, gap: 10, borderRadius: 20 },
  hudRetrato: { width: 76, height: 76, borderRadius: 38, overflow: 'hidden', backgroundColor: C.rosa, borderWidth: 3, borderColor: '#fff' },
  hudAvatarNome: { fontFamily: F.subtitulo, fontSize: 18, lineHeight: 22, color: C.ameixa },
  hudAvatarHumor: { fontFamily: F.medio, fontSize: 12, color: C.suave },
  hudBarra: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hudTrilho: { flex: 1, height: 7, borderRadius: 4, backgroundColor: C.areia, overflow: 'hidden' },
  hudPreench: { height: 7, borderRadius: 4 },
  botaoSecundario: { backgroundColor: C.branco, borderWidth: 1.5, borderColor: C.ameixa },
  botao: { backgroundColor: C.pink, borderRadius: 999, paddingHorizontal: 26, paddingVertical: 14, alignItems: 'center' },
  botaoTexto: { fontFamily: F.subtitulo, fontSize: 20, lineHeight: 26, color: '#fff', letterSpacing: 0.3, textAlign: 'center' },

  aviso: { backgroundColor: C.branco, borderRadius: 22, padding: 16, gap: 12, borderWidth: 2, borderColor: C.pink },
  avisoTexto: { fontFamily: F.medio, fontSize: 15, color: C.ameixa },

  onb: { width: '100%', maxWidth: 980, alignSelf: 'center', padding: 24, paddingTop: 48, gap: 12 },
  onbMarca: { fontFamily: F.titulo, fontSize: 88, color: C.pink, lineHeight: 100, marginTop: 8 },
  onbLead: { fontFamily: F.medio, fontSize: 20, color: C.ameixa, maxWidth: 520, lineHeight: 28 },
  onbGrade: { gap: 24, marginTop: 24 },
  onbPreview: { width: 240, aspectRatio: 200 / 330, alignSelf: 'center' },
  campoRotulo: { fontFamily: F.forte, fontSize: 14, color: C.suave },
  input: { backgroundColor: C.branco, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, color: C.ameixa, fontFamily: F.medio, fontSize: 16, borderWidth: 1.5, borderColor: C.areiaEscura },
  bolinha: { width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: 'transparent' },
  bolinhaAtiva: { borderColor: C.ameixa },
});
let s = criarEstilos();
