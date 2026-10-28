import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo, Animated, AppState, Easing, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View, useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SvgXml } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import type { Session } from '@supabase/supabase-js';
import { apagarNuvem, confirmarCodigo, enviarCodigo, mensagemErro, sair, sincronizar, supabase } from './src/nuvem';
import { useFonts } from 'expo-font';
// Importa só os pesos usados, para não publicar a família inteira
import { BarlowCondensed_800ExtraBold } from '@expo-google-fonts/barlow-condensed/800ExtraBold';
import { BarlowCondensed_900Black } from '@expo-google-fonts/barlow-condensed/900Black';
import { Archivo_400Regular } from '@expo-google-fonts/archivo/400Regular';
import { Archivo_600SemiBold } from '@expo-google-fonts/archivo/600SemiBold';
import { Archivo_700Bold } from '@expo-google-fonts/archivo/700Bold';
import {
  ATIVIDADES, BONUS_MISSAO, CONQUISTAS, LISTA_ATIVIDADES, LOJA, MISSOES, NECESSIDADES,
  bloqueio, calcular, diaDe, possui, servePara,
  type AtividadeId, type Estado, type Evento, type Item, type Opcao, type Perfil,
} from './src/jogo';
import {
  BAIXOS, CALCADOS, CORES_CABELO, CORES_OLHOS, CORES_ROUPA, CORES_ROUPA_LISTA, NARIZES, OLHOS_LISTA, PELES, ROSTOS,
  SOBRANCELHAS, TOPOS, cabelosPara, iconeSvg, pessoaSvg, type Corpo, type Look,
} from './src/personagem';
import {
  ALT, ESCALA, LARG, LISTA_COMODOS, MOVEIS, SEGREDOS, VAGAS, casaPadrao, doChao, iso, montarComodo, movelSvg,
  type Alvo, type ComodoId, type Objeto, type Segredo,
} from './src/casa';

// Base clara em linho (bege quase branco); ameixa no texto; pink e lima só nos detalhes
const C = {
  fundo: '#FAF6F0', areia: '#F1E8DD', areiaEscura: '#E4D6C6', branco: '#FFFFFF',
  ameixa: '#42124C', noite: '#2A0A31', pink: '#FE0472', pinkEscuro: '#C8005A', limaEscuro: '#3F7F00',
  lima: '#8AFF00', rosa: '#FFD1E6', suave: '#7D6A7F', linha: '#EADFD3',
};
const F = { titulo: 'BarlowCondensed_900Black', subtitulo: 'BarlowCondensed_800ExtraBold', texto: 'Archivo_400Regular', medio: 'Archivo_600SemiBold', forte: 'Archivo_700Bold' };
const K = {
  perfil: 'faithsteps:perfil',
  eventos: 'faithsteps:eventos',
  pendentes: 'faithsteps:pendentes',
  cursor: 'faithsteps:cursor',
  conta: 'faithsteps:conta',
};
const ANIMAR_NATIVO = Platform.OS !== 'web';
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
    supabase.auth.getSession().then(({ data }) => setSessao(data.session));
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSessao(s));
    return () => data.subscription.unsubscribe();
  }, []);

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
  // O que acontece ao tocar num objeto da casa
  const usarObjeto = (alvo: Alvo) => {
    if (alvo.tipo === 'atividade') setRegistrando({ inicial: alvo.atividade });
    else if (alvo.tipo === 'visual') setEspelho(true);
    else if (alvo.tipo === 'roupas') setGuardaRoupa(true);
    else achar(alvo.segredo);
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
        perfil={perfil}
        estado={estado}
        acao={acao}
        conta={conta}
        erroSalvar={erroSalvar}
        onAbrirRegistro={inicial => setRegistrando({ inicial })}
        onObjeto={usarObjeto}
        onLoja={() => setLojaAberta(true)}
        onDecorar={() => setDecorando(true)}
        onEntrar={() => setEntrando(true)}
        onSair={sairDaConta}
        onApagar={apagarTudo}
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
      <Decorar aberto={decorando} casa={casaAtual} estado={estado} onMudar={mudarCasa} onFechar={() => setDecorando(false)} />
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
  perfil: Perfil; estado: Estado; acao: AtividadeId | null; conta: Conta; erroSalvar: boolean;
  onAbrirRegistro: (inicial: AtividadeId | null) => void; onObjeto: (alvo: Alvo) => void;
  onLoja: () => void; onDecorar: () => void;
  onEntrar: () => void; onSair: () => void; onApagar: () => Promise<string | null>;
}) {
  const { perfil, estado } = props;
  const { width } = useWindowDimensions();
  const largo = width >= 1080;
  const [comodo, setComodo] = useState<ComodoId>('quarto');

  const quarto = (
    <View style={largo ? { flexDirection: 'row', gap: 12 } : { gap: 10 }}>
      <Comodos atual={comodo} vertical={largo} onEscolher={setComodo} />
      <View style={{ flex: 1 }}>
        <Cena perfil={perfil} estado={estado} acao={props.acao} comodo={comodo} onObjeto={props.onObjeto} onDecorar={props.onDecorar} />
      </View>
    </View>
  );
  const necessidades = <Cartao titulo="Necessidades"><Barras estado={estado} /></Cartao>;
  const missao = <Cartao titulo="Missão do dia"><Missao estado={estado} onAbrir={props.onAbrirRegistro} /></Cartao>;
  const jornada = <Cartao titulo="Jornada"><Jornada estado={estado} /></Cartao>;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.fundo }} contentContainerStyle={s.pagina}>
      <Topo perfil={perfil} estado={estado} conta={props.conta} onLoja={props.onLoja} onRegistrar={() => props.onAbrirRegistro(null)} />

      {props.erroSalvar && <Aviso texto="Não foi possível salvar neste aparelho. Seus últimos registros podem se perder se você fechar o app." />}
      {estado.humor === 'adormecido' && (
        <Aviso texto={`${perfil.nome} adormeceu depois de dias sem devocional. Faça um devocional para acordar.`} acao="Fazer devocional" onAcao={() => props.onAbrirRegistro('devocional')} />
      )}

      {largo ? (
        <>
          <View style={s.tresColunas}>
            <View style={s.centro}>{quarto}</View>
            <View style={s.lateral}>{necessidades}{missao}{jornada}</View>
          </View>
        </>
      ) : (
        <View style={{ gap: 16 }}>{quarto}{necessidades}{missao}{jornada}</View>
      )}

      <ContaPainel conta={props.conta} onEntrar={props.onEntrar} onSair={props.onSair} onApagar={props.onApagar} />
    </ScrollView>
  );
}

const STATUS: Record<Sinc, string> = { local: '', sincronizando: 'sincronizando...', ok: 'salvo na nuvem', offline: 'sem conexão' };

function Topo({ perfil, estado, conta, onLoja, onRegistrar }: { perfil: Perfil; estado: Estado; conta: Conta; onLoja: () => void; onRegistrar: () => void }) {
  return (
    <View style={s.topo}>
      <View style={s.marcaLinha}>
        <SvgXml xml={ICONE} width={44} height={44} />
        <View>
          <Text style={s.marca}>Faith Steps</Text>
          <Text style={s.marcaSub}>{perfil.nome}{conta.email ? `, ${STATUS[conta.sinc]}` : ''}</Text>
        </View>
      </View>
      <View style={s.stats}>
        <View style={s.stat}>
          <Text style={s.statRotulo}>Nível {estado.nivel}</Text>
          <View style={s.trilhoMini}><View style={[s.preenchMini, { width: `${(estado.xpNoNivel / estado.xpParaProximo) * 100}%` }]} /></View>
          <Text style={s.statDetalhe}>{estado.xpNoNivel} de {estado.xpParaProximo} XP</Text>
        </View>
        <Stat rotulo="Talentos" valor={String(estado.talentos)} />
        <Stat rotulo="Ofensiva" valor={`${estado.ofensiva} ${estado.ofensiva === 1 ? 'dia' : 'dias'}`} />
        <Stat rotulo="Graça" valor={String(estado.gracas)} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Botao texto="Loja" onPress={onLoja} secundario />
        <Botao texto="Registrar" onPress={onRegistrar} />
      </View>
    </View>
  );
}

const Stat = ({ rotulo, valor }: { rotulo: string; valor: string }) => (
  <View style={s.stat}>
    <Text style={s.statRotulo}>{rotulo}</Text>
    <Text style={s.statValor}>{valor}</Text>
  </View>
);

/* ---------- Quarto e personagem ---------- */

function useReduzirMovimento() {
  const [reduzir, setReduzir] = useState(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduzir).catch(() => {}); }, []);
  return reduzir;
}

function Comodos({ atual, vertical, onEscolher }: { atual: ComodoId; vertical: boolean; onEscolher: (c: ComodoId) => void }) {
  const itens = LISTA_COMODOS.map(c => {
    const ativo = c.id === atual;
    return (
      <Pressable
        key={c.id}
        onPress={() => onEscolher(c.id)}
        accessibilityRole="tab"
        accessibilityState={{ selected: ativo }}
        style={[s.comodo, vertical && { width: 172 }, ativo && s.comodoAtivo]}
      >
        <Text style={[s.comodoNome, ativo && { color: '#fff' }]}>{c.nome}</Text>
        <Text style={[s.comodoDica, ativo && { color: C.rosa }]}>{c.dica}</Text>
      </Pressable>
    );
  });
  return vertical
    ? <View style={{ gap: 8 }} accessibilityRole="tablist">{itens}</View>
    : <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, alignItems: 'flex-start' }}>{itens}</ScrollView>;
}

type Ponto = [number, number];

// Cena isométrica: o cômodo, os objetos clicáveis e o personagem andando pela casa
function Cena({ perfil, estado, acao, comodo, onObjeto, onDecorar }: {
  perfil: Perfil; estado: Estado; acao: AtividadeId | null; comodo: ComodoId; onObjeto: (alvo: Alvo) => void; onDecorar: () => void;
}) {
  const [rotulo, setRotulo] = useState<string | null>(null);
  const dormindo = estado.humor === 'adormecido';
  const c = useMemo(
    () => montarComodo(comodo, { itens: estado.itens, casa: perfil.casa, achados: estado.achados, dormindo: dormindo && comodo === 'quarto' ? perfil.look : undefined }),
    [comodo, estado.itens, perfil.casa, estado.achados, dormindo, perfil.look],
  );
  const reduzir = useReduzirMovimento();
  const [largura, setLargura] = useState(0);
  const k = largura / LARG;
  const pos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const anim = useRef<Animated.CompositeAnimation | null>(null);
  const atual = useRef<Ponto>(c.entrada);
  const [andando, setAndando] = useState(false);
  const [virado, setVirado] = useState(false);
  const [passo, setPasso] = useState<0 | 1>(0);
  const ocupado = useRef(false);
  const acaoRef = useRef(acao);
  acaoRef.current = acao;

  const tela = (p: Ponto) => { const [x, y] = iso(p[0], p[1]); return { x: x * k, y: y * k }; };

  const andarAte = (destino: Ponto, depois?: () => void) => {
    anim.current?.stop();
    // Começa de onde o personagem está agora, mesmo no meio de outra caminhada
    pos.stopAnimation(v => { if (k) atual.current = doChao(v.x / k, v.y / k); });
    const [ax] = iso(...atual.current), [bx] = iso(...destino);
    if (Math.abs(bx - ax) > 2) setVirado(bx < ax);
    const dist = Math.hypot(destino[0] - atual.current[0], destino[1] - atual.current[1]);
    if (reduzir || dist < 0.1 || !k) {
      pos.setValue(tela(destino));
      atual.current = destino;
      setAndando(false);
      depois?.();
      return;
    }
    setAndando(true);
    anim.current = Animated.timing(pos, { toValue: tela(destino), duration: dist * 430, easing: Easing.linear, useNativeDriver: ANIMAR_NATIVO });
    anim.current.start(({ finished }) => {
      if (!finished) return;
      atual.current = destino;
      setAndando(false);
      depois?.();
    });
  };

  // Ao trocar de cômodo, entra pela frente e vai até o meio
  useEffect(() => {
    if (!largura) return;
    anim.current?.stop();
    atual.current = c.entrada;
    pos.setValue(tela(c.entrada));
    ocupado.current = false;
    const [x0, x1, y0, y1] = c.area;
    andarAte([(x0 + x1) / 2, (y0 + y1) / 2]);
  }, [comodo, largura]);

  // Sem nada para fazer, passeia pelo cômodo
  useEffect(() => {
    if (reduzir || dormindo) return;
    const id = setInterval(() => {
      if (ocupado.current || acaoRef.current || Math.random() < 0.45) return;
      const [x0, x1, y0, y1] = c.area;
      andarAte([x0 + Math.random() * (x1 - x0), y0 + Math.random() * (y1 - y0)]);
    }, 2600);
    return () => clearInterval(id);
  }, [c, reduzir, dormindo, largura]);

  useEffect(() => {
    if (acao) { anim.current?.stop(); setAndando(false); }
  }, [acao]);

  useEffect(() => {
    if (!andando) return;
    const id = setInterval(() => setPasso(p => (p ? 0 : 1)), 170);
    return () => clearInterval(id);
  }, [andando]);

  const a = acao ? ATIVIDADES[acao] : null;
  const xmlParado = useMemo(
    () => pessoaSvg(perfil.look, { forma: estado.forma, humor: estado.humor, pose: a?.pose ?? 'baixo', fones: a?.fones, olhosFechados: a?.olhosFechados }),
    [perfil.look, estado.forma, estado.humor, a],
  );
  const xmlPassos = useMemo(
    () => ([0, 1] as const).map(p => pessoaSvg(perfil.look, { forma: estado.forma, humor: estado.humor, pose: 'andar', passo: p })),
    [perfil.look, estado.forma, estado.humor],
  );
  const falta = !a && !andando
    ? NECESSIDADES.filter(n => estado.necessidades[n.id] < 30).sort((x, y) => estado.necessidades[x.id] - estado.necessidades[y.id])[0]
    : null;

  const altura = 3.6 * ESCALA * k, larguraP = (altura * 200) / 330;
  const usar = (o: Objeto) => {
    if (dormindo) return onObjeto(o.alvo);
    ocupado.current = true;
    andarAte(o.ponto, () => { ocupado.current = false; onObjeto(o.alvo); });
  };

  return (
    <View style={s.cena} onLayout={e => setLargura(e.nativeEvent.layout.width)}>
      <SvgXml xml={c.svg} width="100%" height="100%" />
      {largura > 0 && !dormindo && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute', left: 0, top: 0, width: larguraP, height: altura,
            transform: [{ translateX: Animated.add(pos.x, -larguraP / 2) }, { translateY: Animated.add(pos.y, -altura * (312 / 330)) }],
          }}
        >
          <View style={[StyleSheet.absoluteFill, virado && { transform: [{ scaleX: -1 }] }]}>
            {andando
              ? xmlPassos.map((x, i) => (
                  <View key={i} style={[StyleSheet.absoluteFill, { opacity: passo === i ? 1 : 0 }]}>
                    <SvgXml xml={x} width="100%" height="100%" />
                  </View>
                ))
              : <Personagem xml={xmlParado} animacao={a?.id === 'exercicio' || a?.pose === 'cima' ? 'pular' : 'parado'} />}
          </View>
          {falta && (
            <View style={s.balaoCena}><Text style={s.balaoTexto}>{falta.falta}</Text></View>
          )}
        </Animated.View>
      )}
      {c.objetos.map(o => (
        <Pressable
          key={o.id}
          accessibilityRole="button"
          accessibilityLabel={o.rotulo}
          onPress={() => usar(o)}
          onHoverIn={() => setRotulo(o.rotulo)}
          onHoverOut={() => setRotulo(null)}
          onPressIn={() => setRotulo(o.rotulo)}
          style={({ hovered, pressed }: { hovered?: boolean; pressed: boolean }) => [
            s.objeto,
            { left: `${(o.caixa[0] / LARG) * 100}%`, top: `${(o.caixa[1] / ALT) * 100}%`, width: `${(o.caixa[2] / LARG) * 100}%`, height: `${(o.caixa[3] / ALT) * 100}%` },
            (hovered || pressed) && s.objetoAtivo,
          ]}
        />
      ))}
      <View style={s.legendaCena} pointerEvents="none">
        <Text style={s.legendaCenaTexto}>{rotulo ?? 'Toque num objeto para usar'}</Text>
      </View>
      <Pressable style={s.botaoDecorar} onPress={onDecorar} accessibilityRole="button">
        <Text style={s.botaoDecorarTexto}>Decorar</Text>
      </Pressable>
      {dormindo && comodo !== 'quarto' && (
        <Text style={s.dica} pointerEvents="none">Seu personagem está dormindo no quarto</Text>
      )}
    </View>
  );
}

function Personagem({ xml, animacao }: { xml: string; animacao: 'parado' | 'pular' | 'sair' }) {
  const v = useRef(new Animated.Value(0)).current;
  const reduzir = useReduzirMovimento();

  useEffect(() => {
    v.setValue(0);
    if (reduzir) return;
    const ir = (para: number, ms: number) => Animated.timing(v, { toValue: para, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: ANIMAR_NATIVO });
    const anim = animacao === 'sair'
      ? Animated.sequence([ir(1, 900), Animated.delay(1200), ir(0, 900)])
      : Animated.loop(Animated.sequence([ir(1, animacao === 'pular' ? 280 : 1500), ir(0, animacao === 'pular' ? 280 : 1500)]));
    anim.start();
    return () => anim.stop();
  }, [animacao, reduzir, v]);

  const estilo = animacao === 'sair'
    ? { opacity: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, 60] }) }] }
    : { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, animacao === 'pular' ? -14 : -3] }) }] };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, estilo]}>
      <SvgXml xml={xml} width="100%" height="100%" />
    </Animated.View>
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

function Jornada({ estado }: { estado: Estado }) {
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
            : movelSvg(item.id);
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

function ContaPainel({ conta, onEntrar, onSair, onApagar }: {
  conta: Conta; onEntrar: () => void; onSair: () => void; onApagar: () => Promise<string | null>;
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
              <Text style={s.legenda}>Seu personagem fica salvo na nuvem, e você usa o mesmo no celular e no computador. Sem senha: mandamos um código para o seu e-mail.</Text>
              <TextInput
                value={email} onChangeText={setEmail} onSubmitEditing={pedir}
                placeholder="seu@email.com" placeholderTextColor="#A893A6" style={s.input}
                autoCapitalize="none" autoCorrect={false} autoComplete="email" keyboardType="email-address" inputMode="email"
                accessibilityLabel="E-mail"
              />
              <Botao texto={ocupado ? 'Enviando...' : 'Enviar código'} onPress={pedir} desativado={!emailOk || ocupado} />
            </>
          ) : (
            <>
              <Text style={s.legenda}>Enviamos um código para {email.trim()}. Pode levar um minuto; confira também o spam.</Text>
              <TextInput
                value={codigo} onChangeText={t => setCodigo(t.replace(/\D/g, ''))} onSubmitEditing={confirmar}
                placeholder="Código do e-mail" placeholderTextColor="#A893A6" style={[s.input, { letterSpacing: 4 }]}
                keyboardType="number-pad" inputMode="numeric" autoComplete="one-time-code" maxLength={10}
                accessibilityLabel="Código do e-mail"
              />
              <Botao texto={ocupado ? 'Entrando...' : 'Entrar'} onPress={confirmar} desativado={codigo.length < 6 || ocupado} />
              <Pressable onPress={() => setEtapa('email')} accessibilityRole="button">
                <Text style={s.link}>Usar outro e-mail ou pedir um código novo</Text>
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
  const xml = pessoaSvg(look, { forma: r.depois.forma, humor: r.depois.humor, pose: a.pose, fones: a.fones, olhosFechados: a.olhosFechados });

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onFechar}>
      <View style={s.fundoModal}>
        <View style={[s.folha, { alignItems: 'center' }]}>
          <View style={{ width: 170, aspectRatio: 200 / 330 }}>
            <Personagem xml={xml} animacao={a.id === 'exercicio' || a.pose === 'cima' ? 'pular' : 'parado'} />
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
  const xml = useMemo(() => pessoaSvg(look, { forma: 50, humor: 'radiante' }), [look]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.fundo }} contentContainerStyle={s.onb}>
      <StatusBar style="dark" />
      <SvgXml xml={ICONE} width={64} height={64} />
      <Text style={s.onbMarca}>Faith Steps</Text>
      <Text style={s.onbLead}>Crie seu personagem. Ele cresce a cada passo de fé que você dá na vida real.</Text>
      <View style={[s.onbGrade, largo && { flexDirection: 'row', alignItems: 'center' }]}>
        <View style={s.onbPreview}><SvgXml xml={xml} width="100%" height="100%" /></View>
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
  const xml = useMemo(() => pessoaSvg(rascunho, { forma, humor: 'normal' }), [rascunho, forma]);
  return (
    <Modal transparent visible={aberto} animationType="fade" onRequestClose={onFechar}>
      <View style={s.fundoModal}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onFechar} accessibilityLabel="Fechar" />
        <ScrollView style={{ width: '100%', maxWidth: 640, maxHeight: '92%' }} contentContainerStyle={[s.folha, { maxWidth: 640 }]}>
          <Text style={s.folhaTitulo}>{titulo}</Text>
          <View style={{ width: 140, aspectRatio: 200 / 330, alignSelf: 'center' }}><SvgXml xml={xml} width="100%" height="100%" /></View>
          {children(rascunho, setRascunho)}
          <Botao texto="Salvar" onPress={() => onSalvar(rascunho)} />
          <Pressable onPress={onFechar} style={{ alignSelf: 'center' }} accessibilityRole="button"><Text style={s.link}>Cancelar</Text></Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

// Decorar: escolher que móvel fica em cada vaga da casa
function Decorar({ aberto, casa, estado, onMudar, onFechar }: {
  aberto: boolean; casa: Record<string, string>; estado: Estado; onMudar: (c: Record<string, string>) => void; onFechar: () => void;
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

const Aviso = ({ texto, acao, onAcao }: { texto: string; acao?: string; onAcao?: () => void }) => (
  <View style={s.aviso}>
    <Text style={s.avisoTexto}>{texto}</Text>
    {acao && onAcao && <Botao texto={acao} onPress={onAcao} />}
  </View>
);

const s = StyleSheet.create({
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
