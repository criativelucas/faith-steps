import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { desafioDoDia, gratidaoValida, lerDiario, ordemCorreta, type PaginaDiario, type Pratica } from './praticas';

export default function PraticaGuiada({ tipo, perfilId, onConcluir }: { tipo: Pratica; perfilId: string; onConcluir: () => void }) {
  const chave = `faithsteps:caderno:v1:${perfilId}`;
  const [paginas, setPaginas] = useState<PaginaDiario[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState('');
  const [textos, setTextos] = useState(['','','']);
  const [ocupado, setOcupado] = useState(false);
  const [historico, setHistorico] = useState(false);
  const [verso] = useState(() => desafioDoDia());
  const palavras = verso.texto.split(' ');
  const [banco] = useState(() => palavras.map((_,i)=>i).sort((a,b)=>((a*7+3)%palavras.length)-((b*7+3)%palavras.length)).reverse());
  const [ordem, setOrdem] = useState<number[]>([]);
  const [revelado, setRevelado] = useState(false);
  const [estudando, setEstudando] = useState(true);
  const trava = useRef(false);
  useEffect(() => {
    let vivo = true;
    AsyncStorage.getItem(chave).then(raw => { const dados = lerDiario(raw); if (vivo) { setPaginas(dados); setCarregado(true); } }).catch(() => { if(vivo) setErro('Não foi possível abrir o caderno. Feche e tente novamente; seus dados foram preservados.'); });
    return () => { vivo = false; };
  }, [chave]);
  const valido = tipo === 'gratidao' ? gratidaoValida(textos) : tipo === 'intercessao' ? textos[0].trim().length >= 2 && textos[1].trim().length >= 3 : !estudando && !revelado && ordemCorreta(ordem,palavras.length);
  const salvar = async (proximas: PaginaDiario[], concluir: boolean) => {
    if (!carregado || trava.current) return;
    trava.current = true; setOcupado(true); setErro('');
    try { await AsyncStorage.setItem(chave, JSON.stringify(proximas)); setPaginas(proximas); if(concluir) onConcluir(); }
    catch { setErro('Não foi possível salvar. Seu texto continua aqui; tente novamente.'); }
    finally { trava.current = false; setOcupado(false); }
  };
  const concluir = () => {
    if (!valido) return;
    const quando = Date.now();
    const pagina: PaginaDiario = { id: `${quando}-${tipo}`, tipo, quando, textos: tipo === 'memorizacao' ? [verso.referencia,verso.texto] : textos.map(t=>t.trim()).filter(Boolean) };
    void salvar([pagina,...paginas],true);
  };
  const mudarTexto = (i: number, valor: string) => setTextos(t=>t.map((a,n)=>n===i?valor:a));
  return <View style={st.root}>
    <View style={st.tabs}>{[['Praticar',false],['Meu caderno',true]].map(([rotulo,h])=><Pressable key={String(rotulo)} accessibilityRole="button" accessibilityState={{selected:historico===h}} onPress={()=>setHistorico(Boolean(h))} style={[st.tab,historico===h&&st.tabAtiva]}><Text style={st.tabTxt}>{String(rotulo)}</Text></Pressable>)}</View>
    <Text style={st.privacidade}>Seu caderno fica salvo neste aparelho, separado por personagem.</Text>
    {!carregado && !erro && <Text style={st.muted}>Abrindo seu caderno…</Text>}
    {historico ? <View style={st.lista}>
      {paginas.filter(p=>p.tipo===tipo).length===0 && <Text style={st.muted}>Sua primeira página começa com a prática de hoje.</Text>}
      {paginas.filter(p=>p.tipo===tipo).map(p=><View key={p.id} style={st.card}><Text style={st.data}>{new Date(p.quando).toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'})}</Text>{p.textos.map((t,i)=><Text key={i} style={st.texto}>{tipo==='gratidao'?`${i+1}. `:''}{t}</Text>)}{tipo==='intercessao' && <Pressable disabled={ocupado} accessibilityRole="button" onPress={()=>void salvar(paginas.map(x=>x.id===p.id?{...x,respondida:!x.respondida}:x),false)} style={st.secondary}><Text style={st.secondaryTxt}>{p.respondida?'✓ Oração respondida · reabrir':'Marcar como respondida'}</Text></Pressable>}</View>)}
    </View> : <>
      {tipo==='memorizacao' ? <View style={st.card}>
        <Text style={st.kicker}>DESAFIO DO DIA · {verso.referencia}</Text>
        {estudando ? <><Text style={st.verso}>{verso.texto}</Text><Text style={st.muted}>Leia com calma. Depois, monte o versículo colocando as palavras na ordem certa.</Text><Pressable style={st.secondary} onPress={()=>{setRevelado(false);setEstudando(false);}}><Text style={st.secondaryTxt}>Estou pronto para montar</Text></Pressable></> : <>
          <Text style={st.muted}>Toque nas palavras para montar. Toque numa palavra escolhida para retirá-la.</Text>
          <View style={st.resposta}>{ordem.length===0&&<Text style={st.muted}>Seu versículo aparece aqui…</Text>}{ordem.map((n,i)=><Pressable key={n} accessibilityLabel={`Retirar ${palavras[n]}`} onPress={()=>setOrdem(o=>o.filter((_,j)=>j!==i))} style={st.palavraEscolhida}><Text style={st.texto}>{palavras[n]}</Text></Pressable>)}</View>
          <View style={st.banco}>{banco.filter(n=>!ordem.includes(n)).map(n=><Pressable key={n} accessibilityRole="button" accessibilityLabel={`Escolher ${palavras[n]}`} onPress={()=>setOrdem(o=>[...o,n])} style={st.palavra}><Text style={st.texto}>{palavras[n]}</Text></Pressable>)}</View>
          {ordem.length===palavras.length&&<Text accessibilityLiveRegion="polite" style={st.muted}>{valido?'Muito bem! Você completou o versículo.':'Ainda não é essa ordem. Retire uma palavra para tentar de novo.'}</Text>}
          <Pressable style={st.secondary} onPress={()=>{setRevelado(true);setEstudando(true);setOrdem([]);}}><Text style={st.secondaryTxt}>Ler novamente</Text></Pressable>
        </>}
      </View> : <View style={st.card}>
        <Text style={st.kicker}>{tipo==='gratidao'?'TRÊS PEQUENAS BÊNÇÃOS':'UM PEDIDO, UM MOMENTO DE ORAÇÃO'}</Text>
        <Text style={st.muted}>{tipo==='gratidao'?'O que trouxe esperança ao seu dia? Escreva três motivos diferentes.':'Anote por quem deseja orar e o pedido. Reserve um momento de oração antes de concluir.'}</Text>
        {(tipo==='gratidao'?['Primeiro motivo','Segundo motivo','Terceiro motivo']:['Por quem você vai orar?','Pedido de oração']).map((label,i)=><View key={label} style={{gap:7}}><Text style={st.label}>{label}</Text><TextInput accessibilityLabel={label} multiline value={textos[i]} maxLength={600} onChangeText={t=>mudarTexto(i,t)} placeholder={tipo==='gratidao'?'Hoje eu agradeço por…':'Escreva aqui…'} placeholderTextColor="#8aaba9" style={st.input}/></View>)}
      </View>}
      <Pressable accessibilityRole="button" disabled={!valido||!carregado||ocupado} style={[st.primary,(!valido||!carregado||ocupado)&&{opacity:.45}]} onPress={concluir}><Text style={st.primaryTxt}>{ocupado?'Salvando…':tipo==='memorizacao'?'Concluir desafio':tipo==='gratidao'?'Guardar meus três motivos':'Concluir oração e guardar pedido'}</Text></Pressable>
    </>}
    {!!erro&&<Text accessibilityRole="alert" style={st.error}>{erro}</Text>}
  </View>;
}
const st=StyleSheet.create({
  root:{gap:14},tabs:{flexDirection:'row',gap:8},tab:{flex:1,padding:12,borderRadius:20,backgroundColor:'#e6f2f0',alignItems:'center'},tabAtiva:{backgroundColor:'#cdebca'},tabTxt:{color:'#305d58',fontWeight:'600',fontSize:13},privacidade:{fontSize:11,color:'#718a8c',lineHeight:17},lista:{gap:12},card:{backgroundColor:'#f4faf8',borderWidth:1,borderColor:'#d7e9e2',borderRadius:20,padding:20,gap:14},data:{fontSize:11,color:'#64817a'},texto:{fontSize:15,color:'#294c50',lineHeight:23},kicker:{fontSize:10,letterSpacing:1.5,fontWeight:'700',color:'#548574'},muted:{fontSize:13,lineHeight:21,color:'#64817a'},verso:{fontSize:25,lineHeight:36,color:'#244b52',fontWeight:'500'},label:{fontSize:12,fontWeight:'600',color:'#37655c'},input:{minHeight:85,textAlignVertical:'top',backgroundColor:'#fff',borderWidth:1,borderColor:'#c9ded5',borderRadius:12,padding:14,fontSize:15,color:'#294c50'},primary:{padding:17,borderRadius:24,backgroundColor:'#397a67',alignItems:'center'},primaryTxt:{color:'#fff',fontSize:14,fontWeight:'600'},secondary:{padding:11,backgroundColor:'#e1efe9',borderRadius:12,alignItems:'center'},secondaryTxt:{fontSize:12,color:'#3b7260'},error:{color:'#a04242',fontSize:13},resposta:{minHeight:92,flexDirection:'row',flexWrap:'wrap',gap:7,padding:12,borderWidth:1,borderStyle:'dashed',borderColor:'#90b5a3',borderRadius:12},banco:{flexDirection:'row',flexWrap:'wrap',gap:8},palavra:{padding:10,borderRadius:10,backgroundColor:'#fff',borderWidth:1,borderColor:'#c6dad2'},palavraEscolhida:{padding:8,borderRadius:9,backgroundColor:'#dceecb'},
});
