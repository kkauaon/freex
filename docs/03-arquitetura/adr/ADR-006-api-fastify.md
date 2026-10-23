# ADR-006: Servir a API REST em um serviço Fastify separado

- **Status:** Aceito
- **Data:** 2026-10-23
- **Substitui:** parcialmente [ADR-005](ADR-005-monolito-modular.md) (apenas a linha `apps/web` como dona da API REST)
- **Substituído por:** —
- **Relaciona-se com:** [`../arquitetura-geral.md`](../arquitetura-geral.md), [`../api.md`](../api.md), [`../seguranca-e-privacidade.md`](../seguranca-e-privacidade.md), [`../../06-operacoes/deploy-e-observabilidade.md`](../../06-operacoes/deploy-e-observabilidade.md)

## Contexto

O [ADR-005](ADR-005-monolito-modular.md) colocou a API REST e a autenticação dentro de `apps/web`, usando Route Handlers do Next.js, para reduzir infraestrutura no MVP. Há agora um requisito explícito de backend de alto desempenho e previsível.

Pontos que pesam:

1. A API é stateless e dominada pela latência do PostgreSQL, mas o overhead do framework, a serialização e o controle de pool e de ciclo de vida contam.
2. Route Handlers acoplam o deploy, o escalonamento e o ciclo de release da API ao frontend.
3. O produto exige validação com Zod em toda borda, logs estruturados com Pino e verificação de permissão no servidor. Todos se encaixam melhor num servidor HTTP dedicado.
4. O domínio (`screenplay`, `layout`, `contracts`) é TypeScript e precisa ser compartilhado entre cliente, API, colaboração e worker. Isso exclui trocar a linguagem do backend sem duplicar a paginação, que é o contrato do produto.
5. O desempenho do editor e do PDF é decidido por Yjs/Hocuspocus e por Chromium, não pela linguagem da API.

## Decisão

Adotamos **Fastify 5 sobre Node.js 24 LTS** em uma nova unidade, `apps/api`, que passa a ser a dona da API REST (`/v1/*`) e da autenticação (Better Auth, atrás de `/v1/auth/*`).

| Unidade | Responsabilidade | Estado |
|---|---|---|
| `apps/web` | Interface, SSR, shell PWA. Consome a API por HTTP | Stateless |
| `apps/api` | API REST, autenticação, autorização, orquestração, enfileiramento de jobs | Stateless |
| `apps/collab` | Inalterado | Stateful por sala |
| `apps/worker` | Inalterado | Efêmero |

Diretrizes:

- Validação e serialização com Zod por `fastify-type-provider-zod`; o OpenAPI é gerado dos mesmos schemas de `packages/contracts`.
- Logs com Pino nativo do Fastify, com os campos exigidos em [`AGENTS.md`](../../../AGENTS.md); nunca texto de roteiro.
- Permissões em hooks e políticas de `packages/auth`; o vínculo de acesso faz parte de cada consulta.
- Pool de conexões PostgreSQL dimensionado por instância; trabalho pesado, como PDF, vai para o BullMQ e nunca roda na requisição.
- `apps/web` e `apps/api` compartilham domínio por pacotes, nunca por import entre apps.
- Metas de desempenho são medidas com k6 antes de qualquer otimização adicional.

Regras de dependência de `apps/api`: `contracts`, `db`, `auth`, `screenplay`, `layout` e `observability`. Não depende de `ui`. `apps/web` deixa de depender de `db` e de `auth`; fala com a API por contrato.

## Alternativas consideradas

| Alternativa | Por que foi descartada |
|---|---|
| Route Handlers do Next.js (ADR-005) | Acopla API e frontend, controle limitado de pool, hooks e ciclo de vida. |
| Go | Duplica schema, validação e paginação em duas linguagens, o que arrisca a paridade entre prévia e PDF. O ecossistema Yjs/ProseMirror é JavaScript, então o Node continuaria necessário. O ganho esperado é pequeno, pois o gargalo é o banco. |
| Rust | Mesmos custos de duplicação e curva de aprendizado. É candidato futuro apenas para o servidor de colaboração ou o motor de layout em WASM, se a medição justificar. |
| NestJS | Mais cerimônia e acoplamento por decorators, com ganho de desempenho nulo ou negativo. |
| Hono | Muito rápido, mas o ecossistema de plugins para Node, de logging e de observabilidade é menor. |
| Express | Mais lento, sem validação ou tipos modernos, manutenção fraca. |

## Consequências

### Positivas

- Menor overhead por requisição e serialização rápida.
- A API escala, é reiniciada e recebe release de forma independente do frontend.
- Integração nativa com Pino e com Zod, que já fazem parte da stack.
- Fronteira de segurança mais clara, com `apps/web` sem acesso direto ao banco.
- Caminho aberto para extrair módulos específicos depois, sem trocar o contrato.

### Negativas

- Uma unidade a mais de deploy, pipeline, métricas e health check.
- Uma chamada de rede a mais entre `web` e `api` no SSR.
- CORS e cookies de sessão entre origens precisam ser configurados com cuidado; o uso do mesmo domínio-site (subdomínio ou proxy reverso) é preferido.
- Better Auth precisa ser integrado ao Fastify, e não ao Next.
- Os documentos de arquitetura, API, segurança e operação precisam ser mantidos consistentes.

### Neutras

- O contrato REST em [`../api.md`](../api.md) não muda.
- Node e TypeScript continuam como runtime e linguagem.

## Critérios de conformidade

1. `apps/api` sobe e atende `/v1/*` sem `apps/web` no mesmo processo.
2. Reiniciar `apps/web` ou `apps/api` não encerra sessões de colaboração.
3. `apps/web` não importa `db` nem `auth`.
4. Toda rota usa schema Zod de entrada e de saída.
5. Há teste de autorização por endpoint e por papel.
6. Nenhum job de PDF executa dentro de uma requisição.
7. `apps/api` tem health check, métricas, traces e logs próprios.
8. Há benchmark k6 com metas registradas de p95 da API, antes do lançamento.

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Latência extra no SSR | Mesma região, rede privada, chamadas em paralelo, cache de leitura |
| Cookie de sessão entre `web` e `api` | Mesmo site; `SameSite`, `Secure`, `HttpOnly`; teste E2E de auth |
| Desvio entre OpenAPI e implementação | Geração a partir do Zod e teste de contrato no CI |
| Gargalo real persistir | Extrair só o serviço medido (colaboração ou layout em WASM) com novo ADR |

## Referências

- [`ADR-005`](ADR-005-monolito-modular.md)
- [`../arquitetura-geral.md`](../arquitetura-geral.md)
- [`../api.md`](../api.md)
- [Fastify](https://fastify.dev/)
