# Colaboração em tempo real

**Status:** proposta técnica para a fase 2  
**Tecnologias:** Yjs, Hocuspocus, Redis, PostgreSQL  
**Relaciona-se com:** [`arquitetura-geral.md`](arquitetura-geral.md), [`modelo-de-dados.md`](modelo-de-dados.md), [`api.md`](api.md), [`ADR-001`](adr/ADR-001-colaboracao-crdt.md)

---

## 1. Objetivo

Permitir que várias pessoas editem o mesmo roteiro ao mesmo tempo, com:

- convergência sem conflitos manuais;
- presença e cursores;
- permissões aplicadas no servidor;
- funcionamento offline com sincronização posterior;
- histórico de versões;
- limites claros de escala e abuso.

## 2. Por que CRDT

### 2.1 O problema

Edição colaborativa pode ser resolvida de três formas:

| Modelo | Como funciona | Problema |
|---|---|---|
| Travamento | Só um edita por vez | Ruim para escrita a quatro mãos |
| OT (Operational Transformation) | Servidor transforma operações concorrentes | Exige servidor central autoritativo e é complexo de operar |
| CRDT (Conflict-free Replicated Data Type) | Réplicas convergem sem coordenação central | Metadados maiores, necessário validar estrutura |

O FREEX escolhe CRDT porque:

- permite edição offline;
- não exige um único servidor autoritativo por documento;
- escala horizontalmente com Redis;
- tem biblioteca madura (Yjs) e integração com ProseMirror.

### 2.2 O que CRDT não resolve

CRDT garante convergência de texto, não garante semântica de estrutura. Duas pessoas podem, ao mesmo tempo:

- dividir o mesmo bloco de fala;
- apagar o personagem de uma fala enquanto outra adiciona diálogo;
- transformar um bloco em diálogo duplo enquanto outra edita uma das colunas.

Esses casos exigem regras de normalização e validação. A seção 9 trata disso.

## 3. Estrutura do documento Yjs

### 3.1 Um documento por roteiro

- `Y.Doc` com nome lógico `script:{scriptId}`.
- Uma sala por roteiro.
- O documento contém um `Y.XmlFragment('content')` que representa a árvore ProseMirror.
- Um `Y.Map('meta')` guarda `schemaVersion` e um `updatedBy` opcional.
- Comentários NÃO ficam no Y.Doc; ficam no PostgreSQL, com âncoras de posição relativa.

```text
Y.Doc
├── XmlFragment "content"
│   ├── scene_heading
│   ├── action
│   ├── speech
│   │   ├── character
│   │   └── dialogue
│   └── transition
└── Map "meta"
    └── schemaVersion
```

### 3.2 Binding com ProseMirror

- `ySyncPlugin` sincroniza o documento.
- `yCursorPlugin` publica seleção e cursor.
- `yUndoPlugin` mantém undo local por usuário.
- O schema ProseMirror é a autoridade de estrutura no cliente.
- Toda mutação passa por uma transação ProseMirror. Nenhum código de UI mexe no `Y.Doc` diretamente.

### 3.3 Por que não usar um `Y.Text` único

Um `Y.Text` com o roteiro inteiro seria simples, mas perderia a estrutura de elementos. O layout, a validação e a exportação precisam saber o tipo de cada bloco. A árvore XML preserva tipos e atributos e permite operações atômicas por elemento.

## 4. Arquitetura de sincronização

```mermaid
flowchart LR
  subgraph Navegador
    PM[ProseMirror]
    Y[Y.Doc]
    IDB[(IndexedDB)]
    PM <--> Y
    Y <--> IDB
  end

  subgraph Servidor
    H[Hocuspocus]
    R[(Redis pub/sub)]
    DB[(PostgreSQL)]
  end

  Y <-->|WebSocket| H
  H <--> R
  H --> DB
```

### 4.1 Handshake

1. O cliente obtém um token de colaboração em `POST /v1/scripts/:id/collab-token`.
2. Abre WebSocket para o serviço de colaboração.
3. Envia mensagem de autenticação com o token.
4. O servidor valida assinatura, expiração, `scriptId`, `projectId` e papel.
5. O servidor carrega o estado do documento (ou cria vazio).
6. Cliente e servidor trocam `sync step 1` e `sync step 2`.
7. Awareness é enviado.
8. A edição começa.

### 4.2 Token

Payload:

```json
{
  "iss": "https://api.freex.app",
  "aud": "freex-collab",
  "sub": "user_uuid",
  "projectId": "project_uuid",
  "scriptId": "script_uuid",
  "role": "editor",
  "jti": "token_uuid",
  "exp": 1760000000,
  "iat": 1759999700
}
```

- TTL: 5 minutos.
- Assinatura: EdDSA (Ed25519) ou HS256 com segredo rotacionado.
- Enviado na mensagem de autenticação do Hocuspocus, não na query string.
- O servidor verifica a assinatura e consulta o banco para confirmar que o vínculo ainda existe.
- Um token de `viewer` abre conexão somente leitura.

### 4.3 Protocolo

O FREEX usa o protocolo do Hocuspocus, não um protocolo próprio. As mensagens relevantes:

| Mensagem | Função |
|---|---|
| `Authenticate` | Token e identificação do cliente |
| `SyncStep1` | Envia vetor de estado |
| `SyncStep2` | Envia atualizações faltantes |
| `Update` | Atualização incremental |
| `Awareness` | Presença, cursor, seleção |
| `Stateless` | Eventos customizados (comentários, permissões) |
| `Ping/Pong` | Heartbeat |

Regras:

- Tamanho máximo de mensagem: 1 MB.
- Frequência máxima por conexão: 100 mensagens/s.
- Heartbeat: 30 s.
- Timeout de conexão ociosa: 120 s.
- Reconexão: backoff exponencial de 1 s a 30 s, com jitter.
- `documentName` deve seguir `script:{uuid}`; qualquer outro formato é rejeitado.

## 5. Presença e cursores

### 5.1 Awareness

Cada conexão publica:

```json
{
  "user": {
    "id": "user_uuid",
    "name": "Ana Silva",
    "color": "#2563EB",
    "avatarUrl": "https://..."
  },
  "cursor": { "anchor": "...", "head": "..." },
  "selection": { "from": 42, "to": 57 },
  "activeElementId": "element_uuid",
  "lastActiveAt": "2026-10-23T14:00:00Z"
}
```

- Cursor e seleção usam posições relativas do Yjs, não índices absolutos.
- A cor é atribuída por usuário, com paleta fixa e contraste garantido.
- Nome e avatar são truncados e sanitizados.
- Awareness não é persistido; é efêmero.
- Atualizações de cursor são limitadas a 50 ms (20 Hz).
- Usuário inativo há 30 s fica com presença esmaecida; há 5 min é removido da lista.

### 5.2 Múltiplas abas

- A mesma pessoa pode ter várias abas.
- A UI agrupa por `userId` e mostra "2 abas" quando necessário.
- Cada aba tem um `clientId` Yjs próprio.
- O undo é por aba, não por pessoa.

### 5.3 Privacidade

- A presença mostra apenas nome, avatar e cor.
- Não mostra e-mail, papel ou ID interno.
- O cursor de um `viewer` não é editável, mas pode ser exibido.
- O usuário PODE ocultar a própria presença (modo invisível) em uma fase futura.

## 6. Persistência

### 6.1 Estado atual

- `script_documents.state` guarda o estado Yjs completo (`Y.encodeStateAsUpdate`).
- `script_documents.last_seq` guarda a última sequência aplicada.
- Na abertura de uma sala, o servidor carrega o estado; se não existir, cria um documento vazio a partir do título.

### 6.2 Log de atualizações

- `script_updates` recebe cada atualização com `seq` monotônico.
- O log serve para recuperação, depuração e auditoria técnica.
- É append-only e não substitui o snapshot.
- Retenção: 30 dias após o snapshot, ou último 10.000 updates.

### 6.3 Debounce e snapshot

- Persistência do estado completo: debounce de 2 s após a última atualização.
- Snapshot automático: a cada 5 min de atividade ou 200 atualizações, o que ocorrer primeiro.
- Snapshot manual: ação do usuário.
- Snapshot de exportação: criado no momento do pedido, imutável.
- Snapshot de restauração: criado antes de aplicar a restauração.

### 6.4 Compactação

1. Snapshot é gravado.
2. Updates anteriores ao snapshot são elegíveis para remoção.
3. Job diário remove updates além da retenção.
4. O estado em `script_documents` permanece como base.

### 6.5 Recuperação

- Se o processo cair, a sala é recarregada do banco na próxima conexão.
- Se o banco estiver indisponível, a sala continua em memória e tenta persistir.
- Se o processo cair sem persistir, o cliente ainda tem o estado no IndexedDB e pode reenviar ao reconectar.
- Se o cliente também perdeu o estado, o RPO de 5 min se aplica.

## 7. Offline e reconexão

### 7.1 Persistência local

- `y-indexeddb` guarda o documento no navegador.
- O estado local é a réplica do usuário.
- Ao abrir offline, o editor funciona em modo somente local.
- A UI mostra "Offline — alterações serão sincronizadas".
- No mobile, o navegador pode suspender a aba; a sincronização em segundo plano não é prometida. Ao voltar, o cliente reconecta e aplica o estado local antes de enviar alterações.

### 7.2 Reconexão

1. O cliente detecta a queda.
2. Entra em modo offline; edições continuam.
3. Tenta reconectar com backoff.
4. No handshake, envia `SyncStep1`.
5. O servidor responde com o que falta.
6. O cliente envia o que o servidor não tem.
7. As réplicas convergem.
8. A UI mostra "Sincronizado".

### 7.3 Conflitos

Não há diálogo de "escolha uma versão". O CRDT resolve texto. Para estrutura, a normalização da seção 9 resolve. O usuário vê o resultado, não um conflito.

### 7.4 Limpeza local

- Logout limpa IndexedDB após confirmar que não há alterações pendentes.
- Se houver pendências, a UI avisa e oferece exportar ou aguardar.
- Em dispositivo compartilhado, o usuário PODE desativar cache offline nas configurações.

### 7.5 Schema antigo

- Se o cliente tem schema anterior ao do servidor, a edição é bloqueada.
- A UI pede para atualizar a página.
- O servidor migra o documento ao abrir.
- Nunca aplicar uma atualização de schema incompatível em uma sala ativa.

## 8. Permissões em tempo real

### 8.1 Papéis

| Papel | Conecta? | Lê? | Edita? | Comenta? |
|---|---|---|---|---|
| owner | Sim | Sim | Sim | Sim |
| editor | Sim | Sim | Sim | Sim |
| commenter | Sim | Sim | Não | Sim |
| viewer | Sim | Sim | Não | Não |

### 8.2 Aplicação

- `onAuthenticate` valida o token e consulta o banco.
- `connection.readOnly = true` para `viewer` e `commenter`.
- O servidor rejeita mensagens `Update` de conexões somente leitura.
- A UI esconde controles, mas a decisão é do servidor.
- Mudança de papel publica um evento `permission.changed` no Redis.
- O serviço atualiza a conexão ou a encerra, conforme o caso.
- Remoção de membro encerra todas as conexões daquele usuário no projeto.

### 8.3 Links de leitura

- Token de link contém `linkId`, `scriptId`, `role=viewer`, `exp`.
- Não exige conta, mas exige token válido.
- Revogação é imediata: o servidor consulta o estado do link.
- Links expiram por padrão em 7 dias.
- Não permitem comentários, a menos que o criador habilite.

## 9. Integridade estrutural

### 9.1 Problema

Yjs converge o texto, mas duas operações concorrentes podem produzir uma árvore inválida:

- `speech` sem `character`;
- `speech` sem `dialogue`;
- `parenthetical` depois do diálogo;
- `dual_dialogue` com uma coluna;
- dois `character` no mesmo `speech`;
- nó vazio.

### 9.2 Prevenção

- Comandos ProseMirror encapsulam operações estruturais.
- Operações de divisão e junção de fala são transações atômicas.
- O schema impede a maioria das mutações inválidas no cliente.
- O servidor valida o JSON no snapshot.

### 9.3 Normalização

Após aplicar atualizações remotas, o cliente executa uma passagem de normalização:

1. Remover nós vazios.
2. Garantir que `speech` tenha `character` e pelo menos um `dialogue`.
3. Mover `parenthetical` para antes do primeiro `dialogue`.
4. Se `dual_dialogue` tiver menos de duas `speech`, converter para `speech` simples.
5. Se `dual_dialogue` tiver mais de duas, manter as duas primeiras e converter o resto.
6. Mesclar textos adjacentes do mesmo tipo.
7. Reordenar `character` para o início do `speech`.

A normalização é idempotente e determinística.

### 9.4 Quarentena

Se o servidor detectar um snapshot inválido:

1. Não sobrescrever o último snapshot válido.
2. Marcar a sala como `quarantined`.
3. Notificar o time.
4. Permitir leitura.
5. Bloquear edição até intervenção.
6. Restaurar o último snapshot válido, se necessário.

Isso é raro e deve ser tratado como incidente, não como fluxo normal.

### 9.5 Testes de concorrência

- Duas réplicas dividem a mesma fala.
- Uma apaga o personagem enquanto a outra adiciona diálogo.
- Uma cria diálogo duplo enquanto a outra edita uma coluna.
- Uma restaura uma versão enquanto a outra digita.
- Três réplicas editam o mesmo parágrafo.
- Cliente offline por 30 min e reconexão.

## 10. Comentários ancorados

### 10.1 Armazenamento

- Comentários ficam no PostgreSQL.
- O anchor é uma posição relativa do Yjs codificada em `bytea`.
- `selected_text` guarda o texto no momento da criação.
- Se o anchor não resolver, o comentário fica órfão, mas não desaparece.

### 10.2 Criação

1. Usuário seleciona um trecho.
2. Cliente cria `RelativePosition` de início e fim.
3. `POST /v1/scripts/:id/comments` envia anchor, texto e corpo.
4. Servidor valida permissão e grava.
5. Servidor publica `comment.created` no canal `script:{id}:events`.
6. Hocuspocus repassa via `Stateless` para as conexões da sala.
7. Clientes atualizam a lista.

### 10.3 Edição do texto

- O anchor acompanha a edição.
- Se o trecho for apagado, o anchor resolve para nulo.
- O comentário é marcado como órfão.
- A UI mostra "Trecho original removido" e mantém a thread.

### 10.4 Resolução

- Resolver muda `status` para `resolved`.
- A thread sai da lista ativa.
- Reabrir volta para `open`.
- O histórico de resolução fica em `audit_events`.

### 10.5 Permissões

- `owner`, `editor`, `commenter` criam e respondem.
- `viewer` não cria.
- Autor pode editar o próprio comentário por 15 min; depois, apenas excluir (soft delete) ou responder.
- `owner` pode excluir qualquer comentário do projeto.

## 11. Histórico de versões

### 11.1 Tipos

| Tipo | Quando | Retenção |
|---|---|---|
| `auto` | A cada 5 min ou 200 updates | 90 dias |
| `manual` | Usuário nomeia | Vida do projeto |
| `export` | No pedido de exportação | 7 dias após o PDF |
| `restore` | Antes de restaurar | Vida do projeto |

### 11.2 Restauração

1. Usuário escolhe uma versão.
2. Servidor cria um snapshot `restore` do estado atual (segurança).
3. Servidor carrega o estado da versão escolhida.
4. Aplica uma transação que substitui o conteúdo do documento.
5. A sala converge para o novo conteúdo.
6. A UI mostra um banner "Versão restaurada; desfaça se necessário".
7. O histórico anterior permanece.

A restauração não é um `git reset`. Ela cria um novo estado e preserva o passado.

### 11.3 Diff

- Comparação estrutural entre `document_json` de duas versões.
- Mostra blocos adicionados, removidos e alterados.
- Não é um diff de caracteres; é um diff de elementos.
- O diff é calculado no servidor e enviado à UI.

## 12. Limites e desempenho

| Limite | Valor |
|---|---|
| Conexões simultâneas por roteiro | 50 |
| Tamanho de mensagem | 1 MB |
| Mensagens por segundo por conexão | 100 |
| Tamanho de texto por roteiro | 5 MB |
| Páginas por roteiro | 300 |
| Membros por projeto | 100 |
| Documentos abertos por instância | Configurável; monitorar memória |
| Latência de propagação p95 | 300 ms na mesma região |
| Latência de tecla p95 | 50 ms no cliente |

### 12.1 Memória

- Medir o consumo por sala de 120 páginas.
- Metas iniciais: menos de 50 MB por sala, 2.000 salas por instância de 8 GB.
- Se a meta não for atingida, reduzir salas por instância ou aumentar recursos.
- Não usar cache de documento sem limite.

### 12.2 Backpressure

- Se a fila de mensagens de uma conexão crescer, o servidor aplica backpressure.
- Se o cliente não acompanhar, a conexão é encerrada com código claro.
- Atualizações são agrupadas em intervalos de 16–50 ms, conforme o ambiente.

## 13. Falhas

| Falha | Comportamento |
|---|---|
| Redis indisponível | Edições na mesma instância continuam; pub/sub entre instâncias para; alerta; novas conexões podem ser roteadas para uma instância única |
| PostgreSQL indisponível | Sala continua em memória; persistência falha; UI mostra "não salvo"; cliente mantém cópia local; alerta |
| Hocuspocus reinicia | Clientes reconectam; sala recarrega do banco; sync converge |
| Cliente fica offline | Modo offline; IndexedDB; sync ao voltar |
| Cliente fecha sem sincronizar | Estado local permanece; ao abrir, sync envia o que falta |
| Mensagem inválida | Conexão encerrada ou mensagem descartada; log sem conteúdo |
| Token expirado | Cliente renova via API; reconecta |
| Permissão revogada | Conexão encerrada ou rebaixada; UI informa |

### 13.1 Regra de ouro

O texto nunca deve ser perdido silenciosamente. Se o servidor não consegue persistir, o cliente precisa saber e manter a cópia local até conseguir.

## 14. Segurança

- Token de curta duração, com `jti` e `aud`.
- Verificação de origem no handshake.
- Rate limit por IP, usuário e documento.
- Sem confiança no `role` enviado pelo cliente; sempre consultar o banco.
- Awareness sanitizado.
- Nenhum HTML do usuário é renderizado como HTML.
- Subdocumentos Yjs desabilitados.
- Mensagens grandes ou malformadas são rejeitadas antes de aplicar.
- Logs não contêm texto do roteiro.
- Conexões administrativas são auditadas.

## 15. Observabilidade

### 15.1 Métricas

- conexões ativas por instância;
- salas ativas;
- updates por segundo;
- latência de propagação;
- lag de persistência;
- duração de snapshot;
- falhas de autenticação;
- mensagens rejeitadas;
- uso de memória por sala;
- lag de pub/sub do Redis.

### 15.2 Logs

Eventos estruturados:

- `collab.connection.opened`;
- `collab.connection.closed`;
- `collab.auth.failed`;
- `collab.persistence.failed`;
- `collab.snapshot.created`;
- `collab.schema.invalid`;
- `collab.permission.changed`.

Campos: `script_id`, `project_id`, `user_id`, `connection_id`, `duration_ms`, `error_code`. Nunca o texto.

### 15.3 Traces

- handshake;
- sync;
- persistência;
- snapshot;
- broadcast.

## 16. Testes

### 16.1 Convergência

- Duas réplicas, operações concorrentes, estado final igual.
- Três réplicas, operações aleatórias, propriedade de convergência.
- 1.000 operações por réplica, sem divergência.

### 16.2 Offline

- Cliente offline por 1 min, 10 min e 30 min.
- Reconexão com edições dos dois lados.
- Fechar e reabrir o navegador.
- Limpar cache local com pendências.

### 16.3 Permissões

- `viewer` tenta enviar update; servidor rejeita.
- `commenter` tenta editar; servidor rejeita.
- Mudança de papel em sessão ativa.
- Remoção de membro em sessão ativa.
- Token expirado e renovação.

### 16.4 Estrutura

- Divisão concorrente de fala.
- Junção concorrente.
- Diálogo duplo concorrente.
- Restauração durante edição.
- Normalização idempotente.

### 16.5 Carga

- 50 clientes no mesmo roteiro.
- 10.000 updates em 5 min.
- 2.000 salas por instância.
- Latência p95 dentro da meta.
- Memória dentro da meta.

### 16.6 Caos

- Matar Redis.
- Matar PostgreSQL.
- Matar Hocuspocus.
- Latência de rede.
- Perda de pacotes.

## 17. Critérios de aceite

- Duas sessões editam o mesmo roteiro e convergem.
- Um `viewer` não consegue editar, nem com cliente modificado.
- Um cliente offline por 10 min reconecta sem perder texto.
- Um comentário sobrevive a uma edição ao redor.
- Uma restauração não apaga o histórico.
- 50 conexões simultâneas funcionam dentro da meta.
- Redis e PostgreSQL podem cair sem perda silenciosa.
- O servidor não confia em papel enviado pelo cliente.
- Nenhum texto de roteiro aparece em logs.
- Testes de concorrência e caos passam.
