// testes/pontuacao.test.js
// Testes do índice e do semáforo (src/pontuacao.js). Rodar com: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularPontuacao, semaforo, indice, perguntaVisivel } from '../src/pontuacao.js';
import { questionario, modulo, perfilPadaria, respostasPadaria, tudoNaoSei } from './apoio.js';

const calcular = (perfil, respostas) => calcularPontuacao(questionario, perfil, respostas, modulo.temas);

test('padaria: confere com o cálculo feito à mão', () => {
  const r = calcular(perfilPadaria, respostasPadaria);
  // 10 perguntas pontuadas aplicáveis → máximo 20; soma 9 → 45
  assert.equal(r.indice, 45);
  assert.equal(r.semaforo, 'amarelo');
  assert.deepEqual(r.porTema, [
    { tema: 'Ativos e dependências', indice: 25, semaforo: 'vermelho' }, // Q05=1, Q06=0 → 1/4
    { tema: 'Ameaças e controles', indice: 50, semaforo: 'amarelo' },   // Q11=1, Q12=1 → 2/4
    { tema: 'Continuidade', indice: 50, semaforo: 'amarelo' },          // Q07..Q10 = 4/8
    { tema: 'Pessoas', indice: 50, semaforo: 'amarelo' },               // Q13=0, Q15=2 (Q14 N/A) → 2/4
  ]);
});

test('mesma entrada gera sempre o mesmo resultado', () => {
  const a = calcular(perfilPadaria, respostasPadaria);
  const b = calcular(structuredClone(perfilPadaria), structuredClone(respostasPadaria));
  assert.deepEqual(a, b);
});

test('tudo "não sei" dá índice 0 e vermelho', () => {
  const r = calcular(perfilPadaria, tudoNaoSei());
  assert.equal(r.indice, 0);
  assert.equal(r.semaforo, 'vermelho');
  assert.ok(r.porTema.every((t) => t.indice === 0 && t.semaforo === 'vermelho'));
});

test('"não se aplica" tira a pergunta do cálculo', () => {
  const comNA = calcular(perfilPadaria, { ...respostasPadaria, M2_Q14: 'nao_se_aplica' });
  const comNao = calcular(perfilPadaria, { ...respostasPadaria, M2_Q14: 'nao' });
  const pessoas = (r) => r.porTema.find((t) => t.tema === 'Pessoas').indice;
  assert.equal(pessoas(comNA), 50);  // 2/4
  assert.equal(pessoas(comNao), 33); // 2/6 = 33,3 → 33
});

test('pergunta com "pontua": false não muda o índice', () => {
  const a = calcular(perfilPadaria, { ...respostasPadaria, M2_Q01: '1', M2_Q02: 'menos_de_1h' });
  const b = calcular(perfilPadaria, { ...respostasPadaria, M2_Q01: '5', M2_Q02: 'mais_de_1_semana' });
  assert.deepEqual(a, b);
});

test('pergunta condicional que não apareceu não entra, mesmo se vier resposta', () => {
  const sozinho = { ...perfilPadaria, P03_pessoas: '1' };
  assert.equal(perguntaVisivel(questionario.perguntas.find((p) => p.id === 'M2_Q13'), sozinho), false);
  const a = calcular(sozinho, { ...respostasPadaria, M2_Q13: 'todos_tudo' });
  const b = calcular(sozinho, { ...respostasPadaria, M2_Q13: 'so_o_necessario' });
  assert.deepEqual(a, b);
  assert.equal(a.porTema.find((t) => t.tema === 'Pessoas').indice, 100); // só Q15 = 2/2
});

test('perguntas condicionais seguem o perfil', () => {
  const p = (id) => questionario.perguntas.find((q) => q.id === id);
  assert.equal(perguntaVisivel(p('M2_Q03'), perfilPadaria), false); // sem sistema_gestao
  assert.equal(perguntaVisivel(p('M2_Q03'), { P10_sistemas: ['sistema_gestao'] }), true);
  assert.equal(perguntaVisivel(p('M2_Q04'), perfilPadaria), true);  // celular_pessoal
  assert.equal(perguntaVisivel(p('M2_Q06'), { P08_dados: ['nenhum'] }), false);
  assert.equal(perguntaVisivel(p('M2_Q06'), { P08_dados: ['saude'] }), true);
});

test('obrigatória em branco conta como 0', () => {
  const { M2_Q15, ...semQ15 } = respostasPadaria;
  const r = calcular(perfilPadaria, semQ15);
  assert.equal(r.indice, 35); // Q15 vale 0 em vez de 2: soma 7 de 20
  assert.equal(r.semaforo, 'vermelho');
});

test('resposta com valor desconhecido é recusada', () => {
  assert.throws(() => calcular(perfilPadaria, { ...respostasPadaria, M2_Q08: 'talvez' }), /M2_Q08/);
});

test('limites do semáforo e arredondamento', () => {
  assert.equal(semaforo(100), 'verde');
  assert.equal(semaforo(70), 'verde');
  assert.equal(semaforo(69), 'amarelo');
  assert.equal(semaforo(40), 'amarelo');
  assert.equal(semaforo(39), 'vermelho');
  assert.equal(semaforo(0), 'vermelho');
  assert.equal(semaforo(null), 'sem_dados');
  assert.equal(indice(139, 200), 70); // 69,5 → 70
  assert.equal(indice(1, 3), 33);
  assert.equal(indice(0, 0), null);
});

test('tema sem perguntas aplicáveis fica "sem_dados"', () => {
  const mini = {
    perguntas: [
      { id: 'X1', tema: 'A', tipo: 'sim_nao', obrigatoria: true,
        opcoes: [{ valor: 'sim', pontos: 2 }, { valor: 'nao', pontos: 0 }, { valor: 'nao_sei', pontos: 0 }] },
      { id: 'X2', tema: 'B', tipo: 'sim_nao', obrigatoria: true,
        opcoes: [{ valor: 'sim', pontos: 2 }, { valor: 'nao_se_aplica' }, { valor: 'nao_sei', pontos: 0 }] },
    ],
  };
  const r = calcularPontuacao(mini, {}, { X1: 'sim', X2: 'nao_se_aplica' });
  assert.equal(r.indice, 100);
  assert.deepEqual(r.porTema[1], { tema: 'B', indice: null, semaforo: 'sem_dados' });
});
