# Testes e aceite

**Status:** proposta para a fase 1
**Relaciona-se com:** [`../01-requisitos/srs.md`](../01-requisitos/srs.md), [`../02-roteiro/paginacao-e-quebras.md`](../02-roteiro/paginacao-e-quebras.md), [`../03-arquitetura/exportacao-pdf.md`](../03-arquitetura/exportacao-pdf.md), [`../03-arquitetura/colaboracao-tempo-real.md`](../03-arquitetura/colaboracao-tempo-real.md)

---

## 1. Objetivo

Garantir que o FREEX cumpra três promessas que não podem falhar em produção:

1. o roteiro está sempre no formato especificado;
2. o PDF é idêntico à prévia;
3. nenhuma edição é perdida, mesmo com concorrência, rede instável ou falha de componente.

O resto do produto, por importante que seja, é construído sobre essas três. A estratégia de testes é organizada por risco, não por cobertura de arquivo.

## 2. Princípios

- **Testar o contrato, não a implementação.** O motor de layout é testado pela saída canônica, não por detalhes internos.
- **Golden files para o que é visual e determinístico.** Layout e PDF têm referências versionadas.
- **Property-based para o que é combinatorial.** Paginação, normalização e convergência se beneficiam de geração aleatória com invariantes.
- **Testes de autorização em todos os endpoints.** Não basta testar o caso feliz.
- **Falha de teste é falha de build.** Não existe "vermelho conhecido" sem issue, dono e prazo.
- **Dados sintéticos.** Nenhum roteiro real de usuário entra em fixture, CI ou ambiente de teste.
- **Teste lento é teste noturno.** O merge não espera uma suíte de 40 minutos.
- **Nenhum teste depende de produção.** Staging usa cópia anonimizada.

## 3. Camadas

| Camada | Ferramenta | O que cobre | Quando roda |
|---|---|---|---|
| Unidade | Vitest | Funções puras, schema, normalização, permissões | Cada PR |
| Propriedade | fast-check + Vitest | Invariantes de paginação, texto, convergência | Cada PR (amostra) e noturno (completo) |
| Golden layout | Vitest + snapshots canônicos | Páginas, linhas, hash | Cada PR |
| Integração | Vitest + Testcontainers | Banco, Redis, storage, fila | Cada PR (subset) e noturno |
| Contrato | Zod + OpenAPI + testes de schema | API REST, payloads, erros | Cada PR |
| E2E | Playwright | Jornadas, teclado, colaboração, PDF | Cada PR (crítico) e noturno |
| Visual | Playwright + pixelmatch | Página, editor, PDF | Noturno e release |
| Carga | k6 | API, WebSocket, exportação | Semanal e release |
| Segurança | Semgrep, npm audit, ZAP, testes de autorização | Vulnerabilidades e isolamento | Cada PR e noturno |
| Acessibilidade | axe-core + teste manual | WCAG 2.2 AA | Cada PR e release |

A pirâmide não é uma regra estética. O motor de layout merece muitos testes de unidade e propriedade porque é determinístico e barato de testar. A colaboração merece testes de integração e caos porque o comportamento emerge de várias réplicas.

## 4. Organização

```text
packages/test/
  fixtures/
    scripts/
      minimal.json
      ten-pages.json
      all-elements.json
      broken-dialogue.json
      dual-dialogue.json
      long-scene-heading.json
      accents.json
      a4.json
    pdf/
      ten-pages.pdf
      all-elements.pdf
      title-page.pdf
    expected/
      ten-pages.layout.json
      ten-pages.hash
  helpers/
    layout.ts
    pdf.ts
    collab.ts
    auth.ts
```

Convenções:

- nome de teste descreve comportamento: `quebra diálogo longo com MORE e CONT'D`, não `teste 3`.
- fixture tem um propósito documentado em comentário curto.
- golden file só muda com revisão explícita e justificativa no PR.
- nenhum teste usa `sleep` fixo quando existe condição observável.
- IDs de teste seguem `T-<ÁREA>-<NÚMERO>` e aparecem no relatório de aceite.

## 5. Testes de formatação e paginação

### 5.1 Casos obrigatórios

Os 20 casos de [`../02-roteiro/paginacao-e-quebras.md`](../02-roteiro/paginacao-e-quebras.md) são a base. Cada um vira um teste nomeado:

| ID | Cenário | Verificação |
|---|---|---|
| T-FMT-001 | Documento vazio | 1 página, sem número |
| T-FMT-002 | Exatamente 54 linhas | 1 página, última linha na posição correta |
| T-FMT-003 | 55 linhas | 2 páginas, 1 linha na segunda |
| T-FMT-004 | Cena na linha 53 | Cena desce inteira |
| T-FMT-005 | Cena na linha 52 + 2 linhas | Cena e ação ficam |
| T-FMT-006 | Personagem na linha 54 | Personagem desce |
| T-FMT-007 | Personagem na linha 53 + 1 diálogo | Cabe |
| T-FMT-008 | Diálogo de 40 linhas | `(MORE)` e `(CONT'D)` corretos |
| T-FMT-009 | Diálogo de 3 linhas com 4 livres | Cabe inteiro |
| T-FMT-010 | Diálogo de 3 linhas com 3 livres | Move inteiro |
| T-FMT-011 | Diálogo duplo de 8 linhas | Cabe ou move inteiro |
| T-FMT-012 | Diálogo duplo de 60 linhas | Erro de conteúdo, sem divisão |
| T-FMT-013 | Ação de 5 linhas com 3 livres | Divide 3 + 2 |
| T-FMT-014 | Ação de 5 linhas com 1 livre | Move inteiro |
| T-FMT-015 | Transição no fim da página | Fica se cabe, desce se não |
| T-FMT-016 | Título + roteiro | Título sem número; página 1 sem número |
| T-FMT-017 | Intervalo 10–20 | 11 páginas, números originais |
| T-FMT-018 | A4 | Grade 57 × 58 |
| T-FMT-019 | Acento e cedilha | Largura e PDF corretos |
| T-FMT-020 | Palavra de 40 caracteres | Quebra por caractere e aviso |

### 5.2 Invariantes de propriedade

Gerar documentos aleatórios dentro do schema e verificar:

- nenhuma linha excede a largura do elemento;
- nenhuma página excede 54 linhas de corpo;
- toda linha tem coordenada dentro da página;
- a soma de linhas e espaços antes de um bloco é igual à altura do bloco;
- um cabeçalho de cena nunca é a última linha da página;
- um personagem nunca é a última linha da página;
- um parêntese nunca é a última linha da página;
- toda fala dividida tem `(MORE)` na página de origem e `(CONT'D)` na seguinte;
- a página de título nunca recebe número;
- o número de páginas é monotônico quando se adiciona conteúdo ao fim;
- o mesmo documento, duas execuções, produz o mesmo hash.

### 5.3 Determinismo

- Rodar o layout 100 vezes com o mesmo input e comparar o hash.
- Rodar em Node e no navegador, com o mesmo input, e comparar a saída canônica.
- Rodar com larguras de janela diferentes e confirmar que a saída não muda.
- Rodar com `Intl` e fuso diferentes e confirmar que datas não afetam o layout do corpo.
- Verificar que o hash não depende da ordem de propriedades do objeto.

### 5.4 Normalização e validação

- Cabeçalho, personagem, transição e plano em maiúsculas.
- Cabeçalho sem `INT.`/`EXT.` gera erro bloqueante.
- Personagem sem diálogo gera erro bloqueante.
- Parêntese solto é rejeitado pelo schema.
- Diálogo duplo com uma coluna vazia é rejeitado.
- Texto com caracteres fora do Latino gera aviso e não quebra o layout.
- Colagem de HTML externo é convertida em texto ou rejeitada, nunca injetada.

## 6. Testes de PDF

### 6.1 Paridade

Para cada fixture:

1. calcular o layout da prévia;
2. gerar o PDF;
3. comparar número de páginas;
4. comparar o hash de layout;
5. comparar a posição de cada linha com tolerância de 0,01 pol;
6. comparar o texto extraído, normalizando espaços;
7. comparar as quebras de página.

Uma diferença de página é falha bloqueante. Uma diferença de posição acima da tolerância também.

### 6.2 Golden PDFs

- PDFs de referência versionados em `packages/test/fixtures/pdf/`.
- Comparação binária não é suficiente; comparar páginas, texto, fontes e posições.
- Diff visual com `pixelmatch`, tolerância para antialiasing.
- Atualização de golden exige revisão de duas pessoas e registro do motivo.
- O PDF de referência é gerado no mesmo container Linux da produção.

### 6.3 Fonte e metadados

- `pdffonts` confirma Courier Prime incorporada e subsetada.
- Nenhuma fonte substituta aparece.
- `pdftotext` confirma acentos, cedilha e texto selecionável.
- `pdfinfo` confirma número de páginas, tamanho e metadados.
- Metadados não contêm caminho interno, token, ID de sessão ou nome de usuário não configurado.
- PDF não contém JavaScript, formulário, anexo ou link externo inesperado.
- PDF de outro projeto não é acessível por URL, mesmo com ID válido.

### 6.4 Falhas

- Fonte indisponível: job falha com `EXPORT_FONT_ERROR`, sem arquivo parcial.
- Chromium crash: retry, depois dead-letter.
- Timeout: job falha, sem PDF truncado.
- Storage indisponível: job falha, sem registro `ready`.
- Snapshot inexistente: erro claro, sem renderizar estado atual.

## 7. Testes de colaboração

### 7.1 Convergência

- Duas réplicas aplicam as mesmas atualizações em ordens diferentes e convergem.
- Edições concorrentes na mesma frase preservam ambas.
- Inserção e remoção concorrentes no mesmo bloco não geram texto órfão.
- Undo local não desfaz edição remota.
- 10 réplicas com 1.000 operações aleatórias convergem para o mesmo estado.

Ferramenta: fast-check para gerar operações, Yjs como modelo, comparação de estado canônico.

### 7.2 Offline e reconexão

- Cliente offline por 1, 10 e 30 minutos; edições persistem e sincronizam.
- Fechar e reabrir a aba mantém a cópia local.
- Reconexão com token expirado renova e sincroniza.
- Duas abas do mesmo usuário não duplicam presença.
- Queda do servidor de colaboração: cliente entra em offline, não perde texto.

### 7.3 Permissões

- `viewer` e `commenter` não enviam update de texto, mesmo com cliente alterado.
- Remoção de membro encerra a sessão em até 60 s.
- Token de outro projeto é rejeitado.
- Token expirado é rejeitado.
- Papel alterado no banco é aplicado na próxima mensagem sensível.
- awareness não vaza e-mail ou dado pessoal desnecessário.

### 7.4 Estrutura

- Edição concorrente que divide uma fala é normalizada.
- Edição que apaga o personagem de uma fala é corrigida ou quarentenada.
- Duas pessoas criam diálogo duplo ao mesmo tempo; o resultado é válido.
- Documento com schema antigo abre em leitura ou é migrado.
- Documento inválido não é renderizado como se fosse válido.

### 7.5 Carga e caos

- 50 conexões simultâneas no mesmo roteiro.
- 10.000 usuários simultâneos por região no beta.
- Duas instâncias de colaboração com Redis.
- Queda do Redis durante edição.
- Queda do PostgreSQL durante persistência.
- Latência de rede de 200 ms e perda de 1% dos pacotes.
- Reconexão em massa após queda.
- Backlog de persistência e recuperação.

## 8. Testes de API e backend

### 8.1 Integração

- Banco real em Testcontainers, com migrações aplicadas.
- Redis real para fila, rate limit e pub/sub.
- Storage fake ou MinIO.
- Cada teste cria e limpa seu próprio tenant.

### 8.2 Contrato

- Respostas validadas contra o schema Zod e o OpenAPI.
- Erros seguem o formato `{ code, message, details, requestId }`.
- Paginação por cursor, sem duplicar ou pular itens.
- Idempotência: repetir `POST` com a mesma chave não cria duplicata.
- Concorrência otimista: `If-Match` desatualizado retorna 409.
- Limite de payload retorna 413 com mensagem clara.

### 8.3 Autorização

Para cada endpoint, testar a matriz completa de papéis da SRS:

- `owner`, `editor`, `commenter`, `viewer`;
- não membro;
- membro de outro projeto;
- usuário não autenticado;
- token expirado;
- recurso inexistente.

O teste deve falhar se um endpoint retornar dado de outro projeto, mesmo com ID correto.

### 8.4 Migrações

- Banco vazio: todas as migrações aplicam.
- Banco com fixture da versão anterior: migração aplica sem perda.
- Rollback quando suportado.
- Migração não bloqueia tabela grande por tempo excessivo.
- Dados de teste não vazam para produção.

## 9. Testes de frontend e E2E

### 9.1 Jornadas críticas

| ID | Jornada | Verificação |
|---|---|---|
| T-E2E-001 | Cadastro e primeiro roteiro | Conta criada, e-mail verificado, projeto e roteiro abertos |
| T-E2E-002 | Escrever uma cena completa | Todos os elementos, Tab/Enter, normalização |
| T-E2E-003 | Exportar PDF | Validação, opções, progresso, download, página de título |
| T-E2E-004 | Colaboração em duas sessões | Cursores, edição concorrente, presença |
| T-E2E-005 | Offline e reconexão | Banner, edição local, sincronização |
| T-E2E-006 | Comentário e resolução | Anchor, resposta, resolver, reabrir |
| T-E2E-007 | Versão e restauração | Criar, comparar, restaurar, histórico |
| T-E2E-008 | Permissões | Viewer, commenter, editor, owner |
| T-E2E-009 | Convite e remoção | Convite, aceite, remoção, sessão encerrada |
| T-E2E-010 | Edição e leitura em tablet e celular | Modo linear, barra de elementos, teclado virtual, diálogo duplo, comentário, prévia paginada e exportação |
| T-E2E-011 | Erro de exportação | Fonte indisponível, mensagem, retry |
| T-E2E-012 | Sessão expirada | Reautenticação sem perder edição local |
| T-E2E-013 | Mobile offline e reconexão | Shell PWA, edição local, sincronização sem perda |

### 9.2 Teclado

- Tabular por todos os controles sem armadilha de foco.
- `Esc` fecha diálogos e devolve o foco ao elemento anterior.
- `Enter` e `Space` ativam botões.
- Setas navegam em listas e abas.
- Atalhos não disparam quando o foco está em campo de texto, salvo os globais.
- Nenhuma ação essencial depende de hover.

### 9.3 Responsividade

- 360 × 640: edição mobile linear, comentário, prévia paginada e exportação.
- 390 × 844: edição mobile com teclado virtual aberto e safe area.
- 844 × 390: orientação paisagem sem perda de estado.
- 768 × 1024: tablet, editor simplificado.
- 1280 × 720: editor completo.
- 1920 × 1080: editor completo com painel aberto.
- Zoom de 200% sem corte de controles.
- Alvos de toque com no mínimo 44 × 44 px.
- O bloco ativo permanece visível acima do teclado virtual.
- Girar o dispositivo preserva bloco, seleção e rolagem.

## 10. Desempenho

| Cenário | Meta | Ferramenta |
|---|---|---|
| Tecla no editor | p95 < 50 ms | Playwright trace + Performance API |
| Propagação remota | p95 < 300 ms | Teste de colaboração instrumentado |
| LCP | < 2,5 s em 4G | Lighthouse CI |
| Abertura de 120 páginas | < 3 s | Playwright |
| Abertura de 300 páginas | < 5 s | Playwright |
| Edição mobile interativa | < 4 s em celular de referência | Lighthouse mobile + Playwright |
| Rolagem mobile | 60 fps em roteiro de 120 páginas | Playwright trace |
| Exportação de 120 páginas | p95 < 15 s | k6 + worker |
| Memória do worker | < 1 GB por job | Métrica do container |
| API de lista | p95 < 300 ms | k6 |

Testes de carga usam dados sintéticos e ambiente dedicado. Não rodam contra produção.

## 11. Segurança

- SAST em cada PR.
- Scan de dependências e de segredo em cada PR.
- DAST noturno em staging.
- Testes de autorização fazem parte da suíte, não de uma revisão manual.
- Teste de XSS em comentários, títulos e nomes de personagem.
- Teste de CSRF em endpoints mutáveis.
- Teste de SSRF em campos que aceitam URL.
- Teste de upload com tipo falso e tamanho excessivo.
- Teste de PDF com HTML malicioso, se o renderer aceitar entrada externa no futuro.
- Revisão de logs para garantir que nenhum texto de roteiro aparece.
- Teste de rate limit e de bloqueio progressivo.

## 12. Acessibilidade

- axe-core em todas as telas principais, sem violações críticas.
- Teste manual com NVDA ou VoiceOver no editor.
- Navegação completa por teclado.
- Contraste verificado por ferramenta e por inspeção.
- Teste com zoom de 200%.
- Teste com `prefers-reduced-motion`.
- Teste de anúncio de mudança de elemento e de página.
- Teste de leitura em dispositivo móvel com leitor de tela.

## 13. Dados e fixtures

- Fixtures são sintéticas e versionadas.
- Nomes de personagens e textos não copiam roteiros conhecidos.
- Cada fixture tem um cenário e um resultado esperado.
- Fixtures grandes (120 e 300 páginas) são geradas por script, não armazenadas em texto.
- Dados de staging são anonimizados e não reutilizam e-mails reais.
- Nenhum teste grava conteúdo de roteiro em log ou artefato de CI.

Fixtures mínimas:

| Fixture | Uso |
|---|---|
| `minimal.json` | Documento vazio e primeira página |
| `ten-pages.json` | Jornada de aceite |
| `all-elements.json` | Todos os elementos e variantes |
| `broken-dialogue.json` | `(MORE)` / `(CONT'D)` |
| `dual-dialogue.json` | Colunas e alturas diferentes |
| `long-scene-heading.json` | Quebra e aviso |
| `accents.json` | Latino, cedilha e pontuação |
| `a4.json` | Perfil A4 |
| `title-page.json` | Página de título e numeração |

## 14. CI e gates

### 14.1 Em cada pull request

- lint e formatação;
- typecheck estrito;
- testes de unidade;
- testes de propriedade com amostra reduzida;
- golden layout das fixtures principais;
- integração de API com Testcontainers (subset);
- build de web, collab e worker;
- E2E crítico em Chromium;
- axe-core nas telas principais;
- scan de dependência e segredo.

### 14.2 Noturno

- suíte completa de integração;
- E2E em Chromium, Firefox e WebKit;
- golden PDFs e diff visual;
- testes de colaboração com múltiplas réplicas;
- carga de API e WebSocket;
- DAST em staging;
- restauração de backup em ambiente de teste;
- varredura de acessibilidade completa.

### 14.3 Release

- todos os gates de PR e noturno;
- migração em banco vazio e em cópia de staging;
- teste de rollback;
- verificação de fontes e PDF no container de produção;
- checklist de segurança;
- checklist de aceite do MVP.

### 14.4 Política de flaky

- Teste intermitente é marcado, não ignorado.
- Dono e prazo de 5 dias úteis.
- Após 3 falhas em 7 dias, sai do gate de merge e entra em quarentena.
- Retry automático é permitido uma vez, com registro; não é desculpa para instabilidade.
- Teste em quarentena não conta como cobertura.

## 15. Cobertura

- Mínimo de 80% de linhas no motor de layout e nas permissões, conforme NFR-MAINT-002.
- Cobertura de branches no schema e na normalização.
- Cobertura não substitui golden, propriedade ou E2E.
- Relatório de cobertura é publicado no PR, mas não é a única métrica de qualidade.
- Mutation testing no motor de layout é desejável a partir da fase 2, com meta inicial de 60% de mutantes mortos.

## 16. Aceite do MVP

Cada critério da SRS é verificado por um teste ou por um procedimento documentado.

| # | Critério da SRS | Verificação |
|---:|---|---|
| 1 | Conta, verificação e projeto | T-E2E-001 |
| 2 | Roteiro de 10 páginas com todos os elementos | T-E2E-002, fixture `ten-pages` |
| 3 | PDF com fonte, margens, numeração e título | T-PDF-001 a T-PDF-006 |
| 4 | Prévia e PDF com mesmas páginas e quebras | T-PDF-001 |
| 5 | `(MORE)` e `(CONT'D)` | T-FMT-008, T-PDF-003 |
| 6 | Cabeçalho, personagem e parêntese não isolados | T-FMT-004, T-FMT-006, T-FMT-007 |
| 7 | Dois usuários sem perder texto | T-COL-001, T-E2E-004 |
| 8 | `viewer` não edita nem com cliente modificado | T-COL-010, T-API-020 |
| 9 | Offline por 10 minutos sem perda | T-COL-005, T-E2E-005 |
| 10 | Comentário sobrevive a edição | T-CMT-001, T-E2E-006 |
| 11 | Restauração sem apagar histórico | T-VER-001, T-E2E-007 |
| 12 | 120 páginas em menos de 15 s no p95 | T-PERF-003 |
| 13 | Edição, comentário e exportação em 360 px | T-E2E-010, T-E2E-013 |
| 14 | Nenhum fluxo exige pagamento ou cartão | Revisão de fluxo e teste de navegação |
| 15 | Fluxo principal acessível por teclado | T-A11Y-001 |
| 16 | Nenhum segredo ou conteúdo em log | T-SEC-010 |
| 17 | Recuperação de Redis e worker | T-CHAOS-001, T-CHAOS-002 |

## 17. Catálogo resumido

| Prefixo | Área |
|---|---|
| `T-FMT` | Formatação e paginação |
| `T-PDF` | Exportação e fidelidade |
| `T-COL` | Colaboração e CRDT |
| `T-CMT` | Comentários |
| `T-VER` | Versões e restauração |
| `T-API` | API, contrato e autorização |
| `T-E2E` | Jornadas de interface |
| `T-PERF` | Desempenho |
| `T-SEC` | Segurança |
| `T-A11Y` | Acessibilidade |
| `T-CHAOS` | Falhas e recuperação |

Testes citados no aceite e ainda não detalhados acima:

| ID | Verificação |
|---|---|
| `T-PDF-001` | Paridade de páginas e quebras entre prévia e PDF |
| `T-PDF-002` | Fonte Courier Prime incorporada e subsetada |
| `T-PDF-003` | `(MORE)` / `(CONT'D)` no PDF |
| `T-PDF-004` | Página de título sem número e com contato correto |
| `T-PDF-005` | Numeração começando em 2 na segunda página do roteiro |
| `T-PDF-006` | Texto selecionável e acentos corretos |
| `T-COL-001` | Convergência de duas réplicas com as mesmas operações |
| `T-COL-005` | Offline de 10 minutos com sincronização sem perda |
| `T-COL-010` | `viewer` não envia update de texto com cliente modificado |
| `T-API-020` | Matriz de autorização de exportação e download |
| `T-CMT-001` | Comentário ancorado sobrevive a edição ao redor |
| `T-VER-001` | Restauração cria nova versão e preserva histórico |
| `T-PERF-003` | Exportação de 120 páginas em p95 < 15 s |
| `T-PERF-007` | Edição mobile interativa e rolagem em 120 páginas |
| `T-SEC-010` | Logs e traces sem conteúdo de roteiro ou segredo |
| `T-CHAOS-001` | Queda do Redis sem perda de documento |
| `T-CHAOS-002` | Queda do worker sem perda de job |
| `T-A11Y-001` | Fluxo principal completo por teclado e leitor de tela |

O catálogo detalhado, com pré-condições e passos, vive no repositório de testes quando o código existir. Este documento define o que não pode faltar.

## 18. Severidade e saída

| Severidade | Exemplo | Bloqueia release |
|---|---|---|
| S1 | Perda de texto, PDF com layout errado, acesso cruzado | Sim |
| S2 | Colaboração instável, exportação falhando para um perfil | Sim |
| S3 | Erro de interface sem perda de dados | Depende do impacto |
| S4 | Ajuste visual ou texto | Não |

Critérios de saída:

- zero S1 e S2 abertos;
- S3 com plano aprovado;
- todos os gates verdes;
- checklist de aceite assinado por produto e engenharia;
- restauração de backup testada na janela de release;
- nenhum teste crítico em quarentena.

## 19. Referências

- [`../01-requisitos/srs.md`](../01-requisitos/srs.md)
- [`../02-roteiro/paginacao-e-quebras.md`](../02-roteiro/paginacao-e-quebras.md)
- [`../03-arquitetura/exportacao-pdf.md`](../03-arquitetura/exportacao-pdf.md)
- [`../03-arquitetura/colaboracao-tempo-real.md`](../03-arquitetura/colaboracao-tempo-real.md)
- [`../03-arquitetura/seguranca-e-privacidade.md`](../03-arquitetura/seguranca-e-privacidade.md)
- [`../04-design/ux-e-interface.md`](../04-design/ux-e-interface.md)
