// src/matriz.js
// Matriz de riscos 3×3 (probabilidade × impacto) — montada só pelo código.
// Catálogo fixo de 7 riscos; regras documentadas no README. Sem IA.

import { comoLista, perguntaVisivel, pontosDaPergunta } from './pontuacao.js';

export const CATALOGO = [
  { id: 'golpe-fraude', nome: 'Golpe ou fraude' },
  { id: 'ransomware', nome: 'Sequestro de dados (ransomware)' },
  { id: 'furto-perda', nome: 'Furto ou perda de equipamento' },
  { id: 'falha-equipamento-internet', nome: 'Falha de equipamento ou internet' },
  { id: 'erro-humano', nome: 'Erro humano' },
  { id: 'conta-invadida', nome: 'Conta invadida' },
  { id: 'vazamento-dados', nome: 'Vazamento de dados' },
];

const ROTULO_NIVEL = { baixo: 'Baixo', medio: 'Médio', alto: 'Alto' };
const ROTULO_IMPACTO = { 1: 'baixo', 2: 'médio', 3: 'alto' };

const limitar = (n) => Math.min(3, Math.max(1, n));

/** Nível do risco pelo produto P × I: 1–2 baixo · 3–4 médio · 6–9 alto. */
export function nivel(probabilidade, impacto) {
  const p = probabilidade * impacto;
  if (p <= 2) return 'baixo';
  if (p <= 4) return 'medio';
  return 'alto';
}

/** Probabilidade a partir da média dos pontos de controle (0 a 2). */
export function probabilidadePorMedia(media) {
  if (media === null) return 2;
  if (media >= 1.5) return 1;
  if (media >= 0.75) return 2;
  return 3;
}

/** Impacto pelo tempo que o negócio aguenta sem algo. */
export function impactoPorDuracao(valor) {
  switch (valor) {
    case 'menos_de_1h': return 3;
    case 'ate_1_dia': return 2;
    case 'ate_1_semana':
    case 'mais_de_1_semana': return 1;
    default: return 2; // não sei ou não respondida
  }
}

/** Ferramentas de leitura das respostas, já respeitando as condições. */
function leitor(questionario, perfil, respostas) {
  const porId = new Map(questionario.perguntas.map((p) => [p.id, p]));

  const valor = (id) => {
    const p = porId.get(id);
    if (!p || !perguntaVisivel(p, perfil)) return null;
    const v = respostas[id];
    return v === undefined || v === '' ? null : v;
  };

  const media = (ids) => {
    const pontos = ids
      .map((id) => porId.get(id))
      .filter(Boolean)
      .map((p) => pontosDaPergunta(p, perfil, respostas))
      .filter((x) => x !== null);
    if (pontos.length === 0) return null;
    return pontos.reduce((a, b) => a + b, 0) / pontos.length;
  };

  const tem = (campo, ...valores) => valores.some((v) => comoLista(perfil[campo]).includes(v));

  return { valor, media, tem };
}

/** Probabilidade e impacto de cada risco do catálogo. */
function avaliarRiscos(questionario, perfil, respostas) {
  const { valor, media, tem } = leitor(questionario, perfil, respostas);
  const incidente = perfil.P13_incidente === 'sim' ? 1 : 0;
  const q08 = valor('M2_Q08');

  const regras = {
    'golpe-fraude': () => ({
      probabilidade: limitar(probabilidadePorMedia(media(['M2_Q15', 'M2_Q11'])) + incidente),
      impacto: tem('P07_pagamentos', 'pix', 'link_pagamento') ? 3 : 2,
    }),

    ransomware: () => ({
      probabilidade: tem('P09_equipamentos', 'computador', 'notebook')
        ? probabilidadePorMedia(media(['M2_Q12', 'M2_Q15']))
        : 1,
      impacto: q08 === 'automatico' ? 2 : 3,
    }),

    'furto-perda': () => {
      const exposto = tem('P06_canais', 'loja_fisica')
        && tem('P09_equipamentos', 'notebook', 'tablet', 'celular_empresa', 'celular_pessoal');
      const q04 = valor('M2_Q04');
      return {
        probabilidade: limitar(2 + (exposto ? 1 : 0)),
        impacto: limitar(impactoPorDuracao(q04) + (valor('M2_Q10') === 'nao' ? 1 : 0)),
      };
    },

    'falha-equipamento-internet': () => {
      const duracoes = [valor('M2_Q02')];
      if (valor('M2_Q03') !== null) duracoes.push(valor('M2_Q03'));
      const pior = Math.max(...duracoes.map(impactoPorDuracao));
      const planoB = valor('M2_Q09') === 'sim_todos_sabem' ? 1 : 0;
      return {
        probabilidade: probabilidadePorMedia(media(['M2_Q07'])),
        impacto: limitar(pior - planoB),
      };
    },

    'erro-humano': () => ({
      probabilidade: limitar(
        probabilidadePorMedia(media(['M2_Q15', 'M2_Q13']))
        + (['6-10', '11-20', '21-49'].includes(perfil.P03_pessoas) ? 1 : 0),
      ),
      impacto: q08 === 'automatico' ? 1 : q08 === 'manual' ? 2 : 3,
    }),

    'conta-invadida': () => ({
      probabilidade: limitar(probabilidadePorMedia(media(['M2_Q11', 'M2_Q14'])) + incidente),
      impacto: tem('P06_canais', 'whatsapp', 'instagram', 'site_proprio', 'marketplace') ? 3 : 2,
    }),

    'vazamento-dados': () => {
      const guardaDados = tem('P08_dados', 'contato', 'cpf', 'endereco', 'saude', 'financeiros');
      if (!guardaDados) return { probabilidade: 1, impacto: 1 };
      return {
        probabilidade: probabilidadePorMedia(media(['M2_Q06', 'M2_Q13', 'M2_Q14'])),
        impacto: tem('P08_dados', 'cpf', 'saude', 'financeiros') ? 3 : 2,
      };
    },
  };

  return CATALOGO.map((risco, ordem) => {
    const { probabilidade, impacto } = regras[risco.id]();
    return {
      id: risco.id,
      nome: risco.nome,
      probabilidade,
      impacto,
      produto: probabilidade * impacto,
      nivel: nivel(probabilidade, impacto),
      ordem,
    };
  });
}

/**
 * Monta a matriz completa:
 * { riscos: [...], celulas: [9 células], principais: [5 ids] }.
 * Células em ordem de leitura: impacto 3→1 (linhas), probabilidade 1→3 (colunas).
 */
export function calcularMatriz(questionario, perfil = {}, respostas = {}) {
  const riscos = avaliarRiscos(questionario, perfil, respostas);

  const celulas = [];
  for (let impacto = 3; impacto >= 1; impacto--) {
    for (let probabilidade = 1; probabilidade <= 3; probabilidade++) {
      celulas.push({
        probabilidade,
        impacto,
        nivel: nivel(probabilidade, impacto),
        riscos: riscos
          .filter((r) => r.probabilidade === probabilidade && r.impacto === impacto)
          .map((r) => r.id),
      });
    }
  }

  // Desempate fixo: maior produto → maior impacto → ordem do catálogo.
  const principais = [...riscos]
    .sort((a, b) => b.produto - a.produto || b.impacto - a.impacto || a.ordem - b.ordem)
    .slice(0, 5)
    .map((r) => r.id);

  return {
    riscos: riscos.map(({ ordem, ...r }) => r),
    celulas,
    principais,
  };
}

/** Tabela da matriz em Markdown, com o nível escrito (não depende de cor). */
export function matrizEmMarkdown(matriz) {
  const nomes = new Map(matriz.riscos.map((r) => [r.id, r.nome]));
  const linhas = [
    '| Impacto \\ Probabilidade | 1 · baixa | 2 · média | 3 · alta |',
    '|---|---|---|---|',
  ];
  for (let impacto = 3; impacto >= 1; impacto--) {
    const colunas = [1, 2, 3].map((probabilidade) => {
      const c = matriz.celulas.find((x) => x.impacto === impacto && x.probabilidade === probabilidade);
      const lista = c.riscos.map((id) => nomes.get(id)).join('; ');
      return `**${ROTULO_NIVEL[c.nivel]}**${lista ? ': ' + lista : ''}`;
    });
    linhas.push(`| ${impacto} · ${ROTULO_IMPACTO[impacto]} | ${colunas.join(' | ')} |`);
  }
  return linhas.join('\n');
}
