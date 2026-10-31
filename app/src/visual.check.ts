import assert from 'node:assert/strict';
import { LOJA, servePara } from './jogo.ts';
import { cabelosPara, type Look } from './personagem.ts';
import { itensDoLook, lookComCorpo, lookComItem, paraOcasiao } from './estudio.ts';
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
assert.equal(animacaoContextual('sentado','Pedalando'),'pedalar');
assert.equal(animacaoContextual('correr','Fazendo polichinelos'),'exercicio');
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
