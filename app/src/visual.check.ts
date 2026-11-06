import assert from 'node:assert/strict';
import { LOJA, servePara } from './jogo.ts';
import { cabelosPara, type Look } from './personagem.ts';
import { normalizarRoupa, itensDoLook, lookComCorpo, lookComItem, paraOcasiao } from './estudio.ts';
import { avancarTrafego, modeloCarro, RAIO_RODA } from './mundoExterior.ts';
import * as THREE from 'three';
const look: Look = { corpo:'feminino', pele:'#C98B62', cabelo:'longo', corCabelo:'#2A1530', moletom:'pink', topo:'vestidoLongo', baixo:'saia', calcado:'salto', fantasia:'ester' };
const masculino=lookComCorpo(look,'masculino');
assert.equal(masculino.fantasia,undefined);
assert.ok(cabelosPara('masculino').some(c=>c.id===masculino.cabelo));
assert.ok(itensDoLook(masculino).every(i=>servePara(i,'masculino')));
assert.equal(look.fantasia,'ester', 'Preview transformations must not mutate saved looks');
const camiseta=LOJA.find(i=>i.id==='camiseta')!;
assert.equal(lookComItem(look,camiseta).fantasia,undefined);
assert.equal(lookComItem(look,camiseta).topo,'camiseta');
assert.ok(paraOcasiao(camiseta,'treino'));
assert.ok(!paraOcasiao(LOJA.find(i=>i.id==='blazer')!,'piscina'));
assert.deepEqual(itensDoLook(look).map(i=>i.id),['ester']);
for(const dir of [-1,1]) {
  let carros=[{pos:dir===1?48:-36,dir,vel:5.2,z:14.85},{pos:dir===1?-41:53,dir,vel:2,z:14.85}];
  for(let t=0;t<6000;t++) {
    const proximo=avancarTrafego(carros,1/60);
    carros=carros.map((c,i)=>({...c,pos:proximo[i].pos}));
    const gap=((carros[1].pos-carros[0].pos)*dir+96)%96;
    assert.ok(gap>=4.5-1e-6 && gap<=91.5+1e-6, `Overlapping traffic: ${gap}`);
  }
}
for(const modelo of ['sedan','suv','taxi','esporte'] as const) {
  const {grupo,rodas}=modeloCarro('#476b80',modelo);
  assert.equal(rodas.length,4);
  const caixa=new THREE.Box3().setFromObject(grupo);
  assert.ok(Math.abs(caixa.min.y)<1e-6, 'Tires must touch the ground');
  assert.ok(caixa.max.z-caixa.min.z<1.4, 'Car must fit its lane');
  for(const roda of rodas) assert.equal(roda.position.y,RAIO_RODA);
  grupo.traverse(o=>{ if(o instanceof THREE.Mesh) { const pos=o.geometry.getAttribute('position'); assert.ok(Array.from(pos.array).every(Number.isFinite)); o.geometry.dispose(); } });
}
console.log('ok: compatibilidade de roupas, prévias imutáveis, ocasiões, tráfego sem sobreposição e contato dos pneus');

const { lerDiario, gratidaoValida, ordemCorreta, desafioDoDia } = await import('./praticas.ts');
assert.deepEqual(lerDiario(null), []);
assert.throws(() => lerDiario('{broken'));
assert.throws(() => lerDiario('[{"tipo":"unknown"}]'));
assert.equal(gratidaoValida(['Família',' família ','Saúde']), false);
assert.equal(gratidaoValida(['Família','Amigos','Descanso']), true);
assert.equal(ordemCorreta([0,2,1],3), false);
assert.equal(ordemCorreta([0,1,2],3), true);
assert.deepEqual(desafioDoDia(new Date(2026,9,30,0)),desafioDoDia(new Date(2026,9,30,23)));
const pagina={id:'1',tipo:'intercessao',quando:1,textos:['Amigos','Esperança'],respondida:true};
assert.deepEqual(lerDiario(JSON.stringify([pagina])),[pagina]);

const {detectarComodoPorPosicao,validarPosicaoMovel,snapGrid}=await import('./casa.ts');
assert.equal(detectarComodoPorPosicao(-3.8,10.2),'garagem');
assert.equal(detectarComodoPorPosicao(9.5,-2.1),'varanda');
assert.equal(detectarComodoPorPosicao(14.6,10.6),null);
assert.equal(validarPosicaoMovel(2.5,8.6,-1,[]).valido,false);
assert.equal(validarPosicaoMovel(3.05,4.15,-1,[]).valido,false);
assert.equal(snapGrid(1.38,.25),1.5);
const {calcularAmbienteTempo}=await import('./relogio.ts');
for(const [h,m] of [[5,0],[7,30],[12,0],[17,0],[19,12]]) {
 const t=new Date(2026,9,30,h,m).getTime();
 assert.ok(Math.abs(calcularAmbienteTempo(t-1000).luzDirecionalInt-calcularAmbienteTempo(t+1000).luzDirecionalInt)<.01);
}
assert.equal(ordemCorreta([2,1,0],3,['amor','é','amor']),true,'Identical word tiles are interchangeable');
assert.equal(ordemCorreta([0,1,0],3,['amor','é','amor']),false,'A tile cannot be reused');
const {vidaVazia,lerVidaLocal,regarHorta,receberCarta}=await import('./vidaLocal.ts');
let vida=regarHorta(vidaVazia(),'2026-10-30');
assert.equal(regarHorta(vida,'2026-10-30').horta.dias,1);
vida=regarHorta(regarHorta(vida,'2026-10-31'),'2026-11-01');
assert.equal(regarHorta(vida,'2026-11-02').horta.dias,3);
vida=receberCarta(vida,{dia:'2026-10-30',texto:'Deus é amor.',referencia:'1 João 4:8'});
assert.equal(receberCarta(vida,vida.cartas[0]).cartas.length,1);
assert.deepEqual(lerVidaLocal(JSON.stringify(vida)),vida);
assert.throws(()=>lerVidaLocal('{"cartas":[],"horta":{"dias":-1}}'));
const {mobiliaDePerfil}=await import('./casa.ts');
const originalMovido={item:'original:poltrona',x:10.5,z:3.5,giro:Math.PI/2};
assert.deepEqual(mobiliaDePerfil({mobilia:[originalMovido]},[]),[originalMovido], 'Original furniture persists without a store purchase');
assert.deepEqual(mobiliaDePerfil({mobilia:[{...originalMovido,item:'original:inexistente'}]},[]),[], 'Unknown original furniture is rejected');

const {PASSAGENS,abrirPassagens,areaPassagem}=await import('./circulacao.ts');
for(const p of PASSAGENS){
 const horizontal=p.eixo==='x';
 const parede=horizontal?{x0:p.inicio-1,z0:p.fixo,x1:p.fim+1,z1:p.fixo}:{x0:p.fixo,z0:p.inicio-1,x1:p.fixo,z1:p.fim+1};
 const partes=abrirPassagens([parede],[p]);
 assert.equal(partes.length,3,`${p.nome}: portal com duas laterais`);
 assert.equal(partes[1].y0,2.25,`${p.nome}: vão livre para o personagem`);
 assert.deepEqual(abrirPassagens(partes,[p]),partes,'Reabrir passagem não duplica geometria');
 const area=areaPassagem(p);
 assert.ok(area[2]>area[0]&&area[3]>area[1],'Entrada protegida no modo reforma');
}
console.log('Passagens entre casa e expansões verificadas');

const {segmentoBloqueado,animacaoContextual}=await import('./fisica.ts');
const caixaTeste:[number,number,number,number][]=[[1,1,2,2]];
assert.equal(segmentoBloqueado(0,1.5,3,1.5,caixaTeste),true,'Fast motion cannot tunnel through furniture');
assert.equal(segmentoBloqueado(.7,1.5,.8,1.5,caixaTeste),true,'Body clearance applies to short steps');
assert.equal(segmentoBloqueado(0,0,.9,.9,caixaTeste),true,'Corner collision includes the destination');
assert.equal(segmentoBloqueado(0,.7,3,.7,caixaTeste),false,'Clear path beside furniture stays walkable');
assert.equal(segmentoBloqueado(1.5,1.5,1.5,1.5,caixaTeste),true,'Detect actors under moved furniture');
const caixaInvertida:[number,number,number,number][]=[[2,2,1,1]];
assert.equal(segmentoBloqueado(0,1.5,3,1.5,caixaInvertida),true,'Handle inverted bounds');
assert.equal(animacaoContextual('sentado','Pedalando'),'pedalar');
assert.equal(animacaoContextual('mexer','Cuidando da bicicleta de passeio 🚲'),'mexer'); // em pé não pedala
assert.equal(animacaoContextual('sentado','Pedalando na bicicleta 🚲'),'pedalar');
assert.equal(animacaoContextual('sentado','Corpo em movimento','bicicleta'),'pedalar');
assert.equal(animacaoContextual('correr','Fazendo polichinelos'),'exercicio');
assert.equal(animacaoContextual('andar','Correndo na esteira 🏃'),'correr');
assert.equal(animacaoContextual('correr','Correndo na esteira'),'correr');
assert.equal(animacaoContextual('cima','Louvando','microfone'),'cantar');
const {readFileSync}=await import('node:fs');
const glb=readFileSync(new URL('../public/boneco.glb',import.meta.url));
const gltf=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString());
for(const nome of ['correr','pedalar','cantar','sentado','deitado'])assert.ok(gltf.animations.some((a:{name:string})=>a.name===nome),`Modelo exportado contém ${nome}`);
console.log('Colisões contínuas e animações exportadas verificadas');

const { montarItemLoja3D, enquadrarItemLoja3D } = await import('./modelos3DLoja.ts');
for (const item of LOJA.filter(i => i.tipo !== 'roupa' && i.tipo !== 'fantasia')) {
  const g = new THREE.Group();
  montarItemLoja3D(g, item);
  assert.ok(g.children.length > 0, `Item ${item.id} precisa gerar malhas 3D`);
  const enq = enquadrarItemLoja3D(item);
  assert.ok(enq.alvoY >= 0 && enq.meiaAltura > 0, `Item ${item.id} precisa de enquadramento 3D valido`);
}
console.log('Modelos 3D e enquadramento de todos os itens da loja verificados');

const {validarCompra,criarFilaCompra}=await import('./loja.ts');
const produto=LOJA.find(i=>i.preco>0&&i.nivel>1)!;
const comprador={talentos:10000,nivel:99,humor:'normal' as const,itens:[] as string[]};
assert.equal(validarCompra(comprador,produto),null);
assert.equal(validarCompra({...comprador,itens:[produto.id]},produto)?.status,'adquirido');
assert.equal(validarCompra({...comprador,talentos:0},produto)?.status,'bloqueado');
assert.equal(validarCompra({...comprador,nivel:0},produto)?.status,'bloqueado');
assert.equal(validarCompra({...comprador,humor:'adormecido'},produto)?.status,'bloqueado');
const fila=criarFilaCompra();let liberar!:()=>void;let cobrancas=0;
const primeira=fila(async()=>{cobrancas++;await new Promise<void>(r=>{liberar=r;});return {status:'sucesso',mensagem:'ok'};});
assert.equal((await fila(async()=>{cobrancas++;return {status:'sucesso',mensagem:'ok'};})).status,'bloqueado');
liberar();assert.equal((await primeira).status,'sucesso');assert.equal(cobrancas,1);
assert.equal((await fila(async()=>{throw new Error('offline');})).status,'falha');
assert.equal((await fila(async()=>({status:'sucesso',mensagem:'ok'}))).status,'sucesso','Retry works after a failure');
console.log('Loja: elegibilidade, compra duplicada, falha e nova tentativa verificadas');

for(const id of ['cachorro','gato','jejum','evangelismo','cruz','quadroJosue','mapaPaulo','versiculoDia','jardim','varanda','garagem','piscina','academia','estudio']){
 const item=LOJA.find(i=>i.id===id)!;const grupo=new THREE.Group();montarItemLoja3D(grupo,item);
 const bounds=new THREE.Box3().setFromObject(grupo);const centro=bounds.getCenter(new THREE.Vector3());
 assert.ok(Math.abs(bounds.min.y)<.0001,`${id}: base da prévia fora do pedestal`);
 assert.ok(Math.abs(centro.x)<.0001&&Math.abs(centro.z)<.0001,`${id}: modelo centralizado`);
 grupo.traverse(o=>{const m=o as THREE.Mesh;if(m.isMesh){const pos=m.geometry.getAttribute('position');for(let i=0;i<pos.array.length;i++)assert.ok(Number.isFinite(pos.array[i]),`${id}: geometria válida`);m.geometry.dispose();const mats=Array.isArray(m.material)?m.material:[m.material];mats.forEach(mt=>mt.dispose());}});
}
console.log('Modelos refinados: geometria finita, centralização e base verificadas');

const {animalRefinado}=await import('./modelosRefinados.ts');
for(const tipo of ['gato','cachorro'] as const){
 const g=new THREE.Group();const animal=animalRefinado(g,tipo);
 assert.equal(animal.pernas.length,4);assert.ok(g.children.includes(animal.rabo));
 animal.pernas.forEach(p=>assert.equal(p.parent,g,'Patas preservam articulação na cena'));
}

for (const tipo of ['gato', 'cachorro'] as const) {
 const grupo = new THREE.Group();
 const {pernas} = animalRefinado(grupo, tipo);
 for (const perna of pernas) {
  const bounds = new THREE.Box3().setFromObject(perna);
  assert.ok(Math.abs(bounds.min.y) < 1e-6, `${tipo}: patas apoiadas no chão`);
 }
 grupo.traverse(o => {
  if (o instanceof THREE.Mesh) assert.ok(o.castShadow && o.receiveShadow, `${tipo}: sombras consistentes`);
 });
}
const {descartarAcessorio, descartarCorpo} = await import('./recursos3D.ts');
const geometriaCompartilhada = new THREE.BoxGeometry();
const materialInstancia = new THREE.MeshStandardMaterial();
const esqueleto = new THREE.Skeleton([new THREE.Bone()]);
const objeto = new THREE.Group();
const malha = new THREE.SkinnedMesh(geometriaCompartilhada, materialInstancia);
malha.bind(esqueleto); objeto.add(malha);
const mixer = new THREE.AnimationMixer(objeto);
const acao = mixer.clipAction(new THREE.AnimationClip('teste', 1, [])); acao.play();
let geometriaDescartada = 0, materialDescartado = 0, esqueletoDescartado = 0;
geometriaCompartilhada.addEventListener('dispose', () => geometriaDescartada++);
materialInstancia.addEventListener('dispose', () => materialDescartado++);
esqueleto.dispose = () => { esqueletoDescartado++; };
new THREE.Group().add(objeto);
descartarCorpo({objeto, mixer, mats: {pele: materialInstancia}});
assert.equal(geometriaDescartada, 0, 'Geometria GLTF preservada para outras instâncias');
assert.equal(materialDescartado, 1);
assert.equal(esqueletoDescartado, 1);
assert.equal(objeto.parent, null);
assert.equal(mixer.existingAction(acao.getClip()), null, 'Animação removida do cache');
const acessorio = new THREE.Group();
acessorio.add(new THREE.Mesh(geometriaCompartilhada, materialInstancia), new THREE.Mesh(geometriaCompartilhada, materialInstancia));
descartarAcessorio(acessorio);
assert.equal(geometriaDescartada, 1, 'Recurso procedural descartado uma vez');
assert.equal(materialDescartado, 2);
console.log('Patas, sombras e descarte de recursos 3D verificados');

// Os dois GLBs usados pelo jogo precisam preservar roupas, cabelos e animações.
for (const sexo of ['m', 'f']) {
 const bytes = readFileSync(new URL(`../public/corpo_${sexo}.glb`, import.meta.url));
 assert.equal(bytes.readUInt32LE(0), 0x46546c67);
 assert.equal(bytes.readUInt32LE(8), bytes.length);
 const modelo = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
 for (const nome of ['parado','andar','correr','sentado','deitado','orar','ler','mexer','comer','louvor','exercicio','pedalar','cantar']) {
  assert.ok(modelo.animations.some((a: {name: string}) => a.name === nome), `${sexo}: animação ${nome}`);
 }
 for (const nome of ['pele','cabelo_coque','cabelo_rabo','cabelo_raspado','roupa_casaco_longo','sapato_salto']) {
  assert.ok(modelo.nodes.some((n: {name: string}) => n.name === nome), `${sexo}: peça ${nome}`);
 }
 assert.ok(modelo.skins.length > 0, `${sexo}: esqueleto preservado`);
}
console.log('GLBs masculino e feminino: estrutura, peças e 13 animações preservadas');

// Catálogo inteiro: malhas, normais, índices e base, mesmo sob um pedestal transformado.
const {descartarCena} = await import('./recursos3D.ts');
for (const item of LOJA.filter(i => !['roupa','fantasia'].includes(i.tipo))) {
 const pai = new THREE.Group(); pai.position.set(7, 2, -3); pai.rotation.y = .73; pai.scale.setScalar(1.4);
 montarItemLoja3D(pai, item);
 const modelo = pai.children[0]; modelo.removeFromParent();
 const bounds = new THREE.Box3().setFromObject(modelo);
 const centro = bounds.getCenter(new THREE.Vector3());
 assert.ok(!bounds.isEmpty(), `${item.id}: modelo presente`);
 assert.ok(Math.abs(bounds.min.y) < 1e-5 && Math.abs(centro.x) < 1e-5 && Math.abs(centro.z) < 1e-5, `${item.id}: centralização independente do pedestal`);
 modelo.traverse(o => {
  if (!(o instanceof THREE.Mesh)) return;
  for (const nome of ['position', 'normal']) {
   const atributo = o.geometry.getAttribute(nome);
   assert.ok(atributo && Array.from(atributo.array).every(Number.isFinite), `${item.id}: ${nome} finito`);
  }
  const indice = o.geometry.index;
  if (indice) assert.ok(Array.from(indice.array).every(i => i >= 0 && i < o.geometry.getAttribute('position').count), `${item.id}: índices válidos`);
 });
 descartarCena(modelo);
}
const {bibliaRefinada} = await import('./modelosRefinados.ts');
const biblia = new THREE.Group(); bibliaRefinada(biblia);
let triangulosBiblia = 0, malhasBiblia = 0;
biblia.traverse(o => {if (o instanceof THREE.Mesh) {malhasBiblia++;triangulosBiblia += (o.geometry.index?.count ?? o.geometry.getAttribute('position').count)/3;}});
assert.ok(triangulosBiblia < 3000 && malhasBiblia < 20, 'Bíblia mantém orçamento de geometria e chamadas de desenho');
descartarCena(biblia);

const recursos = new THREE.Group();
const txPropria = new THREE.Texture(), txCompartilhada = new THREE.Texture(); txCompartilhada.userData.compartilhada = true;
let propria = 0, compartilhada = 0, linhaLiberada = 0;
txPropria.addEventListener('dispose', () => propria++);txCompartilhada.addEventListener('dispose', () => compartilhada++);
const geoLinha = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(1,1,1)]);
geoLinha.addEventListener('dispose', () => linhaLiberada++);
recursos.add(new THREE.Line(geoLinha, new THREE.LineBasicMaterial()));
recursos.add(new THREE.Sprite(new THREE.SpriteMaterial({map: txPropria})));
recursos.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({map:txPropria,emissiveMap:txCompartilhada})));
descartarCena(recursos);
assert.equal(propria,1,'Textura própria liberada uma vez, mesmo entre sprite e malha');
assert.equal(compartilhada,0,'Textura do catálogo compartilhada preservada');
assert.equal(linhaLiberada,1,'Linhas também liberam geometria');
console.log('Catálogo completo: geometria, pedestal transformado, orçamento da Bíblia e limpeza da cena verificados');
const arvoreAntiga={item:'original:arvore3',x:-4.775,z:10.6154};
const arvoreCorrigida=mobiliaDePerfil({mobilia:[arvoreAntiga]},[])[0];
assert.ok(arvoreCorrigida.z < 0,'Árvore padrão deixa de atravessar a garagem');
assert.equal(arvoreAntiga.z,10.6154,'Migração preserva os dados recebidos');
const arvoreMovida={...arvoreAntiga,x:4,z:10};
assert.deepEqual(mobiliaDePerfil({mobilia:[arvoreMovida]},[]),[arvoreMovida],'Paisagismo personalizado é preservado');
assert.deepEqual(mobiliaDePerfil({mobilia:[arvoreCorrigida]},[]),[arvoreCorrigida],'Migração de paisagismo é idempotente');

const {pecaKaykit, detalharObjetoKaykit} = await import('./kaykit.ts');
const {default: dadosKaykit} = await import('./assets/kaykit.json', {with:{type:'json'}});
let triangulosKaykit = 0;
for (const id of Object.keys(dadosKaykit) as (keyof typeof dadosKaykit)[]) {
 const m=pecaKaykit(id,{x:3,y:.4,z:-2,w:1.4,h:1.2,d:.8,giro:Math.PI/2});
 const geo=m.geometry, pos=geo.getAttribute('position'), cores=geo.getAttribute('color');
 assert.equal(cores.count,pos.count,`${id}: cores completas`);
 for(const nome of ['position','normal','color']) assert.ok(Array.from(geo.getAttribute(nome).array).every(Number.isFinite),`${id}: atributos finitos`);
 assert.ok(Array.from(cores.array).every(c=>c>=0&&c<=1),`${id}: cores lineares válidas`);
 assert.ok(Array.from(geo.index!.array).every(i=>i>=0&&i<pos.count),`${id}: índices dentro da malha`);
 const caixa=new THREE.Box3().setFromObject(m);
 assert.ok(Math.abs(caixa.min.y-.4)<1e-5,`${id}: apoiado na superfície após girar`);
 assert.ok(caixa.getCenter(new THREE.Vector3()).distanceTo(new THREE.Vector3(3,1,-2))<1e-5,`${id}: encaixe centralizado`);
 triangulosKaykit+=geo.index!.count/3;
 descartarCena(m);
}
assert.ok(triangulosKaykit<60000,'Seleção KayKit mantém orçamento de geometria para celular');
const mesaDecorada=new THREE.Group();detalharObjetoKaykit('mesa',mesaDecorada);
const antesDetalhe=new THREE.Box3().setFromObject(mesaDecorada).getCenter(new THREE.Vector3());
mesaDecorada.position.set(2,0,-3);
const depoisDetalhe=new THREE.Box3().setFromObject(mesaDecorada).getCenter(new THREE.Vector3());
assert.ok(depoisDetalhe.sub(antesDetalhe).distanceTo(new THREE.Vector3(2,0,-3))<1e-5,'Objetos sobre a mesa acompanham sua posição');
descartarCena(mesaDecorada);
console.log(`KayKit: ${Object.keys(dadosKaykit).length} modelos, ${triangulosKaykit} triângulos; cores, encaixe e decoração móvel verificados`);

const {validarAreaEdicao,criarGradeEdicao}=await import('./editorTerreno.ts');
assert.ok(validarAreaEdicao([3,10,3.5,10.5],[]),'Faixa externa diante da casa aceita móveis');
assert.ok(validarAreaEdicao([-5.8,-4,-5.4,-3.6],[]),'Lateral externa aceita árvore');
assert.ok(validarAreaEdicao([1,1,1.4,1.4],[[1.45,1,1.8,1.4]]),'Móveis próximos sem interseção são aceitos');
assert.ok(!validarAreaEdicao([1,1,1.6,1.6],[[1.45,1,1.8,1.4]]),'Sobreposição real continua bloqueada');
assert.ok(!validarAreaEdicao([-7,0,-6.5,1],[]),'Limite do terreno permanece válido');
for(const passo of [.25,.5] as const){
 const grade=criarGradeEdicao(passo),b=new THREE.Box3().setFromObject(grade);
 assert.ok(b.min.x<-6&&b.max.x>18&&b.min.z<-6&&b.max.z>12,'Grade cobre interiores e área externa');
 descartarCena(grade);
}
console.log('Editor: terreno externo, encaixes próximos, obstáculos reais e grade verificados');

// Os detalhes externos ficam em uma malha por objeto, com orçamento baixo de triângulos.
const paisagismo = await import('./paisagismo.ts');
for (const criar of [paisagismo.arvoreDetalhada,paisagismo.arbustoDetalhado,paisagismo.igrejaDetalhada]) {
  const modelo=criar(), pos=modelo.geometry.getAttribute('position');
  if(!Array.from(pos.array).every(Number.isFinite) || pos.count/3>1500) throw new Error('Paisagismo excedeu o orçamento ou possui vértices inválidos');
  modelo.geometry.computeBoundingBox();
  if(modelo.geometry.boundingBox!.min.y<-.02) throw new Error('Paisagismo abaixo do terreno');
  modelo.geometry.dispose();modelo.material.dispose();
}
console.log('Paisagismo: modelos válidos, até 1500 triângulos e uma malha por objeto');

const {DONOS_ROTEIROS,objetoDisponivel}=await import('./interacoesCasa.ts');
const fonteCasa=readFileSync(new URL('./Casa3D.tsx',import.meta.url),'utf8');
const rotinas=fonteCasa.slice(fonteCasa.indexOf('const ROTEIROS:'),fonteCasa.indexOf('const bicicletaEstacionada='));
for(const [,id] of rotinas.matchAll(/id: '([^']+)'/g)) assert.ok(DONOS_ROTEIROS[id],`Rotina ${id} tem móvel explícito`);
const paiOculto=new THREE.Group(),filho=new THREE.Group();paiOculto.add(filho);paiOculto.visible=false;
assert.equal(objetoDisponivel(filho),false);paiOculto.visible=true;assert.equal(objetoDisponivel(filho),true);filho.visible=false;assert.equal(objetoDisponivel(filho),false);
const {revisarObjeto,vasoSanitario}=await import('./revisaoObjetos.ts');
for(const id of ['banco','almofada','aquario','espelho','banheira','guarda-roupa','bancada_oficina','bicicleta_passeio','bicicleta','teclado-estudio','bateria','treino','colchonete','cafeteira_varanda','ducha_piscina']) {
 const g=new THREE.Group();revisarObjeto(id,g);assert.ok(g.children.length,`${id}: geometria revisada`);
 g.traverse(o=>{if(o instanceof THREE.Mesh) for(const attr of ['position','normal'])assert.ok(Array.from(o.geometry.getAttribute(attr).array).every(Number.isFinite),`${id}: ${attr}`);});descartarCena(g);
}
descartarCena(vasoSanitario());
const {adicionarAnimacoesContextuais}=await import('./animacoesContextuais.ts');
const base=new THREE.AnimationClip('parado',1,['upperarm_l','upperarm_r','lowerarm_l','lowerarm_r','spine_01','thigh_l','thigh_r'].map(n=>new THREE.QuaternionKeyframeTrack(n+'.quaternion',[0,1],[0,0,0,1,0,0,0,1])));
const clipesNovos=new Map([['parado',base]]);adicionarAnimacoesContextuais(clipesNovos);
for(const nome of ['pesos','alongar','nadar','teclado','regar']) {const clip=clipesNovos.get(nome)!;assert.ok(clip.validate(),nome);for(const t of clip.tracks) {assert.ok(Array.from(t.values).every(Number.isFinite));assert.ok(Array.from(t.values.slice(0,4)).every((v,i)=>Math.abs(v-t.values[t.values.length-4+i])<1e-6),`${nome}: ciclo sem salto`);}}
assert.equal(animacaoContextual('correr','Treinando','halteres'),'pesos');
assert.equal(animacaoContextual('andar','Nadando e se refrescando'),'nadar');
assert.equal(animacaoContextual('correr','Alongando'),'alongar');
assert.equal(animacaoContextual('mexer','Tocando teclado'),'teclado');
assert.equal(animacaoContextual('mexer','Regando','regador'),'regar');
console.log('Ambientes: rotinas vinculadas, objetos ocultos ignorados, 15 modelos e 5 ciclos específicos verificados');

// Uma rota diagonal válida continua válida quando retomada em qualquer ponto.
const canto: [number,number,number,number][] = [[0,0,1,1]];
for(let i=0;i<=100;i++) {
 const t=i/100;
 assert.equal(segmentoBloqueado(-1+3*t,-.4+.1*t,2,-.3,canto,.26),false);
}
assert.equal(segmentoBloqueado(-1,.5,2,.5,canto,.26),true);

for (const id of ['vestido','vestidoLongo','saia','saiaLonga','tunicaCoral','jose','tunicaFestiva','anjo','ester']) {
 const item = LOJA.find(i => i.id === id)!;
 assert.ok(!servePara(item, 'masculino'), id);
 assert.ok(servePara(item, 'feminino'), id);
 assert.deepEqual(lookComItem(masculino, item), masculino);
}
const antigo = {...look, corpo: 'masculino' as const, topo: 'tunicaCoral' as const, fantasia: 'jose'};
const corrigido = normalizarRoupa(antigo);
assert.equal(corrigido.topo, 'moletom');
assert.equal(corrigido.baixo, 'calca');
assert.equal(corrigido.fantasia, undefined);
assert.equal(antigo.fantasia, 'jose');

assert.equal(animacaoContextual('andar', 'Levando a bicicleta'), 'andar');
assert.equal(animacaoContextual('andar', 'Indo regar', 'regador'), 'andar');
assert.equal(animacaoContextual('mexer', 'Bebendo água', 'copo'), 'comer');
assert.equal(animacaoContextual('sentado', 'Tomando café', 'copo'), 'sentado');

const { criarMicroEfeitos } = await import('./microEfeitos.ts');
const cenaAgua = new THREE.Scene();
const efeitoAgua = criarMicroEfeitos(cenaAgua);
const gotas = cenaAgua.children[0] as THREE.InstancedMesh;
efeitoAgua.seguirAgua(new THREE.Vector3(4, 1, -3));
efeitoAgua.atualizar(performance.now() + 6000);
assert.ok(gotas.visible, 'Rega deve durar enquanto a ação está ativa');
const matrizGota = new THREE.Matrix4();
gotas.getMatrixAt(0, matrizGota);
const posGota = new THREE.Vector3().setFromMatrixPosition(matrizGota);
assert.ok(Math.abs(posGota.x - 4) < .03 && Math.abs(posGota.z + 3) < .03, 'Água deve sair do bico, não do corpo');
efeitoAgua.pararAguaSeguida();
assert.ok(!gotas.visible, 'Água deve parar ao encerrar a rega');
efeitoAgua.iniciar('vapor', new THREE.Vector3());
efeitoAgua.pararAguaSeguida();
assert.ok(gotas.visible, 'Encerrar a rega não deve apagar vapor de outra ação');

const { MOVEIS } = await import('./casa.ts');
const { NOVOS_ITENS } = await import('./catalogoColecao.ts');
const { COLECAO_MODELOS, miniaturaColecao } = await import('./colecaoLoja.ts');
for(const item of NOVOS_ITENS){
 assert.ok(LOJA.some(i=>i.id===item.id&&i.nome===item.nome));
 assert.ok(MOVEIS[item.id], `${item.id}: disponível no editor`);
}
for(const [id,montar] of Object.entries(COLECAO_MODELOS)){
 const g=new THREE.Group();montar(g);const b=new THREE.Box3().setFromObject(g);
 assert.ok(!b.isEmpty() && b.min.y>=-.001, `${id}: base apoiada no chão`);
 let triangulos=0;g.traverse(o=>{if(o instanceof THREE.Mesh)triangulos+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});
 assert.ok(triangulos<5000,`${id}: orçamento de geometria`);
 const svg=miniaturaColecao(id);assert.ok(svg.includes('<polygon')&&!/NaN|Infinity/.test(svg),`${id}: miniatura válida`);
}

const { acabamentoRoupa, tramaTecido, prepararUvTecido } = await import('./acabamentosVisuais.ts');
const { PINTURAS } = await import('./pinturas.ts');
for(const pintura of PINTURAS)assert.ok(LOJA.some(i=>i.id===pintura.id&&i.tipo==='papel'));
assert.ok(acabamentoRoupa('moletom').roughness>acabamentoRoupa('camisa').roughness);
assert.equal(tramaTecido('malha'),tramaTecido('malha'),'Tramas compartilhadas entre personagens');
assert.notDeepEqual(tramaTecido('malha').image.data,tramaTecido('sarja').image.data);

const tecidoSemUv=new THREE.BoxGeometry();tecidoSemUv.deleteAttribute('uv');
prepararUvTecido(tecidoSemUv);
assert.equal(tecidoSemUv.getAttribute('uv').count,tecidoSemUv.getAttribute('position').count);
assert.ok(Array.from(tecidoSemUv.getAttribute('uv').array).every(Number.isFinite));
const uvTecido=tecidoSemUv.getAttribute('uv');prepararUvTecido(tecidoSemUv);assert.equal(tecidoSemUv.getAttribute('uv'),uvTecido);

const {filtrarEstacoes} = await import('./radioGospel.ts');
const estacoes = filtrarEstacoes([
  {name:' Rádio  A ',url_resolved:'https://a.example/live',lastcheckok:1},
  {name:'Repetida',url_resolved:'https://a.example/live',lastcheckok:1},
  {name:'Sem https',url_resolved:'http://b.example/live',lastcheckok:1},
  {name:'Fora do ar',url_resolved:'https://c.example/live',lastcheckok:0},
]);
assert.deepEqual(estacoes,[{nome:'Rádio A',url:'https://a.example/live'}]);
console.log('Rádio gospel: só estações https, ativas e sem repetição');
