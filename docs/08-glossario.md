# Glossário

Vocabulário de roteiro e de engenharia usado no FREEX. Quando um termo tem mais de uma tradução corrente, a entrada indica a forma adotada na documentação.

## 1. Termos de roteiro

| Termo | Definição | Observação |
|---|---|---|
| **Ação (action)** | Descrição do que vemos e ouvimos na cena, escrita no presente. | Não é instrução de câmera nem romance. |
| **A/B pages** | Páginas inseridas em um roteiro de produção sem renumerar as seguintes, identificadas como `12A`, `12B`. | Recurso de produção, fora do MVP. |
| **Beat** | Pausa dramática curta ou unidade de progressão da história. | O sentido depende do contexto. Em diálogo, pode aparecer como `(beat)`. |
| **Cabeçalho de cena (scene heading, slugline)** | Linha que indica interior/exterior, locação e tempo: `INT. COZINHA - NOITE`. | Também chamado de *slugline*. |
| **Cold open** | Cena ou sequência antes da abertura ou dos créditos. | Comum em séries. |
| **Continuação (`CONTINUED`)** | Marca de que a cena continua na página seguinte. | Usada em roteiros de produção; não é obrigatória no perfil spec. |
| **`(CONT'D)`** | Marca que indica continuação da fala do mesmo personagem. | Aparece após `(MORE)` ou quando o personagem volta a falar depois de uma ação. |
| **Coverage** | Relatório de leitura de um roteiro, com sinopse, comentários e recomendação. | Termo de mercado, não elemento de formatação. |
| **Diálogo** | Fala de um personagem. | Bloco estreito, abaixo do nome do personagem. |
| **Diálogo duplo (dual dialogue)** | Duas falas lado a lado, para indicar simultaneidade. | Também chamado de *side-by-side dialogue*. |
| **Elemento** | Unidade estrutural do roteiro: cena, ação, personagem, parêntese, diálogo, transição, plano. | O editor trabalha com tipos de elemento, não com parágrafos genéricos. |
| **Especificação (spec script)** | Roteiro escrito por iniciativa do autor, sem contrato de produção. | Não leva números de cena nem cabeçalho de produção. |
| **Fade in / fade out** | Abertura e encerramento em que a imagem surge ou desaparece. | `FADE IN:` é transição alinhada à esquerda; `FADE OUT.` encerra. |
| **Fala** | Conteúdo dito por um personagem. | Inclui diálogo e parênteses. |
| **Fonte monoespaçada** | Fonte em que todos os caracteres ocupam a mesma largura. | Courier é o padrão do roteiro. |
| **INTERCUT** | Recurso que alterna duas cenas em tempo real. | Ver [`02-roteiro/elementos-e-convencoes.md`](02-roteiro/elementos-e-convencoes.md). |
| **Locked pages** | Páginas travadas após o início da produção, que não devem ser renumeradas. | Revisões posteriores usam cores e páginas A/B. |
| **Logline** | Resumo de uma frase que apresenta protagonista, conflito e stakes. | Não é elemento do roteiro. |
| **Montagem (montage)** | Sequência de imagens curtas que resume ação ou passagem de tempo. | Formatada como série de planos ou ação curta. |
| **`(MORE)`** | Marca que indica que a fala continua na página seguinte. | Fica no fim da página de origem, alinhada à direita. |
| **Número de cena** | Número atribuído a cada cena em roteiro de produção. | Não aparece no perfil spec. |
| **Parêntese (parenthetical, wrylie)** | Indicação breve de como a fala é dita ou a quem se dirige. | *Wrylie* é o termo informal. Usar com moderação. |
| **Página de título (title page)** | Primeira folha, com título, autoria, crédito e contato. | Não é numerada e não conta na numeração. |
| **Plano (shot)** | Instrução de enquadramento ou de câmera. | Em maiúsculas; usar com parcimônia. |
| **Revisão colorida (revision colors)** | Sistema de cores que identifica a rodada de alterações em roteiro de produção. | Branco, azul, rosa, amarelo, verde, goldenrod, buff, salmão, cereja, e depois uma segunda sequência. |
| **Roteiro de produção (shooting script)** | Versão usada na filmagem, com números de cena, revisões e continuações. | Também chamado de *production draft*. |
| **Sinopse** | Resumo narrativo do roteiro. | Não faz parte do PDF de submissão padrão. |
| **Slugline** | Ver cabeçalho de cena. | Termo em inglês muito usado no mercado. |
| **Table read** | Leitura do roteiro em voz alta com equipe e elenco. | Evento, não formato. |
| **Transição** | Instrução de passagem entre cenas, como `CUT TO:` ou `DISSOLVE TO:`. | Alinhada à direita; usar com moderação. |
| **Tratamento (treatment)** | Texto em prosa que descreve a história antes do roteiro. | Não é roteiro formatado. |
| **V.O. (voice over)** | Voz fora de cena, sem o personagem visível. | Não confundir com `O.S.`. |
| **O.S. (off screen)** | Personagem presente na cena, mas fora do enquadramento. | Não confundir com `V.O.`. |
| **Viúva / órfã** | Linha ou bloco isolado no fim ou no início de uma página. | O layout evita cabeçalho, personagem e parêntese isolados. |
| **WGA** | Writers Guild of America, sindicato dos roteiristas dos EUA. | Referência de práticas e de créditos, não órgão normativo de formato. |

## 2. Termos de engenharia

| Termo | Definição | Observação |
|---|---|---|
| **ADR** | Architecture Decision Record. Registro de uma decisão arquitetural, com contexto, alternativas e consequências. | Ver [`03-arquitetura/adr/`](03-arquitetura/adr/). |
| **Awareness** | Estado efêmero compartilhado no Yjs, usado para presença, cursor e seleção. | Não é persistido no documento. |
| **CRDT** | Conflict-free Replicated Data Type. Estrutura que converge sem coordenação central. | Base da colaboração do FREEX. |
| **CSP** | Content Security Policy. Cabeçalho que restringe origens de script, estilo e outros recursos. | Reduz XSS. |
| **CSRF** | Cross-Site Request Forgery. Ataque que força uma ação autenticada em outro site. | Mitigado por `SameSite`, `Origin` e token. |
| **Debounce** | Atraso deliberado antes de executar uma ação, para agrupar eventos. | Usado na paginação e na persistência. |
| **Determinismo** | Propriedade de produzir a mesma saída para a mesma entrada e versão. | Requisito do motor de layout. |
| **Editor linear (mobile)** | Modo de edição em coluna, com blocos empilhados e barra de elementos, usado em telas estreitas. | Não altera a geometria canônica; a prévia e o PDF continuam paginados. |
| **Feature flag** | Interruptor que liga ou desliga uma funcionalidade sem novo deploy. | Não substitui autorização. |
| **Golden test** | Teste que compara a saída atual com uma referência versionada. | Usado em layout e PDF. |
| **Hash de layout** | Hash estável da saída canônica de páginas e linhas. | Detecta divergência de paginação. |
| **Hocuspocus** | Servidor WebSocket para Yjs, com autenticação e extensões. | Serviço de colaboração. |
| **IDOR** | Insecure Direct Object Reference. Acesso a recurso alheio pela troca de identificador. | Mitigado por autorização por vínculo. |
| **Idempotência** | Propriedade de repetir uma operação sem duplicar o efeito. | Usada em exportação e criação de recursos. |
| **Layout engine** | Motor que distribui elementos em páginas, linhas e coordenadas. | `@freex/layout`. |
| **LGPD** | Lei Geral de Proteção de Dados Pessoais, Lei 13.709/2018. | Aplicável no Brasil. |
| **GDPR** | General Data Protection Regulation, regulamento de proteção de dados da União Europeia. | Aplicável quando houver titulares na UE. |
| **Monólito modular** | Aplicação implantada como uma unidade, com módulos e fronteiras internas explícitas. | Escolha do FREEX para web e API. |
| **OT** | Operational Transformation. Modelo de colaboração que transforma operações concorrentes em um servidor central. | Alternativa ao CRDT, não adotada. |
| **PITR** | Point-in-Time Recovery. Recuperação do banco para um instante específico. | Janela de 7 dias. |
| **ProseMirror** | Framework de editor estruturado com schema e transações. | Base do editor. |
| **PWA** | Progressive Web App: aplicação web instalável, com shell offline e service worker. | Entrega em desktop e mobile, sem app nativo. |
| **Rate limit** | Limite de requisições ou mensagens por janela de tempo. | Protege API, login e WebSocket. |
| **RPO** | Recovery Point Objective. Perda máxima de dados aceitável em uma recuperação. | Meta: 5 min. |
| **RTO** | Recovery Time Objective. Tempo máximo para restaurar o serviço. | Meta: 1 h. |
| **SBOM** | Software Bill of Materials. Inventário de componentes de um artefato. | Gerado por release. |
| **SLO** | Service Level Objective. Meta mensurável de nível de serviço. | 99,9% de disponibilidade. |
| **SLI** | Service Level Indicator. Medida que alimenta um SLO. | Disponibilidade, latência, sucesso. |
| **Snapshot** | Estado completo e imutável de um roteiro em um instante. | Base de versão e exportação. |
| **SSRF** | Server-Side Request Forgery. Ataque que faz o servidor acessar um destino interno. | Mitigado por allowlist. |
| **Subdocumento** | Documento Yjs aninhado dentro de outro. | Desabilitado no FREEX. |
| **Tenant isolation** | Garantia de que dados de um cliente não são acessíveis por outro. | Testada em todos os endpoints. |
| **XSS** | Cross-Site Scripting. Injeção de script em conteúdo exibido a outro usuário. | Mitigado por escape e CSP. |
| **Yjs** | Biblioteca de CRDT para colaboração em tempo real e offline. | Base do documento. |
| **`Y.Doc`** | Documento Yjs que contém o estado colaborativo. | Um por roteiro. |

## 3. Siglas

| Sigla | Significado |
|---|---|
| ADR | Architecture Decision Record |
| API | Application Programming Interface |
| CDN | Content Delivery Network |
| CRDT | Conflict-free Replicated Data Type |
| CSP | Content Security Policy |
| CSRF | Cross-Site Request Forgery |
| FDX | Final Draft Document |
| GDPR | General Data Protection Regulation |
| IDOR | Insecure Direct Object Reference |
| LGPD | Lei Geral de Proteção de Dados Pessoais |
| OT | Operational Transformation |
| PDF | Portable Document Format |
| PITR | Point-in-Time Recovery |
| PWA | Progressive Web App |
| RPO | Recovery Point Objective |
| RTO | Recovery Time Objective |
| SBOM | Software Bill of Materials |
| SLI | Service Level Indicator |
| SLO | Service Level Objective |
| SSRF | Server-Side Request Forgery |
| WGA | Writers Guild of America |
| XSS | Cross-Site Scripting |

## 4. Como manter

- Termo novo entra quando aparece em um documento normativo e não é óbvio para alguém de fora da área.
- A definição tem uma ou duas frases; o link aponta para o documento que aprofunda.
- Termo em inglês amplamente usado no mercado pode ficar em inglês, com a tradução entre parênteses.
- Não usar o glossário para justificar uma regra. Regra vive no documento normativo, com fonte.
