// testes/apoio.js
// Dados FICTÍCIOS compartilhados pelos testes. Nenhuma empresa real.

import { readFileSync } from 'node:fs';

const ler = (caminho) => JSON.parse(readFileSync(new URL(caminho, import.meta.url), 'utf8'));

export const questionario = ler('../questionario.json');
export const modulo = ler('../modulo.json');

/** Padaria fictícia EP-91 (perfil provisório até o curador publicar testes/perfis/). */
export const perfilPadaria = {
  codinome: 'EP-91',
  P01_ramo: 'alimentacao',
  P02_porte: 'mei',
  P03_pessoas: '2-5',
  P04_tempo: '4-10',
  P05_uf: 'PA',
  P06_canais: ['loja_fisica', 'whatsapp'],
  P07_pagamentos: ['dinheiro', 'pix', 'cartao_maquininha'],
  P08_dados: ['contato'],
  P09_equipamentos: ['celular_pessoal'],
  P10_sistemas: ['planilhas'],
  P11_site: 'nao',
  P12_ti: 'dono',
  P13_incidente: 'nao',
};

/** Respostas da padaria usadas no cálculo à mão (ver README). */
export const respostasPadaria = {
  M2_Q01: '2',
  M2_Q02: 'ate_1_dia',
  M2_Q04: 'menos_de_1h',
  M2_Q05: 'em_parte',
  M2_Q06: 'nao',
  M2_Q07: '1_2_por_ano',
  M2_Q08: 'manual',
  M2_Q09: 'so_o_dono',
  M2_Q10: 'em_parte',
  M2_Q11: 'algumas',
  M2_Q12: 'alguns',
  M2_Q13: 'todos_tudo',
  M2_Q14: 'nao_se_aplica',
  M2_Q15: 'sim_combinado',
};

/** Todas as perguntas respondidas com "não sei". */
export function tudoNaoSei() {
  return Object.fromEntries(questionario.perguntas.map((p) => [p.id, 'nao_sei']));
}
