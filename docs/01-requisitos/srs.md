# Especificação de requisitos de software (SRS)

**Versão:** 1.0  
**Status:** aprovada para a fase 0  
**Escopo:** MVP do FREEX, com colaboração em tempo real e exportação em PDF

## 1. Objetivo

Este documento define o que o FREEX deve fazer, para quem, sob quais restrições e como cada requisito será verificado. Ele é a fonte de verdade para priorização e aceite. Detalhes de implementação ficam nos documentos de arquitetura; detalhes de formato ficam em [`../02-roteiro/normas-de-formatacao.md`](../02-roteiro/normas-de-formatacao.md).

## 2. Escopo do produto

O FREEX é uma aplicação web para escrever, revisar e exportar roteiros cinematográficos e de TV no padrão da indústria. O MVP cobre:

- contas, projetos e permissões;
- editor de roteiro com formatação automática;
- colaboração em tempo real;
- comentários e histórico de versões;
- exportação para PDF com fidelidade de página.

Não cobre produção audiovisual, orçamento, storyboard, publicação ou IA. O escopo negativo completo está na seção 9.

## 3. Definições

| Termo | Definição |
|---|---|
| Roteiro | Documento estruturado em elementos de roteiro, com texto e metadados |
| Elemento | Cabeçalho de cena, ação, personagem, parêntese, diálogo, transição ou variante |
| Layout | Resultado do motor que distribui elementos em páginas, linhas e coordenadas |
| Snapshot | Estado completo e imutável de um roteiro em um instante |
| Versão | Snapshot nomeado ou automático, restaurável |
| Sessão de colaboração | Conexão WebSocket autenticada a um roteiro |
| Exportação | Geração assíncrona de um PDF a partir de um snapshot |
| Papel | `owner`, `editor`, `commenter` ou `viewer` |
| Perfil de página | Conjunto de papel, margens, fonte e espaçamento |

## 4. Atores e papéis

### 4.1 Atores

- **Visitante:** não autenticado. Pode criar conta, entrar e aceitar convite.
- **Usuário:** autenticado. Pode criar projetos e gerenciar seus dados.
- **Membro de projeto:** usuário com papel em um projeto.
- **Sistema:** jobs de exportação, snapshots automáticos, validação e limpeza.
- **Administrador de plataforma:** suporte e operação, sem acesso ao conteúdo por padrão.

### 4.2 Matriz de permissões

| Ação | owner | editor | commenter | viewer |
|---|---|---|---|---|
| Ver projeto e roteiro | Sim | Sim | Sim | Sim |
| Editar texto do roteiro | Sim | Sim | Não | Não |
| Criar/excluir roteiro | Sim | Sim | Não | Não |
| Editar título e metadados | Sim | Sim | Não | Não |
| Criar comentário | Sim | Sim | Sim | Não |
| Responder comentário | Sim | Sim | Sim | Não |
| Resolver comentário | Sim | Sim | Sim | Não |
| Criar versão nomeada | Sim | Sim | Não | Não |
| Restaurar versão | Sim | Sim | Não | Não |
| Exportar PDF | Sim | Sim | Sim | Sim |
| Convidar membro | Sim | Não | Não | Não |
| Alterar papel | Sim | Não | Não | Não |
| Remover membro | Sim | Não | Não | Não |
| Excluir projeto | Sim | Não | Não | Não |
| Transferir propriedade | Sim | Não | Não | Não |

O papel `owner` é único por projeto. Um projeto sempre tem pelo menos um `owner`.

## 5. Requisitos funcionais

Prioridades: **M** = obrigatório no MVP, **S** = deveria, **C** = poderia, **W** = fora desta versão.

### 5.1 Contas e autenticação

| ID | Requisito | Prioridade | Critério de aceite |
|---|---|---|---|
| FR-AUTH-001 | Cadastro com e-mail e senha | M | E-mail válido e senha com no mínimo 12 caracteres criam conta; e-mail duplicado retorna erro claro |
| FR-AUTH-002 | Verificação de e-mail | M | Conta não verificada não cria projeto; link expira em 24 h; reenvio limitado |
| FR-AUTH-003 | Login e logout | M | Sessão criada em cookie `HttpOnly`, `Secure`, `SameSite=Lax`; logout invalida a sessão no servidor |
| FR-AUTH-004 | Recuperação de senha | M | Token de uso único, expira em 1 h; resposta não revela se o e-mail existe |
| FR-AUTH-005 | Login com Google | S | Fluxo OAuth com state e PKCE; conta existente é vinculada por e-mail verificado |
| FR-AUTH-006 | MFA por TOTP | C | Usuário ativa, confirma com código e recebe códigos de recuperação |
| FR-AUTH-007 | Gerenciamento de sessões | M | Usuário vê dispositivos ativos e pode revogar sessões individuais |
| FR-AUTH-008 | Perfil | M | Nome, avatar, idioma e fuso horário editáveis |
| FR-AUTH-009 | Exclusão de conta | M | Solicitação inicia fluxo de exclusão com carência de 30 dias; dados pessoais são anonimizados |
| FR-AUTH-010 | Proteção contra abuso | M | Login e recuperação limitados por IP e por conta; bloqueio progressivo |

### 5.2 Projetos e membros

| ID | Requisito | Prioridade | Critério de aceite |
|---|---|---|---|
| FR-PRJ-001 | Criar projeto | M | Título obrigatório; projeto criado com o criador como `owner`; limite configurável por conta |
| FR-PRJ-002 | Listar e buscar projetos | M | Lista paginada, ordenada por atualização; busca por título |
| FR-PRJ-003 | Renomear, arquivar e excluir | M | Exclusão exige confirmação; projeto fica 30 dias em lixeira; restauração disponível |
| FR-PRJ-004 | Convidar por e-mail | M | Convite com papel, token de uso único e validade de 7 dias; e-mail enviado |
| FR-PRJ-005 | Aceitar convite | M | Usuário autenticado com e-mail correspondente entra no projeto com o papel definido |
| FR-PRJ-006 | Alterar papel e remover membro | M | Apenas `owner`; remoção encerra sessões de colaboração do usuário no projeto |
| FR-PRJ-007 | Transferir propriedade | S | `owner` escolhe outro membro; promove a `owner` e rebaixa o anterior para `editor` |
| FR-PRJ-008 | Configurações do projeto | S | Idioma do roteiro, formato e perfil de página padrão |
| FR-PRJ-009 | Duplicar projeto ou roteiro | S | Cópia recebe novo ID; membros e comentários não são copiados por padrão |
| FR-PRJ-010 | Link de leitura | C | Link com token, papel `viewer`, expiração e revogação |
| FR-PRJ-011 | Registro de auditoria do projeto | M | Eventos de membro, permissão, exportação e restauração são registrados |
| FR-PRJ-012 | Limite de membros | M | Limite operacional configurável, sem relação com plano pago; convite acima do limite é bloqueado com mensagem clara |

### 5.3 Editor e escrita

| ID | Requisito | Prioridade | Critério de aceite |
|---|---|---|---|
| FR-EDT-001 | Criar roteiro | M | Título e formato obrigatórios; documento inicia com página de título e um cabeçalho de cena de exemplo |
| FR-EDT-002 | Abrir e editar | M | Editor carrega em até 3 s para roteiro de 120 páginas em conexão padrão |
| FR-EDT-003 | Elementos de roteiro | M | Cabeçalho de cena, ação, personagem, parêntese, diálogo, transição, plano e diálogo duplo |
| FR-EDT-004 | Navegação por teclado | M | Com teclado, `Tab` avança elemento, `Shift+Tab` retrocede e `Enter` cria o próximo elemento esperado; no mobile, a barra de elementos cumpre o mesmo papel (FR-EDT-022) |
| FR-EDT-005 | Formatação automática | M | Cada elemento usa a geometria da especificação no layout paginado; o modo mobile linear não altera essa geometria na prévia e no PDF |
| FR-EDT-006 | Normalização de caixa | M | Cabeçalho, personagem e transição são convertidos para maiúsculas ao confirmar |
| FR-EDT-007 | Navegador de cenas | M | Lista de cenas com número, título, página e indicador de cena atual |
| FR-EDT-008 | Autocompletar de personagens | S | Sugere personagens já usados; aceitar com Enter ou Tab |
| FR-EDT-009 | Localizar e substituir | S | Busca no texto e nos cabeçalhos; substituição com confirmação |
| FR-EDT-010 | Desfazer e refazer | M | Histórico por usuário, com limite mínimo de 100 operações |
| FR-EDT-011 | Ênfase inline | S | Negrito, itálico e sublinhado preservados no layout e no PDF |
| FR-EDT-012 | Prévia paginada | M | Exibe páginas com quebras, numeração e título; atualiza em até 500 ms após a edição |
| FR-EDT-013 | Contagem de páginas | M | Contagem do roteiro exclui página de título; exibe meta configurável |
| FR-EDT-014 | Contagem de palavras e caracteres | C | Exibida no rodapé do editor |
| FR-EDT-015 | Modo foco | S | Oculta barras laterais e mantém a página centralizada |
| FR-EDT-016 | Correção ortográfica | C | Português do Brasil e inglês; sugestões não alteram o texto sem confirmação |
| FR-EDT-017 | Importar Fountain | C | Texto Fountain é convertido em elementos; erros de sintaxe são listados |
| FR-EDT-018 | Exportar Fountain | C | Documento gera Fountain válido; formatação inline é preservada quando possível |
| FR-EDT-019 | Página de título | M | Campos de título, autores, crédito, contato e data; prévia fiel |
| FR-EDT-020 | Diálogo duplo | S | No desktop, dois blocos lado a lado com edição de cada coluna; no mobile, blocos lineares identificados como coluna esquerda/direita; prévia e PDF mantêm o layout conforme especificação |
| FR-EDT-021 | Painel de validação | M | Erros e avisos listados com link para o trecho; exportação bloqueada apenas por erros |
| FR-EDT-022 | Edição em dispositivo móvel | M | Modo mobile linear a partir de 360 px: criar, editar, comentar, visualizar prévia paginada e exportar; barra de elementos substitui `Tab`; teclado virtual e hardware são suportados |
| FR-EDT-023 | Acessibilidade do editor | M | Todas as ações por teclado; foco visível; leitor de tela anuncia elemento e posição |

### 5.4 Formatação e paginação

| ID | Requisito | Prioridade | Critério de aceite |
|---|---|---|---|
| FR-FMT-001 | Papel US Letter | M | 8,5 × 11 pol; retrato; margens conforme especificação |
| FR-FMT-002 | Fonte Courier Prime 12 pt | M | Courier Prime incorporada; 10 caracteres/pol; 6 linhas/pol; fallback bloqueado na exportação |
| FR-FMT-003 | Geometria dos elementos | M | Posições e larguras idênticas à tabela normativa, com tolerância de 0,01 pol |
| FR-FMT-004 | Paginação | M | 54 linhas de corpo por página; quebras conforme regras de viúva/órfã |
| FR-FMT-005 | Numeração de páginas | M | Topo direito, 0,5 pol, formato `2.`; página 1 e título sem número |
| FR-FMT-006 | `(MORE)` e `(CONT'D)` | M | Diálogo quebrado entre páginas recebe os marcadores; opção de desligar |
| FR-FMT-007 | Viúvas e órfãs | M | Cabeçalho, personagem e parêntese nunca ficam sozinhos no fim da página |
| FR-FMT-008 | Página de título | M | Layout com título, crédito, autor, contato e data; sem número |
| FR-FMT-009 | Diálogo duplo | S | Colunas com geometria definida; não quebra entre páginas sem tratamento |
| FR-FMT-010 | A4 | C | Exportação A4 com aviso de que não é o padrão de submissão |
| FR-FMT-011 | Números de cena e revisões | W | Fase posterior; modelo de dados preparado |
| FR-FMT-012 | Validação de formato | M | Erros bloqueantes e avisos não bloqueantes conforme especificação |
| FR-FMT-013 | Vocabulário localizado | S | Palavras-chave em inglês ou português; geometria invariável |
| FR-FMT-014 | Hash de layout | M | Cada renderização produz hash estável para o mesmo documento e perfil |

### 5.5 Colaboração em tempo real

| ID | Requisito | Prioridade | Critério de aceite |
|---|---|---|---|
| FR-COL-001 | Sincronização em tempo real | M | Duas sessões veem a edição da outra em até 300 ms p95 na mesma região |
| FR-COL-002 | Presença | M | Avatares e nomes dos participantes ativos; atualização em até 1 s |
| FR-COL-003 | Cursores remotos | M | Cursor e seleção coloridos por usuário; posição correta após edições concorrentes |
| FR-COL-004 | Offline e reconexão | M | Edições offline persistem no navegador e sincronizam ao reconectar |
| FR-COL-005 | Convergência | M | Duas réplicas que recebem as mesmas operações convergem para o mesmo estado |
| FR-COL-006 | Permissões no servidor | M | `viewer` e `commenter` não conseguem enviar atualizações de texto, mesmo com cliente modificado |
| FR-COL-007 | Modo somente leitura | M | Interface desabilita edição; servidor rejeita escritas |
| FR-COL-008 | Estado da conexão | M | Indicador claro: conectado, sincronizando, offline, erro |
| FR-COL-009 | Token de colaboração | M | Token de curta duração, vinculado a usuário, projeto, roteiro e papel |
| FR-COL-010 | Escala horizontal | M | Duas instâncias do serviço sincronizam o mesmo roteiro via Redis |
| FR-COL-011 | Limites de abuso | M | Mensagens por segundo, tamanho de payload e conexões por usuário limitados |
| FR-COL-012 | Seguir usuário | C | Acompanhar a viewport de outro participante |
| FR-COL-013 | Desfazer colaborativo | S | Desfazer por usuário, sem desfazer edições de terceiros |
| FR-COL-014 | Limite de editores | M | 50 conexões simultâneas por roteiro; excedente recebe modo leitura |
| FR-COL-015 | Reconexão automática | M | Backoff exponencial com jitter; sem perda de edições locais |

### 5.6 Comentários

| ID | Requisito | Prioridade | Critério de aceite |
|---|---|---|---|
| FR-CMT-001 | Criar comentário | M | Seleção de texto gera thread ancorada; comentário vazio é rejeitado |
| FR-CMT-002 | Responder | M | Respostas ordenadas por data; autor e horário visíveis |
| FR-CMT-003 | Resolver e reabrir | M | Resolvido sai da lista ativa e pode ser reaberto |
| FR-CMT-004 | Menções e notificações | S | `@usuário` notifica membro do projeto; e-mail respeita preferência |
| FR-CMT-005 | Filtrar | S | Por status, autor e trecho |
| FR-CMT-006 | Ancoragem resiliente | M | Comentário acompanha o texto após edições; se o trecho for apagado, fica como "desanexado" |
| FR-CMT-007 | Permissões de comentário | M | Apenas `owner`, `editor` e `commenter` criam e respondem |
| FR-CMT-008 | Comentários no PDF | C | Apêndice opcional, sem alterar a paginação do roteiro |

### 5.7 Versões e histórico

| ID | Requisito | Prioridade | Critério de aceite |
|---|---|---|---|
| FR-VER-001 | Snapshots automáticos | M | A cada 5 min de atividade ou 200 atualizações, o que ocorrer primeiro |
| FR-VER-002 | Versão nomeada | M | Usuário cria versão com nome e descrição; imutável |
| FR-VER-003 | Listar versões | M | Data, autor, tipo, tamanho e nome; paginação |
| FR-VER-004 | Restaurar | M | Restauração cria nova versão; histórico anterior permanece |
| FR-VER-005 | Comparar | S | Diff textual entre duas versões, com navegação por alteração |
| FR-VER-006 | Retenção | M | Automáticas por 90 dias; nomeadas até exclusão do projeto; exportações por 7 dias |

### 5.8 Exportação em PDF

| ID | Requisito | Prioridade | Critério de aceite |
|---|---|---|---|
| FR-EXP-001 | Exportação assíncrona | M | Job enfileirado; status `queued`, `processing`, `ready`, `failed` |
| FR-EXP-002 | Fidelidade de layout | M | PDF e prévia têm o mesmo número de páginas e quebras para o mesmo snapshot |
| FR-EXP-003 | Página de título | M | Opção incluir/omitir; quando incluída, não é numerada |
| FR-EXP-004 | Intervalo de páginas | S | Exporta intervalo sem renumerar o documento |
| FR-EXP-005 | Lista de cenas | C | Anexo com cena, página e título |
| FR-EXP-006 | Lista de personagens | C | Anexo com personagem, primeira cena e contagem de falas |
| FR-EXP-007 | Marca d'água | C | Texto configurável, cinza claro, sem afetar layout |
| FR-EXP-008 | Cores de revisão | W | Fase de produção; modelo preparado |
| FR-EXP-009 | Download seguro | M | URL assinada, expira em 24 h; acesso restrito a membro do projeto |
| FR-EXP-010 | Status e notificação | M | Usuário vê progresso e recebe aviso no app; e-mail opcional |
| FR-EXP-011 | Cache | S | Mesmo snapshot + opções reutiliza PDF; hash registrado |
| FR-EXP-012 | Limites | M | 300 páginas, 50 MB, 120 s de processamento; erro claro ao exceder |
| FR-EXP-013 | Metadados | S | Título, autor, assunto, criador e data; sem dados internos |
| FR-EXP-014 | Texto selecionável | M | Fonte incorporada; texto copiável; acentos corretos |
| FR-EXP-015 | Validação antes da exportação | M | Erros bloqueiam; avisos exigem confirmação |
| FR-EXP-016 | Histórico | M | Quem exportou, quando, versão, opções e status |
| FR-EXP-017 | Nome do arquivo | S | `titulo-AAAA-MM-DD-vN.pdf`, sanitizado |

### 5.9 Navegação e busca

| ID | Requisito | Prioridade | Critério de aceite |
|---|---|---|---|
| FR-NAV-001 | Lista de cenas com página | M | Atualiza após edição; clique navega para a cena |
| FR-NAV-002 | Ir para página | M | Entrada de página ou atalho; rolagem para a página correta |
| FR-NAV-003 | Paleta de comandos | S | `Ctrl/Cmd+K`; ações de criação, navegação e exportação |
| FR-NAV-004 | Busca no roteiro | S | Busca textual com destaque e navegação entre resultados |

### 5.10 Administração e auditoria

| ID | Requisito | Prioridade | Critério de aceite |
|---|---|---|---|
| FR-ADM-001 | Eventos de auditoria | M | Login, convite, mudança de papel, edição de metadados, restauração e exportação |
| FR-ADM-002 | Histórico de exportações | M | Visível para `owner` e `editor`; filtros por data e usuário |
| FR-ADM-003 | Console de administração | C | Suporte vê metadados, nunca o texto do roteiro, sem consentimento |
| FR-ADM-004 | Feature flags | S | Liberação gradual de recursos por conta ou projeto |

## 6. Requisitos não funcionais

### 6.1 Desempenho

| ID | Requisito | Meta |
|---|---|---|
| NFR-PERF-001 | Latência de tecla no editor | p95 < 50 ms no cliente |
| NFR-PERF-002 | Propagação de edição remota | p95 < 300 ms na mesma região |
| NFR-PERF-003 | Carregamento inicial | LCP < 2,5 s em 4G; editor interativo < 3 s |
| NFR-PERF-004 | Exportação de 120 páginas | p95 < 15 s; máximo 120 s |
| NFR-PERF-005 | Memória do worker de PDF | < 1 GB por job de 120 páginas |
| NFR-PERF-006 | Abertura de roteiro de 300 páginas | < 5 s |
| NFR-PERF-007 | Edição mobile | Editor interativo em até 4 s em celular de referência (4 GB de RAM, 4G); rolagem sem travamento perceptível em roteiro de 120 páginas |

### 6.2 Escala e disponibilidade

| ID | Requisito | Meta |
|---|---|---|
| NFR-SCALE-001 | Editores simultâneos por roteiro | 50 |
| NFR-SCALE-002 | Usuários simultâneos por região | 10.000 no beta público |
| NFR-SCALE-003 | Projetos por conta | Limite operacional configurável; padrão 50; sem relação com plano pago |
| NFR-REL-001 | Disponibilidade mensal | 99,9% para leitura e edição |
| NFR-REL-002 | RPO | 5 min |
| NFR-REL-003 | RTO | 1 h |
| NFR-REL-004 | Perda de edição em reconexão | Zero |
| NFR-REL-005 | Recuperação de versão | < 30 s para roteiro de 120 páginas |

### 6.3 Segurança

| ID | Requisito | Meta |
|---|---|---|
| NFR-SEC-001 | Padrão de segurança | OWASP ASVS nível 2 |
| NFR-SEC-002 | Transporte | TLS 1.3; HSTS |
| NFR-SEC-003 | Repouso | AES-256 no banco, objetos e backups |
| NFR-SEC-004 | Senhas | Argon2id com parâmetros calibrados |
| NFR-SEC-005 | Sessões | Cookie `HttpOnly`, `Secure`, `SameSite`; rotação no login |
| NFR-SEC-006 | Autorização | Verificação no servidor em toda requisição e conexão WebSocket |
| NFR-SEC-007 | Isolamento | Nenhum dado de projeto acessível por ID sem vínculo de membro |
| NFR-SEC-008 | Dependências | Scan em CI; bloqueio de vulnerabilidades críticas |
| NFR-SEC-009 | Segredos | Secret manager; nenhum segredo no repositório ou log |

### 6.4 Privacidade

| ID | Requisito | Meta |
|---|---|---|
| NFR-PRIV-001 | Conformidade | LGPD e GDPR quando aplicável |
| NFR-PRIV-002 | Treinamento de modelos | Sem uso de roteiros para treinar IA sem consentimento explícito e opt-in |
| NFR-PRIV-003 | Direitos do titular | Exportação e exclusão de dados em até 30 dias |
| NFR-PRIV-004 | Minimização | Coletar apenas dados necessários; logs sem conteúdo de roteiro |
| NFR-PRIV-005 | Subprocessadores | Lista pública e contratos de tratamento |

### 6.5 Acessibilidade

| ID | Requisito | Meta |
|---|---|---|
| NFR-A11Y-001 | Padrão | WCAG 2.2 nível AA |
| NFR-A11Y-002 | Teclado | Todas as funções essenciais sem mouse |
| NFR-A11Y-003 | Leitor de tela | Editor anuncia tipo de elemento, posição e texto |
| NFR-A11Y-004 | Contraste | 4,5:1 para texto; 3:1 para componentes |
| NFR-A11Y-005 | Movimento | Respeitar `prefers-reduced-motion` |

### 6.6 Compatibilidade e internacionalização

| ID | Requisito | Meta |
|---|---|---|
| NFR-COMPAT-001 | Navegadores | Últimas 2 versões de Chrome, Edge, Firefox e Safari, em desktop e mobile |
| NFR-COMPAT-002 | Resoluções | Edição e leitura a partir de 360 px; editor paginado completo a partir de 1024 px |
| NFR-I18N-001 | Interface | pt-BR no MVP; en-US na sequência |
| NFR-I18N-002 | Roteiro | Vocabulário de elementos em inglês ou português |
| NFR-I18N-003 | Fonte | Courier Prime cobre Latino; outros alfabetos em modo de compatibilidade com aviso |
| NFR-I18N-004 | Fuso e datas | Armazenamento UTC; exibição no fuso do usuário |

### 6.7 Observabilidade e manutenção

| ID | Requisito | Meta |
|---|---|---|
| NFR-OBS-001 | Logs | Estruturados, com `request_id`, `trace_id`, ator, projeto e resultado |
| NFR-OBS-002 | Métricas | Latência, erro, conexões, jobs, fila, uso de PDF |
| NFR-OBS-003 | Traces | Fluxo de edição, exportação e autenticação |
| NFR-OBS-004 | Alertas | SLO, falha de persistência, backlog de exportação |
| NFR-MAINT-001 | Tipagem | TypeScript estrito, sem `any` não justificado |
| NFR-MAINT-002 | Testes | Cobertura mínima de 80% no motor de layout e nas permissões |
| NFR-MAINT-003 | Documentação | Mudança de comportamento atualiza o documento correspondente |

## 7. Regras de negócio

| ID | Regra |
|---|---|
| RN-001 | Todo projeto tem exatamente um `owner` ativo. |
| RN-002 | Um usuário só acessa um projeto se for membro ativo ou tiver link válido. |
| RN-003 | Apenas `owner` e `editor` editam texto. |
| RN-004 | Comentários não alteram o conteúdo do roteiro. |
| RN-005 | Exportação sempre parte de um snapshot imutável. |
| RN-006 | Restauração nunca apaga o histórico; cria uma nova versão. |
| RN-007 | A página de título não conta na numeração. |
| RN-008 | O PDF de submissão usa US Letter e Courier Prime 12 pt, salvo opção explícita A4. |
| RN-009 | Nenhum PDF é gerado com fonte substituta silenciosa. |
| RN-010 | Um convite expirado pode ser reenviado, mas não reutilizado. |
| RN-011 | Contas excluídas têm carência de 30 dias; depois, dados pessoais são anonimizados. |
| RN-012 | O conteúdo do roteiro não aparece em logs de aplicação. |

## 8. Restrições e premissas

### 8.1 Restrições

- Aplicação web responsiva, instalável como PWA; sem cliente nativo.
- O produto é 100% gratuito: não há plano pago, assinatura, paywall ou cobrança pelo uso.
- Edição em desktop e celular; no celular, o editor usa modo linear e a prévia paginada preserva a geometria canônica.
- US Letter é o perfil canônico.
- Courier Prime é a fonte padrão; a licença deve permitir incorporação em PDF.
- O motor de layout é determinístico e compartilhado entre prévia e PDF.
- O serviço de colaboração exige Redis para escala horizontal.
- O worker de PDF depende de Chromium em versão fixa.
- Limite de 300 páginas por roteiro no MVP.

### 8.2 Premissas

- O usuário tem conexão estável na maior parte do tempo.
- O navegador suporta WebSocket, IndexedDB, Service Worker e `Intl`.
- O volume inicial permite um único provedor de nuvem.
- A equipe aceita operar dois serviços adicionais (colaboração e worker).

## 9. Fora do escopo

- Orçamento, cronograma, storyboard, decupagem e gestão de produção.
- Edição de vídeo, áudio ou imagem.
- Publicação, marketplace, comunidade e cursos.
- Geração de roteiro por IA.
- Aplicativos nativos.
- Formatos de peça teatral, quadrinhos, audiodrama e publicidade.
- Planos pagos, assinatura ou cobrança pelo uso.
- Federação ou colaboração entre organizações.

## 10. Critérios de aceite do MVP

O MVP é aceito quando todos os itens abaixo forem verdadeiros:

1. Um usuário cria conta, verifica e-mail e cria um projeto.
2. Um roteiro de 10 páginas é escrito com todos os elementos e exportado em PDF.
3. O PDF tem fonte incorporada, margens corretas, numeração a partir da página 2 e página de título sem número.
4. A prévia e o PDF têm o mesmo número de páginas e os mesmos pontos de quebra.
5. Um diálogo quebrado entre páginas contém `(MORE)` e `(CONT'D)`.
6. Nenhum cabeçalho de cena, personagem ou parêntese fica isolado no fim de uma página.
7. Dois usuários editam o mesmo roteiro ao mesmo tempo sem perder texto.
8. Um usuário `viewer` não consegue editar, nem com cliente modificado.
9. Um usuário offline por 10 minutos reconecta e sincroniza sem perda.
10. Um comentário sobrevive a uma edição ao redor e pode ser resolvido.
11. Uma versão anterior é restaurada sem apagar o histórico.
12. A exportação de 120 páginas conclui em menos de 15 s no p95.
13. Um roteiro é criado, editado, comentado e exportado em viewport de 360 px no modo mobile.
14. Nenhum fluxo exige pagamento, assinatura ou cartão de crédito.
15. O fluxo principal passa em testes de acessibilidade por teclado e por leitor de tela.
16. Nenhum segredo, conteúdo de roteiro ou dado pessoal aparece em logs.
17. O sistema se recupera de uma queda do Redis ou do worker sem perda de dados.

## 11. Rastreabilidade

| Persona | Requisitos principais |
|---|---|
| Ana | FR-AUTH, FR-PRJ-001, FR-EDT-001..013, FR-FMT, FR-EXP |
| Bruno e Carla | FR-COL, FR-CMT, FR-VER, FR-PRJ-004..006 |
| Diego | FR-PRJ-004..011, FR-VER, FR-EXP-003..016, FR-ADM |
| Marina | FR-AUTH, FR-CMT, FR-EDT-012, FR-EDT-022, FR-EXP |

## 12. Documentos relacionados

- Normas de formatação: [`../02-roteiro/normas-de-formatacao.md`](../02-roteiro/normas-de-formatacao.md)
- Paginação: [`../02-roteiro/paginacao-e-quebras.md`](../02-roteiro/paginacao-e-quebras.md)
- Arquitetura: [`../03-arquitetura/arquitetura-geral.md`](../03-arquitetura/arquitetura-geral.md)
- Colaboração: [`../03-arquitetura/colaboracao-tempo-real.md`](../03-arquitetura/colaboracao-tempo-real.md)
- Exportação: [`../03-arquitetura/exportacao-pdf.md`](../03-arquitetura/exportacao-pdf.md)
- Testes: [`../05-qualidade/testes-e-aceite.md`](../05-qualidade/testes-e-aceite.md)
