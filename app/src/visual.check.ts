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
