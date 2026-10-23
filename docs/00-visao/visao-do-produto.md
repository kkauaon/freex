# Visão do produto

## 1. Resumo

FREEX é uma plataforma web de escrita de roteiros para cinema e TV. O produto combina um editor que aplica o padrão de formatação da indústria, colaboração em tempo real e exportação para PDF com fidelidade de página.

A tese é simples: roteiristas não deveriam gastar energia com margens, fontes e quebras de página. Também não deveriam trocar arquivos por e-mail para escrever a quatro mãos. O formato deve ser invisível para quem escreve e impecável para quem lê.

## 2. Contexto

### 2.1 O roteiro é um documento técnico e literário

Um roteiro é lido por produtores, diretores, atores, departamentos de arte e equipes de produção. A formatação não é estética: ela codifica informação.

- O cabeçalho de cena diz **onde** e **quando** a ação acontece.
- A indentação separa **quem fala** do **que é dito** e do **que é visto**.
- A contagem de páginas estima **tempo de tela**. Uma página bem formatada equivale, aproximadamente, a um minuto.
- A numeração e as cores de revisão controlam **qual versão** cada departamento está usando.

Quando o formato quebra, a leitura quebra junto. Um PDF com fonte proporcional, margem errada ou diálogo largo demais parece amador antes de a primeira cena ser lida. Em produção, uma numeração de cena inconsistente pode custar dinheiro.

### 2.2 O mercado atual

Ferramentas especializadas resolvem o formato, mas cobram por isso de formas diferentes:

- **Celtx** popularizou o roteiro na web, com modelo de assinatura e um conjunto amplo de ferramentas de pré-produção.
- **Final Draft** é a referência de fato em produção, com foco em formatação, revisões e interoperabilidade.
- **WriterDuet** e **Arc Studio** apostam em colaboração e experiência web.
- **Google Docs e Word** são gratuitos e familiares, mas não entendem elementos de roteiro, paginação e exportação com fidelidade.

O espaço que FREEX ocupa é o de uma ferramenta web **gratuita e focada no essencial**: escrever bem, colaborar sem atrito e entregar um PDF que o mercado aceita. Sem transformar o roteirista em gerente de projeto e sem pedir assinatura para liberar o formato.

### 2.3 O problema em uma frase

O roteirista perde tempo com formato e com versões, em vez de perder tempo com a história.

## 3. Proposta de valor

### 3.1 Para quem escreve sozinho

- O documento já nasce no padrão, sem configuração.
- A prévia mostra a página real, com quebras e numeração.
- O PDF sai igual à prévia, com fonte incorporada.
- O editor entende os elementos e acelera a escrita com Tab/Enter, autocompletar de personagens e navegação por cena.
- O trabalho continua no navegador do celular, com um modo de edição linear e a mesma prévia paginada.

### 3.2 Para quem escreve em dupla ou em sala de roteiro

- Duas ou mais pessoas editam o mesmo documento ao vivo.
- Cursores e seleções mostram quem está onde.
- Permissões separam quem edita, quem comenta e quem apenas lê.
- Comentários ficam ancorados no trecho, não em um chat paralelo.
- O histórico mostra o que mudou, quando e por quem.

### 3.3 Para produtoras e coordenadores de roteiro

- Projetos organizados, com membros e papéis.
- Exportação consistente para leitura, reunião e submissão.
- Versões nomeadas e restauráveis.
- Base para recursos de produção, como numeração de cenas e cores de revisão.

## 4. Princípios de produto

1. **O padrão é o produto.** Formatação não é um recurso secundário. É a razão de existir da ferramenta.
2. **A página é a verdade do documento.** No desktop, o usuário vê a página; no celular, a edição é linear, mas a prévia paginada e o PDF continuam sendo a referência de layout.
3. **Colaboração sem cerimônia.** Entrar em um roteiro deve ser tão simples quanto abrir um link, com permissões claras.
4. **Silêncio visual.** A interface some quando o texto aparece. O foco é a página.
5. **Nada de surpresa no PDF.** O que está na prévia é o que sai no arquivo.
6. **Português primeiro, indústria global.** A interface é em pt-BR; o roteiro pode usar o vocabulário de elementos em inglês para submissão internacional.
7. **Dados do usuário não são matéria-prima.** Sem treinar modelos com roteiros sem consentimento explícito. Sem vender conteúdo.
8. **Acessível por padrão.** Teclado, leitores de tela, contraste e redução de movimento fazem parte do produto, não de uma fase posterior.

## 5. Público

### 5.1 Segmentos

| Segmento | Necessidade principal | Adequação ao FREEX |
|---|---|---|
| Roteiristas independentes | Formato correto e PDF para submissão | Alta: o essencial sem custo |
| Duplas e salas de roteiro | Edição simultânea e comentários | Alta: colaboração é núcleo do produto |
| Produtoras pequenas e médias | Organização de projetos e controle de acesso | Média: gestão de projetos é suporte, não o foco |
| Escolas e oficinas de roteiro | Feedback, versões e padronização | Alta: acesso gratuito reduz a barreira |
| Departamentos de desenvolvimento | Leitura, comparação de versões e histórico | Média: foco em escrita, não em fluxo de estúdio |

### 5.2 Não públicos do MVP

- Grandes estúdios com fluxos proprietários de revisão e integração com sistemas de produção.
- Equipes que precisam de planejamento de filmagem, orçamento e cronograma no mesmo documento.
- Usuários que querem um editor de texto genérico com aparência de roteiro.

## 6. Escopo

### 6.1 Dentro do escopo

- Roteiro cinematográfico (longa, curta) e teleplay em formato spec.
- Elementos: cabeçalho de cena, ação, personagem, parêntese, diálogo, transição e variantes de produção.
- Paginação com regras de viúva/órfã, `(MORE)` e `(CONT'D)`.
- Página de título.
- Colaboração em tempo real, presença, permissões e histórico.
- Comentários e resolução.
- Exportação em PDF, com opções de publicação.
- Vocabulário de elementos em inglês e português.
- Edição em desktop e celular, com modo mobile linear e prévia paginada.
- Perfil de página US Letter. A4 como opção de impressão local, com aviso.

### 6.2 Fora do escopo

- Formato de peça teatral, quadrinhos, audiodrama, publicidade e vídeo institucional.
- Storyboard, decupagem, plano de filmagem, orçamento e cronograma.
- Edição de imagem, som ou vídeo.
- Publicação de roteiros em marketplace ou comunidade.
- Assessoria de roteiro, coaching ou correção humana.
- Geração automática de roteiro por IA no MVP.
- Aplicativos nativos. O produto é web responsivo, instalável como PWA, com edição em desktop e celular.
- Planos pagos, assinatura ou cobrança pelo uso.

### 6.3 Escopo negativo explícito

FREEX não vai:

- alterar o texto do roteiro para "caber" na página;
- aplicar correções de estilo sem confirmação;
- exportar PDF com fonte substituta sem avisar;
- esconder do autor que uma página quebrou no meio de um diálogo;
- tratar comentários como parte do roteiro exportado, a menos que o autor peça;
- reservar recursos essenciais para um plano pago ou exigir cartão de crédito para escrever.

## 7. Diferenciais

| Diferencial | Como se traduz |
|---|---|
| Formatação como contrato | Constantes únicas, testes golden, PDF fiel, validação antes da exportação |
| Colaboração de verdade | CRDT, presença, permissões por papel, offline e reconexão |
| PDF de submissão | Courier Prime incorporada, página de título, numeração correta, sem artefatos de navegador |
| Foco | Menos abas, menos módulos, menos distração |
| Transparência | O usuário vê o que o validador corrigiu e por quê |
| Acesso gratuito | 100% gratuito, sem plano pago, assinatura ou cobrança pelo uso |

## 8. Métricas de sucesso

Métricas de produto, não de vaidade. As metas numéricas serão calibradas após o beta.

### 8.1 Ativação

- Percentual de novos usuários que criam um roteiro e exportam um PDF na primeira semana.
- Tempo até o primeiro parágrafo escrito.
- Percentual de roteiros que chegam a 10 páginas.

### 8.2 Engajamento

- Roteiros ativos por semana.
- Sessões de escrita por semana.
- Percentual de projetos com mais de um membro.
- Comentários resolvidos por projeto.

### 8.3 Qualidade

- Taxa de exportações concluídas sem erro.
- Taxa de PDFs com aviso de layout.
- Divergência entre prévia e PDF (meta: zero).
- Número de conflitos de colaboração que exigem intervenção manual (meta: zero).

### 8.4 Retenção

- Retenção semanal de quem escreveu pelo menos 30 minutos.
- Retenção de projetos com colaboração.
- Retenção de quem edita em desktop e em celular, separadamente.

### 8.5 Confiança

- Incidentes com perda de dados (meta: zero).
- Tempo de recuperação de uma versão anterior.
- NPS de suporte.

## 9. Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Complexidade de colaboração | Alta | Alto | CRDT consolidado, testes de convergência, escopo claro de permissões |
| Divergência entre prévia e PDF | Média | Alto | Motor de layout único, Chromium fixado, testes golden |
| Concorrência com ferramentas estabelecidas | Alta | Médio | Foco em formato + colaboração + acesso gratuito, não em amplitude de pré-produção |
| Custo operacional sem receita de assinatura | Média | Alto | Limites de uso, cache, retenção, infraestrutura enxuta e orçamento monitorado |
| Experiência de edição no celular | Alta | Médio | Modo linear específico, testes em dispositivos reais e prévia paginada somente leitura |
| Requisitos de produção (revisões, cenas) | Média | Médio | Fase 2/3, com desenho desde o modelo de dados |
| Privacidade de roteiros | Média | Alto | Criptografia, controle de acesso, política clara, sem treino sem consentimento |
| Dependência de Chromium para PDF | Média | Médio | Versão fixada, testes de regressão, fallback documentado |
| Internacionalização | Baixa | Médio | Vocabulário configurável, fonte com suporte a Latino; limites claros |

## 10. Premissas

1. O usuário principal já conhece o formato ou espera que a ferramenta o ensine.
2. A maior parte dos roteiros do MVP tem entre 5 e 130 páginas.
3. Duas a cinco pessoas colaboram na maioria dos projetos compartilhados.
4. O PDF é o artefato de entrega mais importante no curto prazo.
5. A escrita alterna desktop e celular; sessões longas tendem ao desktop, e revisões e ajustes acontecem no celular.
6. O usuário aceita aprender atalhos de teclado no desktop e usar a barra de elementos no celular.
7. A confiança nos dados é decisiva: um único incidente de perda pode destruir a reputação.

## 11. Não objetivos

- Ser um estúdio de produção completo.
- Substituir o julgamento criativo do roteirista.
- Competir por quantidade de recursos.
- Criar um formato proprietário de roteiro.
- Depender de uma única plataforma de nuvem para sempre.

## 12. Critérios de sucesso da fase 0

Esta documentação estará pronta para orientar a implementação quando:

- as normas de formatação tiverem fontes e valores fechados;
- os requisitos do MVP tiverem critérios de aceite testáveis;
- a arquitetura de colaboração e PDF tiver decisões registradas em ADR;
- o modelo de dados cobrir projetos, roteiros, versões, comentários e exportações;
- os riscos e decisões abertas estiverem explícitos;
- o roadmap tiver fases e critérios de saída.

## 13. Referências internas

- Personas e jornadas: [`personas-e-jornadas.md`](personas-e-jornadas.md)
- Requisitos: [`../01-requisitos/srs.md`](../01-requisitos/srs.md)
- Normas de formatação: [`../02-roteiro/normas-de-formatacao.md`](../02-roteiro/normas-de-formatacao.md)
- Arquitetura: [`../03-arquitetura/arquitetura-geral.md`](../03-arquitetura/arquitetura-geral.md)
