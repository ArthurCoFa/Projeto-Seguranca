// src/prompts.js
// Monta os prompts a partir dos modelos em prompts/*.md.
// Envia à IA só o necessário: sem codinome, sem UF, sem valores crus.

import { readFileSync } from 'node:fs';
import { comoLista, perguntaVisivel } from './pontuacao.js';

const PASTA = new URL('../prompts/', import.meta.url);
const cache = new Map();

/** Lê um modelo de prompts/ (uma vez só). */
export function lerModelo(nome) {
  if (!cache.has(nome)) cache.set(nome, readFileSync(new URL(nome, PASTA), 'utf8'));
  return cache.get(nome);
}

/** Troca {{variavel}} pelos valores. Uma só passada: valores não são reprocessados. */
export function preencher(modelo, variaveis) {
  return modelo.replace(/\{\{(\w+)\}\}/g, (_, nome) => {
    if (!(nome in variaveis)) throw new Error(`Variável sem valor no prompt: ${nome}`);
    return String(variaveis[nome]);
  });
}

/** Texto livre do cliente: sem < > e {{ }}, uma linha, até 280 caracteres. */
export function limparTextoLivre(texto) {
  return String(texto ?? '')
    .replace(/[<>]/g, '')
    .replace(/\{\{|\}\}/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 280);
}

// Rótulos do perfil comum (somente os campos enviados à IA).
const PERFIL = {
  P01_ramo: ['Ramo', {
    comercio_varejista: 'comércio varejista', alimentacao: 'alimentação', beleza_estetica: 'beleza e estética',
    saude: 'saúde', servicos_profissionais: 'serviços profissionais', educacao: 'educação',
    industria_confeccao: 'indústria ou confecção', servicos_tecnicos: 'serviços técnicos',
    comercio_online: 'comércio online', outro: 'outro',
  }],
  P02_porte: ['Porte', { mei: 'MEI (microempreendedor individual)', me: 'ME (microempresa)', epp: 'EPP (empresa de pequeno porte)' }],
  P03_pessoas: ['Pessoas que trabalham (com o dono)', { 1: 'só o dono', '2-5': '2 a 5', '6-10': '6 a 10', '11-20': '11 a 20', '21-49': '21 a 49' }],
  P04_tempo: ['Tempo de funcionamento', { menos_de_1: 'menos de 1 ano', '1-3': '1 a 3 anos', '4-10': '4 a 10 anos', mais_de_10: 'mais de 10 anos' }],
  P06_canais: ['Canais de venda e atendimento', {
    loja_fisica: 'loja física', whatsapp: 'WhatsApp', instagram: 'Instagram', site_proprio: 'site próprio',
    marketplace: 'marketplace', telefone: 'telefone', apps_delivery: 'aplicativos de entrega',
  }],
  P07_pagamentos: ['Formas de recebimento', {
    dinheiro: 'dinheiro', pix: 'Pix', cartao_maquininha: 'cartão na maquininha', boleto: 'boleto',
    link_pagamento: 'link de pagamento', crediario: 'crediário',
  }],
  P08_dados: ['Dados de clientes que guarda', {
    nenhum: 'nenhum', contato: 'contato', cpf: 'CPF', endereco: 'endereço', saude: 'dados de saúde', financeiros: 'dados financeiros',
  }],
  P09_equipamentos: ['Equipamentos de trabalho', {
    computador: 'computador', notebook: 'notebook', celular_empresa: 'celular da empresa',
    celular_pessoal: 'celular pessoal', tablet: 'tablet',
  }],
  P10_sistemas: ['Sistemas e serviços', {
    sistema_gestao: 'sistema de gestão ou vendas', planilhas: 'planilhas', email_nuvem: 'e-mail e arquivos na nuvem',
    sistema_contador: 'sistema do contador', agenda_online: 'agenda online', nenhum: 'nenhum',
  }],
  P11_site: ['Tem site ou loja virtual', { sim: 'sim', nao: 'não' }],
  P12_ti: ['Quem cuida da tecnologia', { dono: 'o dono', funcionario: 'um funcionário', terceirizado: 'um terceirizado', ninguem: 'ninguém' }],
  P13_incidente: ['Golpe ou problema de segurança nos últimos 2 anos', { sim: 'sim', nao: 'não', nao_sei: 'não sabe' }],
};

const rotulo = (mapa, valor) => mapa[valor] ?? limparTextoLivre(valor);

/** Nome do ramo em texto (usa P01_outro, limpo, quando o ramo é "outro"). */
export function textoRamo(perfil) {
  if (perfil.P01_ramo === 'outro' && perfil.P01_outro) return limparTextoLivre(perfil.P01_outro);
  return rotulo(PERFIL.P01_ramo[1], perfil.P01_ramo) || 'não informado';
}

export function textoPorte(perfil) {
  return rotulo(PERFIL.P02_porte[1], perfil.P02_porte) || 'não informado';
}

/** Perfil em linhas legíveis — sem codinome e sem UF. */
export function textoPerfil(perfil) {
  return Object.entries(PERFIL)
    .filter(([campo]) => perfil[campo] !== undefined)
    .map(([campo, [nome, mapa]]) => {
      const valores = campo === 'P01_ramo' ? [textoRamo(perfil)] : comoLista(perfil[campo]).map((v) => rotulo(mapa, v));
      return `- ${nome}: ${valores.join(', ') || 'não informado'}`;
    })
    .join('\n');
}

/** Respostas em linhas legíveis — só as perguntas que apareceram. */
export function textoRespostas(questionario, perfil, respostas) {
  return questionario.perguntas
    .filter((p) => perguntaVisivel(p, perfil))
    .map((p) => {
      const valor = respostas[p.id];
      let resposta;
      if (valor === undefined || valor === null || valor === '') resposta = '(sem resposta)';
      else if (p.tipo === 'texto_curto') resposta = `"${limparTextoLivre(valor)}"`;
      else if (p.tipo === 'escala_1_5' && valor !== 'nao_sei') resposta = `${valor} de 5`;
      else resposta = p.opcoes.find((o) => o.valor === valor)?.rotulo ?? '(resposta inválida)';
      return `- [${p.tema}] ${p.texto} → ${resposta}`;
    })
    .join('\n');
}

const COR = { verde: 'verde', amarelo: 'amarelo', vermelho: 'vermelho', sem_dados: 'sem dados suficientes' };
const NIVEL = { baixo: 'Baixo', medio: 'Médio', alto: 'Alto' };

export function textoPontuacao(pontuacao) {
  const fmt = (i, s) => (i === null ? COR.sem_dados : `${i} de 100 (${COR[s]})`);
  return [
    `- Índice geral: ${fmt(pontuacao.indice, pontuacao.semaforo)}`,
    ...pontuacao.porTema.map((t) => `- ${t.tema}: ${fmt(t.indice, t.semaforo)}`),
  ].join('\n');
}

export function textoMatriz(matriz) {
  const nomes = new Map(matriz.riscos.map((r) => [r.id, r.nome]));
  return [
    'Riscos (probabilidade e impacto de 1 a 3):',
    ...matriz.riscos.map((r) => `- ${r.nome}: probabilidade ${r.probabilidade}, impacto ${r.impacto}, nível ${NIVEL[r.nivel]}`),
    '',
    'Riscos principais (nesta ordem):',
    ...matriz.principais.map((id, i) => `${i + 1}. ${nomes.get(id)}`),
  ].join('\n');
}

/**
 * Monta { sistema, usuario } para o adaptador.
 * Entrada já validada e pontuação/matriz já calculadas pelo código.
 */
export function montarPrompts({ questionario, modulo, perfil, respostas, pontuacao, matriz }) {
  const ramo = textoRamo(perfil);
  const porte = textoPorte(perfil);
  const referencias = lerModelo('referencias.md').trim();

  const artefatos = modulo.artefatos
    .map((a) => preencher(lerModelo(`artefato-${a.id}.md`), { ramo, porte }).trim())
    .join('\n\n');

  const sistema = preencher(lerModelo('sistema.md'), { ramo, porte, referencias });
  const usuario = preencher(lerModelo('relatorio.md'), {
    ramo,
    porte,
    perfil: textoPerfil(perfil),
    respostas: textoRespostas(questionario, perfil, respostas),
    pontuacao: textoPontuacao(pontuacao),
    matriz: textoMatriz(matriz),
    artefatos,
  });

  return { sistema, usuario };
}

/** Pedido de correção quando a IA devolve JSON inválido (1 nova tentativa). */
export function montarPromptCorrecao(usuario, erro) {
  return `${usuario}\n\n---\n\n${preencher(lerModelo('correcao-json.md'), { erro: limparTextoLivre(erro) })}`;
}
