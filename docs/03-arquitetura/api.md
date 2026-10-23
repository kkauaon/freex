# API

**Status:** proposta técnica para a fase 1  
**Base:** `https://api.freex.app`  
**Versão:** `v1`  
**Formato:** JSON, UTF-8, camelCase

---

## 1. Princípios

1. **REST para CRUD, WebSocket para colaboração.** Não trafegar texto de roteiro por REST durante a edição.
2. **Autorização no servidor.** Todo endpoint verifica sessão e vínculo com o projeto.
3. **Idempotência explícita.** Operações que criam recursos aceitam `Idempotency-Key`.
4. **Erros padronizados.** RFC 9457 (`application/problem+json`), com código estável.
5. **Paginação por cursor.** Sem `OFFSET` em listas grandes.
6. **Versionamento na URL.** `/v1`; mudanças incompatíveis criam `/v2`.
7. **Contratos tipados.** Zod + OpenAPI em `packages/contracts`.

## 2. Autenticação

### 2.1 Sessão

- Cookie `freex_session`, `HttpOnly`, `Secure`, `SameSite=Lax`.
- Sessão armazenada no banco; token opaco, hash no servidor.
- Expiração deslizante de 30 dias; absoluta de 90 dias.
- Logout invalida a sessão no servidor.
- Implementação com Better Auth executado em `apps/api` (Fastify, [ADR-006](adr/ADR-006-api-fastify.md)), atrás dos endpoints `/v1/auth/*`; o contrato público, o cookie e os controles desta seção são mantidos pela camada de API.
- `apps/web` e `apps/api` DEVEM ficar no mesmo site (mesmo domínio registrável, por exemplo `freex.app` e `api.freex.app`). O cookie `SameSite=Lax` não é enviado entre sites distintos.
- O navegador chama a API com `credentials: 'include'`; o SSR repassa o cookie da requisição recebida.

### 2.2 OAuth

- Google no MVP; Apple na sequência.
- Fluxo com `state` e PKCE.
- Conta existente é vinculada por e-mail verificado.
- E-mail não verificado exige confirmação.

### 2.3 Token de colaboração

- `POST /v1/scripts/:id/collab-token`.
- TTL de 5 min.
- Uso único para abrir a conexão; renovação antes de expirar.
- Não é aceito em REST.

### 2.4 CSRF

- Requisições mutáveis exigem `Origin` permitido.
- CORS na API aceita apenas a origem do web app, com `credentials`; sem curinga.
- Cookie `SameSite=Lax` reduz o risco.
- Endpoints sensíveis exigem header `X-CSRF-Token` obtido em `GET /v1/me`.
- WebSocket valida `Origin`.

## 3. Convenções

### 3.1 JSON

```json
{
  "id": "0192f3a4-...",
  "title": "O Último Andar",
  "createdAt": "2026-10-23T14:00:00Z"
}
```

- Datas em ISO 8601 UTC.
- IDs em UUID.
- Campos ausentes em PATCH não são alterados.
- `null` limpa um campo opcional.
- Arrays vazios são `[]`, não `null`.

### 3.2 Paginação

```http
GET /v1/projects?limit=20&cursor=eyJjcmVhdGVkQXQiOi...
```

```json
{
  "data": [],
  "nextCursor": "eyJjcmVhdGVkQXQiOi...",
  "hasMore": true
}
```

- `limit` padrão 20, máximo 100.
- Cursor opaco, base64url.
- Ordenação padrão: `updatedAt desc`, `id desc`.

### 3.3 Idempotência

```http
Idempotency-Key: 8f14e45f-ea0d-4c1b-9b2a-3f6c2d1e0a9b
```

- Válida por 24 h.
- Mesma chave + mesmo corpo = mesma resposta.
- Mesma chave + corpo diferente = `409 IDEMPOTENCY_CONFLICT`.
- Obrigatória em `POST /exports`, `POST /invitations`, `POST /snapshots`.

### 3.4 Concorrência otimista

- `GET` de projeto/roteiro retorna `ETag`.
- `PATCH` pode enviar `If-Match`.
- Se o recurso mudou, `409 VERSION_CONFLICT`.
- O corpo do erro inclui a versão atual.

### 3.5 Limites de payload

- JSON: 1 MB, exceto importação.
- Texto de roteiro: 5 MB.
- Upload de avatar: 2 MB.

## 4. Erros

### 4.1 Formato

```json
{
  "type": "https://api.freex.app/errors/validation",
  "title": "Validation failed",
  "status": 422,
  "code": "VALIDATION_ERROR",
  "detail": "O título é obrigatório.",
  "instance": "/v1/projects",
  "requestId": "req_01J...",
  "errors": [
    { "field": "title", "message": "Obrigatório" }
  ]
}
```

### 4.2 Códigos

| HTTP | Código | Quando |
|---:|---|---|
| 400 | `BAD_REQUEST` | Corpo malformado |
| 401 | `AUTH_REQUIRED` | Sem sessão |
| 401 | `INVALID_CREDENTIALS` | Login inválido |
| 403 | `EMAIL_NOT_VERIFIED` | Conta não verificada |
| 403 | `FORBIDDEN` | Sem permissão |
| 404 | `NOT_FOUND` | Recurso inexistente ou de outro projeto |
| 409 | `CONFLICT` | Estado incompatível |
| 409 | `VERSION_CONFLICT` | `If-Match` falhou |
| 409 | `IDEMPOTENCY_CONFLICT` | Chave repetida com corpo diferente |
| 409 | `SCHEMA_UNSUPPORTED` | Documento em versão incompatível |
| 410 | `INVITATION_EXPIRED` | Convite expirado |
| 413 | `PAYLOAD_TOO_LARGE` | Corpo acima do limite |
| 422 | `VALIDATION_ERROR` | Regra de negócio |
| 422 | `EXPORT_LIMIT_EXCEEDED` | Acima de 300 páginas |
| 429 | `RATE_LIMITED` | Limite excedido |
| 500 | `INTERNAL` | Erro inesperado |
| 503 | `UNAVAILABLE` | Dependência indisponível |

### 4.3 Regras

- 404 para recurso de outro projeto, não 403. Evita revelar existência.
- `detail` é seguro para o usuário; sem stack trace, SQL ou caminho interno.
- `requestId` aparece no log e na UI.
- Erros de validação listam campos.

## 5. Endpoints

### 5.1 Autenticação e conta

| Método | Caminho | Auth | Descrição |
|---|---|---|---|
| POST | `/v1/auth/register` | Público | Cria conta |
| POST | `/v1/auth/login` | Público | Login com e-mail e senha |
| POST | `/v1/auth/logout` | Sessão | Encerra sessão |
| POST | `/v1/auth/password/forgot` | Público | Inicia recuperação |
| POST | `/v1/auth/password/reset` | Público | Redefine com token |
| GET | `/v1/auth/verify` | Público | Verifica e-mail |
| POST | `/v1/auth/verify/resend` | Sessão | Reenvia verificação |
| GET | `/v1/auth/oauth/google` | Público | Inicia OAuth |
| GET | `/v1/auth/oauth/google/callback` | Público | Callback OAuth |
| GET | `/v1/me` | Sessão | Perfil e CSRF token |
| PATCH | `/v1/me` | Sessão | Atualiza perfil |
| GET | `/v1/me/sessions` | Sessão | Lista dispositivos |
| DELETE | `/v1/me/sessions/:id` | Sessão | Revoga sessão |
| DELETE | `/v1/me` | Sessão | Solicita exclusão |

**Exemplo de registro:**

```http
POST /v1/auth/register
Content-Type: application/json

{
  "email": "ana@exemplo.com",
  "password": "uma-senha-longa-e-unica",
  "name": "Ana Silva",
  "locale": "pt-BR"
}
```

```http
201 Created
Set-Cookie: freex_session=...; HttpOnly; Secure; SameSite=Lax
```

```json
{
  "user": {
    "id": "0192f3a4-...",
    "email": "ana@exemplo.com",
    "name": "Ana Silva",
    "emailVerified": false
  }
}
```

### 5.2 Projetos

| Método | Caminho | Papel | Descrição |
|---|---|---|---|
| GET | `/v1/projects` | Usuário | Lista projetos do usuário |
| POST | `/v1/projects` | Usuário | Cria projeto |
| GET | `/v1/projects/:id` | Membro | Detalhe |
| PATCH | `/v1/projects/:id` | Owner | Atualiza metadados |
| DELETE | `/v1/projects/:id` | Owner | Move para lixeira |
| POST | `/v1/projects/:id/restore` | Owner | Restaura |
| POST | `/v1/projects/:id/duplicate` | Owner/Editor | Duplica |
| GET | `/v1/projects/:id/members` | Membro | Lista membros |
| POST | `/v1/projects/:id/invitations` | Owner | Convida |
| PATCH | `/v1/projects/:id/members/:userId` | Owner | Muda papel |
| DELETE | `/v1/projects/:id/members/:userId` | Owner | Remove |
| POST | `/v1/projects/:id/transfer-ownership` | Owner | Transfere |
| POST | `/v1/invitations/:token/accept` | Sessão | Aceita convite |

**Criar projeto:**

```http
POST /v1/projects
Content-Type: application/json

{
  "title": "O Último Andar",
  "format": "feature",
  "language": "pt-BR"
}
```

```json
{
  "id": "0192f3a4-...",
  "title": "O Último Andar",
  "format": "feature",
  "language": "pt-BR",
  "role": "owner",
  "createdAt": "2026-10-23T14:00:00Z"
}
```

**Convidar:**

```http
POST /v1/projects/:id/invitations
Idempotency-Key: ...

{
  "email": "carla@exemplo.com",
  "role": "editor"
}
```

Resposta `201` com `invitationId`, `expiresAt` e um link copiável. O e-mail é enviado de forma assíncrona.

### 5.3 Roteiros

| Método | Caminho | Papel | Descrição |
|---|---|---|---|
| GET | `/v1/projects/:id/scripts` | Membro | Lista roteiros |
| POST | `/v1/projects/:id/scripts` | Owner/Editor | Cria roteiro |
| GET | `/v1/scripts/:id` | Membro | Metadados |
| PATCH | `/v1/scripts/:id` | Owner/Editor | Título, status, idioma |
| DELETE | `/v1/scripts/:id` | Owner/Editor | Move para lixeira |
| POST | `/v1/scripts/:id/duplicate` | Owner/Editor | Duplica |
| GET | `/v1/scripts/:id/document` | Membro | JSON canônico para leitura |
| POST | `/v1/scripts/:id/collab-token` | Membro | Token de WebSocket |
| GET | `/v1/scripts/:id/scenes` | Membro | Lista derivada de cenas |
| GET | `/v1/scripts/:id/characters` | Membro | Lista derivada de personagens |
| POST | `/v1/scripts/:id/import` | Owner/Editor | Importa Fountain/FDX |

**Criar roteiro:**

```http
POST /v1/projects/:id/scripts
Content-Type: application/json

{
  "title": "O Último Andar",
  "format": "feature",
  "language": "pt-BR",
  "template": "feature"
}
```

**Token de colaboração:**

```http
POST /v1/scripts/:id/collab-token
```

```json
{
  "token": "eyJhbGciOiJFZERTQSIs...",
  "expiresAt": "2026-10-23T14:05:00Z",
  "websocketUrl": "wss://collab.freex.app",
  "documentName": "script:0192f3a4-..."
}
```

O token é de uso único para abrir a conexão. O cliente renova antes de expirar.

**Documento:**

```http
GET /v1/scripts/:id/document
```

```json
{
  "schemaVersion": 1,
  "document": { "type": "doc", "content": [] },
  "layoutHash": "sha256:...",
  "updatedAt": "2026-10-23T14:00:00Z"
}
```

Esse endpoint é para leitura, exportação e debug. A edição vai pelo WebSocket.

### 5.4 Versões

| Método | Caminho | Papel | Descrição |
|---|---|---|---|
| GET | `/v1/scripts/:id/snapshots` | Membro | Lista versões |
| POST | `/v1/scripts/:id/snapshots` | Owner/Editor | Cria versão nomeada |
| GET | `/v1/scripts/:id/snapshots/:snapshotId` | Membro | Detalhe |
| POST | `/v1/scripts/:id/snapshots/:snapshotId/restore` | Owner/Editor | Restaura |
| GET | `/v1/scripts/:id/snapshots/:snapshotId/diff` | Membro | Diff contra versão |

**Criar versão:**

```http
POST /v1/scripts/:id/snapshots
Idempotency-Key: ...

{
  "label": "Leitura 12/11",
  "description": "Versão para a leitura com a direção"
}
```

**Restaurar:**

```http
POST /v1/scripts/:id/snapshots/:snapshotId/restore
```

```json
{
  "restoredSnapshotId": "0192f3a4-...",
  "newSnapshotId": "0192f3a4-...",
  "versionNumber": 42
}
```

A restauração cria um snapshot de segurança e aplica a versão escolhida. O histórico não é apagado.

### 5.5 Comentários

| Método | Caminho | Papel | Descrição |
|---|---|---|---|
| GET | `/v1/scripts/:id/comments` | Membro | Lista threads |
| POST | `/v1/scripts/:id/comments` | Owner/Editor/Commenter | Cria thread |
| GET | `/v1/comments/:id` | Membro | Detalhe |
| PATCH | `/v1/comments/:id` | Autor | Edita o primeiro comentário |
| POST | `/v1/comments/:id/messages` | Owner/Editor/Commenter | Responde |
| POST | `/v1/comments/:id/resolve` | Owner/Editor/Commenter | Resolve |
| POST | `/v1/comments/:id/reopen` | Owner/Editor/Commenter | Reabre |
| DELETE | `/v1/comments/:id` | Autor/Owner | Remove |

**Criar comentário:**

```http
POST /v1/scripts/:id/comments
Content-Type: application/json

{
  "anchor": {
    "start": "base64...",
    "end": "base64..."
  },
  "selectedText": "Ele está lá.",
  "body": "Esse 'lá' pode ser mais específico?"
}
```

```json
{
  "id": "0192f3a4-...",
  "status": "open",
  "author": { "id": "...", "name": "Carla" },
  "createdAt": "2026-10-23T14:00:00Z"
}
```

### 5.6 Exportações

| Método | Caminho | Papel | Descrição |
|---|---|---|---|
| POST | `/v1/scripts/:id/exports` | Membro | Solicita PDF |
| GET | `/v1/scripts/:id/exports` | Membro | Histórico |
| GET | `/v1/exports/:id` | Membro | Status |
| GET | `/v1/exports/:id/download` | Membro | URL assinada |
| POST | `/v1/exports/:id/cancel` | Solicitante | Cancela |
| DELETE | `/v1/exports/:id` | Solicitante | Remove |

**Solicitar:**

```http
POST /v1/scripts/:id/exports
Idempotency-Key: ...

{
  "includeTitlePage": true,
  "includeSceneList": false,
  "includeCharacterList": false,
  "includeComments": false,
  "pageRange": null,
  "pageSize": "letter",
  "watermark": null
}
```

```http
202 Accepted
```

```json
{
  "id": "0192f3a4-...",
  "status": "queued",
  "snapshotId": "0192f3a4-...",
  "estimatedSeconds": 12
}
```

**Status:**

```json
{
  "id": "0192f3a4-...",
  "status": "ready",
  "pageCount": 104,
  "fileSize": 812345,
  "sha256": "...",
  "createdAt": "2026-10-23T14:00:00Z",
  "completedAt": "2026-10-23T14:00:12Z",
  "expiresAt": "2026-10-30T14:00:12Z"
}
```

**Download:**

```json
{
  "url": "https://storage.freex.app/exports/...?X-Amz-Signature=...",
  "expiresAt": "2026-10-24T14:00:00Z",
  "fileName": "o-ultimo-andar-2026-10-23-v3.pdf"
}
```

### 5.7 Saúde

| Método | Caminho | Auth | Descrição |
|---|---|---|---|
| GET | `/v1/health` | Público | Liveness |
| GET | `/v1/ready` | Interno | Readiness (DB, Redis, fila) |

`/v1/health` retorna `200` se o processo está vivo. `/v1/ready` retorna `503` se uma dependência crítica está indisponível.

## 6. WebSocket

### 6.1 Conexão

```text
wss://collab.freex.app
```

- `documentName`: `script:{uuid}`.
- Autenticação na primeira mensagem, com o token de colaboração.
- Origem validada.
- Subprotocolo do Hocuspocus.

### 6.2 Mensagens

| Tipo | Direção | Descrição |
|---|---|---|
| `Authenticate` | Cliente → Servidor | Token |
| `SyncStep1` | Ambos | Vetor de estado |
| `SyncStep2` | Ambos | Atualizações faltantes |
| `Update` | Ambos | Atualização incremental |
| `Awareness` | Ambos | Presença e cursor |
| `Stateless` | Servidor → Cliente | Eventos de comentário/permissão |
| `Ping/Pong` | Ambos | Heartbeat |

### 6.3 Códigos de fechamento

| Código | Significado |
|---:|---|
| 1000 | Normal |
| 1001 | Vai embora |
| 4001 | Token inválido ou expirado |
| 4003 | Sem permissão |
| 4008 | Limite de conexões |
| 4010 | Documento em quarentena |
| 4011 | Schema incompatível |
| 1011 | Erro interno |

### 6.4 Reconexão

- Backoff exponencial com jitter.
- Renovar token antes de reconectar.
- Não criar nova conexão se já houver uma ativa.
- UI mostra estado: conectado, sincronizando, offline, erro.

## 7. Permissões

A matriz completa está em [`../01-requisitos/srs.md`](../01-requisitos/srs.md), seção 4.2.

Regras de API:

- `owner`: tudo no projeto.
- `editor`: lê, edita roteiro, cria comentários, exporta.
- `commenter`: lê, comenta, exporta; não edita.
- `viewer`: lê e exporta; não edita, não comenta.

Nenhum endpoint confia no papel enviado pelo cliente. O papel é sempre derivado da sessão e do vínculo com o projeto.

## 8. Rate limits

| Escopo | Limite |
|---|---|
| Login por IP | 10/min |
| Login por conta | 5/min |
| Registro por IP | 5/h |
| Recuperação por e-mail | 3/h |
| API por usuário | 600/min |
| Exportações por usuário | 10/h |
| Convites por projeto | 50/dia |
| WebSocket por conexão | 100 msg/s |
| WebSocket por usuário | 5 conexões simultâneas |

Respostas `429` incluem `Retry-After`.

## 9. OpenAPI

- Fonte de verdade: `packages/contracts/openapi.yaml`.
- Gerada a partir de schemas Zod com `zod-to-openapi`.
- CI falha se a especificação divergir do código.
- A documentação pública é gerada em `/docs`.
- Exemplos são testados.

## 10. Versionamento

- `/v1` é estável.
- Campos novos podem ser adicionados sem nova versão.
- Campos existentes não são removidos nem têm tipo alterado em `/v1`.
- Mudança incompatível cria `/v2`.
- Versões antigas têm prazo de 12 meses, comunicado.

## 11. Webhooks

Fora do MVP. Quando existirem:

- assinatura HMAC;
- retry com backoff;
- eventos: `export.ready`, `project.member_added`, `comment.created`;
- endpoint por projeto;
- logs de entrega.

## 12. Critérios de aceite

- Todos os endpoints verificam sessão e vínculo.
- Um usuário de outro projeto recebe 404.
- `viewer` não consegue editar por REST nem por WebSocket.
- `POST /exports` é idempotente.
- Erros seguem RFC 9457.
- Paginação por cursor funciona.
- Rate limits retornam `429` com `Retry-After`.
- OpenAPI cobre todos os endpoints.
- Nenhum segredo ou texto de roteiro aparece em log.
- WebSocket rejeita token expirado e origem inválida.
