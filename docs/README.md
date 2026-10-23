# Documentação do FREEX

Índice geral, convenções de leitura e regras de manutenção.

## 1. Para que serve esta documentação

Este conjunto descreve o produto FREEX antes de o código existir. Ele tem três funções:

1. **Alinhar o produto.** O que será construído, para quem, com quais limites.
2. **Fixar o padrão de roteiro.** Medidas, elementos, paginação e critérios de validação que não podem ser inventados a cada tela.
3. **Servir de contrato técnico.** Arquitetura, modelo de dados, API, colaboração, PDF, segurança e critérios de aceite.

A documentação é viva. Quando o código divergir dela, a divergência deve ser resolvida no mesmo commit: ou o código se corrige, ou o documento é atualizado com justificativa.

## 2. Ordem de leitura

Para entender o produto:

1. [`00-visao/visao-do-produto.md`](00-visao/visao-do-produto.md)
2. [`00-visao/personas-e-jornadas.md`](00-visao/personas-e-jornadas.md)
3. [`01-requisitos/srs.md`](01-requisitos/srs.md)
4. [`02-roteiro/normas-de-formatacao.md`](02-roteiro/normas-de-formatacao.md)

Para implementar:

1. [`02-roteiro/normas-de-formatacao.md`](02-roteiro/normas-de-formatacao.md)
2. [`02-roteiro/elementos-e-convencoes.md`](02-roteiro/elementos-e-convencoes.md)
3. [`02-roteiro/paginacao-e-quebras.md`](02-roteiro/paginacao-e-quebras.md)
4. [`03-arquitetura/arquitetura-geral.md`](03-arquitetura/arquitetura-geral.md)
5. [`03-arquitetura/modelo-de-dados.md`](03-arquitetura/modelo-de-dados.md)
6. [`03-arquitetura/api.md`](03-arquitetura/api.md)
7. [`03-arquitetura/colaboracao-tempo-real.md`](03-arquitetura/colaboracao-tempo-real.md)
8. [`03-arquitetura/exportacao-pdf.md`](03-arquitetura/exportacao-pdf.md)
9. [`05-qualidade/testes-e-aceite.md`](05-qualidade/testes-e-aceite.md)

Para operar e lançar:

1. [`03-arquitetura/seguranca-e-privacidade.md`](03-arquitetura/seguranca-e-privacidade.md)
2. [`06-operacoes/deploy-e-observabilidade.md`](06-operacoes/deploy-e-observabilidade.md)
3. [`07-roadmap/roadmap.md`](07-roadmap/roadmap.md)

## 3. Mapa dos documentos

| Caminho | Tipo | Conteúdo |
|---|---|---|
| `00-visao/visao-do-produto.md` | Informativo | Problema, proposta, escopo, métricas, riscos |
| `00-visao/personas-e-jornadas.md` | Informativo | Personas, trabalhos a realizar, jornadas |
| `01-requisitos/srs.md` | Normativo | Requisitos funcionais e não funcionais, critérios de aceite |
| `02-roteiro/normas-de-formatacao.md` | **Normativo** | Página, fonte, margens, geometria, espaçamento, validação |
| `02-roteiro/elementos-e-convencoes.md` | **Normativo** | Gramática de cada elemento, casos especiais, exemplos |
| `02-roteiro/paginacao-e-quebras.md` | **Normativo** | Algoritmo de paginação, viúvas/órfãs, `(MORE)`/`(CONT'D)` |
| `02-roteiro/referencias.md` | Informativo | Fontes externas, o que cada uma sustenta, conflitos |
| `03-arquitetura/arquitetura-geral.md` | Normativo | Contexto, containers, stack, fluxos, falhas |
| `03-arquitetura/modelo-de-dados.md` | Normativo | Entidades, invariantes, índices, retenção |
| `03-arquitetura/colaboracao-tempo-real.md` | Normativo | CRDT, presença, persistência, offline, permissões |
| `03-arquitetura/exportacao-pdf.md` | Normativo | Pipeline, fidelidade, opções, segurança, testes |
| `03-arquitetura/api.md` | Normativo | Endpoints, erros, limites, versionamento |
| `03-arquitetura/seguranca-e-privacidade.md` | Normativo | Modelo de ameaças, RBAC, LGPD, resposta a incidentes |
| `03-arquitetura/adr/*.md` | Normativo | Decisões arquiteturais com contexto e consequências |
| `04-design/ux-e-interface.md` | Normativo | Arquitetura de informação, telas, atalhos, acessibilidade |
| `05-qualidade/testes-e-aceite.md` | Normativo | Estratégia de testes, fixtures, gates, aceite |
| `06-operacoes/deploy-e-observabilidade.md` | Normativo | Ambientes, CI/CD, SLOs, backups, runbooks |
| `06-operacoes/deploy-vps.md` | Rascunho | Roteiro manual de deploy em uma VPS (fase 1) |
| `07-roadmap/roadmap.md` | Informativo | Fases, dependências, riscos, decisões abertas |
| `08-glossario.md` | Informativo | Vocabulário de roteiro e de engenharia |

## 4. Linguagem normativa

Os documentos normativos usam os termos abaixo com sentido preciso, adaptados de RFC 2119:

| Termo | Significado |
|---|---|
| **DEVE** | Requisito obrigatório. O não cumprimento é um defeito. |
| **NÃO DEVE** | Proibição. O não cumprimento é um defeito. |
| **DEVERIA** | Recomendação forte. Pode ser ignorada apenas com justificativa registrada. |
| **PODE** | Opção permitida, sem obrigação. |
| **PADRÃO FREEX** | Decisão de produto dentro de uma faixa aceita pela indústria. Não é uma nova regra de mercado. |

Sempre que houver mais de uma convenção aceita, o documento diz isso explicitamente e marca a escolha do FREEX como **padrão de produto**. Isso evita a armadilha de apresentar uma preferência interna como se fosse uma lei da indústria.

## 5. Unidades e notação

- Medidas de página em polegadas (pol) e, quando útil, milímetros. O padrão canônico é US Letter.
- Fonte em pontos (pt). 12 pt = 1/6 pol de altura de linha.
- Larguras de texto em caracteres (células), porque Courier é monoespaçada a 10 caracteres por polegada.
- Posições horizontais sempre medidas **da borda esquerda da página**, não da margem.
- Exemplos de roteiro em blocos de código usam Courier Prime 12 pt e largura máxima de 60 caracteres.
- Datas em ISO 8601 (`2026-10-23`) nos documentos técnicos.
- Identificadores de requisitos: `FR-<ÁREA>-<NÚMERO>` e `NFR-<ÁREA>-<NÚMERO>`.

## 6. Regras de manutenção

1. **Fonte antes de regra.** Nenhuma medida ou convenção nova entra sem referência em [`02-roteiro/referencias.md`](02-roteiro/referencias.md). Se a fonte não existir, a regra não é "padrão da indústria"; é decisão de produto e deve ser marcada como tal.
2. **Um número, um lugar.** As constantes de formatação vivem em `02-roteiro/normas-de-formatacao.md` e, no código, em um único módulo (`packages/screenplay/src/format.ts`). Nenhuma tela ou componente repete o valor.
3. **Mudou comportamento, mudou documento.** Alteração de layout, permissão, API ou modelo de dados exige atualização do documento correspondente no mesmo commit.
4. **Requisito não se apaga.** Requisito obsoleto é marcado com ~~strikethrough~~ e uma nota de substituição. O histórico fica.
5. **ADRs são imutáveis.** Uma decisão nova que substitua outra cria um ADR com `Substitui: ADR-00X`.
6. **Sem placeholder.** Documento incompleto é marcado como `RASCUNHO` no topo, com a pendência explícita. Não se escreve "TODO" solto.
7. **Português claro.** Documentação em pt-BR. Código, nomes de tabelas, endpoints, variáveis e mensagens de commit em inglês.

## 7. Status dos documentos

| Documento | Status |
|---|---|
| Visão, personas, SRS | Aprovado para a fase 0 |
| Normas de formatação, elementos, paginação | Aprovado para a fase 0; sujeito a validação com roteiristas |
| Arquitetura, dados, API | Proposta técnica para a fase 1 |
| ADRs | Aceitos em 2026-10-23; mudança só por substituição |
| Colaboração e PDF | Proposta técnica para as fases 1 e 2 |
| Segurança, operações | Proposta para revisão antes do beta |
| UX | Proposta para validação com usuários |
| Roadmap | Vivo; revisado a cada fase |

## 8. Decisões fechadas e abertas

Três decisões estão fechadas e não devem ser tratadas como hipótese:

- **Gratuidade.** O FREEX é 100% gratuito, sem plano pago, assinatura ou cobrança pelo uso.
- **Desktop e mobile.** O produto funciona em desktop e celular, tanto para leitura quanto para edição. No celular, a edição usa um modo linear específico; a prévia paginada continua disponível.
- **Fonte.** O FREEX usa Courier Prime (SIL Open Font License) em todos os perfis. Não há fallback silencioso nem variante licenciada.

As decisões abaixo ainda não foram tomadas. Elas estão registradas aqui para não virarem suposições silenciosas:

| Tema | Pendência | Impacto |
|---|---|---|
| Sustentabilidade de custos | Como cobrir infraestrutura sem receita de assinatura | Limites de uso, capacidade, escolha de provedor |
| Importação | FDX, Fountain ou PDF no lançamento | Escopo da fase 1 ou 2 |
| Residência de dados | Brasil, EUA ou União Europeia | Infraestrutura, LGPD/GDPR, latência |
| Revisões de produção | Números de cena e cores de revisão no lançamento | Escopo e complexidade do editor |
| IA | Assistente de escrita e/ou análise | Produto, custo, privacidade |
| Licença do código | Antes do beta | Distribuição e contribuição |
| Links de edição sem conta | Prazo de validade, revogação e retenção dos roteiros compartilhados; hoje o link vale para sempre e nada é apagado | Privacidade, custo de armazenamento, abuso |

## 9. Glossário

Termos de roteiro e de engenharia estão em [`08-glossario.md`](08-glossario.md).
