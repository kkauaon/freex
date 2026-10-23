# AGENTS.md

Instruções para agentes e pessoas que trabalharem neste repositório.

## 1. Estado atual

O repositório está na **fase 1 (fundação mínima)**. Existe um scaffold funcional (`pnpm install`, `pnpm typecheck`, `pnpm test`) com `packages/screenplay` (elementos, máquina de estados, parsers, normalização, validação `FMT*`, ênfase inline, documento canônico e import/export Fountain como biblioteca), `packages/layout` (paginador com coesão, órfãs e viúvas, `(MORE)`/`(CONT'D)`, diálogo duplo, página de título, intervalo de páginas, hash e `LAYOUT_VERSION` 2; ver `paginacao-e-quebras.md`, seção 14), `packages/contracts`, `packages/pdf` (HTML pré-paginado + Chromium via Playwright, Courier Prime embutida), `apps/collab` (Hocuspocus 4 + Yjs: colaboração em tempo real por link de edição sem conta, `POST /v1/shares` e WebSocket, armazenamento em arquivos, limites de abuso, `TRUST_PROXY` atrás de proxy; roteiro de deploy em VPS em `docs/06-operacoes/deploy-vps.md` e arquivos em `deploy/`; ver `colaboracao-tempo-real.md`, seção 18) e `apps/api` (Fastify: `/v1/health`, `/v1/layout/paginate` e `/v1/export/pdf` síncrono, sem auth nem banco) e `apps/web` (Next.js com editor ProseMirror WYSIWYG: o texto é escrito direto nas folhas, com capa, quebras de página, número, `(MORE)`/`(CONT'D)` vindos do motor e Courier Prime; máquina de estados de elementos, ênfase, diálogo duplo, painel de problemas com salto ao trecho, rascunho local e exportação de PDF e Fountain; modo linear no celular, com a prévia numa aba; Compartilhar cria o link de edição e a rota `/s#token` abre o roteiro compartilhado com nome obrigatório, avatares, cursores com nome, painel Pessoas e quem editou; sem autenticação nem projetos; a raiz `/` lista os recentes deste navegador, com o rascunho em `/draft`). Não existem ainda: banco, auth, comentários, histórico de versões, persistência offline da colaboração (IndexedDB), revogação e validade dos links, worker/PDF, ESLint, CI, `pnpm dev` validado, `lint`, `test:e2e`, `test:pdf` e `db:migrate`.

Regras para o que ainda não existe:

- não invente comandos, endpoints ou variáveis de ambiente como se já funcionassem;
- não crie código de produção sem uma tarefa explícita;
- trate os documentos como contrato a ser implementado, não como código já escrito;
- se precisar propor uma estrutura, marque como proposta e atualize a documentação correspondente.

### 1.1 Invariantes de produto

- **Gratuito.** O FREEX é 100% gratuito, sem plano pago, assinatura, paywall ou cobrança pelo uso. Não introduza billing nem condicione recursos essenciais a pagamento.
- **Desktop e mobile.** Leitura e edição funcionam em desktop e celular. No celular, o editor usa modo linear; a prévia paginada e o PDF preservam a geometria canônica. Não publique uma versão somente leitura no celular.

## 2. Fonte de verdade

A ordem de precedência é:

1. [`docs/01-requisitos/srs.md`](docs/01-requisitos/srs.md) para o que o produto deve fazer.
2. [`docs/02-roteiro/normas-de-formatacao.md`](docs/02-roteiro/normas-de-formatacao.md) para página, fonte, margens, geometria e espaçamento.
3. [`docs/02-roteiro/elementos-e-convencoes.md`](docs/02-roteiro/elementos-e-convencoes.md) para gramática e conteúdo de cada elemento.
4. [`docs/02-roteiro/paginacao-e-quebras.md`](docs/02-roteiro/paginacao-e-quebras.md) para o algoritmo de paginação e quebras.
5. [`docs/03-arquitetura/`](docs/03-arquitetura/) para arquitetura, dados, API, colaboração, PDF e segurança.
6. [`docs/03-arquitetura/adr/`](docs/03-arquitetura/adr/) para decisões estruturais.
7. [`docs/04-design/ux-e-interface.md`](docs/04-design/ux-e-interface.md) para interface e interação.
8. [`docs/05-qualidade/testes-e-aceite.md`](docs/05-qualidade/testes-e-aceite.md) para verificação.
9. [`docs/06-operacoes/deploy-e-observabilidade.md`](docs/06-operacoes/deploy-e-observabilidade.md) para operação.

Se o código divergir de um documento, a divergência se resolve no mesmo commit: ou o código é corrigido, ou o documento é atualizado com justificativa. Não deixe a documentação mentir.

## 3. Invariantes de formatação

Estes valores são o contrato do produto. Não são preferências visuais.

| Item | Valor |
|---|---|
| Papel | US Letter, 8,5 × 11 pol, retrato |
| Fonte | Courier Prime 12 pt, 10 cpi, 6 lpi |
| Margem esquerda | 1,5 pol |
| Margens direita, superior e inferior | 1,0 pol |
| Área de texto | 6,0 × 9,0 pol |
| Grade | 60 colunas × 54 linhas de corpo |
| Cabeçalho de cena | 1,5 pol; 6,0 pol de largura |
| Ação | 1,5 pol; 6,0 pol de largura |
| Personagem | 3,7 pol; 2,2 pol de largura |
| Parêntese | 3,1 pol; 2,0 pol de largura |
| Diálogo | 2,5 pol; 3,5 pol de largura |
| Transição | alinhada à direita em 7,5 pol |
| Número de página | topo direito, 0,5 pol, formato `2.` |
| Página 1 | sem número |
| Página de título | sem número e fora da numeração |
| Espaço entre blocos | 1 linha em branco |
| Alinhamento | à esquerda, nunca justificado |
| Hifenização | nunca |
| Kerning e tracking | zero |

Diálogo duplo:

| Medida | Coluna esquerda | Coluna direita |
|---|---:|---:|
| Personagem | 2,75 pol | 5,75 pol |
| Parêntese | 2,25 a 4,0 pol | 5,25 a 7,25 pol |
| Diálogo | 2,0 a 4,5 pol | 5,0 a 7,5 pol |
| Largura do diálogo | 2,5 pol | 2,5 pol |
| Espaço entre colunas | 0,5 pol | — |

### 3.1 Regra de mudança

**Não altere uma constante de formatação sem fazer todas as etapas abaixo, no mesmo commit:**

1. atualizar a fonte em [`docs/02-roteiro/referencias.md`](docs/02-roteiro/referencias.md) ou registrar explicitamente que é decisão de produto;
2. atualizar [`docs/02-roteiro/normas-de-formatacao.md`](docs/02-roteiro/normas-de-formatacao.md) e, se aplicável, paginação e elementos;
3. atualizar fixtures e golden tests;
4. incrementar `profileVersion` quando a mudança alterar paginação ou geometria;
5. atualizar o ADR correspondente ou criar um novo, se a decisão for estrutural;
6. atualizar a tabela do [`README.md`](README.md), se o valor aparecer lá.

Mudança de constante sem golden test e sem versão de perfil é regressão, não melhoria.

### 3.2 O que nunca fazer

- Ajustar margem, fonte ou espaçamento para "caber" uma página.
- Usar fonte proporcional ou substituta silenciosa.
- Deixar o navegador decidir quebras de página no PDF.
- Introduzir quebra de página manual no documento.
- Copiar um número de outra ferramenta sem registrar a fonte.
- Apresentar uma escolha interna como se fosse norma da indústria.
- Mudar o layout e não mudar o hash ou a versão do motor.
- Introduzir plano pago, paywall ou cobrança pelo uso.
- Restringir o celular a leitura quando a mudança toca o editor.

## 4. Stack e estrutura planejadas

| Camada | Escolha |
|---|---|
| Runtime | Node.js 24 LTS |
| Monorepo | pnpm + Turborepo |
| Frontend | Next.js 15 (App Router), React 19 |
| API | Fastify 5 (ADR-006) |
| Entrega | Web responsiva + PWA, com modo mobile de edição |
| Linguagem | TypeScript estrito |
| Editor | ProseMirror + `y-prosemirror` |
| CRDT | Yjs |
| WebSocket | Hocuspocus |
| Banco | PostgreSQL 16 + Drizzle ORM |
| Cache/fila | Redis 7 + BullMQ |
| Storage | S3-compatível |
| Auth | Better Auth com schema próprio e integração Drizzle |
| UI | Tailwind CSS + Radix UI |
| Validação | Zod |
| PDF | Playwright + Chromium fixado |
| Testes | Vitest, Playwright, Testcontainers, fast-check, k6 |
| Observabilidade | OpenTelemetry, Sentry, Pino |

Estrutura planejada:

```text
apps/
  web/          Next.js: UI e shell PWA
  api/          Fastify: API REST, auth
  collab/       Hocuspocus
  worker/       BullMQ + PDF
packages/
  screenplay/   schema, elementos, constantes, validação
  layout/       paginação e coordenadas
  pdf/          renderização e pós-processamento
  contracts/    Zod + OpenAPI + tipos
  db/           schema Drizzle, migrações, repositórios
  auth/         sessão, papéis, políticas
  ui/           design system
  observability/
  config/
  test/
```

Regras de dependência:

- `screenplay` não depende de app, banco ou UI.
- `layout` depende apenas de `screenplay`.
- `pdf` depende de `layout` e `screenplay`.
- `apps/web` depende de `contracts`, `ui`, `screenplay` e `layout`; não acessa banco nem auth diretamente.
- `apps/api` depende de `contracts`, `db`, `auth`, `screenplay`, `layout` e `observability`. Atalho temporário da fundação: também depende de `pdf`, até `apps/worker` existir.
- `apps/collab` depende de `screenplay`, `contracts`, `db`, `auth` e `observability` (hoje usa `screenplay` e `contracts`: o armazenamento é em arquivos, sem `db`, e não há `auth`).
- `apps/worker` depende de `pdf`, `db` e `observability`.
- Nenhum pacote de domínio importa código de `apps/`.
- Nenhum componente de UI importa `db` diretamente.

## 5. Comandos

**Ainda não existem.** Quando o scaffold for criado, os comandos canônicos serão definidos no `package.json` da raiz e documentados aqui. A intenção é:

| Comando | Finalidade | Status |
|---|---|---|
| `pnpm install` | Instalar dependências | Funcional |
| `pnpm dev` | Subir web, collab e worker em modo local | Planejado |
| `pnpm build` | Build de produção | Planejado |
| `pnpm lint` | Lint e formatação | Planejado |
| `pnpm typecheck` | TypeScript estrito | Funcional |
| `pnpm test` | Unidade e integração | Funcional (screenplay, layout, pdf, api, web) |
| `pnpm --filter @freex/web e2e:collab` | Confere no Chromium, com duas pessoas, edição simultânea, presença, cursores, capa compartilhada, rede caindo e links inválidos; exige `pnpm --filter @freex/collab start` (com `WEB_ORIGIN`) e o web rodando | Funcional, manual; fora de `pnpm test` e sem CI |
| `pnpm --filter @freex/web e2e` | Confere no Chromium que o editor é WYSIWYG (cada página mede uma folha, linhas na grade de 16 px); exige `pnpm --filter @freex/web build && start` rodando | Funcional, manual; ainda fora de `pnpm test` e sem CI |
| `pnpm test:e2e` | Playwright | Planejado |
| `pnpm test:pdf` | Golden PDFs e paridade | Planejado |
| `pnpm db:migrate` | Migrações Drizzle | Planejado |

Não apresente esses comandos como funcionais até que o scaffold exista. Se um comando mudar, atualize esta tabela e o [`README.md`](README.md).

## 6. Convenções de código

Quando o código existir:

- TypeScript estrito; `any` exige justificativa em comentário e revisão.
- Validação de entrada com Zod em toda borda: HTTP, WebSocket, job e CLI.
- Nenhuma consulta a projeto, roteiro ou exportação apenas por ID; o vínculo de acesso faz parte da consulta.
- Permissão é verificada no servidor, nunca só na interface.
- Datas em UTC no armazenamento e no transporte; exibição no fuso do usuário.
- Identificadores, tabelas, endpoints, variáveis e mensagens de commit em inglês.
- Comentários de código em inglês, apenas quando explicam o porquê.
- Nenhum segredo, token ou conteúdo de roteiro em log, teste ou fixture.
- Logs estruturados com `event`, `request_id`, `trace_id`, ator, projeto, resultado e duração; sem texto de roteiro.
- Erros de usuário sem stack trace, caminho interno ou consulta SQL.
- Testes de autorização para cada endpoint e cada papel.
- Acessibilidade: toda ação por teclado, foco visível, contraste e anúncio de elemento.
- O motor de layout não mede texto pelo DOM; usa contagem de caracteres e tabela fixa.
- O PDF não recalcula quebras; usa o HTML pré-paginado.

## 7. Documentação

- Documentação em pt-BR. Código e identificadores em inglês.
- Termos normativos: **DEVE**, **NÃO DEVE**, **DEVERIA**, **PODE**, **PADRÃO FREEX**, conforme [`docs/README.md`](docs/README.md).
- Requisito obsoleto é marcado com ~~strikethrough~~ e nota de substituição; não se apaga.
- ADR é imutável; mudança de decisão cria novo ADR com `Substitui: ADR-00X`.
- Documento incompleto é marcado `RASCUNHO` no topo, com pendência explícita. Não use `TODO` solto.
- Link relativo deve apontar para arquivo existente. Verifique antes de concluir.
- Toda regra de formatação precisa de fonte ou marcação de decisão de produto.
- Mudou comportamento, mudou documento no mesmo commit.

## 8. Segurança

- Falha fechada: se a autorização não puder ser verificada, negue.
- Segredo não entra no repositório, na imagem, no log ou na mensagem de erro.
- Credencial possivelmente exposta interrompe o trabalho até rotação.
- Valide entrada em toda fronteira de confiança.
- Não confie em `role`, `projectId` ou `scriptId` enviados pelo cliente sem verificar no banco.
- PDF e colaboração têm superfícies próprias; leia [`docs/03-arquitetura/seguranca-e-privacidade.md`](docs/03-arquitetura/seguranca-e-privacidade.md) antes de mexer nelas.
- Nunca registre conteúdo de roteiro, comentário, token ou senha.

## 9. Definition of done

Uma tarefa só está concluída quando:

1. O comportamento corresponde ao requisito e à especificação de formato.
2. Há teste que falha sem a mudança e passa com ela.
3. Golden layout e PDF continuam passando, ou foram atualizados com justificativa e revisão.
4. Migração, contrato de API e modelo de dados foram atualizados, se aplicável.
5. Documentação correspondente foi atualizada no mesmo commit.
6. Nenhum segredo, log temporário ou código comentado ficou para trás.
7. Acessibilidade, teclado e toque foram verificados quando a mudança toca a interface.
8. A mudança foi verificada em viewport de 360 px quando afeta o editor ou a leitura.
9. O diff foi revisado e contém apenas a mudança pretendida.
10. O comando de verificação aplicável foi executado e o resultado foi relatado.
11. Riscos, limitações e decisões abertas foram registrados.

## 10. O que pedir antes de fazer

Pergunte antes de:

- alterar uma constante de formatação ou o perfil de página;
- introduzir cobrança, plano pago ou paywall;
- restringir a edição no celular a leitura;
- apagar ou reescrever um ADR;
- mudar o modelo de permissões;
- introduzir um serviço, banco ou provedor novo;
- mudar a política de retenção ou de privacidade;
- tomar uma decisão de produto listada como aberta em [`docs/README.md`](docs/README.md);
- executar ação destrutiva em dados, banco ou storage;
- acessar credencial ou ambiente de produção.

## 11. Decisões abertas

Não trate como resolvido:

- sustentabilidade de custos sem receita de assinatura;
- importação FDX, Fountain ou PDF;
- residência de dados;
- revisões de produção e números de cena;
- IA;
- licença do código.

Elas estão em [`docs/README.md`](docs/README.md) e no [`docs/07-roadmap/roadmap.md`](docs/07-roadmap/roadmap.md).

## 12. Leitura mínima antes de codar

1. [`README.md`](README.md)
2. [`docs/README.md`](docs/README.md)
3. [`docs/02-roteiro/normas-de-formatacao.md`](docs/02-roteiro/normas-de-formatacao.md)
4. [`docs/02-roteiro/paginacao-e-quebras.md`](docs/02-roteiro/paginacao-e-quebras.md)
5. [`docs/03-arquitetura/arquitetura-geral.md`](docs/03-arquitetura/arquitetura-geral.md)
6. [`docs/05-qualidade/testes-e-aceite.md`](docs/05-qualidade/testes-e-aceite.md)

Se o tempo for curto, leia pelo menos os itens 3 e 4. Eles definem o que o produto promete.
