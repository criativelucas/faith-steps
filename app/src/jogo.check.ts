// Checagem das regras do jogo. Rodar com: node src/jogo.check.ts
import assert from 'node:assert/strict';
import { calcular, corDaCasa, desempenho, DIA } from './jogo.ts';
import type { Evento } from './jogo.ts';
import { tingir } from './cores.ts';

const inicio = new Date(2026, 0, 5, 9).getTime(); // segunda, 9h
const reg = (atividade: any, quando: number, qtd = 1): Evento => ({ id: String(Math.random()), tipo: 'registro', atividade, qtd, quando });

// Começa tudo em 55 (abaixo do Radiante), humor normal
let e = calcular(inicio, [], inicio);
assert.equal(e.necessidades.espirito, 55);
assert.equal(e.humor, 'normal');
assert.equal(e.nivel, 1);

// Queda: Espírito −50/dia, Comunhão −15/dia
e = calcular(inicio, [], inicio + DIA);
assert.equal(Math.round(e.necessidades.espirito), 5);
assert.equal(Math.round(e.necessidades.comunhao), 40);

// Devocional enche Espírito (com teto 100) e dá XP e talentos
e = calcular(inicio, [reg('devocional', inicio + 60_000)], inicio + 60_000);
assert.equal(Math.round(e.necessidades.espirito), 100);
assert.equal(e.xp, 30);
assert.equal(e.talentos, 10);

// Limite diário: o 3º devocional do dia não rende pontos
e = calcular(inicio, [1, 2, 3].map(m => reg('devocional', inicio + m * 60_000)), inicio + 4 * 60_000);
assert.equal(e.xp, 60);
assert.equal(e.totalRegistros, 3);

// Abatido quando Espírito zera; Adormecido depois de 3 dias zerado
assert.equal(calcular(inicio, [], inicio + 2 * DIA).humor, 'abatido');
assert.equal(calcular(inicio, [], inicio + 5 * DIA).humor, 'adormecido');
// Um devocional acorda
assert.notEqual(calcular(inicio, [reg('devocional', inicio + 5 * DIA)], inicio + 5 * DIA).humor, 'adormecido');

// Graça cobre um dia esquecido: ativo no dia 1, esquece o 2, ativo no 3
e = calcular(inicio, [reg('oracao', inicio), reg('oracao', inicio + 2 * DIA)], inicio + 2 * DIA);
assert.equal(e.ofensiva, 2);
assert.equal(e.gracas, 0);
// Sem Graça, esquecer zera a ofensiva
e = calcular(inicio, [reg('oracao', inicio), reg('oracao', inicio + 2 * DIA), reg('oracao', inicio + 4 * DIA)], inicio + 4 * DIA);
assert.equal(e.ofensiva, 1);

// Nível: 100 XP sobe para o nível 2
e = calcular(inicio, [reg('igreja', inicio), reg('igreja', inicio + 1000)], inicio + 2000);
assert.equal(e.xp, 100);
assert.equal(e.nivel, 2);

// Missão do dia completa dá bônus de 30 talentos
e = calcular(inicio, [reg('devocional', inicio), reg('leitura', inicio + 1000), reg('exercicio', inicio + 2000)], inicio + 3000);
assert.equal(e.missaoCompleta, true);
assert.equal(e.talentos, 10 + 3 + 8 + 30);

// Compra desconta talentos
e = calcular(inicio, [reg('igreja', inicio), { id: 'c1', tipo: 'compra', item: 'planta', preco: 15, quando: inicio + 1000 }], inicio + 2000);
assert.equal(e.talentos, 5);
assert.deepEqual(e.itens, ['planta']);

// Forma física: sem exercício cai, com 150 min/semana sobe
assert.ok(calcular(inicio, [], inicio + 10 * DIA).forma < 50);
const treinos = Array.from({ length: 10 }, (_, i) => reg('exercicio', inicio + i * DIA, 1));
assert.ok(calcular(inicio, treinos, inicio + 10 * DIA).forma > 50);

console.log('ok: regras do jogo');

// Sincronização do perfil
import { juntarPerfil } from './jogo.ts';
const look = { pele: '#000000', cabelo: 'curto', corCabelo: '#000000', moletom: 'pink' } as const;
const celular = { nome: 'Davi', criadoEm: 100, atualizadoEm: 500, look: { ...look, moletom: 'lima' } };
const computador = { nome: 'Davi', criadoEm: 50, atualizadoEm: 300, look };
assert.equal(juntarPerfil(null, null), null);
assert.deepEqual(juntarPerfil(celular, null), celular);
assert.deepEqual(juntarPerfil(null, computador), computador);
// Vale o mais recente, mas a data de início é a mais antiga
assert.deepEqual(juntarPerfil(celular, computador), { ...celular, criadoEm: 50 });
assert.deepEqual(juntarPerfil(computador, celular), { ...celular, criadoEm: 50 });
console.log('ok: sincronização do perfil');

// Easter egg: a moeda perdida rende talentos só uma vez
e = calcular(inicio, [{ id: 'a1', tipo: 'achado', item: 'dracma', quando: inicio }, { id: 'a2', tipo: 'achado', item: 'dracma', quando: inicio + 1 }], inicio + 2);
assert.equal(e.talentos, 10);
assert.deepEqual(e.achados, ['dracma']);
console.log('ok: easter eggs');

// Meditação antiga conta como devocional
e = calcular(inicio, [reg('meditacao', inicio)], inicio);
assert.equal(e.xp, 30);
assert.equal(e.ofensiva, 1);
console.log('ok: meditação conta como devocional');

// Cor da casa: segue o avatar até a pessoa escolher outra
assert.equal(corDaCasa({ look: { corpo: 'masculino' } as any }), '#2F7DF6');
assert.equal(corDaCasa({ look: { corpo: 'feminino' } as any }), '#FE0472');
assert.equal(corDaCasa({ look: { corpo: 'masculino' } as any, cor: '#F5B700' }), '#F5B700');
console.log('ok: cor da casa');

// Cor do tema: só tons de rosa mudam
assert.equal(tingir('#FE0472', '#2F7DF6'), '#2F7DF6');
assert.equal(tingir('#C9A88A', '#2F7DF6'), '#C9A88A'); // madeira não muda
assert.equal(tingir('#FFD1E6', '#FE0472'), '#FFD1E6'); // rosa padrão deixa tudo igual
const claro = tingir('#FFD1E6', '#2F7DF6');
assert.ok(claro !== '#FFD1E6' && parseInt(claro.slice(5, 7), 16) > parseInt(claro.slice(1, 3), 16), claro); // rosa claro vira azul claro
console.log('ok: cor do tema');

// Desempenho: dias com Deus por semana e totais
{
  const seg = inicio, qua = inicio + 2 * DIA, semanaPassada = inicio - 7 * DIA;
  const d = desempenho([
    reg('devocional', seg), reg('oracao', seg + 1000), reg('exercicio', qua, 2), reg('igreja', qua + 1000),
    reg('leitura', semanaPassada, 3), reg('meditacao', semanaPassada + 1000),
  ], qua + 5000);
  const [anterior, atual] = d.semanas.slice(-2);
  assert.equal(d.semanas.length, 8);
  assert.equal(new Date(atual.inicio).getDay(), 0); // semana começa no domingo
  assert.deepEqual([atual.dias, atual.registros], [2, 4]); // segunda e quarta; exercício não conta como dia com Deus
  assert.deepEqual([anterior.dias, anterior.registros], [1, 2]); // leitura não conta; meditação antiga conta como devocional
  assert.equal(d.vezes.devocional, 2);
  assert.equal(d.capitulos, 3);
  assert.equal(d.minutos, 60);
  console.log('ok: desempenho');
}

// Loja expandida: atividades bloqueadas, filtro por perfil, versículo do dia e miniaturas
import { ATIVIDADES, bloqueio, isContaTester, liberada, LOJA, servePara, versiculoDoDia } from './jogo.ts';
import { itemExtraSvg, lugarLivreMovel, mobiliaDePerfil, MOVEIS, revestimentoSvg, VAGAS } from './casa.ts';
import { icone } from './icones.ts';
{
  const semCompras = calcular(inicio, [], inicio);
  assert.equal(liberada(semCompras, ATIVIDADES.devocional), true);
  assert.equal(liberada(semCompras, ATIVIDADES.jejum), false);
  assert.equal(liberada(semCompras, ATIVIDADES.evangelismo), false);

  const comJejum = calcular(inicio, [
    reg('igreja', inicio), reg('igreja', inicio + 1000), reg('igreja', inicio + 2 * DIA), reg('igreja', inicio + 2 * DIA + 1000),
    { id: 'cj', tipo: 'compra', item: 'jejum', preco: 80, quando: inicio + 3 * DIA },
    reg('jejum', inicio + 3 * DIA + 1000, 1),
  ], inicio + 3 * DIA + 2000);
  assert.equal(liberada(comJejum, ATIVIDADES.jejum), true);
  assert.equal(liberada(comJejum, ATIVIDADES.evangelismo), false);
  assert.equal(comJejum.hoje.jejum, 1);

  const anjo = LOJA.find(i => i.id === 'anjo')!;
  const ester = LOJA.find(i => i.id === 'ester')!;
  const rei = LOJA.find(i => i.id === 'rei')!;
  const cavaleiro = LOJA.find(i => i.id === 'cavaleiro')!;
  assert.equal(servePara(anjo, 'feminino'), true);
  assert.equal(servePara(anjo, 'masculino'), false);
  assert.equal(servePara(ester, 'feminino'), true);
  assert.equal(servePara(ester, 'masculino'), false);
  assert.equal(servePara(rei, 'masculino'), true);
  assert.equal(servePara(rei, 'feminino'), false);
  assert.equal(servePara(cavaleiro, 'masculino'), true);
  assert.equal(servePara(cavaleiro, 'feminino'), true);

  // Todos os móveis, papéis de parede, pisos e itens extras da loja têm miniatura válida
  assert.equal(LOJA.filter(i => i.tipo === 'papel').length, 10);
  assert.equal(LOJA.filter(i => i.tipo === 'piso').length, 10);
  for (const item of LOJA) {
    if (item.tipo === 'movel') assert.ok(MOVEIS[item.id], `Falta miniatura do móvel: ${item.id}`);
    if (item.tipo === 'papel' || item.tipo === 'piso') {
      const svg = revestimentoSvg(item.id);
      assert.ok(svg.length > 90, `Falta amostra do revestimento: ${item.id}`);
    }
    if (item.tipo === 'comodo' || item.tipo === 'atividade' || item.tipo === 'funcao') {
      const svg = itemExtraSvg(item.id);
      assert.ok(svg.length > 80, `Falta ilustração do item: ${item.id}`);
    }
  }
  assert.ok(VAGAS.some(v => v.comodo === 'estudio' && v.item === 'estudio'));
  assert.ok(VAGAS.some(v => v.comodo === 'academia' && v.item === 'academia'));

  // Migração de casa antiga (vagas) para mobília 3D livre e busca de vaga livre
  const migrada = mobiliaDePerfil({ casa: { 'quarto-parede': 'quadro', 'sala-canto': 'planta' } }, ['quadro', 'planta']);
  assert.equal(migrada.length, 2);
  assert.equal(migrada.find(m => m.item === 'quadro')?.parede, true);
  assert.equal(migrada.find(m => m.item === 'planta')?.parede, undefined);
  const livreSala = lugarLivreMovel('chao', [], [], 'sala');
  assert.ok(livreSala && livreSala.x < 7 && livreSala.z > 4.5);
  const livreParede = lugarLivreMovel('parede', migrada, ['quadro'], 'quarto');
  assert.ok(livreParede && livreParede.parede === true);

  for (const n of ['jardim', 'estudio', 'academia', 'versiculo', 'carrinho', 'construir', 'pontos', 'camadas', 'cabide', 'acao', 'forma']) {
    assert.ok(icone(n).includes('<path') || icone(n).includes('<circle') || icone(n).includes('<rect'), `Ícone vazio: ${n}`);
  }

  const v1 = versiculoDoDia(inicio);
  const v2 = versiculoDoDia(inicio + DIA);
  assert.ok(v1.texto.length > 10 && v1.referencia.length > 3);
  assert.notEqual(v1.referencia, v2.referencia);
  assert.equal(versiculoDoDia(inicio + 3600_000).referencia, v1.referencia);

  // Modo Tester & Talentos Infinitos
  assert.equal(isContaTester('riativelucas@gmail.com'), true);
  assert.equal(isContaTester('RIATIVELUCAS@GMAIL.COM'), true);
  assert.equal(isContaTester('criativelucas@gmail.com'), true);
  assert.equal(isContaTester('outro@email.com'), false);
  const estadoTester = { ...semCompras, talentos: 999999, nivel: 99 };
  assert.equal(bloqueio(estadoTester, LOJA.find(i => i.id === 'estudio')!), null);
  assert.equal(bloqueio(estadoTester, LOJA.find(i => i.id === 'piscina')!), null);
  assert.equal(bloqueio(estadoTester, LOJA.find(i => i.id === 'ester')!), null);

  console.log('ok: loja expandida, papéis, pisos, mobília 3D, HUD Sims e versículo do dia');
}
