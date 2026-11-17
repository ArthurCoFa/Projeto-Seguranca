// testes/matriz.test.js
// Testes da matriz de riscos 3×3 (src/matriz.js). Rodar com: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularMatriz, matrizEmMarkdown, nivel, CATALOGO } from '../src/matriz.js';
import { questionario, perfilPadaria, respostasPadaria, tudoNaoSei } from './apoio.js';

const risco = (m, id) => m.riscos.find((r) => r.id === id);
const pi = (m, id) => [risco(m, id).probabilidade, risco(m, id).impacto];

test('padaria: probabilidade e impacto conferem com a tabela de decisão', () => {
  const m = calcularMatriz(questionario, perfilPadaria, respostasPadaria);
  assert.deepEqual(pi(m, 'golpe-fraude'), [1, 3]);               // média(Q15=2,Q11=1)=1,5; tem Pix
  assert.deepEqual(pi(m, 'ransomware'), [1, 3]);                 // sem computador; backup manual
  assert.deepEqual(pi(m, 'furto-perda'), [3, 3]);                // loja física + celular; aguenta < 1 h
  assert.deepEqual(pi(m, 'falha-equipamento-internet'), [2, 2]); // Q07=1; internet até 1 dia
  assert.deepEqual(pi(m, 'erro-humano'), [2, 2]);                // média(Q15=2,Q13=0)=1; backup manual
  assert.deepEqual(pi(m, 'conta-invadida'), [2, 3]);             // Q11=1 (Q14 N/A); vende por WhatsApp
  assert.deepEqual(pi(m, 'vazamento-dados'), [3, 2]);            // Q06=0,Q13=0; só contato
});

test('padaria: 5 riscos principais na ordem de desempate', () => {
  const m = calcularMatriz(questionario, perfilPadaria, respostasPadaria);
  assert.deepEqual(m.principais, [
    'furto-perda',                // 9
    'conta-invadida',             // 6, impacto 3
    'vazamento-dados',            // 6, impacto 2
    'falha-equipamento-internet', // 4, catálogo antes de erro humano
    'erro-humano',                // 4
  ]);
});

test('mesma entrada gera sempre a mesma matriz', () => {
  const a = calcularMatriz(questionario, perfilPadaria, respostasPadaria);
  const b = calcularMatriz(questionario, structuredClone(perfilPadaria), structuredClone(respostasPadaria));
  assert.deepEqual(a, b);
  assert.equal(matrizEmMarkdown(a), matrizEmMarkdown(b));
});

test('matriz tem 9 células e cada risco aparece em exatamente uma', () => {
  const m = calcularMatriz(questionario, perfilPadaria, tudoNaoSei());
  assert.equal(m.celulas.length, 9);
  const todos = m.celulas.flatMap((c) => c.riscos).sort();
  assert.deepEqual(todos, CATALOGO.map((r) => r.id).sort());
  for (const r of m.riscos) {
    assert.ok(r.probabilidade >= 1 && r.probabilidade <= 3);
    assert.ok(r.impacto >= 1 && r.impacto <= 3);
  }
});

test('sem dados de clientes, vazamento fica 1 × 1', () => {
  const m = calcularMatriz(questionario, { ...perfilPadaria, P08_dados: ['nenhum'] }, tudoNaoSei());
  assert.deepEqual(pi(m, 'vazamento-dados'), [1, 1]);
});

test('clínica com dados de saúde: impacto de vazamento é 3', () => {
  const m = calcularMatriz(questionario, { ...perfilPadaria, P08_dados: ['contato', 'saude'] }, tudoNaoSei());
  assert.deepEqual(pi(m, 'vazamento-dados'), [3, 3]);
});

test('incidente nos últimos 2 anos aumenta golpe e conta invadida', () => {
  const sem = calcularMatriz(questionario, perfilPadaria, respostasPadaria);
  const com = calcularMatriz(questionario, { ...perfilPadaria, P13_incidente: 'sim' }, respostasPadaria);
  assert.equal(risco(com, 'golpe-fraude').probabilidade, risco(sem, 'golpe-fraude').probabilidade + 1);
  assert.equal(risco(com, 'conta-invadida').probabilidade, risco(sem, 'conta-invadida').probabilidade + 1);
});

test('plano B conhecido por todos reduz o impacto da falha de internet', () => {
  const sem = calcularMatriz(questionario, perfilPadaria, respostasPadaria);
  const com = calcularMatriz(questionario, perfilPadaria, { ...respostasPadaria, M2_Q09: 'sim_todos_sabem' });
  assert.equal(risco(com, 'falha-equipamento-internet').impacto, risco(sem, 'falha-equipamento-internet').impacto - 1);
});

test('nível pelo produto P × I', () => {
  assert.equal(nivel(1, 2), 'baixo');
  assert.equal(nivel(1, 3), 'medio');
  assert.equal(nivel(2, 2), 'medio');
  assert.equal(nivel(2, 3), 'alto');
  assert.equal(nivel(3, 3), 'alto');
});

test('Markdown da matriz escreve o nível em texto, não só cor', () => {
  const md = matrizEmMarkdown(calcularMatriz(questionario, perfilPadaria, respostasPadaria));
  const linhas = md.split('\n');
  assert.equal(linhas.length, 5);
  assert.match(linhas[2], /^\| 3 · alto \| \*\*Médio\*\*: Golpe ou fraude; Sequestro/);
  assert.match(linhas[2], /\*\*Alto\*\*: Furto ou perda de equipamento \|$/);
  assert.match(linhas[4], /^\| 1 · baixo \| \*\*Baixo\*\* \|/);
});
