# Deploy e observabilidade

**Status:** proposta para revisão antes do beta
**Relaciona-se com:** [`../03-arquitetura/arquitetura-geral.md`](../03-arquitetura/arquitetura-geral.md), [`../03-arquitetura/seguranca-e-privacidade.md`](../03-arquitetura/seguranca-e-privacidade.md), [`../01-requisitos/srs.md`](../01-requisitos/srs.md)

**Fase 1 (uma VPS, sem contêineres):** [`deploy-vps.md`](deploy-vps.md).

---

## 1. Objetivo

Operar o FREEX com previsibilidade: saber se está saudável, detectar degradação antes do usuário, recuperar rápido e aprender com cada falha. Este documento cobre ambientes, pipeline, SLOs, métricas, alertas, runbooks, backup e resposta a incidentes.

A regra que atravessa tudo: **nenhuma falha de infraestrutura pode causar perda silenciosa de texto**. Se o sistema não consegue persistir, ele avisa e mantém cópia local até conseguir.

## 2. SLOs e orçamento de erro

### 2.1 Indicadores

| SLI | Definição | Meta | Janela |
|---|---|---|---|
| Disponibilidade de leitura | Requisições `GET` de projeto/roteiro com status 2xx ou 3xx | 99,9% | 30 dias |
| Disponibilidade de edição | Sessões de colaboração que permanecem conectadas e persistem | 99,9% | 30 dias |
| Latência de API | p95 de requisições de leitura | < 300 ms | 30 dias |
| Latência de edição | p95 de propagação remota na mesma região | < 300 ms | 30 dias |
| Sucesso de exportação | Jobs `ready` / jobs iniciados | > 99% | 30 dias |
| Latência de exportação | p95 de 120 páginas | < 15 s | 30 dias |
| Durabilidade | Atualizações confirmadas e persistidas | 100% | Contínua |

99,9% em 30 dias permite cerca de 43 minutos de indisponibilidade. O orçamento de erro não é licença para falhar; é o limite para priorizar confiabilidade sobre novas funcionalidades.

### 2.2 Política de orçamento

- Consumo acima de 50% no mês: revisão semanal de confiabilidade.
- Consumo acima de 100%: congelamento de mudanças de risco até recuperar margem, salvo correções de segurança e disponibilidade.
- Incidente que consome mais de 20% do orçamento em um evento exige postmortem e ação corretiva com prazo.
- Erro do usuário (4xx) não consome orçamento de disponibilidade; erro do servidor (5xx) consome.

## 3. Ambientes

| Ambiente | Objetivo | Dados | Acesso | Deploy |
|---|---|---|---|---|
| Local | Desenvolvimento | Fixtures sintéticas | Desenvolvedor | Manual |
| Preview | Revisão de PR | Efêmero, isolado | Equipe | Automático por PR |
| Staging | Ensaio de release | Cópia anonimizada | Equipe e QA | Automático no merge |
| Produção | Usuários | Dados reais | Operação restrita | Promoção aprovada |

Regras:

- Preview não acessa banco, storage ou Redis de produção.
- Staging tem a mesma versão de Chromium, fonte e configuração de PDF que produção.
- Produção não recebe deploy direto de branch local.
- Segredos são distintos por ambiente.
- Dados de staging são anonimizados antes da cópia e nunca voltam para produção.

## 4. Topologia de deploy

| Unidade | Tipo | Escala | Observação |
|---|---|---|---|
| `web` | Container stateless | Horizontal | Next.js e interface |
| `api` | Container stateless | Horizontal | Fastify, API REST e auth |
| `collab` | Container stateful | Horizontal com Redis | Uma sala por roteiro; sticky não obrigatório |
| `worker` | Container efêmero | Horizontal | Chromium fixado; concorrência por memória |
| PostgreSQL | Serviço gerenciado | Vertical e réplica | PITR e backup diário |
| Redis | Serviço gerenciado | Vertical | Pub/sub, fila, rate limit |
| Object storage | Serviço gerenciado | Elástico | PDFs e avatares |
| CDN/WAF | Borda | Gerenciado | TLS, cache, proteção |

O provedor específico pode variar. Os contratos são: container Linux, rede privada, storage S3-compatível, PostgreSQL gerenciado e Redis gerenciado. Nada no código depende de um provedor único.

## 5. Pipeline de entrega

### 5.1 Estágios

```text
PR
 ├── lint + typecheck
 ├── unit + property (amostra)
 ├── golden layout
 ├── integração (subset)
 ├── build das três imagens
 ├── E2E crítico
 ├── a11y smoke
 └── scan de dependência e segredo

Merge em main
 ├── build imutável com tag de commit
 ├── deploy em staging
 ├── migração em staging
 ├── E2E completo
 └── smoke de PDF

Release
 ├── aprovação
 ├── migração em produção (job separado)
 ├── deploy canário de web
 ├── deploy de collab
 ├── deploy de worker
 ├── smoke test
 └── monitoramento reforçado por 1 h
```

### 5.2 Artefatos

- Imagens identificadas por digest, nunca por `latest`.
- Build reproduzível, com lockfile e versões fixas.
- SBOM gerado por release.
- Assinatura de imagem quando o provedor suportar.
- Tag de release inclui versão do app, versão do layout, versão do renderer e versão do perfil.

### 5.3 Migrações

- Migração roda em job separado, antes do deploy da aplicação.
- Estratégia expand/contract: adicionar coluna, preencher, migrar leitura, remover depois.
- Nenhuma migração destrutiva no mesmo deploy que muda o código.
- Migração precisa ser idempotente ou ter controle de versão.
- Tempo máximo aceitável: 30 s para tabelas grandes; acima disso, migração em background.
- Rollback de código não desfaz migração; o código novo deve conviver com o schema antigo durante a janela.

### 5.4 Rollback

- Rollback de imagem para a versão anterior em até 5 min.
- Feature flag desliga a funcionalidade sem novo deploy.
- Migração só é revertida se houver script testado; caso contrário, corrige-se para frente.
- O rollback não pode perder edições: o estado Yjs e os snapshots são compatíveis entre versões durante a janela.

### 5.5 Feature flags

- Flags para colaboração, exportação, A4, comentários e limites de uso.
- Flag tem dono, descrição, data de criação e critério de remoção.
- Flag não é permissão; autorização continua no servidor.
- Flag órfã é removida em até 90 dias após estabilização.

## 6. Configuração e segredos

- Configuração não secreta em variáveis de ambiente versionadas por ambiente.
- Segredos em secret manager, injetados em runtime.
- Nenhum segredo em imagem, repositório, log ou mensagem de erro.
- Rotação de chaves de assinatura a cada 90 dias ou imediatamente em caso de suspeita.
- Acesso ao secret manager é auditado e revisado trimestralmente.
- Configuração de produção é revisada por duas pessoas.

## 7. Observabilidade

### 7.1 Logs

Formato JSON, uma linha por evento, com campos estáveis:

```json
{
  "ts": "2026-10-23T14:00:00.000Z",
  "level": "info",
  "event": "export.completed",
  "request_id": "req_...",
  "trace_id": "trace_...",
  "actor_id": "user_...",
  "project_id": "project_...",
  "script_id": "script_...",
  "export_id": "export_...",
  "route": "POST /v1/scripts/:id/exports",
  "status": 200,
  "duration_ms": 8421,
  "outcome": "success",
  "error_code": null,
  "feature_flag": "pdf_worker_v2",
  "region": "us-east-1"
}
```

Regras:

- `event` é um nome estável, em domínio, não uma frase livre.
- `request_id` e `trace_id` aparecem em toda resposta de erro.
- Não registrar texto de roteiro, comentário, título de cena, nome de personagem, senha, token ou corpo de e-mail.
- IDs são suficientes para correlacionar; conteúdo não é.
- Logs de sucesso em hot path são `debug` ou amostrados; erro e evento de auditoria são `info`/`warn`.
- Retenção de 30 dias, com acesso restrito.

### 7.2 Métricas

Padrão RED para serviços e USE para recursos.

| Métrica | Tipo | Uso |
|---|---|---|
| `freex_api_requests_total` | Counter | Volume por rota e status |
| `freex_api_request_duration_seconds` | Histogram | Latência p50/p95/p99 |
| `freex_api_errors_total` | Counter | Erros por código |
| `freex_collab_connections_active` | Gauge | Conexões por instância e região |
| `freex_collab_rooms_active` | Gauge | Salas em memória |
| `freex_collab_update_latency_seconds` | Histogram | Propagação |
| `freex_collab_persistence_lag_seconds` | Gauge | Atraso de persistência |
| `freex_collab_memory_bytes` | Gauge | Memória por sala e total |
| `freex_export_jobs_queued` | Gauge | Backlog |
| `freex_export_job_duration_seconds` | Histogram | Tempo por faixa de páginas |
| `freex_export_failures_total` | Counter | Falhas por código |
| `freex_pdf_pages_total` | Counter | Volume de páginas |
| `freex_db_connections` | Gauge | Pool |
| `freex_redis_memory_ratio` | Gauge | Pressão de memória |
| `freex_storage_errors_total` | Counter | Falha de storage |
| `freex_auth_failures_total` | Counter | Falha de login e token |
| `freex_cost_estimated_usd` | Counter | Custo estimado por provedor e operação |

Nenhuma métrica tem label de usuário, projeto ou roteiro. Cardinalidade alta é controlada por agregação; IDs ficam em logs e traces.

### 7.3 Traces

- OpenTelemetry com propagação W3C.
- Spans para requisição HTTP, consulta ao banco, chamada ao Redis, job de exportação, renderização de PDF e handshake de colaboração.
- Atributos permitidos: rota, status, duração, tipo de operação, faixa de páginas.
- Atributos proibidos: texto, título, nome de personagem, token, e-mail.
- Amostragem de 10% em produção, 100% em erro e em jobs de exportação.
- Trace de uma edição permite seguir do cliente ao WebSocket, Redis, persistência e snapshot.

### 7.4 Dashboards

1. **Saúde do produto:** disponibilidade, latência, erro, sessões ativas.
2. **Colaboração:** conexões, salas, latência, lag de persistência, reconexões.
3. **Exportação:** fila, tempo, falhas, páginas, cache hit.
4. **Banco e Redis:** conexões, CPU, memória, réplica, PITR.
5. **Segurança:** falhas de login, autorização negada, rate limit, tokens inválidos.
6. **Negócio:** cadastros, projetos, roteiros, PDFs, retenção.
7. **Custo:** gasto por provedor, custo por 1.000 páginas exportadas, storage e tráfego.

Cada dashboard tem link para o runbook correspondente.

### 7.5 Alertas

| Alerta | Condição | Severidade | Runbook |
|---|---|---|---|
| API indisponível | 5xx > 5% por 5 min | SEV-1 | `api-down` |
| Latência de API | p95 > 1 s por 10 min | SEV-2 | `api-latency` |
| Colaboração indisponível | conexões novas falham > 10% por 5 min | SEV-1 | `collab-down` |
| Lag de persistência | > 60 s por 5 min | SEV-1 | `collab-persistence` |
| Backlog de exportação | > 50 jobs ou job mais antigo > 10 min | SEV-2 | `export-backlog` |
| Falha de exportação | > 5% por 15 min | SEV-2 | `export-failures` |
| PostgreSQL | conexões > 80% ou réplica atrasada > 30 s | SEV-2 | `db-pressure` |
| Redis | memória > 80% ou evictions > 0 | SEV-2 | `redis-pressure` |
| Storage | erros > 1% por 5 min | SEV-2 | `storage-errors` |
| Backup | falha ou atraso > 1 h | SEV-1 | `backup-failure` |
| Certificado | expira em < 14 dias | SEV-2 | `certificate` |
| Segurança | pico de falha de login ou acesso cruzado | SEV-2 | `security-alert` |
| Orçamento de nuvem | gasto mensal > 80% do orçamento | SEV-2 | `cost-budget` |

Alertas têm dono, janela de silêncio e condição de resolução. Alerta que dispara sem ação é removido ou ajustado.

## 8. Runbooks

### 8.1 API indisponível

1. Confirmar escopo: região, rota, versão.
2. Verificar status do provedor e do banco.
3. Checar deploy recente; se coincidir, rollback para a imagem anterior.
4. Verificar saturação de CPU, memória e pool de conexões.
5. Se o banco estiver indisponível, seguir `db-down`.
6. Comunicar status page se > 5 min.
7. Registrar incidente e linha do tempo.

### 8.2 Colaboração indisponível

1. Verificar health check do `collab` e conexões ativas.
2. Verificar Redis e lag de pub/sub.
3. Se uma instância estiver ruim, retirar do balanceador.
4. Se o Redis estiver indisponível, ativar modo de instância única e avisar no produto.
5. Confirmar que usuários entraram em offline e que edições locais estão preservadas.
6. Após restabelecer, monitorar reconexão em massa e lag de persistência.

### 8.3 Lag de persistência

1. Verificar fila de persistência e latência do PostgreSQL.
2. Verificar se há sala grande consumindo memória ou snapshot travado.
3. Aumentar concorrência de persistência se o banco suportar.
4. Se o lag passar de 5 min, alertar e considerar pausar novas conexões na sala afetada.
5. Nunca descartar atualizações para reduzir lag. Elas vão para disco ou para buffer durável.

### 8.4 Backlog de exportação

1. Verificar número de jobs, idade do mais antigo e taxa de falha.
2. Verificar saúde dos workers e memória.
3. Aumentar réplicas se o storage e o banco suportarem.
4. Identificar job travado e matar com timeout; a fila reenfileira.
5. Se o backlog for por falha de fonte, corrigir a fonte e reprocessar.
6. Comunicar usuários afetados se > 15 min.

### 8.5 PostgreSQL indisponível

1. Confirmar falha no provedor e failover.
2. API retorna 503; colaboração continua em memória com aviso.
3. Bloquear novas sessões e escritas que dependam do banco.
4. Não reiniciar o banco sem confirmar backup e réplica.
5. Após voltar, validar integridade, replicação e PITR.
6. Reconciliar dados bufferizados e confirmar que nenhuma edição foi perdida.

### 8.6 Redis indisponível

1. Colaboração perde pub/sub entre instâncias; fila pausa.
2. Ativar modo de instância única com aviso.
3. Rate limit degrada para memória local.
4. Não é fonte de verdade: confirmar que documentos estão no PostgreSQL.
5. Após voltar, reconectar e monitorar duplicação de jobs.
6. Reprocessar fila com idempotência.

### 8.7 Falha de backup

1. Verificar job, storage e permissões.
2. Rodar backup manual.
3. Confirmar integridade e retenção.
4. Se o backup contínuo estiver comprometido, abrir SEV-1 e avaliar RPO.
5. Registrar e revisar causa.

### 8.8 Incidente de segurança

1. Abrir canal restrito e nomear incident commander.
2. Conter: revogar tokens, bloquear IP, isolar serviço, rotacionar chave.
3. Preservar evidências: logs, traces, snapshots de disco.
4. Avaliar dados afetados e obrigação de notificação.
5. Comunicar jurídico, privacidade e usuários afetados conforme o plano.
6. Corrigir, validar e monitorar.
7. Postmortem em 5 dias úteis.

### 8.9 Orçamento de nuvem acima do previsto

1. Identificar o provedor e a linha de custo que disparou o alerta.
2. Separar crescimento legítimo de abuso: exportações repetidas, storage sem ciclo de vida, salas travadas.
3. Verificar cache de PDF, compressão de snapshots e TTL de logs e objetos.
4. Se houver abuso, aplicar limite de uso e rate limit; nunca bloquear leitura ou edição por inadimplência, porque não há cobrança.
5. Se o custo for estrutural, propor otimização ou revisão de orçamento antes de reduzir retenção.
6. Registrar a decisão e o impacto em capacidade.

## 9. Backup e recuperação

| Item | Estratégia | Retenção | Teste |
|---|---|---|---|
| PostgreSQL | PITR contínuo | 7 dias | Mensal |
| PostgreSQL | Backup diário completo | 30 dias | Trimestral |
| Object storage | Versionamento e ciclo de vida | 30 dias | Trimestral |
| Snapshots | Imutáveis no banco | Política de dados | Mensal |
| Configuração | Infra as code | Git | Cada mudança |
| Segredos | Secret manager | Rotação | Trimestral |

- RPO: 5 min.
- RTO: 1 h.
- Restauração testada em ambiente isolado, com validação de integridade e de layout.
- Após restauração, gerar um PDF de fixture e comparar com golden.
- Nenhum teste de restauração usa produção como destino.

## 10. Capacidade

| Recurso | Sinal | Ação |
|---|---|---|
| Web | CPU > 70% por 15 min | Aumentar réplicas |
| Colaboração | memória por sala > 50 MB | Investigar documento, limitar conexões |
| Colaboração | conexões por instância > 70% do limite | Aumentar réplicas |
| Worker | fila > 5 min | Aumentar concorrência ou réplicas |
| PostgreSQL | conexões > 70% | Pooling, réplica, revisão de queries |
| Redis | memória > 70% | Revisar TTL, aumentar capacidade |
| Storage | crescimento > 20% ao mês | Revisar retenção e ciclo de vida |

Capacidade é revisada antes de cada campanha e a cada release relevante. O limite de 300 páginas e 50 editores é premissa de dimensionamento, não sugestão.

### 10.1 Sustentabilidade de custos

O FREEX é gratuito e não tem receita de assinatura. O custo operacional precisa caber em um orçamento definido, sem transformar limite de uso em plano pago.

- Orçamento mensal por provedor, com alertas em 70%, 90% e 100%.
- Métricas de custo por 1.000 páginas exportadas, por usuário ativo e por GB armazenado.
- Limites de uso por conta são proteção contra abuso e capacidade, não segmentação comercial.
- Cache de PDF, compressão de snapshots e ciclo de vida de storage são revisados mensalmente.
- Exportações repetidas do mesmo snapshot reutilizam o artefato quando o hash de layout não muda.
- A revisão mensal decide entre otimização, redução de retenção ou aumento de orçamento; nunca entre liberar recursos mediante pagamento.

## 11. Operação de segurança

- Patch de dependência crítica em até 7 dias; emergencial em 24 h.
- Atualização de Chromium mensal, com regressão visual antes.
- Acesso de produção por SSO, MFA e menor privilégio.
- Nenhum acesso permanente a conteúdo de roteiro.
- Revisão trimestral de acessos e de subprocessadores.
- Rotação de chaves e tokens conforme a política.
- Varredura de segredo no histórico do repositório.
- Plano de resposta a incidente testado uma vez por semestre.

## 12. Gestão de incidentes

### 12.1 Papéis

- **Incident commander:** coordena, decide e comunica.
- **Operador técnico:** executa diagnóstico e correção.
- **Comunicação:** status page, usuários e suporte.
- **Scribe:** linha do tempo e decisões.
- **Jurídico/privacidade:** quando houver dados pessoais.

### 12.2 Severidade

| Nível | Definição | Resposta | Comunicação |
|---|---|---|---|
| SEV-1 | Perda de dados, vazamento, indisponibilidade total | Imediata | Status page + usuários afetados |
| SEV-2 | Degradação relevante, exportação parada, colaboração instável | 15 min | Status page |
| SEV-3 | Falha limitada, workaround disponível | 1 h | Interna |
| SEV-4 | Baixo impacto | Próximo dia útil | Registro |

### 12.3 Postmortem

- Sem culpa individual.
- Linha do tempo, impacto, causa raiz, detecção, resposta.
- O que funcionou e o que falhou.
- Ações com dono e prazo.
- Ação concluída é verificada, não apenas marcada.

## 13. Checklist de lançamento

- [ ] Domínio, DNS, TLS e HSTS configurados.
- [ ] WAF, rate limit e CSP ativos.
- [ ] Banco com PITR, backup diário e restauração testada.
- [ ] Redis com alta disponibilidade e alerta de memória.
- [ ] Storage com versionamento, ciclo de vida e URL assinada.
- [ ] Worker com Chromium fixado, fonte incorporada e smoke de PDF.
- [ ] Migrações aplicadas em staging e produção.
- [ ] SLOs, dashboards e alertas publicados.
- [ ] On-call definido e runbooks revisados.
- [ ] Status page e canal de suporte ativos.
- [ ] Feature flags configuradas e documentadas.
- [ ] Limites de uso e proteção contra abuso configurados.
- [ ] Jobs de retenção e limpeza agendados.
- [ ] Lista de subprocessadores publicada.
- [ ] Política de privacidade e termos revisados.
- [ ] Teste de carga e de caos aprovado.
- [ ] Rollback ensaiado.
- [ ] Checklist de segurança e de aceite assinado.

## 14. Referências

- [`../03-arquitetura/arquitetura-geral.md`](../03-arquitetura/arquitetura-geral.md)
- [`../03-arquitetura/seguranca-e-privacidade.md`](../03-arquitetura/seguranca-e-privacidade.md)
- [`../03-arquitetura/exportacao-pdf.md`](../03-arquitetura/exportacao-pdf.md)
- [`../03-arquitetura/colaboracao-tempo-real.md`](../03-arquitetura/colaboracao-tempo-real.md)
- [`../05-qualidade/testes-e-aceite.md`](../05-qualidade/testes-e-aceite.md)
- [`../01-requisitos/srs.md`](../01-requisitos/srs.md)
