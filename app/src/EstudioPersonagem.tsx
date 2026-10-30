import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  CORES_CABELO,
  CORES_OLHOS,
  CORES_ROUPA,
  CORES_ROUPA_LISTA,
  NARIZES,
  OLHOS_LISTA,
  PELES,
  ROSTOS,
  SOBRANCELHAS,
  cabelosPara,
  type Baixo,
  type Calcado,
  type Corpo,
  type Look,
  type Topo,
} from './personagem';
import { LOJA, possui, servePara, type Estado, type Item } from './jogo';
import Vitrine3D from './Vitrine3D';

const TELA_CHEIA = { matchContents: true };

export type CategoriaEstudio = 'cabelo' | 'rosto' | 'cima' | 'baixo' | 'calcado' | 'fantasia';
export type OcasiaoEstudio = 'dia' | 'culto' | 'treino' | 'dormir' | 'fantasia' | 'piscina';

type Props = {
  aberto: boolean;
  look: Look;
  forma?: number;
  estado?: Estado;
  itens?: string[];
  talentos?: number;
  nivel?: number;
  modoCriacao?: boolean;
  nomeInicial?: string;
  categoriaInicial?: CategoriaEstudio;
  buscando?: boolean;
  onComprar?: (id: string) => void;
  onSalvar: (look: Look, nome?: string) => void;
  onFechar: () => void;
  onEntrar?: () => void;
};

// Ícone do Plumbob clássico do The Sims
function PlumbobSvg({ tamanho = 32 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho * 1.3} viewBox="0 0 32 42" fill="none">
      <defs>
        <linearGradient id="plumbobTopo" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A6FF54" />
          <stop offset="50%" stopColor="#55E627" />
          <stop offset="100%" stopColor="#2BB812" />
        </linearGradient>
        <linearGradient id="plumbobBase" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#30C215" />
          <stop offset="100%" stopColor="#1B7A09" />
        </linearGradient>
        <filter id="plumbobGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#57E329" floodOpacity="0.65" />
        </filter>
      </defs>
      <g filter="url(#plumbobGlow)">
        <polygon points="16,2 30,19 16,25 2,19" fill="url(#plumbobTopo)" stroke="#D8FF9E" strokeWidth="0.8" />
        <polygon points="16,25 30,19 16,40 2,19" fill="url(#plumbobBase)" stroke="#1B7A09" strokeWidth="0.8" />
        <line x1="16" y1="2" x2="16" y2="40" stroke="#FFFFFF" strokeWidth="0.9" opacity="0.75" />
      </g>
    </svg>
  );
}

// Estrela dourada de destaque dos itens no The Sims
function EstrelaSims() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="gradEstrela" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF275" />
          <stop offset="50%" stopColor="#FFCA28" />
          <stop offset="100%" stopColor="#F57F17" />
        </linearGradient>
      </defs>
      <path
        d="M12 2l2.9 6.2 6.8.9-5 4.8 1.2 6.8-5.9-3.2-5.9 3.2 1.2-6.8-5-4.8 6.8-.9z"
        fill="url(#gradEstrela)"
        stroke="#FFFFFF"
        strokeWidth="1.2"
      />
    </svg>
  );
}

export default function EstudioPersonagem({
  aberto,
  look,
  forma: formaInicial = 50,
  estado,
  itens = [],
  talentos = 0,
  nivel = 1,
  modoCriacao = false,
  nomeInicial = '',
  categoriaInicial = 'cima',
  buscando = false,
  onComprar,
  onSalvar,
  onFechar,
}: Props) {
  const { width } = useWindowDimensions();
  const telaLarga = width >= 860;
  const telaMedia = width >= 640;

  const [cat, setCat] = useState<CategoriaEstudio>(categoriaInicial);
  const [ocasiao, setOcasiao] = useState<OcasiaoEstudio>('dia');
  const [rascunho, setRascunho] = useState<Look>(look);
  const [nome, setNome] = useState(nomeInicial || (modoCriacao ? 'Peregrino da Fé' : ''));
  const [forma, setForma] = useState(formaInicial);
  const [zoom, setZoom] = useState<'rosto' | 'busto' | 'corpo'>('corpo');
  const [giroOffset, setGiroOffset] = useState(0);
  const [filtroGenero, setFiltroGenero] = useState<Corpo | 'todos'>(rascunho.corpo ?? 'masculino');
  const [mensagemAviso, setMensagemAviso] = useState<string | null>(null);

  const fem = rascunho.corpo === 'feminino';

  const mudar = (p: Partial<Look>) => setRascunho(ant => ({ ...ant, ...p }));

  const girar = (dir: 1 | -1) => {
    setGiroOffset(g => g + dir * (Math.PI / 4));
  };

  const temItem = (id: string) => {
    if (modoCriacao) return true;
    const it = LOJA.find(i => i.id === id);
    if (!it) return true;
    if (it.preco === 0) return true;
    if (itens.includes(id)) return true;
    if (estado && possui(estado, it)) return true;
    return false;
  };

  // Avisa brevemente o jogador
  const avisar = (txt: string) => {
    setMensagemAviso(txt);
    setTimeout(() => setMensagemAviso(null), 3500);
  };

  // Compra direta pela tela de aparência
  const tentarComprar = (item: Item) => {
    if (temItem(item.id)) {
      // Já possui: apenas veste
      if (item.tipo === 'fantasia') {
        mudar({ fantasia: item.id });
      } else if (item.peca) {
        mudar({ fantasia: undefined, [item.peca]: item.id } as Partial<Look>);
      }
      avisar(`${item.nome} equipado! ⭐`);
      return;
    }

    const saldo = estado?.talentos ?? talentos;
    if (saldo < item.preco) {
      avisar(`Talentos insuficientes! Você tem 🪙 ${saldo} e o item custa 🪙 ${item.preco}.`);
      return;
    }

    if (item.nivel > (estado?.nivel ?? nivel)) {
      avisar(`Disponível a partir do Nível ${item.nivel}!`);
      return;
    }

    // Chama a compra
    onComprar?.(item.id);

    // Veste no rascunho imediatamente
    if (item.tipo === 'fantasia') {
      mudar({ fantasia: item.id });
    } else if (item.peca) {
      mudar({ fantasia: undefined, [item.peca]: item.id } as Partial<Look>);
    }
    avisar(`${item.nome} comprado e equipado com sucesso! 🎉`);
  };

  // Aleatorizar look no clássico "Dados" do The Sims
  const aleatorizar = () => {
    const corpos: Corpo[] = ['feminino', 'masculino'];
    const corpoSorteado = modoCriacao ? corpos[Math.floor(Math.random() * corpos.length)] : (rascunho.corpo ?? 'masculino');
    const cabelosDisponiveis = cabelosPara(corpoSorteado);
    const cabeloSorteado = cabelosDisponiveis[Math.floor(Math.random() * cabelosDisponiveis.length)].id;
    const peleSorteada = PELES[Math.floor(Math.random() * PELES.length)];
    const corCabSorteada = CORES_CABELO[Math.floor(Math.random() * CORES_CABELO.length)];
    const rostos = ROSTOS.map(r => r[0]);
    const olhos = OLHOS_LISTA.map(o => o[0]);
    const toposValidos = (['moletom', 'camiseta', 'jaqueta', 'polo'] as Topo[]).filter(temItem);
    const baixosValidos = (['calca', 'bermuda'] as Baixo[]).filter(temItem);
    const calcadosValidos = (['tenis', 'botinha', 'chinelo'] as Calcado[]).filter(temItem);
    const coresChaves = CORES_ROUPA_LISTA.map(c => c[0]);

    setRascunho({
      corpo: corpoSorteado,
      pele: peleSorteada,
      cabelo: cabeloSorteado,
      corCabelo: corCabSorteada,
      rosto: rostos[Math.floor(Math.random() * rostos.length)],
      olhos: olhos[Math.floor(Math.random() * olhos.length)],
      corOlhos: CORES_OLHOS[Math.floor(Math.random() * CORES_OLHOS.length)],
      sobrancelha: corpoSorteado === 'feminino' ? 'arqueada' : 'grossa',
      nariz: 'pequeno',
      barba: corpoSorteado === 'masculino' && Math.random() > 0.6 ? 'curta' : 'nenhuma',
      oculos: Math.random() > 0.7,
      sardas: Math.random() > 0.8,
      topo: toposValidos[Math.floor(Math.random() * toposValidos.length)] ?? 'moletom',
      corTopo: coresChaves[Math.floor(Math.random() * coresChaves.length)],
      baixo: baixosValidos[Math.floor(Math.random() * baixosValidos.length)] ?? 'calca',
      corBaixo: coresChaves[Math.floor(Math.random() * coresChaves.length)],
      calcado: calcadosValidos[Math.floor(Math.random() * calcadosValidos.length)] ?? 'tenis',
      corCalcado: coresChaves[Math.floor(Math.random() * coresChaves.length)],
      moletom: 'pink',
      fantasia: undefined,
    });
  };

  // Alternar gênero do corpo
  const trocarCorpo = (corpo: Corpo) => {
    const cabelos = cabelosPara(corpo);
    const serve = (id: string | undefined, padrao: string) => {
      const item = LOJA.find(i => i.id === id);
      return item && servePara(item, corpo) ? id : padrao;
    };
    mudar({
      corpo,
      cabelo: cabelos.some(c => c.id === rascunho.cabelo) ? rascunho.cabelo : cabelos[0].id,
      barba: corpo === 'feminino' ? 'nenhuma' : rascunho.barba,
      topo: serve(rascunho.topo, 'moletom') as Topo,
      baixo: serve(rascunho.baixo, 'calca') as Baixo,
      calcado: serve(rascunho.calcado, 'tenis') as Calcado,
      fantasia: undefined,
    });
    setFiltroGenero(corpo);
  };

  // Categorias em arco concêntrico (ao lado do Sim)
  const categorias: { id: CategoriaEstudio; nome: string; icone: string; sub: string }[] = [
    { id: 'cabelo', nome: 'Cabelo', icone: '💇', sub: 'Penteados e cores' },
    { id: 'rosto', nome: 'Rosto', icone: '👤', sub: 'Pele, olhos e traços' },
    { id: 'cima', nome: 'Parte de Cima', icone: '👕', sub: 'Camisas, moletons e ternos' },
    { id: 'baixo', nome: 'Parte de Baixo', icone: '👖', sub: 'Calças, bermudas e saias' },
    { id: 'calcado', nome: 'Calçados', icone: '👟', sub: 'Tênis, botas e sapatos' },
    { id: 'fantasia', nome: 'Fantasias', icone: '🎭', sub: 'Trajes bíblicos e heróis' },
  ];

  // Abas de ocasião superiores do The Sims 4 (Dia a Dia, Formal, Treino, Dormir, etc.)
  const ocasioes: { id: OcasiaoEstudio; rotulo: string; icone: string }[] = [
    { id: 'dia', rotulo: 'Dia a Dia', icone: '☀️' },
    { id: 'culto', rotulo: 'Culto / Festa', icone: '👔' },
    { id: 'treino', rotulo: 'Treino', icone: '⚽' },
    { id: 'dormir', rotulo: 'Dormir', icone: '🌙' },
    { id: 'fantasia', rotulo: 'Fantasias', icone: '🎭' },
    { id: 'piscina', rotulo: 'Piscina', icone: '🏊‍♂️' },
  ];

  // Filtra itens por categoria e ocasião
  const itensLojaRoupas = LOJA.filter(i => {
    if (cat === 'fantasia') return i.tipo === 'fantasia';
    if (cat === 'cima') return i.tipo === 'roupa' && i.peca === 'topo';
    if (cat === 'baixo') return i.tipo === 'roupa' && i.peca === 'baixo';
    if (cat === 'calcado') return i.tipo === 'roupa' && i.peca === 'calcado';
    return false;
  }).filter(i => {
    if (filtroGenero === 'todos') return true;
    return servePara(i, filtroGenero);
  });

  const saldoTalentos = estado?.talentos ?? talentos;

  return (
    <Modal transparent={false} visible={aberto} animationType="slide" onRequestClose={onFechar}>
      <View style={st.container}>
        {/* BANNER SUPERIOR THE SIMS 4: PLUMBOB + NOME DO SIM + TRAÇOS HEXAGONAIS */}
        <View style={st.topSimsBar}>
          {/* Identidade do Sim */}
          <View style={st.identidadeSim}>
            <View style={st.plumbobWrap}>
              <PlumbobSvg tamanho={28} />
            </View>

            {/* Pill de Nome */}
            <View style={st.nomePill}>
              <Text style={st.lapisIcone}>✏️</Text>
              <TextInput
                value={nome}
                onChangeText={setNome}
                placeholder="Nome do Peregrino"
                placeholderTextColor="rgba(20,40,70,0.5)"
                style={st.nomeInput}
                maxLength={26}
              />
            </View>

            {/* Hexágonos de Traços Espirituais (Estilo The Sims) */}
            <View style={st.hexCluster}>
              <View style={[st.hexCard, st.hexPrincipal]}>
                <Text style={st.hexIcone}>💖</Text>
              </View>
              <View style={st.hexMenores}>
                <View style={st.hexCard}><Text style={st.hexIconeMini}>🕊️</Text></View>
                <View style={st.hexCard}><Text style={st.hexIconeMini}>📖</Text></View>
                <View style={st.hexCard}><Text style={st.hexIconeMini}>🛡️</Text></View>
              </View>
            </View>
          </View>

          {/* Saldo de Talentos & Ações do Cabeçalho */}
          <View style={st.topAcoes}>
            <View style={st.pillTalentos}>
              <Text style={st.pillTalentosTexto}>🪙 {saldoTalentos} Talentos</Text>
            </View>

            <Pressable onPress={aleatorizar} style={st.btnAleatorioSims} accessibilityLabel="Aleatorizar">
              <Text style={st.btnAleatorioTexto}>🎲 Aleatório</Text>
            </Pressable>

            {!modoCriacao && (
              <Pressable onPress={onFechar} style={st.btnFecharSims} accessibilityLabel="Fechar">
                <Text style={st.btnFecharTexto}>✕</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* FEEDBACK DE AVISO FLUTUANTE */}
        {mensagemAviso && (
          <View style={st.toastAviso}>
            <Text style={st.toastTexto}>{mensagemAviso}</Text>
          </View>
        )}

        {/* ÁREA PRINCIPAL: PALCO 3D + ARCO CONCÊNTRICO + PAINEL DE CATÁLOGO */}
        <View style={[st.areaPalco, telaLarga ? st.areaLarga : st.areaCompacta]}>
          {/* SLIDERS LATERAIS DE FORMA FÍSICA & PORTE (ESTILO THE SIMS) */}
          <View style={st.sliderMusculos}>
            <Text style={st.sliderIconeTopo}>🏋️‍♂️</Text>
            <View style={st.sliderTrilho}>
              <View style={[st.sliderPreenchimento, { height: `${forma}%` }]} />
              <View style={[st.sliderThumb, { bottom: `${Math.max(5, Math.min(95, forma))}%` }]} />
            </View>
            <View style={st.sliderBotoes}>
              <Pressable onPress={() => setForma(f => Math.min(100, f + 15))} style={st.btnAjuste}>
                <Text style={st.btnAjusteTexto}>+</Text>
              </Pressable>
              <Pressable onPress={() => setForma(f => Math.max(0, f - 15))} style={st.btnAjuste}>
                <Text style={st.btnAjusteTexto}>-</Text>
              </Pressable>
            </View>
            <Text style={st.sliderIconeBase}>🧍</Text>
          </View>

          {/* PALCO CENTRAL DO PERSONAGEM COM VITRINE 3D */}
          <View style={st.palcoCentro}>
            {/* Sombra de Pedestal do Piso */}
            <View style={st.pedestalSombra} />

            <View style={st.vitrineContainer}>
              <Vitrine3D
                look={rascunho}
                forma={forma}
                humor="normal"
                rosto={zoom === 'rosto'}
                busto={zoom === 'busto'}
                giroOffset={giroOffset}
                dom={TELA_CHEIA}
              />
            </View>

            {/* CONTROLES DE ROTAÇÃO E ENQUADRAMENTO SOBRE O PALCO */}
            <View style={st.palcoBotoes}>
              {/* Botões de Giro 360° */}
              <View style={st.rotacaoBarra}>
                <Pressable onPress={() => girar(-1)} style={st.btnGiroSims}>
                  <Text style={st.btnGiroTexto}>↺</Text>
                </Pressable>
                <Text style={st.rotacaoDica}>Girar 360°</Text>
                <Pressable onPress={() => girar(1)} style={st.btnGiroSims}>
                  <Text style={st.btnGiroTexto}>↻</Text>
                </Pressable>
              </View>

              {/* Botões de Câmera Zoom */}
              <View style={st.cameraPills}>
                <Pressable onPress={() => setZoom('rosto')} style={[st.camPill, zoom === 'rosto' && st.camPillAtivo]}>
                  <Text style={[st.camPillTexto, zoom === 'rosto' && st.camPillTextoAtivo]}>👁️ Rosto</Text>
                </Pressable>
                <Pressable onPress={() => setZoom('busto')} style={[st.camPill, zoom === 'busto' && st.camPillAtivo]}>
                  <Text style={[st.camPillTexto, zoom === 'busto' && st.camPillTextoAtivo]}>👕 Busto</Text>
                </Pressable>
                <Pressable onPress={() => setZoom('corpo')} style={[st.camPill, zoom === 'corpo' && st.camPillAtivo]}>
                  <Text style={[st.camPillTexto, zoom === 'corpo' && st.camPillTextoAtivo]}>🧍 Corpo</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* MENU EM ARCO CONCÊNTRICO THE SIMS (AO LADO DO PERSONAGEM) */}
          <View style={st.arcoCategorias}>
            {categorias.map((c, idx) => {
              const ativo = cat === c.id;
              // Cria uma curvatura suave do arco ao lado da silhueta
              const offsetCurva = Math.sin((idx / (categorias.length - 1)) * Math.PI) * 16;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    setCat(c.id);
                    if (c.id === 'rosto') setZoom('rosto');
                    else if (c.id === 'cabelo') setZoom('rosto');
                    else if (c.id === 'cima') setZoom('busto');
                    else setZoom('corpo');
                  }}
                  style={[
                    st.botaoArco,
                    ativo && st.botaoArcoAtivo,
                    { transform: [{ translateX: -offsetCurva }] },
                  ]}
                  accessibilityLabel={c.nome}
                >
                  <Text style={[st.iconeArco, ativo && st.iconeArcoAtivo]}>{c.icone}</Text>
                  {ativo && <View style={st.haloAtivo} />}
                </Pressable>
              );
            })}
          </View>

          {/* PAINEL DE CATÁLOGO / GUARDA-ROUPA ESTILO THE SIMS 4 À DIREITA */}
          <View style={[st.painelCatalogo, telaLarga ? st.painelLargo : st.painelCompacto]}>
            {/* ABAS DE OCASIÃO DO THE SIMS (DIA A DIA, CULTO, TREINO, ETC.) */}
            <View style={st.ocasiaoBar}>
              {ocasioes.map(o => {
                const sel = ocasiao === o.id;
                return (
                  <Pressable
                    key={o.id}
                    onPress={() => {
                      setOcasiao(o.id);
                      if (o.id === 'fantasia') setCat('fantasia');
                      else if (cat === 'fantasia') setCat('cima');
                    }}
                    style={[st.ocasiaoItem, sel && st.ocasiaoItemAtivo]}
                  >
                    <Text style={st.ocasiaoIcone}>{o.icone}</Text>
                    {sel && <View style={st.ocasiaoIndicador} />}
                  </Pressable>
                );
              })}
            </View>

            {/* CABEÇALHO DA CATEGORIA SELECIONADA */}
            <View style={st.catalogoHeader}>
              <View>
                <Text style={st.catalogoTitulo}>
                  {categorias.find(c => c.id === cat)?.nome.toUpperCase()}
                </Text>
                <Text style={st.catalogoSub}>
                  {categorias.find(c => c.id === cat)?.sub}
                </Text>
              </View>

              {/* Filtro Masculino / Feminino */}
              <View style={st.generoFiltros}>
                <Pressable
                  onPress={() => trocarCorpo('masculino')}
                  style={[st.generoChip, rascunho.corpo === 'masculino' && st.generoChipAtivo]}
                >
                  <Text style={[st.generoTexto, rascunho.corpo === 'masculino' && st.generoTextoAtivo]}>♂ Masc</Text>
                </Pressable>
                <Pressable
                  onPress={() => trocarCorpo('feminino')}
                  style={[st.generoChip, rascunho.corpo === 'feminino' && st.generoChipAtivo]}
                >
                  <Text style={[st.generoTexto, rascunho.corpo === 'feminino' && st.generoTextoAtivo]}>♀ Fem</Text>
                </Pressable>
              </View>
            </View>

            {/* CONTEÚDO DINÂMICO DO CATÁLOGO DE ROUPAS / CABELO / ROSTO */}
            <ScrollView
              style={st.catalogoScroll}
              contentContainerStyle={st.catalogoScrollConteudo}
              showsVerticalScrollIndicator
            >
              {/* 1. SELEÇÃO DE CABELO & BARBA */}
              {cat === 'cabelo' && (
                <View style={st.secaoCatalogo}>
                  <Text style={st.secaoHeaderTexto}>Penteados</Text>
                  <View style={st.gradeCardsSims}>
                    {cabelosPara(rascunho.corpo ?? 'masculino').map(c => {
                      const sel = rascunho.cabelo === c.id;
                      return (
                        <Pressable
                          key={c.id}
                          onPress={() => mudar({ cabelo: c.id })}
                          style={[st.cardSims, sel && st.cardSimsAtivo]}
                        >
                          <View style={st.estrelaBadge}><EstrelaSims /></View>
                          <Text style={st.cardSimsIcone}>💇</Text>
                          <Text style={[st.cardSimsTitulo, sel && st.cardSimsTituloAtivo]}>{c.nome}</Text>
                          {sel && <Text style={st.cardStatusEmUso}>✓ Em uso</Text>}
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={[st.secaoHeaderTexto, { marginTop: 18 }]}>Cor do Cabelo</Text>
                  <View style={st.paletaCores}>
                    {CORES_CABELO.map(cor => (
                      <Pressable
                        key={cor}
                        onPress={() => mudar({ corCabelo: cor })}
                        style={[st.chipCor, { backgroundColor: cor }, rascunho.corCabelo === cor && st.chipCorAtivo]}
                      />
                    ))}
                  </View>

                  {!fem && (
                    <>
                      <Text style={[st.secaoHeaderTexto, { marginTop: 18 }]}>Barba & Cavanhaque</Text>
                      <View style={st.gradeCardsSims}>
                        {[
                          ['nenhuma', 'Sem Barba', '🧔‍♂️'],
                          ['curta', 'Barba Curta', '🧔'],
                          ['cheia', 'Barba Cheia', '🧔‍♂️'],
                        ].map(([id, nomeB, ic]) => {
                          const sel = (rascunho.barba ?? 'nenhuma') === id;
                          return (
                            <Pressable
                              key={id}
                              onPress={() => mudar({ barba: id as any })}
                              style={[st.cardSims, sel && st.cardSimsAtivo]}
                            >
                              <Text style={st.cardSimsIcone}>{ic}</Text>
                              <Text style={[st.cardSimsTitulo, sel && st.cardSimsTituloAtivo]}>{nomeB}</Text>
                              {sel && <Text style={st.cardStatusEmUso}>✓ Em uso</Text>}
                            </Pressable>
                          );
                        })}
                      </View>
                    </>
                  )}
                </View>
              )}

              {/* 2. ROSTO & EXPRESSÃO */}
              {cat === 'rosto' && (
                <View style={st.secaoCatalogo}>
                  <Text style={st.secaoHeaderTexto}>Tom de Pele</Text>
                  <View style={st.paletaCores}>
                    {PELES.map(p => (
                      <Pressable
                        key={p}
                        onPress={() => mudar({ pele: p })}
                        style={[st.chipCor, { backgroundColor: p }, rascunho.pele === p && st.chipCorAtivo]}
                      />
                    ))}
                  </View>

                  <Text style={[st.secaoHeaderTexto, { marginTop: 18 }]}>Formato do Rosto</Text>
                  <View style={st.gradeCardsSims}>
                    {ROSTOS.map(([id, nomeR]) => {
                      const sel = (rascunho.rosto ?? 'oval') === id;
                      return (
                        <Pressable key={id} onPress={() => mudar({ rosto: id })} style={[st.cardSims, sel && st.cardSimsAtivo]}>
                          <Text style={st.cardSimsIcone}>👤</Text>
                          <Text style={[st.cardSimsTitulo, sel && st.cardSimsTituloAtivo]}>{nomeR}</Text>
                          {sel && <Text style={st.cardStatusEmUso}>✓ Em uso</Text>}
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={[st.secaoHeaderTexto, { marginTop: 18 }]}>Estilo dos Olhos</Text>
                  <View style={st.gradeCardsSims}>
                    {OLHOS_LISTA.map(([id, nomeO]) => {
                      const sel = (rascunho.olhos ?? 'pontinho') === id;
                      return (
                        <Pressable key={id} onPress={() => mudar({ olhos: id })} style={[st.cardSims, sel && st.cardSimsAtivo]}>
                          <Text style={st.cardSimsIcone}>👁️</Text>
                          <Text style={[st.cardSimsTitulo, sel && st.cardSimsTituloAtivo]}>{nomeO}</Text>
                          {sel && <Text style={st.cardStatusEmUso}>✓ Em uso</Text>}
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={[st.secaoHeaderTexto, { marginTop: 18 }]}>Cor da Íris</Text>
                  <View style={st.paletaCores}>
                    {CORES_OLHOS.map(c => (
                      <Pressable
                        key={c}
                        onPress={() => mudar({ corOlhos: c })}
                        style={[st.chipCor, { backgroundColor: c }, (rascunho.corOlhos ?? CORES_OLHOS[0]) === c && st.chipCorAtivo]}
                      />
                    ))}
                  </View>

                  <Text style={[st.secaoHeaderTexto, { marginTop: 18 }]}>Acessórios & Detalhes</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Pressable
                      onPress={() => mudar({ oculos: !rascunho.oculos })}
                      style={[st.cardSims, { flex: 1 }, rascunho.oculos && st.cardSimsAtivo]}
                    >
                      <Text style={st.cardSimsIcone}>👓</Text>
                      <Text style={[st.cardSimsTitulo, rascunho.oculos && st.cardSimsTituloAtivo]}>Óculos de Grau</Text>
                      <Text style={st.cardStatusEmUso}>{rascunho.oculos ? '✓ Ativado' : 'Desativado'}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => mudar({ sardas: !rascunho.sardas })}
                      style={[st.cardSims, { flex: 1 }, rascunho.sardas && st.cardSimsAtivo]}
                    >
                      <Text style={st.cardSimsIcone}>✨</Text>
                      <Text style={[st.cardSimsTitulo, rascunho.sardas && st.cardSimsTituloAtivo]}>Sardas</Text>
                      <Text style={st.cardStatusEmUso}>{rascunho.sardas ? '✓ Ativado' : 'Desativado'}</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* 3, 4, 5. PARTE DE CIMA, PARTE DE BAIXO E CALÇADOS COM COMPRA E ARQUIVO */}
              {(cat === 'cima' || cat === 'baixo' || cat === 'calcado') && (
                <View style={st.secaoCatalogo}>
                  <Text style={st.secaoHeaderTexto}>Catálogo de Roupas Disponíveis</Text>
                  <View style={st.gradeCardsSims}>
                    {itensLojaRoupas.map(item => {
                      const possuido = temItem(item.id);
                      const emUso =
                        !rascunho.fantasia &&
                        ((cat === 'cima' && (rascunho.topo ?? 'moletom') === item.id) ||
                          (cat === 'baixo' && (rascunho.baixo ?? 'calca') === item.id) ||
                          (cat === 'calcado' && (rascunho.calcado ?? 'tenis') === item.id));

                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => tentarComprar(item)}
                          style={[st.cardSims, emUso && st.cardSimsAtivo]}
                        >
                          {/* Estrela dourada no canto superior esquerdo como no The Sims 4 */}
                          <View style={st.estrelaBadge}><EstrelaSims /></View>

                          <Text style={st.cardSimsIcone}>
                            {cat === 'cima' ? '👕' : cat === 'baixo' ? '👖' : '👟'}
                          </Text>

                          <Text style={[st.cardSimsTitulo, emUso && st.cardSimsTituloAtivo]} numberOfLines={2}>
                            {item.nome}
                          </Text>

                          {/* Status de posse ou preço na loja */}
                          {emUso ? (
                            <View style={st.tagEmUso}><Text style={st.tagEmUsoTexto}>✓ Em uso</Text></View>
                          ) : possuido ? (
                            <View style={st.tagAdquirido}><Text style={st.tagAdquiridoTexto}>⭐ No armário</Text></View>
                          ) : (
                            <View style={st.tagPreco}>
                              <Text style={st.tagPrecoTexto}>🪙 {item.preco}</Text>
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Paleta de Cores da Peça */}
                  <Text style={[st.secaoHeaderTexto, { marginTop: 20 }]}>
                    Paleta de Cores {cat === 'cima' ? 'da Blusa' : cat === 'baixo' ? 'da Calça' : 'do Calçado'}
                  </Text>
                  <View style={st.paletaCores}>
                    {CORES_ROUPA_LISTA.map(([id, nomeC]) => {
                      const corHex = CORES_ROUPA[id][1];
                      const selCor =
                        (cat === 'cima' && (rascunho.corTopo ?? rascunho.moletom) === id) ||
                        (cat === 'baixo' && (rascunho.corBaixo ?? 'ameixa') === id) ||
                        (cat === 'calcado' && (rascunho.corCalcado ?? 'ameixa') === id);

                      return (
                        <Pressable
                          key={id}
                          onPress={() => {
                            if (cat === 'cima') mudar({ fantasia: undefined, corTopo: id, moletom: id as any });
                            else if (cat === 'baixo') mudar({ fantasia: undefined, corBaixo: id });
                            else mudar({ fantasia: undefined, corCalcado: id });
                          }}
                          style={[st.chipCor, { backgroundColor: corHex }, selCor && st.chipCorAtivo]}
                          accessibilityLabel={nomeC}
                        />
                      );
                    })}
                  </View>
                </View>
              )}

              {/* 6. FANTASIAS BÍBLICAS & ESPECIAIS */}
              {cat === 'fantasia' && (
                <View style={st.secaoCatalogo}>
                  <Text style={st.secaoHeaderTexto}>Fantasias Bíblicas & Temáticas</Text>
                  <Text style={st.subInfo}>
                    As fantasias vestem o personagem por completo com túnica, armadura, adereços e coroas.
                  </Text>

                  {/* Opção de Tirar Fantasia */}
                  <Pressable
                    onPress={() => mudar({ fantasia: undefined })}
                    style={[st.cardSims, !rascunho.fantasia && st.cardSimsAtivo, { marginBottom: 14 }]}
                  >
                    <Text style={st.cardSimsIcone}>🧍</Text>
                    <Text style={st.cardSimsTitulo}>Roupa Normal do Dia a Dia</Text>
                    {!rascunho.fantasia && <Text style={st.cardStatusEmUso}>✓ Em uso</Text>}
                  </Pressable>

                  <View style={st.gradeCardsSims}>
                    {itensLojaRoupas.map(item => {
                      const possuido = temItem(item.id);
                      const emUso = rascunho.fantasia === item.id;

                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => tentarComprar(item)}
                          style={[st.cardSims, emUso && st.cardSimsAtivo]}
                        >
                          <View style={st.estrelaBadge}><EstrelaSims /></View>
                          <Text style={st.cardSimsIcone}>🎭</Text>
                          <Text style={[st.cardSimsTitulo, emUso && st.cardSimsTituloAtivo]} numberOfLines={2}>
                            {item.nome}
                          </Text>

                          {emUso ? (
                            <View style={st.tagEmUso}><Text style={st.tagEmUsoTexto}>✓ Em uso</Text></View>
                          ) : possuido ? (
                            <View style={st.tagAdquirido}><Text style={st.tagAdquiridoTexto}>⭐ Adquirida</Text></View>
                          ) : (
                            <View style={st.tagPreco}>
                              <Text style={st.tagPrecoTexto}>🪙 {item.preco}</Text>
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* BOTÃO CONFIRMAR E SALVAR ESTILO THE SIMS (CIRCULAR VERDE LIME NO CANTO) */}
            <View style={st.barraInferiorAcoes}>
              {!modoCriacao && (
                <Pressable onPress={onFechar} style={st.btnCancelarSims}>
                  <Text style={st.btnCancelarTexto}>✕ Cancelar</Text>
                </Pressable>
              )}

              <Pressable
                onPress={() => onSalvar(rascunho, nome)}
                style={st.btnConfirmarGrande}
                disabled={buscando}
                accessibilityRole="button"
              >
                <Text style={st.confirmarIcone}>✓</Text>
                <Text style={st.confirmarTexto}>{modoCriacao ? 'Criar Peregrino' : 'Confirmar Look'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E6FA8',
    overflow: 'hidden',
  },

  /* HEADER TOP THE SIMS */
  topSimsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    zIndex: 10,
  },
  identidadeSim: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  plumbobWrap: {
    width: 36,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nomePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    boxShadow: '0 4px 14px rgba(0, 30, 60, 0.25)',
  },
  lapisIcone: {
    fontSize: 14,
  },
  nomeInput: {
    fontFamily: 'Archivo_700Bold',
    fontSize: 16,
    color: '#163B5C',
    minWidth: 140,
    maxWidth: 220,
    padding: 0,
  },
  hexCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 6,
  },
  hexCard: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }],
    borderWidth: 1.5,
    borderColor: '#72C2EC',
  },
  hexPrincipal: {
    width: 40,
    height: 40,
    backgroundColor: '#FFE57F',
    borderColor: '#FFA000',
  },
  hexMenores: {
    flexDirection: 'row',
    gap: 6,
  },
  hexIcone: {
    fontSize: 18,
    transform: [{ rotate: '-45deg' }],
  },
  hexIconeMini: {
    fontSize: 13,
    transform: [{ rotate: '-45deg' }],
  },
  topAcoes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pillTalentos: {
    backgroundColor: 'rgba(20, 50, 80, 0.65)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  pillTalentosTexto: {
    fontFamily: 'Archivo_700Bold',
    color: '#FFE082',
    fontSize: 14,
  },
  btnAleatorioSims: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    boxShadow: '0 4px 12px rgba(0, 20, 40, 0.2)',
  },
  btnAleatorioTexto: {
    fontFamily: 'Archivo_700Bold',
    color: '#1A5A8A',
    fontSize: 14,
  },
  btnFecharSims: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnFecharTexto: {
    fontSize: 16,
    color: '#37474F',
    fontFamily: 'Archivo_700Bold',
  },

  /* FEEDBACK FLUTUANTE */
  toastAviso: {
    position: 'absolute',
    top: 76,
    alignSelf: 'center',
    backgroundColor: '#263238',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    zIndex: 100,
    boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
    borderWidth: 1.5,
    borderColor: '#57E329',
  },
  toastTexto: {
    fontFamily: 'Archivo_700Bold',
    color: '#FFFFFF',
    fontSize: 14,
  },

  /* ÁREA PRINCIPAL */
  areaPalco: {
    flex: 1,
    flexDirection: 'row',
    position: 'relative',
  },
  areaLarga: {
    flexDirection: 'row',
  },
  areaCompacta: {
    flexDirection: 'column',
  },

  /* SLIDERS DE FÍSICO DO SIM */
  sliderMusculos: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 16,
    zIndex: 5,
  },
  sliderIconeTopo: {
    fontSize: 20,
    marginBottom: 8,
  },
  sliderIconeBase: {
    fontSize: 20,
    marginTop: 8,
  },
  sliderTrilho: {
    width: 8,
    height: 180,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    position: 'relative',
    overflow: 'visible',
  },
  sliderPreenchimento: {
    width: 8,
    backgroundColor: '#57E329',
    borderRadius: 4,
    position: 'absolute',
    bottom: 0,
  },
  sliderThumb: {
    position: 'absolute',
    left: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 0 10px rgba(87, 227, 41, 0.9)',
    borderWidth: 3,
    borderColor: '#57E329',
  },
  sliderBotoes: {
    gap: 4,
    marginTop: 8,
  },
  btnAjuste: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnAjusteTexto: {
    fontFamily: 'Archivo_700Bold',
    fontSize: 15,
    color: '#164268',
  },

  /* PALCO 3D CENTRAL */
  palcoCentro: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pedestalSombra: {
    position: 'absolute',
    bottom: 40,
    width: 260,
    height: 70,
    borderRadius: 130,
    backgroundColor: 'rgba(5, 25, 45, 0.35)',
    transform: [{ scaleY: 0.35 }],
  },
  vitrineContainer: {
    width: '100%',
    height: '100%',
  },
  palcoBotoes: {
    position: 'absolute',
    bottom: 16,
    alignItems: 'center',
    gap: 10,
    zIndex: 10,
  },
  rotacaoBarra: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 40, 70, 0.65)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 12,
  },
  btnGiroSims: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGiroTexto: {
    fontFamily: 'Archivo_700Bold',
    fontSize: 18,
    color: '#144672',
  },
  rotacaoDica: {
    fontFamily: 'Archivo_600SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  cameraPills: {
    flexDirection: 'row',
    gap: 8,
  },
  camPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  camPillAtivo: {
    backgroundColor: '#57E329',
    boxShadow: '0 0 12px rgba(87, 227, 41, 0.75)',
  },
  camPillTexto: {
    fontFamily: 'Archivo_700Bold',
    fontSize: 12,
    color: '#164268',
  },
  camPillTextoAtivo: {
    color: '#0D3812',
  },

  /* ARCO CONCÊNTRICO THE SIMS 4 */
  arcoCategorias: {
    width: 64,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    zIndex: 15,
  },
  botaoArco: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 14px rgba(0, 20, 45, 0.28)',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    position: 'relative',
  },
  botaoArcoAtivo: {
    backgroundColor: '#57E329',
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.18 }],
    boxShadow: '0 0 18px rgba(87, 227, 41, 0.95)',
  },
  iconeArco: {
    fontSize: 22,
  },
  iconeArcoAtivo: {
    transform: [{ scale: 1.1 }],
  },
  haloAtivo: {
    position: 'absolute',
    inset: -6,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#57E329',
    opacity: 0.7,
  },

  /* PAINEL DE CATÁLOGO À DIREITA */
  painelCatalogo: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderTopLeftRadius: 28,
    borderBottomLeftRadius: 28,
    padding: 18,
    boxShadow: '-8px 0 30px rgba(5, 25, 55, 0.3)',
    display: 'flex',
    flexDirection: 'column',
  },
  painelLargo: {
    width: 420,
  },
  painelCompacto: {
    width: '100%',
    maxHeight: '52%',
    borderTopRightRadius: 28,
  },

  /* ABAS DE OCASIÃO DO SIMS */
  ocasiaoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 12,
  },
  ocasiaoItem: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 12,
    position: 'relative',
  },
  ocasiaoItemAtivo: {
    backgroundColor: '#E8F5E9',
  },
  ocasiaoIcone: {
    fontSize: 22,
  },
  ocasiaoIndicador: {
    position: 'absolute',
    bottom: -4,
    width: 18,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#57E329',
  },

  /* CABEÇALHO DO CATÁLOGO */
  catalogoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  catalogoTitulo: {
    fontFamily: 'BarlowCondensed_900Black',
    fontSize: 22,
    color: '#0F2C46',
    letterSpacing: 0.8,
  },
  catalogoSub: {
    fontFamily: 'Archivo_400Regular',
    fontSize: 12,
    color: '#607D8B',
  },
  generoFiltros: {
    flexDirection: 'row',
    backgroundColor: '#EDF2F7',
    borderRadius: 999,
    padding: 3,
  },
  generoChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  generoChipAtivo: {
    backgroundColor: '#1E6FA8',
  },
  generoTexto: {
    fontFamily: 'Archivo_700Bold',
    fontSize: 11,
    color: '#607D8B',
  },
  generoTextoAtivo: {
    color: '#FFFFFF',
  },

  /* SCROLL DE ITENS DO CATÁLOGO */
  catalogoScroll: {
    flex: 1,
  },
  catalogoScrollConteudo: {
    paddingBottom: 24,
  },
  secaoCatalogo: {
    gap: 10,
  },
  secaoHeaderTexto: {
    fontFamily: 'Archivo_700Bold',
    fontSize: 14,
    color: '#263238',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subInfo: {
    fontFamily: 'Archivo_400Regular',
    fontSize: 12,
    color: '#546E7A',
    marginBottom: 8,
  },

  /* GRADE DE CARDS ESTILO THE SIMS 4 */
  gradeCardsSims: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cardSims: {
    width: '47.5%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    position: 'relative',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    minHeight: 115,
  },
  cardSimsAtivo: {
    borderColor: '#57E329',
    backgroundColor: '#F0FDF4',
    boxShadow: '0 0 14px rgba(87, 227, 41, 0.45)',
  },
  estrelaBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
  },
  cardSimsIcone: {
    fontSize: 34,
    marginBottom: 6,
    marginTop: 4,
  },
  cardSimsTitulo: {
    fontFamily: 'Archivo_700Bold',
    fontSize: 13,
    color: '#334155',
    textAlign: 'center',
  },
  cardSimsTituloAtivo: {
    color: '#14532D',
  },
  tagEmUso: {
    backgroundColor: '#57E329',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginTop: 6,
  },
  tagEmUsoTexto: {
    fontFamily: 'Archivo_700Bold',
    fontSize: 10,
    color: '#064E3B',
  },
  tagAdquirido: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginTop: 6,
  },
  tagAdquiridoTexto: {
    fontFamily: 'Archivo_700Bold',
    fontSize: 10,
    color: '#0369A1',
  },
  tagPreco: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginTop: 6,
  },
  tagPrecoTexto: {
    fontFamily: 'Archivo_700Bold',
    fontSize: 11,
    color: '#B45309',
  },
  cardStatusEmUso: {
    fontFamily: 'Archivo_700Bold',
    fontSize: 11,
    color: '#15803D',
    marginTop: 4,
  },

  /* PALETA DE CORES */
  paletaCores: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 14,
  },
  chipCor: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
  },
  chipCorAtivo: {
    borderColor: '#57E329',
    transform: [{ scale: 1.25 }],
    boxShadow: '0 0 10px rgba(87, 227, 41, 0.9)',
  },

  /* BARRA INFERIOR DE CONFIRMAÇÃO */
  barraInferiorAcoes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  btnCancelarSims: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
  },
  btnCancelarTexto: {
    fontFamily: 'Archivo_700Bold',
    fontSize: 13,
    color: '#64748B',
  },
  btnConfirmarGrande: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#57E329',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
    gap: 8,
    boxShadow: '0 4px 16px rgba(87, 227, 41, 0.55)',
  },
  confirmarIcone: {
    fontSize: 18,
    color: '#064E3B',
    fontFamily: 'Archivo_700Bold',
  },
  confirmarTexto: {
    fontFamily: 'Archivo_700Bold',
    fontSize: 15,
    color: '#064E3B',
  },
});
