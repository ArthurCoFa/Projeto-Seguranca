// src/pontuacao.js
// Índice e semáforo do M2 — calculados só pelo código, sem IA.
// Funções puras: a mesma entrada gera sempre o mesmo resultado.

export const NAO_SE_APLICA = 'nao_se_aplica';

/** Lê um campo do perfil sempre como lista (campos de múltipla escolha). */
export function comoLista(valor) {
  if (Array.isArray(valor)) return valor;
  if (valor === undefined || valor === null || valor === '') return [];
  return [valor];
}

/**
 * Diz se a pergunta aparece para este perfil.
 * Operadores aceitos em `condicao`: igual, diferente, contem, contemAlgum.
 */
export function perguntaVisivel(pergunta, perfil = {}) {
  const c = pergunta.condicao;
  if (!c) return true;
  const valor = perfil[c.campo];
  if ('igual' in c) return valor === c.igual;
  if ('diferente' in c) return valor !== c.diferente;
  if ('contem' in c) return comoLista(valor).includes(c.contem);
  if ('contemAlgum' in c) return c.contemAlgum.some((v) => comoLista(valor).includes(v));
  throw new Error(`Condição desconhecida na pergunta ${pergunta.id}.`);
}

/** Semáforo a partir do índice: verde ≥ 70 · amarelo 40–69 · vermelho < 40. */
export function semaforo(indice) {
  if (indice === null) return 'sem_dados';
  if (indice >= 70) return 'verde';
  if (indice >= 40) return 'amarelo';
  return 'vermelho';
}

/** Índice inteiro de 0 a 100, ou null quando não há nada para medir. */
export function indice(soma, maximo) {
  if (maximo === 0) return null;
  return Math.round((soma / maximo) * 100);
}

/**
 * Pontos de uma pergunta para uma resposta.
 * Devolve null quando a pergunta não entra no cálculo
 * (não pontua, não apareceu, "não se aplica" ou opcional em branco).
 */
export function pontosDaPergunta(pergunta, perfil, respostas) {
  if (pergunta.pontua === false) return null;
  if (!perguntaVisivel(pergunta, perfil)) return null;

  const valor = respostas[pergunta.id];
  if (valor === undefined || valor === null || valor === '') {
    // Obrigatória em branco conta como "não sei" (0); opcional em branco fica fora.
    return pergunta.obrigatoria ? 0 : null;
  }
  if (valor === NAO_SE_APLICA) return null;

  const opcao = pergunta.opcoes.find((o) => o.valor === valor);
  if (!opcao) throw new Error(`Resposta inválida na pergunta ${pergunta.id}.`);
  return opcao.pontos ?? 0;
}

/** Maior ponto possível da pergunta (2 no nosso questionário). */
export function maximoDaPergunta(pergunta) {
  return Math.max(0, ...pergunta.opcoes.map((o) => o.pontos ?? 0));
}

/**
 * Calcula a pontuação no formato da saída:
 * { indice, semaforo, porTema: [{ tema, indice, semaforo }] }.
 * `temas` define a ordem (do modulo.json); sem ele, usa a ordem do questionário.
 */
export function calcularPontuacao(questionario, perfil = {}, respostas = {}, temas) {
  const ordem = temas ?? [...new Set(questionario.perguntas.map((p) => p.tema))];
  const porTema = new Map(ordem.map((t) => [t, { soma: 0, maximo: 0 }]));
  let soma = 0;
  let maximo = 0;

  for (const pergunta of questionario.perguntas) {
    const pontos = pontosDaPergunta(pergunta, perfil, respostas);
    if (pontos === null) continue;
    const t = porTema.get(pergunta.tema);
    if (!t) throw new Error(`Tema desconhecido na pergunta ${pergunta.id}.`);
    const max = maximoDaPergunta(pergunta);
    t.soma += pontos;
    t.maximo += max;
    soma += pontos;
    maximo += max;
  }

  const geral = indice(soma, maximo);
  return {
    indice: geral,
    semaforo: semaforo(geral),
    porTema: ordem.map((tema) => {
      const { soma: s, maximo: m } = porTema.get(tema);
      const i = indice(s, m);
      return { tema, indice: i, semaforo: semaforo(i) };
    }),
  };
}
