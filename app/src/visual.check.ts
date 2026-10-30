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
