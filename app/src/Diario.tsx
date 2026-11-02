// Diário de oração em forma de caderno de argolas (página da esquerda: dono e anotações; da direita: as páginas).
// As práticas de intercessão, gratidão e memorização moram aqui, fora do menu de registrar.
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PraticaGuiada from './PraticaGuiada';
import Vitrine3D from './Vitrine3D';
import type { Pratica } from './praticas';
import type { Look } from './personagem';

const ABAS: { id: Pratica; nome: string; cor: string }[] = [
  { id: 'intercessao', nome: 'Pedidos', cor: '#2F6FD6' },
  { id: 'gratidao', nome: 'Gratidão', cor: '#E59F1A' },
  { id: 'memorizacao', nome: 'Versículos', cor: '#4FA84A' },
];
const LIMITE_NOTAS = 250;

export default function Diario({ aberto, perfilId, nome, look, forma, abaInicial, onConcluir, onFechar }: {
  aberto: boolean; perfilId: string; nome: string; look: Look; forma: number; abaInicial?: Pratica | null;
  onConcluir: (tipo: Pratica) => void; onFechar: () => void;
}) {
  const { width } = useWindowDimensions();
  const largo = width >= 760;
  const [aba, setAba] = useState<Pratica>(abaInicial ?? 'intercessao');
  const [notas, setNotas] = useState('');
  const [pagina, setPagina] = useState<'dono' | 'paginas'>(abaInicial ? 'paginas' : 'dono');
  const chave = `faithsteps:diario-notas:v1:${perfilId}`;
  useEffect(() => {
    if (!aberto) return;
    setAba(abaInicial ?? 'intercessao');
    setPagina(abaInicial ? 'paginas' : 'dono');
    AsyncStorage.getItem(chave).then(v => setNotas(v ?? '')).catch(() => {});
  }, [aberto, abaInicial, chave]);
  const salvarNotas = (v: string) => { setNotas(v); AsyncStorage.setItem(chave, v).catch(() => {}); };

  const esquerda = (
    <View style={st.pagina}>
      <Text style={st.propriedade}>Propriedade de:</Text>
      <View style={st.dono}>
        <View style={st.retrato}><View pointerEvents="none" style={StyleSheet.absoluteFill}><Vitrine3D busto look={look} forma={forma} humor="normal" dom={{ style: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } }} /></View></View>
        <Text style={st.nome}>{nome}</Text>
      </View>
      <View style={st.notas}>
        <TextInput value={notas} onChangeText={v => salvarNotas(v.slice(0, LIMITE_NOTAS))} multiline maxLength={LIMITE_NOTAS}
          placeholder="As anotações vão aqui..." placeholderTextColor="#B8A68C" style={st.notasTexto} accessibilityLabel="Anotações do diário" />
        <Text style={st.contador}>{notas.length}/{LIMITE_NOTAS}</Text>
      </View>
      {!largo && <Pressable onPress={() => setPagina('paginas')} style={st.virar} accessibilityRole="button"><Text style={st.virarTxt}>Ver páginas →</Text></Pressable>}
    </View>
  );
  const direita = (
    <View style={st.pagina}>
      {!largo && <Pressable onPress={() => setPagina('dono')} accessibilityRole="button"><Text style={st.voltarTxt}>← Capa do diário</Text></Pressable>}
      <Text style={st.tituloPagina}>{ABAS.find(a => a.id === aba)!.nome}</Text>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 8 }}>
        <PraticaGuiada key={`${perfilId}:${aba}:${aberto}`} tipo={aba} perfilId={perfilId} historicoInicial
          vazio={`Não há nenhuma entrada no Diário de ${nome} no momento.`} onConcluir={() => onConcluir(aba)} />
      </ScrollView>
    </View>
  );

  return (
    <Modal transparent visible={aberto} animationType="fade" onRequestClose={onFechar}>
      <View style={st.fundo}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onFechar} accessibilityLabel="Fechar diário" />
        <View style={[st.capa, !largo && { maxWidth: 460 }]}>
          {/* Fitas marcadoras: cada uma abre um tipo de página */}
          <View style={[st.fitas, !largo && st.fitasTopo]}>
            {ABAS.map(a => (
              <Pressable key={a.id} onPress={() => { setAba(a.id); setPagina('paginas'); }} accessibilityRole="tab" accessibilityState={{ selected: aba === a.id }}
                style={[st.fita, !largo && st.fitaTopo, { backgroundColor: a.cor }, aba === a.id && (largo ? { width: 112 } : { paddingBottom: 14 })]}>
                <Text style={st.fitaTxt}>{a.nome}</Text>
              </Pressable>
            ))}
          </View>
          <View style={st.miolo}>
            {largo ? <>{esquerda}<Argolas />{direita}</> : pagina === 'dono' ? esquerda : direita}
          </View>
          <Pressable onPress={onFechar} style={st.fechar} accessibilityRole="button" accessibilityLabel="Fechar diário"><Text style={st.fecharTxt}>✕</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

const Argolas = () => (
  <View style={st.argolas} pointerEvents="none">
    {Array.from({ length: 7 }, (_, i) => <View key={i} style={st.argola} />)}
  </View>
);

const st = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(14,26,48,0.62)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  capa: { width: '100%', maxWidth: 900, height: '86%', maxHeight: 620, backgroundColor: '#6B3F26', borderRadius: 16, padding: 12, borderWidth: 3, borderColor: '#8A5636', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } },
  miolo: { flex: 1, flexDirection: 'row', backgroundColor: '#E9D9BC', borderRadius: 8, overflow: 'hidden' },
  pagina: { flex: 1, backgroundColor: '#F7ECD7', padding: 26, gap: 14, borderColor: '#E0CCA8', borderWidth: 1 },
  propriedade: { fontFamily: 'BarlowCondensed_900Black', fontSize: 28, color: '#1F4E9C', textAlign: 'center', marginTop: 18, letterSpacing: 0.5 },
  dono: { flexDirection: 'row', alignItems: 'center', gap: 14, justifyContent: 'center' },
  retrato: { width: 92, height: 92, borderRadius: 46, overflow: 'hidden', backgroundColor: '#8FD16A', borderWidth: 4, borderColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8 },
  nome: { fontFamily: 'Archivo_700Bold', fontSize: 18, color: '#2B6CC4' },
  notas: { flex: 1, minHeight: 140, backgroundColor: '#F0E2C8', borderRadius: 4, padding: 12, borderWidth: 1, borderColor: '#E3D1B0' },
  notasTexto: { flex: 1, fontFamily: 'Archivo_400Regular', fontSize: 14, lineHeight: 22, color: '#4A3A28', textAlignVertical: 'top' },
  contador: { alignSelf: 'flex-end', fontFamily: 'Archivo_400Regular', fontSize: 11, color: '#B8A68C' },
  tituloPagina: { fontFamily: 'BarlowCondensed_900Black', fontSize: 26, color: '#1F4E9C', textAlign: 'center', marginTop: 8 },
  argolas: { width: 30, marginHorizontal: -15, zIndex: 2, justifyContent: 'space-evenly', alignItems: 'center', paddingVertical: 20 },
  argola: { width: 34, height: 14, borderRadius: 8, borderWidth: 3.5, borderColor: '#A7948A', backgroundColor: 'transparent', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 2 },
  fitas: { position: 'absolute', right: -84, top: 60, gap: 10, zIndex: -1 },
  fitasTopo: { position: 'relative', right: 0, top: 0, flexDirection: 'row', marginBottom: 8, zIndex: 1 },
  fita: { width: 96, paddingVertical: 10, paddingLeft: 26, borderTopRightRadius: 10, borderBottomRightRadius: 10 },
  fitaTopo: { flex: 1, width: undefined, paddingLeft: 0, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  fitaTxt: { fontFamily: 'Archivo_700Bold', fontSize: 12, color: '#FFFFFF' },
  fechar: { position: 'absolute', top: 18, right: 18, width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#2B6CC4', alignItems: 'center', justifyContent: 'center', zIndex: 3 },
  fecharTxt: { fontFamily: 'Archivo_700Bold', fontSize: 14, color: '#2B6CC4' },
  virar: { alignSelf: 'flex-end' }, virarTxt: { fontFamily: 'Archivo_700Bold', fontSize: 14, color: '#2B6CC4' },
  voltarTxt: { fontFamily: 'Archivo_700Bold', fontSize: 13, color: '#2B6CC4' },
});
