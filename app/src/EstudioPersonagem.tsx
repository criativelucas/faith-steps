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

type Props = {
  aberto: boolean;
  look: Look;
  forma?: number;
  estado?: Estado;
  modoCriacao?: boolean;
  nomeInicial?: string;
  categoriaInicial?: CategoriaEstudio;
  buscando?: boolean;
  onSalvar: (look: Look, nome?: string) => void;
  onFechar: () => void;
  onEntrar?: () => void;
};

export default function EstudioPersonagem({
  aberto,
  look,
  forma = 50,
  estado,
  modoCriacao = false,
  nomeInicial = '',
  categoriaInicial = 'cima',
  buscando = false,
  onSalvar,
  onFechar,
  onEntrar,
}: Props) {
  const { width } = useWindowDimensions();
  const telaLarga = width >= 820;

  const [cat, setCat] = useState<CategoriaEstudio>(categoriaInicial);
  const [rascunho, setRascunho] = useState<Look>(look);
  const [nome, setNome] = useState(nomeInicial);
  const [zoom, setZoom] = useState<'rosto' | 'busto' | 'corpo'>('corpo');
  const [giroOffset, setGiroOffset] = useState(0);

  const fem = rascunho.corpo === 'feminino';

  const mudar = (p: Partial<Look>) => setRascunho(ant => ({ ...ant, ...p }));

  const girar = (dir: 1 | -1) => {
    setGiroOffset(g => g + dir * (Math.PI / 4));
  };

  const temRoupa = (id: string) => {
    if (modoCriacao || !estado) return true;
    const item = LOJA.find(i => i.id === id);
    return !!item && possui(estado, item) && servePara(item, rascunho.corpo);
  };

  const fantasias = LOJA.filter(
    i => i.tipo === 'fantasia' && (modoCriacao || (estado && possui(estado, i))) && servePara(i, rascunho.corpo)
  );
  const comFantasia = !!rascunho.fantasia;

  // Aleatorizar look no estilo "Dados" do The Sims
  const aleatorizar = () => {
    const corpos: Corpo[] = ['feminino', 'masculino'];
    const corpoSorteado = modoCriacao ? corpos[Math.floor(Math.random() * corpos.length)] : (rascunho.corpo ?? 'masculino');
    const cabelosDisponiveis = cabelosPara(corpoSorteado);
    const cabeloSorteado = cabelosDisponiveis[Math.floor(Math.random() * cabelosDisponiveis.length)].id;
    const peleSorteada = PELES[Math.floor(Math.random() * PELES.length)];
    const corCabSorteada = CORES_CABELO[Math.floor(Math.random() * CORES_CABELO.length)];
    const rostos = ROSTOS.map(r => r[0]);
    const olhos = OLHOS_LISTA.map(o => o[0]);
    const coresOlhos = CORES_OLHOS;
    const toposValidos = (['moletom', 'camiseta', 'jaqueta', 'polo'] as Topo[]).filter(temRoupa);
    const baixosValidos = (['calca', 'bermuda'] as Baixo[]).filter(temRoupa);
    const calcadosValidos = (['tenis', 'botinha', 'chinelo'] as Calcado[]).filter(temRoupa);
    const coresChaves = CORES_ROUPA_LISTA.map(c => c[0]);

    setRascunho({
      corpo: corpoSorteado,
      pele: peleSorteada,
      cabelo: cabeloSorteado,
      corCabelo: corCabSorteada,
      rosto: rostos[Math.floor(Math.random() * rostos.length)],
      olhos: olhos[Math.floor(Math.random() * olhos.length)],
      corOlhos: coresOlhos[Math.floor(Math.random() * coresOlhos.length)],
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
  };

  const categorias: { id: CategoriaEstudio; nome: string; icone: string }[] = [
    { id: 'cabelo', nome: 'Cabelo', icone: '💇' },
    { id: 'rosto', nome: 'Rosto', icone: '👤' },
    { id: 'cima', nome: 'Parte de Cima', icone: '👕' },
    { id: 'baixo', nome: 'Parte de Baixo', icone: '👖' },
    { id: 'calcado', nome: 'Calçados', icone: '👟' },
    { id: 'fantasia', nome: 'Fantasias', icone: '🎭' },
  ];

  return (
    <Modal transparent={false} visible={aberto} animationType="slide" onRequestClose={onFechar}>
      <View style={st.container}>
        {/* BARRA SUPERIOR (HEADER ESTILO THE SIMS) */}
        <View style={st.header}>
          <View style={st.headerInfo}>
            <Text style={st.headerIcone}>{modoCriacao ? '✨' : '🪞'}</Text>
            <View>
              <Text style={st.headerTitulo}>{modoCriacao ? 'Criar Personagem' : 'Guarda-Roupa & Estilo'}</Text>
              <Text style={st.headerSub}>Personalize seu peregrino com roupas e traços de fé</Text>
            </View>
          </View>

          <View style={st.headerAcoes}>
            <Pressable onPress={aleatorizar} style={st.btnAleatorio} accessibilityLabel="Aleatorizar estilo">
              <Text style={st.btnAleatorioTexto}>🎲 Aleatório</Text>
            </Pressable>

            <Pressable
              onPress={() => onSalvar(rascunho, nome)}
              style={st.btnSalvar}
              disabled={buscando}
              accessibilityRole="button"
            >
              <Text style={st.btnSalvarTexto}>{modoCriacao ? 'Começar' : 'Salvar Look'}</Text>
            </Pressable>

            {!modoCriacao && (
              <Pressable onPress={onFechar} style={st.btnFechar} accessibilityLabel="Fechar">
                <Text style={st.btnFecharTexto}>✕</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* ÁREA PRINCIPAL: PALCO 3D + PAINEL DE CUSTOMIZAÇÃO */}
        <View style={[st.corpo, telaLarga ? st.corpoLargo : st.corpoCompacto]}>
          {/* PALCO 3D DO PERSONAGEM */}
          <View style={[st.palco, telaLarga ? st.palcoLargo : st.palcoCompacto]}>
            <View style={st.vitrineBox}>
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

            {/* CONTROLES FLUTUANTES SOBRE O PALCO (ROTAÇÃO E ZOOM) */}
            <View style={st.controlesPalco}>
              {/* Controles de Rotação 360° */}
              <View style={st.linhaRotacao}>
                <Pressable onPress={() => girar(-1)} style={st.btnGiro} accessibilityLabel="Girar para a esquerda">
                  <Text style={st.btnGiroTexto}>↶</Text>
                </Pressable>
                <Text style={st.dicaGiro}>Arraste ou gire</Text>
                <Pressable onPress={() => girar(1)} style={st.btnGiro} accessibilityLabel="Girar para a direita">
                  <Text style={st.btnGiroTexto}>↷</Text>
                </Pressable>
              </View>

              {/* Botões de Enquadramento da Câmera (Zoom Rosto / Busto / Corpo) */}
              <View style={st.linhaZoom}>
                <Pressable
                  onPress={() => setZoom('rosto')}
                  style={[st.btnZoom, zoom === 'rosto' && st.btnZoomAtivo]}
                >
                  <Text style={[st.btnZoomTexto, zoom === 'rosto' && st.btnZoomTextoAtivo]}>👁️ Rosto</Text>
                </Pressable>
                <Pressable
                  onPress={() => setZoom('busto')}
                  style={[st.btnZoom, zoom === 'busto' && st.btnZoomAtivo]}
                >
                  <Text style={[st.btnZoomTexto, zoom === 'busto' && st.btnZoomTextoAtivo]}>👕 Busto</Text>
                </Pressable>
                <Pressable
                  onPress={() => setZoom('corpo')}
                  style={[st.btnZoom, zoom === 'corpo' && st.btnZoomAtivo]}
                >
                  <Text style={[st.btnZoomTexto, zoom === 'corpo' && st.btnZoomTextoAtivo]}>🧍 Corpo</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* PAINEL DE CATEGORIAS E ITENS (LADO DIREITO OU ABAIXO) */}
          <View style={[st.painel, telaLarga ? st.painelLargo : st.painelCompacto]}>
            {/* BARRA DE NAVEGAÇÃO DE CATEGORIAS (ÍCONES FLUTUANTES) */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.catBarra}>
              {categorias.map(c => {
                const ativa = cat === c.id;
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
                    style={[st.catBotao, ativa && st.catBotaoAtivo]}
                  >
                    <Text style={st.catIcone}>{c.icone}</Text>
                    <Text style={[st.catNome, ativa && st.catNomeAtivo]}>{c.nome}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* CONTEÚDO DA CATEGORIA SELECIONADA */}
            <ScrollView style={st.rolagemConteudo} contentContainerStyle={st.conteudoInterno}>
              {modoCriacao && (
                <View style={st.secao}>
                  <Text style={st.secaoTitulo}>Nome do Personagem</Text>
                  <TextInput
                    value={nome}
                    onChangeText={setNome}
                    placeholder="Ex.: Davi, Ester, Sara..."
                    placeholderTextColor="#99A2B0"
                    maxLength={20}
                    style={st.inputNome}
                  />
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                    <Pressable
                      onPress={() => trocarCorpo('feminino')}
                      style={[st.btnSexo, fem && st.btnSexoAtivo]}
                    >
                      <Text style={[st.btnSexoTexto, fem && st.btnSexoTextoAtivo]}>👩 Feminino</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => trocarCorpo('masculino')}
                      style={[st.btnSexo, !fem && st.btnSexoAtivo]}
                    >
                      <Text style={[st.btnSexoTexto, !fem && st.btnSexoTextoAtivo]}>👨 Masculino</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* 1. CABELO & BARBA */}
              {cat === 'cabelo' && (
                <View style={st.secao}>
                  <Text style={st.secaoTitulo}>Corte de Cabelo</Text>
                  <View style={st.gradeCards}>
                    {cabelosPara(fem ? 'feminino' : 'masculino').map(c => {
                      const sel = rascunho.cabelo === c.id;
                      return (
                        <Pressable
                          key={c.id}
                          onPress={() => mudar({ cabelo: c.id })}
                          style={[st.cardItem, sel && st.cardItemAtivo]}
                        >
                          <Text style={st.cardIcone}>💇</Text>
                          <Text style={[st.cardTexto, sel && st.cardTextoAtivo]}>{c.nome}</Text>
                          {sel && <Text style={st.cardBadge}>✓ Em uso</Text>}
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={[st.secaoTitulo, { marginTop: 16 }]}>Cor do Cabelo</Text>
                  <View style={st.chipsCores}>
                    {CORES_CABELO.map(c => (
                      <Pressable
                        key={c}
                        onPress={() => mudar({ corCabelo: c })}
                        style={[st.bolinhaCor, { backgroundColor: c }, rascunho.corCabelo === c && st.bolinhaAtiva]}
                      />
                    ))}
                  </View>

                  {!fem && (
                    <>
                      <Text style={[st.secaoTitulo, { marginTop: 16 }]}>Estilo da Barba</Text>
                      <View style={st.gradeCards}>
                        {[
                          ['nenhuma', 'Sem barba', '🙂'],
                          ['curta', 'Barba curta', '🧔'],
                          ['cheia', 'Barba cheia', '🧔‍♂️'],
                        ].map(([id, nomeB, ic]) => {
                          const sel = (rascunho.barba ?? 'nenhuma') === id;
                          return (
                            <Pressable
                              key={id}
                              onPress={() => mudar({ barba: id as any })}
                              style={[st.cardItem, sel && st.cardItemAtivo]}
                            >
                              <Text style={st.cardIcone}>{ic}</Text>
                              <Text style={[st.cardTexto, sel && st.cardTextoAtivo]}>{nomeB}</Text>
                              {sel && <Text style={st.cardBadge}>✓ Em uso</Text>}
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
                <View style={st.secao}>
                  <Text style={st.secaoTitulo}>Tom de Pele</Text>
                  <View style={st.chipsCores}>
                    {PELES.map(p => (
                      <Pressable
                        key={p}
                        onPress={() => mudar({ pele: p })}
                        style={[st.bolinhaCor, { backgroundColor: p }, rascunho.pele === p && st.bolinhaAtiva]}
                      />
                    ))}
                  </View>

                  <Text style={[st.secaoTitulo, { marginTop: 16 }]}>Formato do Rosto</Text>
                  <View style={st.gradeCards}>
                    {ROSTOS.map(([id, nomeR]) => {
                      const sel = (rascunho.rosto ?? 'oval') === id;
                      return (
                        <Pressable
                          key={id}
                          onPress={() => mudar({ rosto: id })}
                          style={[st.cardItem, sel && st.cardItemAtivo]}
                        >
                          <Text style={st.cardIcone}>👤</Text>
                          <Text style={[st.cardTexto, sel && st.cardTextoAtivo]}>{nomeR}</Text>
                          {sel && <Text style={st.cardBadge}>✓ Em uso</Text>}
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={[st.secaoTitulo, { marginTop: 16 }]}>Estilo dos Olhos</Text>
                  <View style={st.gradeCards}>
                    {OLHOS_LISTA.map(([id, nomeO]) => {
                      const sel = (rascunho.olhos ?? 'pontinho') === id;
                      return (
                        <Pressable
                          key={id}
                          onPress={() => mudar({ olhos: id })}
                          style={[st.cardItem, sel && st.cardItemAtivo]}
                        >
                          <Text style={st.cardIcone}>👁️</Text>
                          <Text style={[st.cardTexto, sel && st.cardTextoAtivo]}>{nomeO}</Text>
                          {sel && <Text style={st.cardBadge}>✓ Em uso</Text>}
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={[st.secaoTitulo, { marginTop: 16 }]}>Cor da Íris</Text>
                  <View style={st.chipsCores}>
                    {CORES_OLHOS.map(c => (
                      <Pressable
                        key={c}
                        onPress={() => mudar({ corOlhos: c })}
                        style={[st.bolinhaCor, { backgroundColor: c }, (rascunho.corOlhos ?? CORES_OLHOS[0]) === c && st.bolinhaAtiva]}
                      />
                    ))}
                  </View>

                  <Text style={[st.secaoTitulo, { marginTop: 16 }]}>Sobrancelhas & Nariz</Text>
                  <View style={st.gradeCards}>
                    {SOBRANCELHAS.map(([id, nomeS]) => {
                      const sel = (rascunho.sobrancelha ?? 'grossa') === id;
                      return (
                        <Pressable
                          key={id}
                          onPress={() => mudar({ sobrancelha: id })}
                          style={[st.cardItem, sel && st.cardItemAtivo]}
                        >
                          <Text style={st.cardIcone}>〰️</Text>
                          <Text style={[st.cardTexto, sel && st.cardTextoAtivo]}>Sobrancelha {nomeS}</Text>
                        </Pressable>
                      );
                    })}
                    {NARIZES.map(([id, nomeN]) => {
                      const sel = (rascunho.nariz ?? 'pequeno') === id;
                      return (
                        <Pressable
                          key={id}
                          onPress={() => mudar({ nariz: id })}
                          style={[st.cardItem, sel && st.cardItemAtivo]}
                        >
                          <Text style={st.cardIcone}>👃</Text>
                          <Text style={[st.cardTexto, sel && st.cardTextoAtivo]}>Nariz {nomeN}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={[st.secaoTitulo, { marginTop: 16 }]}>Acessórios do Rosto</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Pressable
                      onPress={() => mudar({ oculos: !rascunho.oculos })}
                      style={[st.cardItem, { flex: 1 }, rascunho.oculos && st.cardItemAtivo]}
                    >
                      <Text style={st.cardIcone}>👓</Text>
                      <Text style={[st.cardTexto, rascunho.oculos && st.cardTextoAtivo]}>Óculos de Grau</Text>
                      <Text style={st.cardBadge}>{rascunho.oculos ? '✓ Ativado' : 'Desativado'}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => mudar({ sardas: !rascunho.sardas })}
                      style={[st.cardItem, { flex: 1 }, rascunho.sardas && st.cardItemAtivo]}
                    >
                      <Text style={st.cardIcone}>✨</Text>
                      <Text style={[st.cardTexto, rascunho.sardas && st.cardTextoAtivo]}>Sardas</Text>
                      <Text style={st.cardBadge}>{rascunho.sardas ? '✓ Ativado' : 'Desativado'}</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* 3. PARTE DE CIMA */}
              {cat === 'cima' && (
                <View style={st.secao}>
                  <Text style={st.secaoTitulo}>Modelos da Parte de Cima</Text>
                  <View style={st.gradeCards}>
                    {[
                      ['moletom', 'Moletom Acolhedor', '🧥'],
                      ['camiseta', 'Camiseta Básica', '👕'],
                      ['jaqueta', 'Jaqueta Casual', '🧥'],
                      ['camisa', 'Camisa Social Culto', '👔'],
                      ['polo', 'Camisa Polo', '👕'],
                      ['regata', 'Regata Esportiva', '🎽'],
                      ['blazer', 'Terno / Blazer', '🤵'],
                      ['blusa', 'Blusa Elegante', '👚'],
                      ['vestido', 'Vestido', '👗'],
                      ['vestidoLongo', 'Vestido Longo de Culto', '👗'],
                    ]
                      .filter(([id]) => temRoupa(id))
                      .map(([id, nomeT, ic]) => {
                        const sel = !comFantasia && (rascunho.topo ?? 'moletom') === id;
                        return (
                          <Pressable
                            key={id}
                            onPress={() => mudar({ fantasia: undefined, topo: id as any })}
                            style={[st.cardItem, sel && st.cardItemAtivo]}
                          >
                            <Text style={st.cardIcone}>{ic}</Text>
                            <Text style={[st.cardTexto, sel && st.cardTextoAtivo]}>{nomeT}</Text>
                            {sel && <Text style={st.cardBadge}>✓ Em uso</Text>}
                          </Pressable>
                        );
                      })}
                  </View>

                  <Text style={[st.secaoTitulo, { marginTop: 16 }]}>Paleta de Cor da Roupa</Text>
                  <View style={st.chipsCores}>
                    {CORES_ROUPA_LISTA.map(([id, nomeC]) => {
                      const corHex = CORES_ROUPA[id][1];
                      const sel = (rascunho.corTopo ?? rascunho.moletom) === id;
                      return (
                        <Pressable
                          key={id}
                          onPress={() => mudar({ fantasia: undefined, corTopo: id })}
                          style={[st.bolinhaCor, { backgroundColor: corHex }, sel && st.bolinhaAtiva]}
                          accessibilityLabel={nomeC}
                        />
                      );
                    })}
                  </View>
                </View>
              )}

              {/* 4. PARTE DE BAIXO */}
              {cat === 'baixo' && (
                <View style={st.secao}>
                  <Text style={st.secaoTitulo}>Modelos da Parte de Baixo</Text>
                  <View style={st.gradeCards}>
                    {[
                      ['calca', 'Calça Jeans / Casual', '👖'],
                      ['calcaSocial', 'Calça Social', '👖'],
                      ['bermuda', 'Bermuda', '🩳'],
                      ['saia', 'Saia Elegante', '👗'],
                      ['saiaLonga', 'Saia Longa', '👗'],
                    ]
                      .filter(([id]) => temRoupa(id))
                      .map(([id, nomeB, ic]) => {
                        const sel = !comFantasia && (rascunho.baixo ?? 'calca') === id;
                        return (
                          <Pressable
                            key={id}
                            onPress={() => mudar({ fantasia: undefined, baixo: id as any })}
                            style={[st.cardItem, sel && st.cardItemAtivo]}
                          >
                            <Text style={st.cardIcone}>{ic}</Text>
                            <Text style={[st.cardTexto, sel && st.cardTextoAtivo]}>{nomeB}</Text>
                            {sel && <Text style={st.cardBadge}>✓ Em uso</Text>}
                          </Pressable>
                        );
                      })}
                  </View>

                  <Text style={[st.secaoTitulo, { marginTop: 16 }]}>Cor da Parte de Baixo</Text>
                  <View style={st.chipsCores}>
                    {CORES_ROUPA_LISTA.map(([id, nomeC]) => {
                      const corHex = CORES_ROUPA[id][1];
                      const sel = (rascunho.corBaixo ?? 'ameixa') === id;
                      return (
                        <Pressable
                          key={id}
                          onPress={() => mudar({ fantasia: undefined, corBaixo: id })}
                          style={[st.bolinhaCor, { backgroundColor: corHex }, sel && st.bolinhaAtiva]}
                          accessibilityLabel={nomeC}
                        />
                      );
                    })}
                  </View>
                </View>
              )}

              {/* 5. CALÇADOS */}
              {cat === 'calcado' && (
                <View style={st.secao}>
                  <Text style={st.secaoTitulo}>Modelos de Calçado</Text>
                  <View style={st.gradeCards}>
                    {[
                      ['tenis', 'Tênis Esportivo', '👟'],
                      ['botinha', 'Botinha de Couro', '👢'],
                      ['chinelo', 'Chinelo Confortável', '🩴'],
                      ['sapato', 'Sapato Social', '👞'],
                      ['sandalia', 'Sandália', '👡'],
                      ['sapatilha', 'Sapatilha', '🩰'],
                      ['salto', 'Salto Alto', '👠'],
                    ]
                      .filter(([id]) => temRoupa(id))
                      .map(([id, nomeC, ic]) => {
                        const sel = !comFantasia && (rascunho.calcado ?? 'tenis') === id;
                        return (
                          <Pressable
                            key={id}
                            onPress={() => mudar({ fantasia: undefined, calcado: id as any })}
                            style={[st.cardItem, sel && st.cardItemAtivo]}
                          >
                            <Text style={st.cardIcone}>{ic}</Text>
                            <Text style={[st.cardTexto, sel && st.cardTextoAtivo]}>{nomeC}</Text>
                            {sel && <Text style={st.cardBadge}>✓ Em uso</Text>}
                          </Pressable>
                        );
                      })}
                  </View>

                  <Text style={[st.secaoTitulo, { marginTop: 16 }]}>Cor do Calçado</Text>
                  <View style={st.chipsCores}>
                    {CORES_ROUPA_LISTA.map(([id, nomeC]) => {
                      const corHex = CORES_ROUPA[id][1];
                      const sel = rascunho.corCalcado === id;
                      return (
                        <Pressable
                          key={id}
                          onPress={() => mudar({ fantasia: undefined, corCalcado: id })}
                          style={[st.bolinhaCor, { backgroundColor: corHex }, sel && st.bolinhaAtiva]}
                          accessibilityLabel={nomeC}
                        />
                      );
                    })}
                  </View>
                </View>
              )}

              {/* 6. FANTASIAS COMPLETAS */}
              {cat === 'fantasia' && (
                <View style={st.secao}>
                  <Text style={st.secaoTitulo}>Fantasias Bíblicas & Temáticas</Text>

                  {comFantasia && (
                    <Pressable
                      onPress={() => mudar({ fantasia: undefined })}
                      style={[st.cardItem, { marginBottom: 12, backgroundColor: '#FFF5F5', borderColor: '#FEB2B2' }]}
                    >
                      <Text style={st.cardIcone}>👕</Text>
                      <Text style={[st.cardTexto, { color: '#C53030' }]}>Remover Fantasia (Voltar ao Look Normal)</Text>
                    </Pressable>
                  )}

                  <View style={st.gradeCards}>
                    {fantasias.map(f => {
                      const sel = rascunho.fantasia === f.id;
                      const iconesFantasia: Record<string, string> = {
                        pescador: '🎣',
                        pastor: '🐑',
                        mineiro: '⛏️',
                        pirata: '🏴‍☠️',
                        anjo: '🪽',
                        viking: '🛡️',
                        cavaleiro: '⚔️',
                        robo: '🤖',
                        rei: '👑',
                        ester: '👸',
                      };
                      return (
                        <Pressable
                          key={f.id}
                          onPress={() => mudar({ fantasia: f.id })}
                          style={[st.cardItem, sel && st.cardItemAtivo]}
                        >
                          <Text style={st.cardIcone}>{iconesFantasia[f.id] ?? '🎭'}</Text>
                          <Text style={[st.cardTexto, sel && st.cardTextoAtivo]}>{f.nome}</Text>
                          <Text style={st.cardDescricao}>{f.descricao ?? 'Traje completo temático'}</Text>
                          {sel && <Text style={st.cardBadge}>✓ Em uso</Text>}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              {onEntrar && (
                <Pressable onPress={onEntrar} style={{ marginTop: 20, alignSelf: 'center' }}>
                  <Text style={st.linkEntrar}>Já tenho uma conta: Entrar</Text>
                </Pressable>
              )}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDF5FC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#DCE6F2',
    zIndex: 10,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcone: {
    fontSize: 28,
  },
  headerTitulo: {
    fontFamily: 'Archivo_700Bold',
    fontSize: 20,
    color: '#1E293B',
  },
  headerSub: {
    fontFamily: 'Archivo_400Regular',
    fontSize: 12,
    color: '#64748B',
  },
  headerAcoes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  btnAleatorio: {
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  btnAleatorioTexto: {
    fontFamily: 'Archivo_600SemiBold',
    fontSize: 13,
    color: '#334155',
  },
  btnSalvar: {
    backgroundColor: '#10B981',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 9,
    shadowColor: '#10B981',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  btnSalvarTexto: {
    fontFamily: 'Archivo_700Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  btnFechar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnFecharTexto: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '700',
  },

  corpo: {
    flex: 1,
  },
  corpoLargo: {
    flexDirection: 'row',
  },
  corpoCompacto: {
    flexDirection: 'column',
  },

  palco: {
    backgroundColor: '#D9EEFA',
    position: 'relative',
    overflow: 'hidden',
  },
  palcoLargo: {
    flex: 1.15,
    height: '100%',
  },
  palcoCompacto: {
    height: '44%',
    width: '100%',
  },
  vitrineBox: {
    position: 'absolute',
    inset: 0,
  },
  controlesPalco: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  linhaRotacao: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 24,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    gap: 8,
  },
  btnGiro: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGiroTexto: {
    fontSize: 17,
    color: '#1E293B',
    fontWeight: 'bold',
  },
  dicaGiro: {
    fontFamily: 'Archivo_600SemiBold',
    fontSize: 11,
    color: '#64748B',
  },
  linhaZoom: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 24,
    padding: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  btnZoom: {
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  btnZoomAtivo: {
    backgroundColor: '#2563EB',
  },
  btnZoomTexto: {
    fontFamily: 'Archivo_600SemiBold',
    fontSize: 12,
    color: '#475569',
  },
  btnZoomTextoAtivo: {
    color: '#FFFFFF',
  },

  painel: {
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderLeftColor: '#E2E8F0',
  },
  painelLargo: {
    width: 440,
    height: '100%',
  },
  painelCompacto: {
    flex: 1,
    width: '100%',
  },

  catBarra: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  catBotao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catBotaoAtivo: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  catIcone: {
    fontSize: 15,
  },
  catNome: {
    fontFamily: 'Archivo_600SemiBold',
    fontSize: 13,
    color: '#475569',
  },
  catNomeAtivo: {
    color: '#FFFFFF',
  },

  rolagemConteudo: {
    flex: 1,
  },
  conteudoInterno: {
    padding: 16,
    paddingBottom: 40,
  },
  secao: {
    gap: 8,
  },
  secaoTitulo: {
    fontFamily: 'Archivo_700Bold',
    fontSize: 14,
    color: '#1E293B',
    marginBottom: 4,
  },
  inputNome: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'Archivo_600SemiBold',
    fontSize: 15,
    color: '#1E293B',
  },
  btnSexo: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  btnSexoAtivo: {
    backgroundColor: '#EDE9FE',
    borderColor: '#7C3AED',
  },
  btnSexoTexto: {
    fontFamily: 'Archivo_600SemiBold',
    fontSize: 14,
    color: '#475569',
  },
  btnSexoTextoAtivo: {
    color: '#6D28D9',
  },

  gradeCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cardItem: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  cardItemAtivo: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  cardIcone: {
    fontSize: 22,
  },
  cardTexto: {
    fontFamily: 'Archivo_600SemiBold',
    fontSize: 13,
    color: '#334155',
  },
  cardTextoAtivo: {
    color: '#1D4ED8',
    fontFamily: 'Archivo_700Bold',
  },
  cardDescricao: {
    fontFamily: 'Archivo_400Regular',
    fontSize: 11,
    color: '#64748B',
  },
  cardBadge: {
    fontFamily: 'Archivo_700Bold',
    fontSize: 10,
    color: '#2563EB',
    marginTop: 2,
  },

  chipsCores: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingVertical: 4,
  },
  bolinhaCor: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  bolinhaAtiva: {
    borderColor: '#2563EB',
    transform: [{ scale: 1.2 }],
    borderWidth: 3,
  },

  linkEntrar: {
    fontFamily: 'Archivo_600SemiBold',
    fontSize: 14,
    color: '#2563EB',
    textDecorationLine: 'underline',
  },
});
