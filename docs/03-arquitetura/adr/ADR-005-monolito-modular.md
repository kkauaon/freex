# ADR-005: Monólito modular com serviços stateful separados

- **Status:** Aceito
- **Data:** 2026-10-23
- **Substitui:** —
- **Substituído por:** —
- **Relaciona-se com:** [`../arquitetura-geral.md`](../arquitetura-geral.md), [`../api.md`](../api.md), [`../../06-operacoes/deploy-e-observabilidade.md`](../../06-operacoes/deploy-e-observabilidade.md)

## Contexto

O MVP tem três cargas de trabalho com características diferentes:

1. **CRUD e interface web.** Projetos, membros, metadados, comentários, versões, autenticação e API. É stateless, sensível a latência de página e muda com frequência.
2. **Colaboração em tempo real.** Mantém salas Yjs em memória, conexões WebSocket longas, presença e pub/sub. É stateful e tem pico de conexões.
3. **Exportação de PDF.** Executa Chromium, consome memória, tem fila e picos de CPU. É pesado e tolera latência de segundos.

Começar com microsserviços para cada função cria custo operacional antes de existir demanda. Começar com um único processo para tudo mistura ciclos de vida: reiniciar a API derrubaria sessões de colaboração; um PDF problemático poderia afetar a API.

Também é preciso evitar o outro extremo: um monólito sem fronteiras internas vira um emaranhado em que todo módulo importa todo módulo, e a extração futura se torna impossível.

## Decisão

Adotamos um **monólito modular** para a aplicação web e a API, com **dois serviços separados** para collaboration e PDF.

A divisão é:

| Unidade | Responsabilidade | Estado |
|---|---|---|
| `apps/web` | Interface, autenticação, API REST, orquestração | Stateless |
| `apps/collab` | Salas Yjs, WebSocket, presença, persistência do documento | Stateful por sala |
| `apps/worker` | Consumo da fila, renderização de PDF, upload | Efêmero, escalável |
| PostgreSQL | Fonte de verdade relacional e snapshots | Persistente |
| Redis | Pub/sub, filas, rate limit, cache | Efêmero |
| Object storage | PDFs, avatares | Persistente |

O código é organizado em pacotes com dependências unidirecionais:

- `packages/screenplay` não depende de app, banco ou UI;
- `packages/layout` depende apenas de `screenplay`;
- `packages/pdf` depende de `layout` e `screenplay`;
- `apps/web` depende de `contracts`, `db`, `auth`, `ui`, `screenplay` e `layout`;
- `apps/collab` depende de `screenplay`, `db`, `auth` e `observability`;
- `apps/worker` depende de `pdf`, `db` e `observability`;
- nenhum pacote de domínio importa código de `apps/`;
- nenhum componente de UI importa `db` diretamente.

A regra de extração é explícita. Um módulo só vira serviço quando pelo menos uma destas condições for verdadeira:

- precisa escalar em ritmo diferente do restante;
- tem requisito de disponibilidade ou isolamento de falha incompatível com o deploy único;
- exige uma fronteira de conformidade ou residência de dados;
- tem cadência de release que não pode acompanhar a API;
- o custo de mantê-lo no monólito supera o custo de operar mais um serviço.

“Vai escalar no futuro” não é justificativa suficiente. O monólito modular é a aposta default até que a medição mostre o contrário.

## Alternativas consideradas

| Alternativa | Por que foi descartada |
|---|---|
| Microsserviços desde o início | Multiplica deploys, contratos, observabilidade e falhas de rede antes de haver escala ou equipe para sustentar. |
| Monólito único, incluindo colaboração e PDF | Mistura ciclos de vida: reinício da API derruba WebSocket; job de PDF compete por memória com o tráfego web. |
| Serverless para tudo | Boa para picos, ruim para WebSocket stateful e para Chromium de longa duração. Cold start afeta a latência de edição. |
| Serviços gerenciados para colaboração e PDF | Reduz operação, mas cria dependência de preço e de região e limita o controle sobre layout e retenção. |
| Monólito sem pacotes internos | Rápido no primeiro mês, caro no segundo. Sem fronteiras, a extração futura vira reescrita. |

## Consequências

### Positivas

- Um único deploy para web e API reduz custo operacional no início.
- Colaboração e PDF escalam e falham de forma independente.
- As fronteiras de pacote permitem extrair um módulo sem reescrever o domínio.
- O motor de layout fica isolado e testável, sem dependência de framework.
- O modelo de permissões é centralizado, não replicado em cada serviço.

### Negativas

- O monólito ainda é um único ponto de falha para web e API.
- As fronteiras de pacote precisam ser verificadas em CI; caso contrário, viram sugestão.
- Há três unidades de deploy, três pipelines e três conjuntos de métricas.
- A consistência entre API e colaboração exige contratos claros e testes de integração.
- A equipe precisa operar Redis e um worker com Chromium desde cedo.

### Neutras

- A arquitetura não impede mover a API para um serviço separado no futuro; o contrato REST e os pacotes de domínio já estão separados.
- O banco é compartilhado por enquanto. Serviços com banco próprio só se justificam com uma fronteira de domínio real.

## Critérios de conformidade

1. `apps/web` sobe e serve a API sem depender de `apps/collab` estar no mesmo processo.
2. Reiniciar `apps/web` não encerra sessões de colaboração.
3. Um job de PDF não bloqueia requisições da API.
4. Nenhum pacote de domínio importa código de `apps/`.
5. Nenhum componente de UI acessa o banco diretamente.
6. As regras de dependência são verificadas por lint ou teste de arquitetura no CI.
7. Cada serviço tem health check, métricas e logs próprios.
8. A extração de um módulo é possível sem alterar o contrato público da API.

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Monólito virar emaranhado | Regras de dependência no CI, code review, pacotes pequenos e responsabilidade única |
| Serviço de colaboração consumir memória demais | Limite por sala, monitoramento, desconexão de inativos, escala horizontal |
| Worker de PDF derrubar o host | Container isolado, limite de memória, concorrência controlada, timeout |
| Acoplamento ao provedor de nuvem | Interfaces para storage, fila e e-mail; deploy em container |
| Custo de operar três serviços | Automação de deploy, observabilidade compartilhada, runbooks únicos |

## Referências

- [`../arquitetura-geral.md`](../arquitetura-geral.md)
- [`../api.md`](../api.md)
- [`../../06-operacoes/deploy-e-observabilidade.md`](../../06-operacoes/deploy-e-observabilidade.md)
- [`../../05-qualidade/testes-e-aceite.md`](../../05-qualidade/testes-e-aceite.md)
