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
import Loja3D from './src/Loja3D';
import Vitrine3D from './src/Vitrine3D';
import EstudioPersonagem from './src/EstudioPersonagem';
import { icone } from './src/icones';
import { ROSA_PADRAO } from './src/cores';
import { apagarNuvem, confirmarCodigo, entrarComGoogle, enviarCodigo, erroDoLink, googleAtivo, mensagemErro, sair, sincronizar, supabase } from './src/nuvem';
import { useFonts } from 'expo-font';
// Importa só os pesos usados, para não publicar a família inteira
import { BarlowCondensed_800ExtraBold } from '@expo-google-fonts/barlow-condensed/800ExtraBold';
import { BarlowCondensed_900Black } from '@expo-google-fonts/barlow-condensed/900Black';
import { Archivo_400Regular } from '@expo-google-fonts/archivo/400Regular';
import { Archivo_600SemiBold } from '@expo-google-fonts/archivo/600SemiBold';
import { Archivo_700Bold } from '@expo-google-fonts/archivo/700Bold';
import {
  ATIVIDADES, BONUS_MISSAO, CONQUISTAS, CORES_CASA, LISTA_ATIVIDADES, LOJA, MISSOES, NECESSIDADES,
  bloqueio, calcular, corDaCasa, desempenho, diaDe, liberada, possui, servePara, versiculoDoDia,
  type Acabamento, type AtividadeId, type Estado, type Evento, type Item, type Mobilia, type Opcao, type Perfil,
} from './src/jogo';
import {
  BAIXOS, CALCADOS, CORES_CABELO, CORES_OLHOS, CORES_ROUPA, CORES_ROUPA_LISTA, NARIZES, OLHOS_LISTA, PELES, ROSTOS,
  SOBRANCELHAS, TOPOS, cabelosPara, iconeSvg, mix, type Corpo, type Look,
} from './src/personagem';
import { SEGREDOS, lugarLivreMovel, mobiliaDePerfil, type Segredo } from './src/casa';

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
  versiculoLido: 'faithsteps:versiculo',
};
const TELA_CHEIA = { style: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } } as const;
const ICONE = iconeSvg();
const NUVEM = !!supabase;
const LOGO_GOOGLE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';

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
  const [agora, setAgora] = useState(() => Date.now());
  const [erroSalvar, setErroSalvar] = useState(false);
  const [entrando, setEntrando] = useState(false);
  const [provador, setProvador] = useState<'roupas' | 'visual' | null>(null);
  const [decorando, setDecorando] = useState(false);
  const [lojaAba, setLojaAba] = useState<Item['tipo'] | null>(null);
  const [foco, setFoco] = useState('casa');
  const [versiculoAberto, setVersiculoAberto] = useState(false);
  const [versiculoLido, setVersiculoLido] = useState<string | null>(null);
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
        const [p, e, pd, c, ct, vl] = await Promise.all([K.perfil, K.eventos, K.pendentes, K.cursor, K.conta, K.versiculoLido].map(k => AsyncStorage.getItem(k)));
        // Registros de antes da nuvem ganham um id
        const evs: Evento[] = (e ? JSON.parse(e) : []).map((x: Evento) => (x.id ? x : { ...x, id: Crypto.randomUUID() }));
        const pf = p ? JSON.parse(p) : null;
        if (pf) setPerfil({ atualizadoEm: pf.criadoEm, ...pf });
        setEventos(evs);
        setPendentes(pd ? JSON.parse(pd) : evs.map(x => x.id));
        dados.current.cursor = c ? JSON.parse(c) : null;
        dados.current.conta = ct ? JSON.parse(ct) : null;
        if (vl) setVersiculoLido(JSON.parse(vl));
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
        <EstudioPersonagem
          aberto={true}
          modoCriacao
          look={{ corpo: 'feminino', pele: PELES[2], cabelo: 'longo', corCabelo: CORES_CABELO[0], moletom: 'areia', corTopo: 'areia', corBaixo: 'jeans', corCalcado: 'nevoa', olhos: 'amendoado', barba: 'nenhuma', oculos: false }}
          forma={50}
          buscando={!!sessao && sinc === 'sincronizando'}
          onSalvar={(l, n) => {
            const nomeFinal = (n ?? '').trim() || 'Peregrino';
            setPerfil({ nome: nomeFinal, criadoEm: Date.now(), atualizadoEm: Date.now(), look: l });
            setAgora(Date.now());
          }}
          onFechar={() => {}}
          onEntrar={NUVEM && !sessao ? () => setEntrando(true) : undefined}
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
  const mobiliaAtual = mobiliaDePerfil(perfil, estado.itens);
  const acabamentosAtuais = perfil.acabamentos ?? {};
  const mudarMobilia = (mobilia: Mobilia[]) => { setPerfil({ ...perfil, mobilia, casa: undefined, atualizadoEm: Date.now() }); setAgora(Date.now()); };
  const mudarAcabamento = (comodo: string, a: Acabamento) => {
    setPerfil({ ...perfil, acabamentos: { ...(perfil.acabamentos ?? {}), [comodo]: a }, atualizadoEm: Date.now() });
    setAgora(Date.now());
  };
  const mudarCor = (cor: string) => { setPerfil({ ...perfil, cor, atualizadoEm: Date.now() }); setAgora(Date.now()); };
  const mudarNome = (nome: string) => { setPerfil({ ...perfil, nome, atualizadoEm: Date.now() }); mostrarAviso(`Agora seu personagem se chama ${nome}.`); };
  const abrirVersiculo = () => {
    const hoje = diaDe(Date.now());
    setVersiculoLido(hoje);
    guardar(K.versiculoLido, hoje);
    setVersiculoAberto(true);
  };
  const vestir = (item: Item) => {
    if (item.tipo === 'fantasia') {
      mudarLook({ ...perfil.look, fantasia: perfil.look.fantasia === item.id ? undefined : item.id });
      return;
    }
    if (item.peca) mudarLook({ ...perfil.look, fantasia: undefined, [item.peca]: item.id } as Look);
  };
  const comprar = (item: Item) => {
    if (possui(estado, item) || bloqueio(estado, item)) return;
    const quando = Date.now();
    adicionar({ id: Crypto.randomUUID(), tipo: 'compra', item: item.id, preco: item.preco, quando });
    if (item.tipo === 'roupa') return vestir(item);
    if (item.tipo === 'fantasia') {
      mudarLook({ ...perfil.look, fantasia: item.id });
      mostrarAviso(`Fantasia vestida: ${item.nome}. Você pode trocar no Guarda-roupa ou na Loja.`);
      return;
    }
    if (item.tipo === 'comodo') {
      setAgora(quando);
      setLojaAba(null);
      setFoco(item.id);
      mostrarAviso(`${item.nome} desbloqueado! Toque nos objetos para usar.`);
      return;
    }
    if (item.tipo === 'atividade') {
      setAgora(quando);
      mostrarAviso(`${item.nome} liberado! Agora aparece em Registrar.`);
      return;
    }
    if (item.tipo === 'funcao') {
      setAgora(quando);
      setLojaAba(null);
      if (item.id === 'versiculoDia') abrirVersiculo();
      else mostrarAviso(`${item.nome} chegou na casa! Toque nele para brincar.`);
      return;
    }
    if (item.tipo === 'papel' || item.tipo === 'piso') {
      if (!decorando && foco !== 'casa' && foco !== 'jardim') {
        mudarAcabamento(foco, { ...(perfil.acabamentos?.[foco] ?? {}), [item.tipo]: item.id });
        mostrarAviso(`${item.nome} aplicado! Abra Construir para arrastar em outros cômodos.`);
      } else {
        setAgora(quando);
        mostrarAviso(decorando ? `${item.nome} liberado! Arraste para um cômodo.` : `${item.nome} comprado! Abra Construir para arrastar em um cômodo.`);
      }
      return;
    }
    if (decorando) {
      setAgora(quando);
      mostrarAviso(`${item.nome} liberado! Arraste da bandeja para a casa.`);
      return;
    }
    // Móvel comprado na Loja já entra numa vaga livre; em Construir dá para arrastar livremente
    const itensNovos = [...estado.itens, item.id];
    const livre = lugarLivreMovel(item.vaga!, mobiliaAtual, itensNovos, foco);
    if (livre) mudarMobilia([...mobiliaAtual, { item: item.id, ...livre }]);
    else setAgora(quando);
    mostrarAviso(livre ? `${item.nome} colocado na casa! Abra Construir para arrastar onde quiser.` : `${item.nome} guardado! Abra Construir para colocar na casa.`);
  };
  const comprarPorId = (id: string) => {
    const it = LOJA.find(x => x.id === id);
    if (it) comprar(it);
  };
  const vestirPorId = (id: string) => {
    const it = LOJA.find(x => x.id === id);
    if (it && possui(estado, it)) vestir(it);
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
  // O que acontece ao usar um objeto da casa: "atividade:devocional", "visual", "roupas", "segredo:dracma", "loja:comodo"
  const usarObjeto = (alvo: string) => {
    const [tipo, valor] = alvo.split(':');
    if (tipo === 'atividade') setRegistrando({ inicial: valor as AtividadeId });
    else if (tipo === 'visual') setProvador('visual');
    else if (tipo === 'roupas') setProvador('roupas');
    else if (tipo === 'segredo') achar(valor as Segredo);
    else if (tipo === 'loja') setLojaAba((valor as Item['tipo']) || 'comodo');
    else if (tipo === 'acao') {
      if (valor === 'banho') mostrarAviso('Banho tomado! Personagem limpo e renovado.');
      else if (valor === 'dentes') mostrarAviso('Dentes escovados! Sorriso brilhando.');
    }
  };

  const limparLocal = () => {
    AsyncStorage.multiRemove(Object.values(K)).catch(() => {});
    Object.assign(dados.current, { perfil: null, eventos: [], pendentes: [], cursor: null, conta: null });
    setPerfilEstado(null);
    setEventosEstado([]);
    setPendentesEstado([]);
    setVersiculoLido(null);
    setDecorando(false);
    setFoco('casa');
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
        pausado={!!lojaAba || !!provador}
        estado={estado}
        mobilia={mobiliaAtual}
        acabamentos={acabamentosAtuais}
        decorando={decorando}
        acao={acao}
        foco={foco}
        onFoco={setFoco}
        conta={conta}
        erroSalvar={erroSalvar}
        versiculoNovo={versiculoLido !== diaDe(agora)}
        onVersiculo={abrirVersiculo}
        onAbrirRegistro={inicial => setRegistrando({ inicial })}
        onUsar={usarObjeto}
        onProvador={aba => setProvador(aba)}
        onLoja={() => setLojaAba('roupa')}
        onDecorar={() => setDecorando(true)}
        onFecharDecorar={() => setDecorando(false)}
        onMudarMobilia={mudarMobilia}
        onMudarAcabamento={mudarAcabamento}
        onComprarPorId={comprarPorId}
        onEntrar={() => setEntrando(true)}
        onSair={sairDaConta}
        onApagar={apagarTudo}
        onCor={mudarCor}
        onNome={mudarNome}
      />
      <Registrar
        aberto={!!registrando}
        inicial={registrando?.inicial ?? null}
        estado={estado}
        onFechar={() => setRegistrando(null)}
        onRegistrar={registrar}
      />
      {recompensa && <RecompensaModal r={recompensa} look={perfil.look} onFechar={() => setRecompensa(null)} />}
      <EstudioPersonagem
        aberto={!!provador}
        categoriaInicial={provador === 'visual' ? 'rosto' : 'cima'}
        look={perfil.look}
        nomeInicial={perfil.nome}
        forma={estado.forma}
        estado={estado}
        itens={estado.itens}
        talentos={estado.talentos}
        nivel={estado.nivel}
        onComprar={id => {
          const item = LOJA.find(i => i.id === id);
          if (!item || possui(estado, item) || bloqueio(estado, item)) return;
          const quando = Date.now();
          adicionar({ id: Crypto.randomUUID(), tipo: 'compra', item: id, preco: item.preco, quando });
          setAgora(quando);
        }}
        onSalvar={(l, nome) => { setPerfil({ ...perfil, look: l, nome: nome?.trim() || perfil.nome, atualizadoEm: Date.now() }); setAgora(Date.now()); setProvador(null); }}
        onFechar={() => setProvador(null)}
      />
      <LojaModal
        aba={lojaAba}
        onFechar={() => setLojaAba(null)}
        perfil={perfil}
        estado={estado}
        mobilia={mobiliaAtual}
        acabamentos={acabamentosAtuais}
        onComprar={comprarPorId}
        onVestir={vestirPorId}
        onDecorar={() => { setLojaAba(null); setDecorando(true); }}
        onIrComodo={id => { setLojaAba(null); setFoco(id); }}
        onAbrirAtividade={id => { setLojaAba(null); setRegistrando({ inicial: id }); }}
        onVersiculo={() => { setLojaAba(null); abrirVersiculo(); }}
      />
      <Folha aberto={versiculoAberto} titulo="Versículo do dia" onFechar={() => setVersiculoAberto(false)}>
        <VersiculoPainel agora={agora} onDevocional={() => { setVersiculoAberto(false); setRegistrando({ inicial: 'devocional' }); }} />
      </Folha>
      {entrar}
      {aviso && (
        <Pressable style={[s.toast, decorando && { top: 68 }]} onPress={() => setAviso(null)} accessibilityRole="alert">
          <Text style={s.toastTexto}>{aviso}</Text>
        </Pressable>
      )}
    </>
  );
}

/* ---------- Tela principal ---------- */

function Casa(props: {
  perfil: Perfil; estado: Estado; eventos: Evento[];
  mobilia: Mobilia[]; acabamentos: Record<string, Acabamento>; decorando: boolean;
  acao: AtividadeId | null; foco: string; onFoco: (f: string) => void;
  conta: Conta; erroSalvar: boolean; versiculoNovo: boolean; onVersiculo: () => void;
  onAbrirRegistro: (inicial: AtividadeId | null) => void; onUsar: (alvo: string) => void;
  onProvador: (aba: 'roupas' | 'visual') => void;
  onLoja: () => void; onDecorar: () => void; onFecharDecorar: () => void;
  onMudarMobilia: (m: Mobilia[]) => void; onMudarAcabamento: (comodo: string, a: Acabamento) => void; onComprarPorId: (id: string) => void;
  onEntrar: () => void; onSair: () => void; onApagar: () => Promise<string | null>; onCor: (cor: string) => void; onNome: (nome: string) => void;
  pausado?: boolean;
}) {
  const { perfil, estado, foco, onFoco } = props;
  const { width } = useWindowDimensions();
  const compacto = width < 520;
  const linhaUnica = width >= 620;
  const [painel, setPainel] = useState<'necessidades' | 'missao' | 'jornada' | 'conta' | null>(null);
  const fechar = () => setPainel(null);
  const temVersiculo = estado.itens.includes('versiculoDia');

  return (
    <View style={{ flex: 1, backgroundColor: '#EFE7EF' }}>
      <Casa3D
        pausado={props.pausado}
        look={perfil.look}
        forma={estado.forma}
        humor={estado.humor}
        nome={perfil.nome}
        itens={estado.itens}
        mobilia={props.mobilia}
        acabamentos={props.acabamentos}
        decorando={props.decorando}
        talentos={estado.talentos}
        nivel={estado.nivel}
        achados={estado.achados}
        acao={props.acao}
        foco={foco}
        cor={corDaCasa(perfil)}
        onUsar={async alvo => props.onUsar(alvo)}
        onFoco={async f => onFoco(f)}
        onMudarMobilia={async m => props.onMudarMobilia(m)}
        onMudarAcabamento={async (c, a) => props.onMudarAcabamento(c, a)}
        onCor={async c => props.onCor(c)}
        onComprar={async id => props.onComprarPorId(id)}
        onFecharDecorar={async () => props.onFecharDecorar()}
        dom={TELA_CHEIA}
      />
      {!props.decorando && (
        <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { padding: compacto ? 10 : 14, paddingTop: compacto ? 14 : 14, gap: 10 }]}>
          <HudTopoSims estado={estado} conta={props.conta} compacto={compacto} onLoja={props.onLoja} />
          {props.erroSalvar && <Aviso texto="Não foi possível salvar neste aparelho. Seus últimos registros podem se perder se você fechar o app." />}
          {estado.humor === 'adormecido' && (
            <Aviso texto={`${perfil.nome} adormeceu depois de dias sem devocional. Faça um devocional para acordar.`} acao="Fazer devocional" onAcao={() => props.onAbrirRegistro('devocional')} />
          )}
          <HudEsquerdaSims
            estado={estado}
            foco={foco}
            onFoco={onFoco}
            temVersiculo={temVersiculo}
            versiculoNovo={props.versiculoNovo}
            onVersiculo={props.onVersiculo}
            onMissao={() => setPainel('missao')}
          />
          <View style={{ flex: 1 }} pointerEvents="none" />
          <View pointerEvents="box-none" style={linhaUnica ? s.simsBaseLargo : s.simsBase}>
            {!linhaUnica && (
              <View pointerEvents="box-none" style={{ alignSelf: 'flex-end' }}>
                <HudMenuSims
                  compacto={compacto}
                  onDecorar={props.onDecorar}
                  onJornada={() => setPainel('jornada')}
                  onLoja={props.onLoja}
                  onConta={() => setPainel('conta')}
                />
              </View>
            )}
            <HudAvatarSims
              perfil={perfil}
              estado={estado}
              compacto={compacto}
              onNecessidades={() => setPainel('necessidades')}
              onEstilo={() => props.onProvador('roupas')}
              onRegistrar={() => props.onAbrirRegistro(null)}
            />
            {linhaUnica && (
              <HudMenuSims
                compacto={compacto}
                onDecorar={props.onDecorar}
                onJornada={() => setPainel('jornada')}
                onLoja={props.onLoja}
                onConta={() => setPainel('conta')}
              />
            )}
          </View>
        </View>
      )}

      <Folha aberto={painel === 'necessidades'} titulo="Necessidades" onFechar={fechar}><Barras estado={estado} /></Folha>
      <Folha aberto={painel === 'missao'} titulo="Missão do dia" onFechar={fechar}>
        <Missao estado={estado} onAbrir={a => { fechar(); props.onAbrirRegistro(a); }} />
      </Folha>
      <Folha aberto={painel === 'jornada'} titulo="Jornada" onFechar={fechar}><Jornada estado={estado} eventos={props.eventos} /></Folha>
      <Folha aberto={painel === 'conta'} titulo="Conta" onFechar={fechar}>
        <ContaPainel conta={props.conta} nome={perfil.nome} onNome={props.onNome} cor={corDaCasa(perfil)} onCor={props.onCor} onEntrar={() => { fechar(); props.onEntrar(); }} onSair={props.onSair} onApagar={props.onApagar} />
      </Folha>
    </View>
  );
}

const Icone = ({ nome, cor = C.ameixa, tamanho = 22, largura = 2 }: { nome: string; cor?: string; tamanho?: number; largura?: number }) => (
  <SvgXml xml={icone(nome, cor, largura)} width={tamanho} height={tamanho} />
);

function medalhaNivelSvg(progresso: number) {
  const p = Math.max(0, Math.min(1, progresso));
  const arco = (p * 128.8).toFixed(1);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">`
    + `<circle cx="26" cy="26" r="25" fill="#FFFFFF"/>`
    + `<circle cx="26" cy="26" r="20.5" fill="none" stroke="#EAEFF5" stroke-width="4.5"/>`
    + (p > 0.01 ? `<circle cx="26" cy="26" r="20.5" fill="none" stroke="#F5A623" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="${arco} 140" transform="rotate(-90 26 26)"/>` : '')
    // Pod circular branco no topo para acabamento limpo do anel de progresso
    + `<circle cx="26" cy="10" r="7.8" fill="#FFFFFF" stroke="#EAEFF5" stroke-width="1.2"/>`
    // Chama dourada do Espírito (Atos 2)
    + `<path d="M26 4.8 C28.2 7.6 29.8 9.5 29.8 11.8 C29.8 13.9 28.1 15.4 26 15.4 C23.9 15.4 22.2 13.9 22.2 11.8 C22.2 9.5 23.8 7.6 26 4.8 Z" fill="#F5A623"/>`
    + `<path d="M26 8.2 C27.2 9.8 28.1 10.9 28.1 12.2 C28.1 13.4 27.2 14.2 26 14.2 C24.8 14.2 23.9 13.4 23.9 12.2 C23.9 10.9 24.8 9.8 26 8.2 Z" fill="#FFE57F"/>`
    + `</svg>`;
}

function HudTopoSims({ estado, conta, compacto, onLoja }: { estado: Estado; conta: Conta; compacto: boolean; onLoja: () => void }) {
  const [aberto, setAberto] = useState<string | null>(null);
  const INFO: Record<string, { icone?: string; cor: string; titulo: string; valor: string; texto: string; loja?: boolean }> = {
    nivel: {
      cor: '#F5A623', titulo: `Nível ${estado.nivel}`, valor: `${estado.xpNoNivel} / ${estado.xpParaProximo} XP`,
      texto: 'Cada atividade registrada dá XP. Subir de nível libera roupas, papéis de parede, pisos, cômodos e móveis na loja.',
    },
    talentos: {
      icone: 'talento', cor: '#53C737', titulo: 'Talentos', valor: String(estado.talentos), loja: true,
      texto: `Moeda da loja. Ganhe registrando atividades e completando a missão do dia (+${BONUS_MISSAO}). Com o personagem Radiante, você ganha 50% a mais.`,
    },
    ofensiva: {
      icone: 'ofensiva', cor: '#F7A21B', titulo: 'Dias de ofensiva', valor: String(estado.ofensiva),
      texto: `Dias seguidos com devocional, oração ou igreja. Seu recorde: ${estado.recorde} ${estado.recorde === 1 ? 'dia' : 'dias'}.`,
    },
    gracas: {
      icone: 'graca', cor: '#9B6EF3', titulo: 'Graças', valor: String(estado.gracas),
      texto: 'Uma Graça cobre um dia sem devocional, oração ou igreja, e a ofensiva não zera. Você ganha 1 por semana (no máximo 2).',
    },
  };
  const tocar = (id: string) => setAberto(a => (a === id ? null : id));
  const pilula = (id: string, mostrarMais = false) => {
    const i = INFO[id];
    return (
      <Pressable key={id} onPress={() => tocar(id)} style={[s.simsPilula, compacto && s.simsPilulaCompacta]}
        accessibilityRole="button" accessibilityState={{ expanded: aberto === id }} accessibilityLabel={`${i.titulo}: ${i.valor}`}>
        <View style={[s.simsPilulaIcone, compacto && { width: 27, height: 27, borderRadius: 14 }, { backgroundColor: i.cor }]}>
          <Icone nome={i.icone!} cor="#fff" tamanho={compacto ? 14 : 16} largura={2.4} />
        </View>
        <Text style={[s.simsPilulaValor, compacto && { fontSize: 15 }]}>{i.valor}</Text>
        {mostrarMais && (
          <View style={s.simsPilulaMais}><Text style={s.simsPilulaMaisTxt}>+</Text></View>
        )}
      </Pressable>
    );
  };
  const info = aberto ? INFO[aberto] : null;
  const tamNivel = compacto ? 46 : 52;
  return (
    <View style={s.simsTopo} pointerEvents="box-none">
      <Pressable onPress={() => tocar('nivel')} style={[s.simsNivel, { width: tamNivel, height: tamNivel }]}
        accessibilityRole="button" accessibilityState={{ expanded: aberto === 'nivel' }} accessibilityLabel={`Nível ${estado.nivel}, ${estado.xpNoNivel} de ${estado.xpParaProximo} XP`}>
        <View style={[s.simsNivelMascara, { width: tamNivel, height: tamNivel, borderRadius: tamNivel / 2 }]}>
          <SvgXml xml={medalhaNivelSvg(estado.xpNoNivel / Math.max(1, estado.xpParaProximo))} width={tamNivel} height={tamNivel} />
          <View pointerEvents="none" style={[s.simsNivelCentro, compacto && { bottom: 6 }]}>
            <Text style={[s.simsNivelTexto, compacto && { fontSize: 17, lineHeight: 19 }]}>{estado.nivel}</Text>
          </View>
        </View>
      </Pressable>
      {pilula('talentos', true)}
      {pilula('ofensiva')}
      {pilula('gracas')}
      {conta.sinc === 'offline' && (
        <View style={s.simsOffline} accessibilityLabel="Sem conexão"><Text style={s.simsOfflineTxt}>offline</Text></View>
      )}
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
            {info.loja && (
              <Pressable onPress={() => { setAberto(null); onLoja(); }} accessibilityRole="button" style={{ alignSelf: 'flex-start' }}>
                <Text style={[s.link, { color: C.pink }]}>Abrir loja</Text>
              </Pressable>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const FOCOS: { id: string; nome: string; icone: string; item?: string }[] = [
  { id: 'casa', nome: 'Casa toda', icone: 'casa' },
  { id: 'quarto', nome: 'Quarto', icone: 'quarto' },
  { id: 'estudo', nome: 'Estudo', icone: 'estudo' },
  { id: 'sala', nome: 'Sala', icone: 'sala' },
  { id: 'cozinha', nome: 'Cozinha', icone: 'cozinha' },
  { id: 'banheiro', nome: 'Banheiro', icone: 'banheiro' },
  { id: 'jardim', nome: 'Jardim', icone: 'jardim', item: 'jardim' },
  { id: 'estudio', nome: 'Louvor', icone: 'estudio', item: 'estudio' },
  { id: 'academia', nome: 'Academia', icone: 'academia', item: 'academia' },
];

function HudEsquerdaSims(props: {
  estado: Estado; foco: string; onFoco: (f: string) => void;
  temVersiculo: boolean; versiculoNovo: boolean; onVersiculo: () => void; onMissao: () => void;
}) {
  const [comodosAberto, setComodosAberto] = useState(false);
  const feitas = MISSOES.filter(id => (props.estado.hoje[id] ?? 0) > 0).length;
  const visiveis = FOCOS.filter(f => !f.item || props.estado.itens.includes(f.item));
  const focoAtual = visiveis.find(f => f.id === props.foco) ?? FOCOS[0];

  return (
    <View pointerEvents="box-none" style={s.simsLateral}>
      <Pressable onPress={props.onMissao} style={[s.simsBotaoLateral, { backgroundColor: '#299FD8' }]} accessibilityRole="button" accessibilityLabel={`Missão do dia: ${feitas} de ${MISSOES.length}`}>
        <Icone nome="missao" cor="#fff" tamanho={23} largura={2.2} />
        {!props.estado.missaoCompleta && <View style={s.simsPontoNotif} />}
        <View style={[s.simsSeloLateral, { backgroundColor: props.estado.missaoCompleta ? '#45C34E' : '#EC2F7B' }]}>
          <Text style={s.simsSeloTexto}>{feitas}/{MISSOES.length}</Text>
        </View>
      </Pressable>

      {props.temVersiculo && (
        <Pressable onPress={props.onVersiculo} style={[s.simsBotaoLateral, { backgroundColor: '#E59F1A' }]} accessibilityRole="button" accessibilityLabel="Versículo do dia">
          <Icone nome="versiculo" cor="#fff" tamanho={22} largura={2.2} />
          {props.versiculoNovo && <View style={s.simsPontoNotif} />}
          <View style={[s.simsSeloLateral, { backgroundColor: '#6D439E' }]}>
            <Text style={s.simsSeloTexto}>Dia</Text>
          </View>
        </Pressable>
      )}

      <View pointerEvents="box-none" style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <Pressable onPress={() => setComodosAberto(v => !v)} style={s.simsCamadaBotao}
          accessibilityRole="button" accessibilityState={{ expanded: comodosAberto }} accessibilityLabel={`Cômodo atual: ${focoAtual.nome}`}>
          <Icone nome={props.foco === 'casa' ? 'camadas' : focoAtual.icone} cor="#fff" tamanho={18} largura={2.1} />
          {props.foco !== 'casa' && <Text style={s.simsCamadaRotulo}>{focoAtual.nome}</Text>}
        </Pressable>
        {comodosAberto && (
          <View style={s.simsComodosMenu}>
            {visiveis.map(f => {
              const ativo = f.id === props.foco;
              return (
                <Pressable key={f.id} onPress={() => { props.onFoco(f.id); setComodosAberto(false); }}
                  accessibilityRole="tab" accessibilityState={{ selected: ativo }}
                  style={[s.simsComodoItem, ativo && { backgroundColor: '#1B87BE' }]}>
                  <Icone nome={f.icone} cor={ativo ? '#fff' : C.ameixa} tamanho={16} largura={2.1} />
                  <Text style={[s.simsComodoTexto, ativo && { color: '#fff' }]}>{f.nome}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

function HudAvatarSims(props: {
  perfil: Perfil; estado: Estado; compacto: boolean;
  onNecessidades: () => void; onEstilo: () => void; onRegistrar: () => void;
}) {
  const { perfil, estado, compacto } = props;
  const corFundo = estado.humor === 'radiante'
    ? '#49D45D'
    : estado.humor === 'normal'
      ? '#CFDCE6'
      : '#DE4F3A';
  const corBrilho = estado.humor === 'radiante'
    ? '#82F28E'
    : estado.humor === 'normal'
      ? '#EEF4F9'
      : '#F17A67';
  const grade: { id: string; icone: string; nome: string; valor: number }[][] = [
    [
      { id: 'espirito', icone: 'espirito', nome: 'Espírito', valor: Math.round(estado.necessidades.espirito) },
      { id: 'palavra', icone: 'palavra', nome: 'Palavra', valor: Math.round(estado.necessidades.palavra) },
      { id: 'louvor', icone: 'louvor', nome: 'Louvor', valor: Math.round(estado.necessidades.louvor) },
    ],
    [
      { id: 'comunhao', icone: 'comunhao', nome: 'Comunhão', valor: Math.round(estado.necessidades.comunhao) },
      { id: 'corpo', icone: 'corpo', nome: 'Corpo', valor: Math.round(estado.necessidades.corpo) },
      { id: 'forma', icone: 'forma', nome: 'Forma física', valor: Math.round(estado.forma) },
    ],
  ];

  return (
    <View pointerEvents="box-none" style={s.simsWidget}>
      <View pointerEvents="box-none" style={[s.simsRetratoZona, compacto && { width: 86, height: 96, marginRight: -24 }]}>
        <View pointerEvents="none" style={[
          s.simsLosango,
          compacto && { width: 64, height: 64, left: 12, borderRadius: 14 },
          { backgroundColor: corFundo },
        ]}>
          <View style={[s.simsLosangoBrilho, { backgroundColor: corBrilho }]} />
        </View>
        <Pressable onPress={props.onNecessidades} style={[s.simsBusto, compacto && { width: 84, height: 96 }]}
          accessibilityRole="button" accessibilityLabel={`Necessidades de ${perfil.nome}`}>
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Vitrine3D
              busto
              look={perfil.look}
              forma={estado.forma}
              humor={estado.humor === 'adormecido' ? 'normal' : estado.humor}
              olhosFechados={estado.humor === 'adormecido'}
              dom={TELA_CHEIA}
            />
          </View>
        </Pressable>
        <Pressable onPress={props.onEstilo} style={[s.simsBotaoEstilo, compacto && { width: 36, height: 36, borderRadius: 18 }]}
          accessibilityRole="button" accessibilityLabel="Roupas e aparência">
          <Icone nome="cabide" cor="#fff" tamanho={compacto ? 18 : 20} largura={2.2} />
        </Pressable>
      </View>

      <View style={[s.simsBandeja, compacto && { paddingLeft: 28, gap: 6 }]}>
        <Pressable onPress={props.onNecessidades} style={{ gap: 5 }} accessibilityRole="button" accessibilityLabel="Ver todas as necessidades">
          {grade.map((linha, li) => (
            <View key={li} style={{ flexDirection: 'row', gap: 5 }}>
              {linha.map(item => {
                const cheio = item.valor >= 35;
                return (
                  <View key={item.id} style={[s.simsTileNec, compacto && { width: 35, height: 23 }]} accessibilityLabel={`${item.nome}: ${item.valor}`}>
                    <View style={[s.simsTilePreench, { width: `${Math.max(8, Math.min(100, item.valor))}%`, backgroundColor: cheio ? '#4FD466' : '#F04E3E' }]} />
                    <Icone nome={item.icone} cor="#fff" tamanho={compacto ? 13 : 15} largura={2.3} />
                  </View>
                );
              })}
            </View>
          ))}
        </Pressable>
        <Pressable onPress={props.onRegistrar} style={[s.simsBotaoAcao, compacto && { width: 36, height: 51 }]}
          accessibilityRole="button" accessibilityLabel="Registrar atividade">
          <Icone nome="acao" cor="#fff" tamanho={compacto ? 20 : 23} largura={2.1} />
        </Pressable>
      </View>
    </View>
  );
}

function HudMenuSims(props: {
  compacto: boolean; onDecorar: () => void; onJornada: () => void; onLoja: () => void; onConta: () => void;
}) {
  const itens: { id: string; icone: string; rotulo: string; cor: string; onPress: () => void }[] = [
    { id: 'construir', icone: 'construir', rotulo: 'Construir e decorar', cor: '#1B87BE', onPress: props.onDecorar },
    { id: 'jornada', icone: 'jornada', rotulo: 'Jornada', cor: '#1B87BE', onPress: props.onJornada },
    { id: 'loja', icone: 'carrinho', rotulo: 'Loja', cor: '#7A28B8', onPress: props.onLoja },
    { id: 'conta', icone: 'pontos', rotulo: 'Conta e ajustes', cor: '#68BC28', onPress: props.onConta },
  ];
  return (
    <View style={s.simsDock}>
      {itens.map((it, idx) => (
        <Pressable
          key={it.id}
          onPress={it.onPress}
          accessibilityRole="button"
          accessibilityLabel={it.rotulo}
          style={({ pressed }) => [
            s.simsDockTile,
            props.compacto && { width: 44, height: 40 },
            { backgroundColor: it.cor },
            idx === 0 && { borderTopLeftRadius: 10, borderBottomLeftRadius: 10 },
            idx === itens.length - 1 && { borderTopRightRadius: 10, borderBottomRightRadius: 10 },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Icone nome={it.icone} cor="#fff" tamanho={props.compacto ? 21 : 24} largura={2.3} />
        </Pressable>
      ))}
    </View>
  );
}

// Painel que abre por cima do jogo (necessidades, missão, jornada, conta, versículo)
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

function VersiculoPainel({ agora, onDevocional }: { agora: number; onDevocional: () => void }) {
  const v = versiculoDoDia(agora);
  const data = new Date(agora).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <View style={{ gap: 16 }}>
      <Text style={[s.legenda, { textTransform: 'capitalize' }]}>{data}</Text>
      <View style={s.versiculoCaixa}>
        <Text style={s.versiculoTexto}>“{v.texto}”</Text>
        <Text style={s.versiculoRef}>{v.referencia}</Text>
      </View>
      <Botao texto="Fazer devocional agora" onPress={onDevocional} />
    </View>
  );
}

function Barras({ estado }: { estado: Estado }) {
  const forma = Math.round(estado.forma);
  const corForma = forma >= 60 ? C.lima : forma >= 30 ? C.pink : C.pinkEscuro;
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
      <View accessibilityLabel={`Forma física: ${forma} de 100`}>
        <View style={s.barraTopo}>
          <Text style={s.barraNome}>Forma física</Text>
          <Text style={[s.barraValor, forma < 30 && { color: C.pinkEscuro }]}>{forma}</Text>
        </View>
        <View style={s.trilho}><View style={[s.preench, { width: `${forma}%`, backgroundColor: corForma }]} /></View>
      </View>
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

      <PainelDesempenho eventos={eventos} estado={estado} />

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
function PainelDesempenho({ eventos, estado }: { eventos: Evento[]; estado: Estado }) {
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
        {LISTA_ATIVIDADES.filter(a => liberada(estado, a) || d.vezes[a.id] > 0).map(a => (
          <View key={a.id} style={s.desLinha}>
            <Text style={s.desNome}>{a.nome}</Text>
            <Text style={s.desValor}>{total(a.id)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function LojaModal(props: {
  aba: Item['tipo'] | null; onFechar: () => void;
  perfil: Perfil; estado: Estado; mobilia: Mobilia[]; acabamentos: Record<string, Acabamento>;
  onComprar: (id: string) => void; onVestir: (id: string) => void; onDecorar: () => void;
  onIrComodo: (id: string) => void; onAbrirAtividade: (id: AtividadeId) => void; onVersiculo: () => void;
}) {
  if (!props.aba) return null;
  return (
    <Modal transparent visible animationType="fade" onRequestClose={props.onFechar}>
      <View style={{ flex: 1 }}>
        <Loja3D
          abaInicial={props.aba}
          look={props.perfil.look}
          forma={props.estado.forma}
          humor={props.estado.humor}
          nivel={props.estado.nivel}
          talentos={props.estado.talentos}
          itens={props.estado.itens}
          mobilia={props.mobilia}
          acabamentos={props.acabamentos}
          cor={corDaCasa(props.perfil)}
          onComprar={async id => props.onComprar(id)}
          onVestir={async id => props.onVestir(id)}
          onDecorar={async () => props.onDecorar()}
          onIrComodo={async id => props.onIrComodo(id)}
          onAbrirAtividade={async id => props.onAbrirAtividade(id)}
          onVersiculo={async () => props.onVersiculo()}
          onFechar={async () => props.onFechar()}
          dom={TELA_CHEIA}
        />
      </View>
    </Modal>
  );
}

function ContaPainel({ conta, nome, onNome, cor, onCor, onEntrar, onSair, onApagar }: {
  conta: Conta; nome: string; onNome: (nome: string) => void; cor: string; onCor: (cor: string) => void; onEntrar: () => void; onSair: () => void; onApagar: () => Promise<string | null>;
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
      <MudarNome nome={nome} onNome={onNome} />
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
  const [google, setGoogle] = useState(false);
  useEffect(() => {
    if (aberto) { setEtapa('email'); setCodigo(''); setErro(null); googleAtivo().then(setGoogle); }
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
              <Text style={s.legenda}>Seu personagem fica salvo na nuvem, e você usa o mesmo no celular e no computador. Sem senha: {google ? 'entre com o Google ou receba um link no e-mail.' : 'mandamos um link de entrada para o seu e-mail.'}</Text>
              {google && (
                <>
                  <Pressable onPress={() => !ocupado && tentar(entrarComGoogle)} disabled={ocupado} accessibilityRole="button"
                    style={({ pressed }) => [s.botaoGoogle, pressed && { opacity: 0.85 }]}>
                    <SvgXml xml={LOGO_GOOGLE} width={22} height={22} />
                    <Text style={s.botaoGoogleTexto}>Entrar com Google</Text>
                  </Pressable>
                  <Text style={[s.legenda, { textAlign: 'center' }]}>ou receba um link no e-mail</Text>
                </>
              )}
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
  const inicialOk = inicial && liberada(estado, ATIVIDADES[inicial]) ? inicial : null;
  const [sel, setSel] = useState<AtividadeId | null>(inicialOk);
  useEffect(() => { if (aberto) setSel(inicialOk); }, [aberto, inicialOk]);
  const a = sel ? ATIVIDADES[sel] : null;

  return (
    <Modal transparent visible={aberto} animationType="fade" onRequestClose={onFechar}>
      <View style={s.fundoModal}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onFechar} accessibilityLabel="Fechar" />
        <View style={s.folha}>
          <Text style={s.folhaTitulo}>{a ? a.nome : 'O que você fez?'}</Text>
          {!a && (
            <View style={s.gradeAtiv}>
              {LISTA_ATIVIDADES.filter(x => liberada(estado, x)).map(x => {
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
              {!inicialOk && <Pressable onPress={() => setSel(null)}><Text style={s.link}>Ver todas as atividades</Text></Pressable>}
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
    const fant = look.fantasia ? LOJA.find(i => i.id === look.fantasia) : undefined;
    mudar({
      corpo,
      cabelo: cabelos.some(c => c.id === look.cabelo) ? look.cabelo : cabelos[0].id,
      barba: corpo === 'feminino' ? 'nenhuma' : look.barba,
      topo: serve(look.topo, 'moletom'), baixo: serve(look.baixo, 'calca'), calcado: serve(look.calcado, 'tenis'),
      fantasia: fant && servePara(fant, corpo) ? look.fantasia : undefined,
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
  const fantasias = LOJA.filter(i => i.tipo === 'fantasia' && possui(estado, i) && servePara(i, look.corpo));
  const comFantasia = !!look.fantasia;
  const topo = look.topo ?? 'moletom';
  return (
    <View style={{ gap: 18 }}>
      {fantasias.length > 0 && (
        <Campo rotulo="Fantasia">
          <Opcoes
            valores={[['', 'Nenhuma'], ...fantasias.map(i => [i.id, i.nome] as [string, string])]}
            atual={look.fantasia ?? ''}
            onEscolher={v => mudar({ fantasia: v || undefined })}
          />
        </Campo>
      )}
      <Campo rotulo="Parte de cima">
        <Opcoes valores={TOPOS.filter(([id]) => tem(id))} atual={comFantasia ? ('' as typeof topo) : topo} onEscolher={v => mudar({ fantasia: undefined, topo: v })} />
      </Campo>
      <Campo rotulo="Cor da parte de cima">
        <CorRoupa atual={look.corTopo ?? look.moletom} rotulo="Cor da parte de cima" onEscolher={c => mudar({ fantasia: undefined, corTopo: c })} />
      </Campo>
      {topo !== 'vestido' && topo !== 'vestidoLongo' && (
        <>
          <Campo rotulo="Parte de baixo">
            <Opcoes valores={BAIXOS.filter(([id]) => tem(id))} atual={comFantasia ? ('' as NonNullable<Look['baixo']>) : (look.baixo ?? 'calca')} onEscolher={v => mudar({ fantasia: undefined, baixo: v })} />
          </Campo>
          <Campo rotulo="Cor da parte de baixo">
            <CorRoupa atual={look.corBaixo ?? 'ameixa'} rotulo="Cor da parte de baixo" onEscolher={c => mudar({ fantasia: undefined, corBaixo: c })} />
          </Campo>
        </>
      )}
      <Campo rotulo="Calçado">
        <Opcoes valores={CALCADOS.filter(([id]) => tem(id))} atual={comFantasia ? ('' as NonNullable<Look['calcado']>) : (look.calcado ?? 'tenis')} onEscolher={v => mudar({ fantasia: undefined, calcado: v })} />
      </Campo>
      <Campo rotulo="Cor do calçado">
        <CorRoupa atual={look.corCalcado ?? ''} rotulo="Cor do calçado" onEscolher={c => mudar({ fantasia: undefined, corCalcado: c })} />
        {look.corCalcado && (
          <Pressable onPress={() => mudar({ corCalcado: undefined })} accessibilityRole="button" style={{ alignSelf: 'flex-start' }}>
            <Text style={s.link}>Voltar à cor original</Text>
          </Pressable>
        )}
      </Campo>
      <Text style={s.legenda}>Mais roupas e fantasias na loja, compradas com talentos.</Text>
    </View>
  );
}

// Espelho e guarda-roupa unificados: mostra a prévia 3D e só salva ao confirmar
function Provador({ aberto, abaInicial, look, forma, estado, onSalvar, onFechar }: {
  aberto: boolean; abaInicial: 'roupas' | 'visual'; look: Look; forma: number; estado: Estado;
  onSalvar: (l: Look) => void; onFechar: () => void;
}) {
  const [aba, setAba] = useState<'roupas' | 'visual'>(abaInicial);
  const [rascunho, setRascunho] = useState(look);
  useEffect(() => {
    if (aberto) { setRascunho(look); setAba(abaInicial); }
  }, [aberto, abaInicial]);
  const previa = aba === 'visual' && rascunho.fantasia ? { ...rascunho, fantasia: undefined } : rascunho;
  return (
    <Modal transparent visible={aberto} animationType="fade" onRequestClose={onFechar}>
      <View style={s.fundoModal}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onFechar} accessibilityLabel="Fechar" />
        <ScrollView style={{ width: '100%', maxWidth: 640, maxHeight: '92%' }} contentContainerStyle={[s.folha, { maxWidth: 640 }]}>
          <Text style={s.folhaTitulo}>{aba === 'roupas' ? 'Guarda-roupa' : 'Aparência'}</Text>
          <Opcoes valores={[['roupas', 'Roupas'], ['visual', 'Aparência']]} atual={aba} onEscolher={setAba} />
          <View style={{ width: 180, aspectRatio: 200 / 300, alignSelf: 'center' }}><Vitrine3D look={previa} forma={forma} humor="normal" dom={TELA_CHEIA} /></View>
          {aba === 'roupas'
            ? <EditorRoupas look={rascunho} onChange={setRascunho} estado={estado} />
            : <EditorVisual look={rascunho} onChange={setRascunho} />}
          <Botao texto="Salvar" onPress={() => onSalvar(rascunho)} />
          <Pressable onPress={onFechar} style={{ alignSelf: 'center' }} accessibilityRole="button"><Text style={s.link}>Cancelar</Text></Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

/* ---------- Peças pequenas ---------- */

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

function MudarNome({ nome, onNome }: { nome: string; onNome: (nome: string) => void }) {
  const [rascunho, setRascunho] = useState(nome);
  useEffect(() => setRascunho(nome), [nome]);
  const novo = rascunho.trim();
  const salvar = () => { if (novo && novo !== nome) onNome(novo); };
  return (
    <View style={{ width: '100%', maxWidth: 460 }}>
    <Campo rotulo="Nome do personagem">
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <TextInput value={rascunho} onChangeText={setRascunho} onSubmitEditing={salvar} maxLength={20} style={[s.input, { flex: 1 }]}
          placeholder="Nome" placeholderTextColor="#A893A6" accessibilityLabel="Nome do personagem" />
        <Botao texto="Salvar" onPress={salvar} desativado={!novo || novo === nome} />
      </View>
    </Campo>
    </View>
  );
}

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
  itemLargo: { width: 185, maxWidth: 280 },
  itemArte: { width: '100%', aspectRatio: 1, borderRadius: 16, backgroundColor: C.areia, overflow: 'hidden' },
  itemNome: { fontFamily: F.forte, fontSize: 14, lineHeight: 19, color: C.ameixa },
  itemBotao: { marginTop: 4, borderRadius: 999, paddingVertical: 10, alignItems: 'center', backgroundColor: C.areia },
  itemBotaoTexto: { fontFamily: F.forte, fontSize: 13, lineHeight: 18, color: C.suave, textAlign: 'center', paddingHorizontal: 6 },

  versiculoCaixa: { backgroundColor: C.fundo, borderRadius: 24, padding: 22, gap: 12, borderWidth: 1.5, borderColor: C.linha },
  versiculoTexto: { fontFamily: F.medio, fontSize: 19, lineHeight: 28, color: C.ameixa },
  versiculoRef: { fontFamily: F.subtitulo, fontSize: 18, lineHeight: 23, color: C.pink },

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

  simsTopo: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 10, zIndex: 6 },
  simsNivel: { alignItems: 'center', justifyContent: 'center', borderRadius: 999, shadowColor: '#1A0A22', shadowOpacity: 0.22, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 5, backgroundColor: 'transparent' },
  simsNivelMascara: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#FFFFFF', borderRadius: 999 },
  simsNivelCentro: { position: 'absolute', left: 0, right: 0, bottom: 7, alignItems: 'center' },
  simsNivelTexto: { fontFamily: F.titulo, fontSize: 20, lineHeight: 22, color: '#C26E00' },
  simsPilula: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(26, 18, 36, 0.62)', borderRadius: 999, paddingLeft: 2, paddingRight: 12, paddingVertical: 2, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.45)' },
  simsPilulaCompacta: { paddingRight: 9, gap: 5 },
  simsPilulaIcone: { width: 31, height: 31, borderRadius: 16, borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  simsPilulaValor: { fontFamily: F.subtitulo, fontSize: 18, lineHeight: 22, color: '#FFFFFF' },
  simsPilulaMais: { width: 17, height: 17, borderRadius: 9, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginLeft: 1 },
  simsPilulaMaisTxt: { fontFamily: F.titulo, fontSize: 14, lineHeight: 16, color: '#39A928' },
  simsOffline: { backgroundColor: 'rgba(26,18,36,0.7)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  simsOfflineTxt: { fontFamily: F.forte, fontSize: 11, color: '#FFE08A' },

  hudInfoLugar: { position: 'absolute', top: '100%', left: 0, right: 0, alignItems: 'center', paddingTop: 8 },
  hudInfo: { width: '100%', maxWidth: 340, gap: 8, backgroundColor: C.branco, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: C.linha, shadowColor: '#42124C', shadowOpacity: 0.16, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  hudInfoTitulo: { fontFamily: F.forte, fontSize: 15, lineHeight: 20, color: C.ameixa },
  hudInfoTexto: { fontFamily: F.texto, fontSize: 14, lineHeight: 20, color: C.suave },
  hudChipIcone: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  hudChipValor: { fontFamily: F.subtitulo, fontSize: 20, lineHeight: 25, color: C.ameixa },
  hudNivel: { fontFamily: F.subtitulo, fontSize: 16, lineHeight: 20, color: '#fff' },

  simsLateral: { alignSelf: 'flex-start', gap: 14, marginTop: 4, zIndex: 5 },
  simsBotaoLateral: { width: 48, height: 48, borderRadius: 15, borderWidth: 2.5, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#1A0A22', shadowOpacity: 0.24, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
  simsPontoNotif: { position: 'absolute', top: -4, right: -4, width: 13, height: 13, borderRadius: 7, backgroundColor: '#FF3B30', borderWidth: 2, borderColor: '#FFFFFF' },
  simsSeloLateral: { position: 'absolute', bottom: -9, paddingHorizontal: 7, paddingVertical: 1, borderRadius: 9, borderWidth: 1.5, borderColor: '#FFFFFF' },
  simsSeloTexto: { fontFamily: F.forte, fontSize: 10, lineHeight: 13, color: '#FFFFFF' },
  simsCamadaBotao: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 11, borderRadius: 19, backgroundColor: 'rgba(26, 18, 36, 0.68)', borderWidth: 2, borderColor: '#FFFFFF', shadowColor: '#1A0A22', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  simsCamadaRotulo: { fontFamily: F.forte, fontSize: 12, lineHeight: 16, color: '#FFFFFF' },
  simsComodosMenu: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, maxWidth: 290, backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 18, padding: 8, borderWidth: 2, borderColor: '#FFFFFF', shadowColor: '#1A0A22', shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  simsComodoItem: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: C.fundo },
  simsComodoTexto: { fontFamily: F.forte, fontSize: 12, lineHeight: 16, color: C.ameixa },

  simsBase: { gap: 8, alignItems: 'flex-start' },
  simsBaseLargo: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  simsWidget: { flexDirection: 'row', alignItems: 'flex-end' },
  simsRetratoZona: { width: 102, height: 112, marginRight: -26, zIndex: 3, alignItems: 'center', justifyContent: 'flex-end' },
  simsLosango: { position: 'absolute', bottom: 4, left: 14, width: 76, height: 76, borderRadius: 24, transform: [{ rotate: '-6deg' }], borderWidth: 2.5, borderColor: '#FFFFFF', overflow: 'hidden', shadowColor: '#1A0A22', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  simsLosangoBrilho: { position: 'absolute', top: -12, left: -12, width: 52, height: 52, borderRadius: 26, opacity: 0.45 },
  simsBusto: { width: 100, height: 112, overflow: 'hidden', borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  simsBotaoEstilo: { position: 'absolute', left: 0, bottom: 2, zIndex: 5, width: 42, height: 42, borderRadius: 21, backgroundColor: '#1287C9', borderWidth: 2.5, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#0A3B5C', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
  simsBandeja: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(236, 235, 232, 0.95)', borderRadius: 18, paddingLeft: 32, paddingRight: 6, paddingVertical: 6, borderWidth: 1.5, borderColor: '#FFFFFF', shadowColor: '#1A0A22', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  simsTileNec: { width: 44, height: 26, borderRadius: 7, backgroundColor: '#5B6168', borderWidth: 1.5, borderColor: '#474D53', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  simsTilePreench: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  simsBotaoAcao: { width: 42, height: 57, borderTopLeftRadius: 9, borderBottomLeftRadius: 9, borderTopRightRadius: 14, borderBottomRightRadius: 14, backgroundColor: '#1287C9', borderWidth: 2.5, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },

  simsDock: { flexDirection: 'row', gap: 3, backgroundColor: '#FFFFFF', padding: 3, borderRadius: 14, shadowColor: '#1A0A22', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  simsDockTile: { width: 52, height: 46, alignItems: 'center', justifyContent: 'center' },
  botaoSecundario: { backgroundColor: C.branco, borderWidth: 1.5, borderColor: C.ameixa },
  botaoGoogle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: C.branco, borderRadius: 999, paddingVertical: 13, paddingHorizontal: 24, borderWidth: 1.5, borderColor: C.areiaEscura },
  botaoGoogleTexto: { fontFamily: F.forte, fontSize: 16, lineHeight: 22, color: C.ameixa },
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
