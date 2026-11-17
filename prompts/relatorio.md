# Tarefa

Escreva o relatório do módulo **Avaliação de Riscos** para uma empresa do ramo **{{ramo}}**, porte **{{porte}}**. O objetivo é ajudar o dono a enxergar o que pode dar errado no negócio, o tamanho de cada problema e por onde começar.

# Dados da empresa

<perfil>
{{perfil}}
</perfil>

<respostas>
{{respostas}}
</respostas>

# Pontuação calculada pelo sistema (não altere)

{{pontuacao}}

# Matriz de riscos calculada pelo sistema (não altere)

{{matriz}}

# O que escrever

- **resumoParaODono**: até 5 frases. Diga a situação geral (use a cor do semáforo geral), o maior risco e o primeiro passo.
- **pontosFortes**: de 1 a 5 itens curtos, baseados nas respostas com prática adequada. Se não houver nenhuma, escreva um único item reconhecendo o interesse em avaliar os riscos.
- **pontosDeAtencao**: de 3 a 6 itens, começando pelos temas e riscos mais graves. Em `risco`, use `alto` para riscos de nível Alto, `medio` para Médio e `baixo` para Baixo.
- **planoDeAcao**: de 3 a 7 itens, em ordem de prioridade (1 = fazer primeiro). Comece pelas medidas sem custo ou de baixo custo que atacam os riscos mais graves. Cada ação deve ser concreta, algo que o dono consegue fazer sozinho ou com a equipe.
- **artefatos**: exatamente os itens descritos abaixo, com os mesmos `id`.
- **avisoLegal**: copie exatamente: "Material educacional de apoio; não substitui consultoria especializada, auditoria ou assessoria jurídica."

{{artefatos}}

# Formato da resposta

Responda só com este JSON (os valores abaixo são apenas exemplos de formato):

{
  "resumoParaODono": "…",
  "pontosFortes": ["…"],
  "pontosDeAtencao": [
    { "titulo": "…", "explicacao": "…", "risco": "alto" }
  ],
  "planoDeAcao": [
    { "prioridade": 1, "acao": "…", "porque": "…", "esforco": "baixo", "custo": "sem custo", "prazo": "esta semana" }
  ],
  "artefatos": [
    { "id": "matriz-riscos", "titulo": "Matriz de riscos (probabilidade × impacto)", "conteudoMarkdown": "…" },
    { "id": "plano-tratamento", "titulo": "Plano de tratamento dos 5 riscos principais", "conteudoMarkdown": "…" }
  ],
  "avisoLegal": "Material educacional de apoio; não substitui consultoria especializada, auditoria ou assessoria jurídica."
}

Valores permitidos:
- `risco`: `alto` | `medio` | `baixo`
- `esforco`: `baixo` | `medio` | `alto`
- `custo`: `sem custo` | `baixo` | `medio` | `alto`
- `prazo`: `esta semana` | `este mes` | `em 3 meses`

Não inclua os campos `modulo`, `versao`, `codinome`, `geradoEm` nem `pontuacao`: o sistema preenche esses campos.
