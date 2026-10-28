import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo, Animated, Easing, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View, useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SvgXml } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
// Importa só os pesos usados, para não publicar a família inteira
import { BarlowCondensed_800ExtraBold } from '@expo-google-fonts/barlow-condensed/800ExtraBold';
import { BarlowCondensed_900Black } from '@expo-google-fonts/barlow-condensed/900Black';
import { Archivo_400Regular } from '@expo-google-fonts/archivo/400Regular';
import { Archivo_600SemiBold } from '@expo-google-fonts/archivo/600SemiBold';
import { Archivo_700Bold } from '@expo-google-fonts/archivo/700Bold';
import {
  ATIVIDADES, BONUS_MISSAO, CONQUISTAS, LISTA_ATIVIDADES, LOJA, MISSOES, NECESSIDADES,
  bloqueio, calcular, diaDe, possui,
  type AtividadeId, type Estado, type Evento, type Item, type Opcao,
} from './src/jogo';
import {
  CABELOS_LISTA, CORES_CABELO, PELES, dormindoSvg, iconeSvg, movelSvg, pessoaSvg, quartoSvg, type Look,
} from './src/personagem';

const C = {
  ameixa: '#42124C', noite: '#2A0A31', card: '#561A63', pink: '#FE0472', pinkEscuro: '#C8005A',
  lima: '#8AFF00', rosa: '#FFD1E6', nevoa: '#FBF3F8', suave: '#E0BFE0', linha: 'rgba(255,209,230,0.14)',
};
const F = { titulo: 'BarlowCondensed_900Black', subtitulo: 'BarlowCondensed_800ExtraBold', texto: 'Archivo_400Regular', medio: 'Archivo_600SemiBold', forte: 'Archivo_700Bold' };
const K_PERFIL = 'faithsteps:perfil';
const K_EVENTOS = 'faithsteps:eventos';
const ANIMAR_NATIVO = Platform.OS !== 'web';
const ICONE = iconeSvg();

type Perfil = { nome: string; criadoEm: number; look: Look };
type Recompensa = { atividade: AtividadeId; antes: Estado; depois: Estado };

export default function App() {
  const [fontes] = useFonts({ BarlowCondensed_800ExtraBold, BarlowCondensed_900Black, Archivo_400Regular, Archivo_600SemiBold, Archivo_700Bold });
  const [carregado, setCarregado] = useState(false);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [agora, setAgora] = useState(Date.now());
  const [erroSalvar, setErroSalvar] = useState(false);
  const [registrando, setRegistrando] = useState<{ inicial: AtividadeId | null } | null>(null);
  const [recompensa, setRecompensa] = useState<Recompensa | null>(null);
  const [acao, setAcao] = useState<AtividadeId | null>(null);
  const timerAcao = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [p, e] = await Promise.all([AsyncStorage.getItem(K_PERFIL), AsyncStorage.getItem(K_EVENTOS)]);
        if (p) setPerfil(JSON.parse(p));
        if (e) setEventos(JSON.parse(e));
      } catch {
        setErroSalvar(true);
      }
      setCarregado(true);
    })();
  }, []);

  const salvar = (chave: string, valor: unknown) =>
    AsyncStorage.setItem(chave, JSON.stringify(valor)).then(() => setErroSalvar(false), () => setErroSalvar(true));

  const atualizarPerfil = (p: Perfil) => { setPerfil(p); salvar(K_PERFIL, p); };
  const atualizarEventos = (e: Evento[]) => { setEventos(e); salvar(K_EVENTOS, e); };

  const estado = useMemo(() => (perfil ? calcular(perfil.criadoEm, eventos, agora) : null), [perfil, eventos, agora]);

  if (!fontes || !carregado) return <View style={{ flex: 1, backgroundColor: C.ameixa }} />;
  if (!perfil || !estado) return <CriarPersonagem onCriar={p => { atualizarPerfil(p); setAgora(Date.now()); }} />;

  const registrar = (atividade: AtividadeId, qtd: number, grupo?: boolean) => {
    const quando = Date.now();
    const ev: Evento = { tipo: 'registro', atividade, qtd, quando, ...(grupo ? { grupo } : {}) };
    const antes = calcular(perfil.criadoEm, eventos, quando);
    const novos = [...eventos, ev];
    const depois = calcular(perfil.criadoEm, novos, quando);
    atualizarEventos(novos);
    setAgora(quando);
    setRegistrando(null);
    setRecompensa({ atividade, antes, depois });
    setAcao(atividade);
    if (timerAcao.current) clearTimeout(timerAcao.current);
    timerAcao.current = setTimeout(() => setAcao(null), 9000);
  };

  const comprar = (item: Item) => {
    atualizarEventos([...eventos, { tipo: 'compra', item: item.id, preco: item.preco, quando: Date.now() }]);
    if (item.tipo === 'moletom' && item.cor) atualizarPerfil({ ...perfil, look: { ...perfil.look, moletom: item.cor } });
  };
  const vestir = (cor: string) => atualizarPerfil({ ...perfil, look: { ...perfil.look, moletom: cor } });
  const apagarTudo = () => {
    AsyncStorage.multiRemove([K_PERFIL, K_EVENTOS]).catch(() => {});
    setPerfil(null);
    setEventos([]);
  };

  return (
    <>
      <StatusBar style="light" />
      <Casa
        perfil={perfil}
        estado={estado}
        acao={acao}
        erroSalvar={erroSalvar}
        onAbrirRegistro={inicial => setRegistrando({ inicial })}
        onComprar={comprar}
        onVestir={vestir}
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
    </>
  );
}

/* ---------- Tela principal ---------- */

function Casa(props: {
  perfil: Perfil; estado: Estado; acao: AtividadeId | null; erroSalvar: boolean;
  onAbrirRegistro: (inicial: AtividadeId | null) => void;
  onComprar: (item: Item) => void; onVestir: (cor: string) => void; onApagar: () => void;
}) {
  const { perfil, estado } = props;
  const { width } = useWindowDimensions();
  const largo = width >= 1080;

  const quarto = <Quarto perfil={perfil} estado={estado} acao={props.acao} onObjeto={props.onAbrirRegistro} />;
  const necessidades = <Cartao titulo="Necessidades"><Barras estado={estado} /></Cartao>;
  const missao = <Cartao titulo="Missão do dia"><Missao estado={estado} onAbrir={props.onAbrirRegistro} /></Cartao>;
  const jornada = <Cartao titulo="Jornada"><Jornada estado={estado} /></Cartao>;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.ameixa }} contentContainerStyle={s.pagina}>
      <Topo perfil={perfil} estado={estado} onRegistrar={() => props.onAbrirRegistro(null)} />

      {props.erroSalvar && <Aviso texto="Não foi possível salvar neste aparelho. Seus últimos registros podem se perder se você fechar o app." />}
      {estado.humor === 'adormecido' && (
        <Aviso texto={`${perfil.nome} adormeceu depois de dias sem devocional. Faça um devocional para acordar.`} acao="Fazer devocional" onAcao={() => props.onAbrirRegistro('devocional')} />
      )}

      {largo ? (
        <View style={s.tresColunas}>
          <View style={s.lateral}>{necessidades}{missao}</View>
          <View style={s.centro}>{quarto}</View>
          <View style={s.lateral}>{jornada}</View>
        </View>
      ) : (
        <View style={{ gap: 16 }}>{quarto}{necessidades}{missao}{jornada}</View>
      )}

      <Cartao titulo="Loja">
        <Loja perfil={perfil} estado={estado} onComprar={props.onComprar} onVestir={props.onVestir} />
      </Cartao>

      <Ajustes onApagar={props.onApagar} />
    </ScrollView>
  );
}

function Topo({ perfil, estado, onRegistrar }: { perfil: Perfil; estado: Estado; onRegistrar: () => void }) {
  return (
    <View style={s.topo}>
      <View style={s.marcaLinha}>
        <SvgXml xml={ICONE} width={44} height={44} />
        <View>
          <Text style={s.marca}>Faith Steps</Text>
          <Text style={s.marcaSub}>{perfil.nome}</Text>
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
      <Botao texto="Registrar" onPress={onRegistrar} />
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

// Objetos do quarto que viram atalhos de registro (coordenadas no quarto 400 × 300)
const OBJETOS: { atividade: AtividadeId; rotulo: string; x: number; y: number; w: number; h: number }[] = [
  { atividade: 'oracao', rotulo: 'Janela: orar', x: 58, y: 34, w: 80, h: 90 },
  { atividade: 'leitura', rotulo: 'Bíblia: ler', x: 154, y: 36, w: 28, h: 42 },
  { atividade: 'estudo', rotulo: 'Livros: estudar', x: 182, y: 40, w: 68, h: 38 },
  { atividade: 'ensaio', rotulo: 'Violão: ensaiar', x: 16, y: 108, w: 38, h: 108 },
  { atividade: 'devocional', rotulo: 'Almofada: devocional', x: 36, y: 242, w: 74, h: 28 },
  { atividade: 'louvor', rotulo: 'Fone: louvor', x: 262, y: 172, w: 50, h: 32 },
  { atividade: 'igreja', rotulo: 'Porta: igreja', x: 318, y: 88, w: 62, h: 134 },
  { atividade: 'exercicio', rotulo: 'Tênis: exercício', x: 326, y: 228, w: 54, h: 22 },
];

function Quarto({ perfil, estado, acao, onObjeto }: { perfil: Perfil; estado: Estado; acao: AtividadeId | null; onObjeto: (a: AtividadeId) => void }) {
  const dormindo = estado.humor === 'adormecido';
  const a = acao ? ATIVIDADES[acao] : null;
  const xml = useMemo(
    () => pessoaSvg(perfil.look, { forma: estado.forma, humor: estado.humor, pose: a?.pose, fones: a?.fones, olhosFechados: a?.olhosFechados }),
    [perfil.look, estado.forma, estado.humor, a],
  );
  const fundo = useMemo(() => quartoSvg(estado.itens), [estado.itens]);
  const falta = !dormindo && !a ? NECESSIDADES.filter(n => estado.necessidades[n.id] < 30).sort((x, y) => estado.necessidades[x.id] - estado.necessidades[y.id])[0] : null;

  return (
    <View style={s.quarto}>
      <SvgXml xml={fundo} width="100%" height="100%" />
      {dormindo ? (
        <View style={s.cama} pointerEvents="none"><SvgXml xml={dormindoSvg(perfil.look)} width="100%" height="100%" /></View>
      ) : (
        <View style={s.personagemNoQuarto} pointerEvents="none">
          <Personagem xml={xml} animacao={a?.id === 'exercicio' || a?.pose === 'cima' ? 'pular' : a?.id === 'igreja' ? 'sair' : 'parado'} />
        </View>
      )}
      {falta && (
        <View style={s.balao} pointerEvents="none"><Text style={s.balaoTexto}>{falta.falta}</Text></View>
      )}
      {OBJETOS.map(o => (
        <Pressable
          key={o.atividade}
          accessibilityRole="button"
          accessibilityLabel={o.rotulo}
          onPress={() => onObjeto(o.atividade)}
          style={({ hovered, pressed }: { hovered?: boolean; pressed: boolean }) => [
            s.objeto,
            { left: `${o.x / 4}%`, top: `${o.y / 3}%`, width: `${o.w / 4}%`, height: `${o.h / 3}%` },
            (hovered || pressed) && s.objetoAtivo,
          ]}
        >
          {({ hovered, pressed }: { hovered?: boolean; pressed: boolean }) =>
            hovered || pressed ? <Text style={s.objetoRotulo} numberOfLines={1}>{o.rotulo}</Text> : null
          }
        </Pressable>
      ))}
      <Text style={s.dica} pointerEvents="none">Toque nos objetos do quarto para registrar</Text>
    </View>
  );
}

function Personagem({ xml, animacao }: { xml: string; animacao: 'parado' | 'pular' | 'sair' }) {
  const v = useRef(new Animated.Value(0)).current;
  const [reduzir, setReduzir] = useState(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduzir).catch(() => {}); }, []);

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
        const cor = v >= 60 ? C.lima : v >= 30 ? C.pink : C.rosa;
        return (
          <View key={n.id} accessibilityLabel={`${n.nome}: ${v} de 100`}>
            <View style={s.barraTopo}>
              <Text style={s.barraNome}>{n.nome}</Text>
              <Text style={[s.barraValor, v < 30 && { color: C.rosa }]}>{v}</Text>
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

function Loja({ perfil, estado, onComprar, onVestir }: { perfil: Perfil; estado: Estado; onComprar: (i: Item) => void; onVestir: (cor: string) => void }) {
  return (
    <View style={s.lojaGrade}>
      {LOJA.map(item => {
        const tem = possui(estado, item);
        const motivo = tem ? null : bloqueio(estado, item);
        const vestindo = item.tipo === 'moletom' && perfil.look.moletom === item.cor;
        const preview = item.tipo === 'moletom'
          ? pessoaSvg({ ...perfil.look, moletom: item.cor ?? 'pink' }, { forma: estado.forma, viewBox: '30 90 140 140' })
          : movelSvg(item.id);
        let texto: string, onPress: (() => void) | undefined, primario = false;
        if (tem) {
          if (item.tipo === 'moletom') {
            texto = vestindo ? 'Vestindo' : 'Vestir';
            onPress = vestindo ? undefined : () => onVestir(item.cor!);
          } else texto = 'No seu quarto';
        } else if (motivo) texto = motivo;
        else { texto = `Comprar por ${item.preco}`; onPress = () => onComprar(item); primario = true; }

        return (
          <View key={item.id} style={s.item}>
            <View style={s.itemArte}><SvgXml xml={preview} width="100%" height="100%" /></View>
            <Text style={s.itemNome}>{item.nome}</Text>
            <Text style={s.legenda}>{item.preco === 0 ? 'Grátis' : `${item.preco} talentos`}{item.nivel > 1 ? `, nível ${item.nivel}` : ''}</Text>
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
  );
}

function Ajustes({ onApagar }: { onApagar: () => void }) {
  const [confirmar, setConfirmar] = useState(false);
  return (
    <View style={s.ajustes}>
      <Text style={s.legenda}>Por enquanto seus dados ficam só neste aparelho. Login e sincronização entre celular e computador vêm na próxima versão.</Text>
      <Pressable onPress={() => (confirmar ? onApagar() : setConfirmar(true))} accessibilityRole="button">
        <Text style={[s.link, confirmar && { color: C.pink }]}>{confirmar ? 'Toque de novo para apagar tudo (não dá para desfazer)' : 'Apagar meus dados'}</Text>
      </Pressable>
    </View>
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

function CriarPersonagem({ onCriar }: { onCriar: (p: Perfil) => void }) {
  const [nome, setNome] = useState('');
  const [look, setLook] = useState<Look>({ pele: PELES[2], cabelo: 'curto', corCabelo: CORES_CABELO[0], moletom: 'pink' });
  const largo = useWindowDimensions().width >= 760;
  const xml = useMemo(() => pessoaSvg(look, { forma: 50, humor: 'radiante' }), [look]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.ameixa }} contentContainerStyle={s.onb}>
      <StatusBar style="light" />
      <SvgXml xml={ICONE} width={64} height={64} />
      <Text style={s.onbMarca}>Faith Steps</Text>
      <Text style={s.onbLead}>Crie seu personagem. Ele cresce a cada passo de fé que você dá na vida real.</Text>
      <View style={[s.onbGrade, largo && { flexDirection: 'row', alignItems: 'center' }]}>
        <View style={s.onbPreview}><SvgXml xml={xml} width="100%" height="100%" /></View>
        <View style={{ flex: 1, gap: 20, minWidth: 260 }}>
          <Campo rotulo="Nome do personagem">
            <TextInput value={nome} onChangeText={setNome} placeholder="Ex.: Davi" placeholderTextColor="#B38FB8" style={s.input} maxLength={20} accessibilityLabel="Nome do personagem" />
          </Campo>
          <Campo rotulo="Tom de pele">
            <View style={s.chips}>{PELES.map(p => <Bolinha key={p} cor={p} ativo={look.pele === p} rotulo="Tom de pele" onPress={() => setLook({ ...look, pele: p })} />)}</View>
          </Campo>
          <Campo rotulo="Cabelo">
            <View style={s.chips}>
              {CABELOS_LISTA.map(c => (
                <Pressable key={c.id} onPress={() => setLook({ ...look, cabelo: c.id })} style={[s.chip, look.cabelo === c.id && s.chipAtivo]} accessibilityRole="button" accessibilityState={{ selected: look.cabelo === c.id }}>
                  <Text style={[s.chipTexto, look.cabelo === c.id && { color: C.ameixa }]}>{c.nome}</Text>
                </Pressable>
              ))}
            </View>
          </Campo>
          <Campo rotulo="Cor do cabelo">
            <View style={s.chips}>{CORES_CABELO.map(c => <Bolinha key={c} cor={c} ativo={look.corCabelo === c} rotulo="Cor do cabelo" onPress={() => setLook({ ...look, corCabelo: c })} />)}</View>
          </Campo>
          <Botao texto="Começar" onPress={() => onCriar({ nome: nome.trim() || 'Peregrino', criadoEm: Date.now(), look })} />
        </View>
      </View>
    </ScrollView>
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

const Botao = ({ texto, onPress }: { texto: string; onPress: () => void }) => (
  <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [s.botao, pressed && { opacity: 0.85 }]}>
    <Text style={s.botaoTexto}>{texto}</Text>
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
  marca: { fontFamily: F.titulo, fontSize: 34, color: C.lima, lineHeight: 34 },
  marcaSub: { fontFamily: F.medio, fontSize: 14, color: C.suave },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, flexGrow: 1, justifyContent: 'center' },
  stat: { backgroundColor: C.noite, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10, minWidth: 104, gap: 2 },
  statRotulo: { fontFamily: F.medio, fontSize: 12, color: C.suave },
  statValor: { fontFamily: F.subtitulo, fontSize: 24, color: '#fff', lineHeight: 26 },
  statDetalhe: { fontFamily: F.texto, fontSize: 11, color: C.suave },
  trilhoMini: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden', marginVertical: 4, minWidth: 120 },
  preenchMini: { height: 6, backgroundColor: C.lima, borderRadius: 3 },

  tresColunas: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  lateral: { width: 320, gap: 16 },
  centro: { flex: 1 },

  cartao: { backgroundColor: C.card, borderRadius: 28, padding: 20, gap: 14, borderWidth: 1, borderColor: C.linha },
  cartaoTitulo: { fontFamily: F.titulo, fontSize: 30, color: '#fff', lineHeight: 30 },

  quarto: { width: '100%', aspectRatio: 4 / 3, borderRadius: 32, overflow: 'hidden', backgroundColor: C.noite, borderWidth: 6, borderColor: C.nevoa },
  personagemNoQuarto: { position: 'absolute', left: '35.5%', top: '27%', width: '29%', aspectRatio: 200 / 330 },
  cama: { position: 'absolute', left: '30%', top: '22%', width: '40%', aspectRatio: 200 / 330 },
  balao: { position: 'absolute', left: '56%', top: '14%', backgroundColor: C.nevoa, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, maxWidth: '36%' },
  balaoTexto: { fontFamily: F.forte, fontSize: 13, color: C.noite },
  objeto: { position: 'absolute', borderRadius: 12, alignItems: 'center', justifyContent: 'flex-start' },
  objetoAtivo: { backgroundColor: 'rgba(138,255,0,0.14)', borderWidth: 2, borderColor: C.lima },
  objetoRotulo: { position: 'absolute', top: -30, backgroundColor: C.lima, color: C.ameixa, fontFamily: F.forte, fontSize: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },
  dica: { position: 'absolute', bottom: 10, alignSelf: 'center', fontFamily: F.medio, fontSize: 12, color: C.suave, backgroundColor: 'rgba(42,10,49,0.7)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },

  barraTopo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  barraNome: { fontFamily: F.forte, fontSize: 15, color: '#fff' },
  barraValor: { fontFamily: F.forte, fontSize: 15, color: C.suave },
  trilho: { height: 12, borderRadius: 6, backgroundColor: C.noite, overflow: 'hidden' },
  preench: { height: 12, borderRadius: 6 },
  legenda: { fontFamily: F.texto, fontSize: 13, color: C.suave, lineHeight: 19 },

  missao: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.noite, borderRadius: 16, padding: 12 },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: C.suave, alignItems: 'center', justifyContent: 'center' },
  checkFeito: { backgroundColor: C.lima, borderColor: C.lima },
  checkMarca: { color: C.ameixa, fontFamily: F.forte, fontSize: 15 },
  missaoTexto: { fontFamily: F.forte, fontSize: 15, color: '#fff' },

  ofensivaLinha: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  ofensivaNumero: { fontFamily: F.titulo, fontSize: 72, color: C.lima, lineHeight: 72 },
  ofensivaRotulo: { fontFamily: F.subtitulo, fontSize: 22, color: '#fff' },
  mes: { fontFamily: F.subtitulo, fontSize: 20, color: '#fff', textTransform: 'capitalize', marginBottom: 8 },
  calendario: { flexDirection: 'row', flexWrap: 'wrap' },
  calCabeca: { width: `${100 / 7}%`, textAlign: 'center', fontFamily: F.medio, fontSize: 11, color: C.suave, marginBottom: 4 },
  calCelula: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  calDia: { width: '82%', height: '82%', borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  calAtivo: { backgroundColor: C.lima },
  calHoje: { borderWidth: 2, borderColor: C.pink },
  calTexto: { fontFamily: F.medio, fontSize: 12, color: '#fff' },
  conquista: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  selo: { width: 14, height: 14, borderRadius: 7, backgroundColor: C.noite, borderWidth: 2, borderColor: C.lima },
  conquistaNome: { fontFamily: F.forte, fontSize: 14, color: '#fff' },

  lojaGrade: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  item: { width: 160, flexGrow: 1, maxWidth: 220, backgroundColor: C.noite, borderRadius: 22, padding: 12, gap: 6 },
  itemArte: { width: '100%', aspectRatio: 1, borderRadius: 16, backgroundColor: C.rosa, overflow: 'hidden' },
  itemNome: { fontFamily: F.forte, fontSize: 14, color: '#fff' },
  itemBotao: { marginTop: 4, borderRadius: 999, paddingVertical: 10, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  itemBotaoTexto: { fontFamily: F.forte, fontSize: 13, color: C.suave, textAlign: 'center' },

  ajustes: { alignItems: 'center', gap: 10, paddingVertical: 16 },
  link: { fontFamily: F.forte, fontSize: 14, color: C.suave, textDecorationLine: 'underline', textAlign: 'center' },

  fundoModal: { flex: 1, backgroundColor: 'rgba(20,4,24,0.78)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  folha: { width: '100%', maxWidth: 560, backgroundColor: C.card, borderRadius: 32, padding: 24, gap: 16, borderWidth: 1, borderColor: C.linha },
  folhaTitulo: { fontFamily: F.titulo, fontSize: 40, color: '#fff', lineHeight: 40 },
  gradeAtiv: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  ativ: { width: '48%', flexGrow: 1, backgroundColor: C.noite, borderRadius: 18, padding: 14, gap: 4 },
  ativNome: { fontFamily: F.forte, fontSize: 15, color: '#fff' },
  ativInfo: { fontFamily: F.texto, fontSize: 12, color: C.suave },
  ativHoje: { fontFamily: F.forte, fontSize: 11, color: C.lima },
  pergunta: { fontFamily: F.subtitulo, fontSize: 22, color: '#fff' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { borderRadius: 999, borderWidth: 2, borderColor: C.rosa, paddingHorizontal: 18, paddingVertical: 10 },
  chipAtivo: { backgroundColor: C.lima, borderColor: C.lima },
  chipTexto: { fontFamily: F.forte, fontSize: 14, color: '#fff' },
  ganho: { fontFamily: F.titulo, fontSize: 32, color: C.lima, textAlign: 'center' },
  destaque: { fontFamily: F.forte, fontSize: 15, color: C.lima, textAlign: 'center' },

  botao: { backgroundColor: C.pink, borderRadius: 999, paddingHorizontal: 26, paddingVertical: 14, alignItems: 'center' },
  botaoTexto: { fontFamily: F.subtitulo, fontSize: 20, color: '#fff', letterSpacing: 0.3 },

  aviso: { backgroundColor: C.noite, borderRadius: 22, padding: 16, gap: 12, borderWidth: 2, borderColor: C.pink },
  avisoTexto: { fontFamily: F.medio, fontSize: 15, color: '#fff' },

  onb: { width: '100%', maxWidth: 980, alignSelf: 'center', padding: 24, paddingTop: 48, gap: 12 },
  onbMarca: { fontFamily: F.titulo, fontSize: 96, color: C.lima, lineHeight: 92, marginTop: 8 },
  onbLead: { fontFamily: F.medio, fontSize: 20, color: '#fff', maxWidth: 520, lineHeight: 28 },
  onbGrade: { gap: 24, marginTop: 24 },
  onbPreview: { width: 240, aspectRatio: 200 / 330, alignSelf: 'center' },
  campoRotulo: { fontFamily: F.forte, fontSize: 14, color: C.suave },
  input: { backgroundColor: C.noite, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, color: '#fff', fontFamily: F.medio, fontSize: 16, borderWidth: 1, borderColor: C.linha },
  bolinha: { width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: 'transparent' },
  bolinhaAtiva: { borderColor: C.lima },
});
