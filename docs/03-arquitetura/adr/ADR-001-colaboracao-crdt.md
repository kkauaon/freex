# ADR-001: Colaboração com CRDT (Yjs + Hocuspocus)

- **Status:** Aceito
- **Data:** 2026-10-23
- **Substitui:** —
- **Substituído por:** —
- **Relaciona-se com:** [`../colaboracao-tempo-real.md`](../colaboracao-tempo-real.md), [`../../01-requisitos/srs.md`](../../01-requisitos/srs.md) (FR-COL-001 a FR-COL-015)

## Contexto

O FREEX nasce como ferramenta de escrita a várias mãos. Duas ou mais pessoas precisam editar o mesmo roteiro ao mesmo tempo, ver cursores e presença, continuar trabalhando durante uma queda de rede e reencontrar o mesmo documento ao reconectar. O produto também precisa vender para produtoras, que costumam ter vários leitores no mesmo projeto.

Os requisitos que pressionam a decisão:

- propagação de edição remota em p95 inferior a 300 ms na mesma região;
- zero perda de edição em reconexão;
- edição offline com persistência local;
- 50 conexões simultâneas por roteiro no MVP;
- escala horizontal do serviço de colaboração;
- autorização aplicada no servidor, inclusive contra cliente modificado;
- estrutura de elementos preservada, porque layout e PDF dependem do tipo de cada bloco.

Um editor de texto colaborativo pode ser construído com travamento, transformação operacional (OT) ou CRDT. Travamento é simples, mas inviabiliza a escrita simultânea. OT exige um servidor central autoritativo por documento e um histórico de transformações difícil de operar. CRDT permite que réplicas convirjam sem coordenação central e abre caminho para offline.

## Decisão

Adotamos **Yjs** como CRDT e **Hocuspocus** como servidor WebSocket.

A estrutura é:

- um `Y.Doc` por roteiro, nome lógico `script:{scriptId}`;
- um `Y.XmlFragment('content')` que espelha a árvore ProseMirror;
- um `Y.Map('meta')` com `schemaVersion` e metadados mínimos;
- `y-prosemirror` para o binding entre documento e editor;
- `y-indexeddb` para persistência local e edição offline;
- Hocuspocus para autenticação, sincronização e awareness;
- Redis pub/sub para propagar atualizações entre instâncias;
- PostgreSQL como fonte de verdade durável, com estado atual em `script_documents` e log append-only em `script_updates`;
- snapshots imutáveis em `script_snapshots`, usados por versões e exportação.

O servidor de colaboração valida um token de curta duração emitido pela API. O token carrega usuário, projeto, roteiro e papel. O papel é verificado de novo no servidor; a interface não é autoridade.

Comentários não vivem no `Y.Doc`. Ficam no PostgreSQL, com âncoras de posição relativa, para que uma thread não altere o documento nem participe da convergência de texto.

## Alternativas consideradas

| Alternativa | Por que foi descartada |
|---|---|
| Travamento por parágrafo ou por documento | Impede escrita simultânea, que é o diferencial do produto. Gera fila de espera e sensação de lentidão. |
| OT com servidor autoritativo próprio | Exige transformação de operações, histórico central e tratamento de reconexão. Custo de implementação e operação alto para o tamanho da equipe. |
| Automerge | Modelo maduro, mas o ecossistema de binding com ProseMirror e o suporte a servidor são menos diretos que Yjs. Metadados e memória também pesam em documentos longos. |
| Serviço gerenciado de colaboração (Liveblocks e similares) | Reduz tempo inicial, mas cria dependência de preço, região e retenção. Dificulta garantir residência de dados e limites próprios. |
| Firebase Realtime Database ou Firestore | Acopla o produto ao provedor, tem custo imprevisível em documentos grandes e não oferece o controle de estrutura que o layout exige. |
| Sincronização por arquivo e merge manual | Não atende ao requisito de tempo real nem ao de ausência de conflito visível. É o problema que o produto existe para resolver. |

## Consequências

### Positivas

- Edição simultânea converge sem bloqueio.
- Funciona offline; o cliente reaplica atualizações ao reconectar.
- O serviço de colaboração pode escalar horizontalmente com Redis.
- O binding com ProseMirror preserva tipos de elemento, essencial para layout e validação.
- O log de atualizações permite recuperação e auditoria técnica.
- Snapshots independentes do CRDT simplificam exportação e diff.

### Negativas

- CRDT garante convergência de texto, não validade semântica. É preciso normalizar estrutura depois de edições concorrentes.
- O estado do documento carrega metadados; documentos longos consomem mais memória que texto puro.
- O serviço de colaboração é stateful e exige operação própria, com Redis e persistência.
- Desfazer é local por usuário. Desfazer colaborativo global não é gratuito e fica fora do MVP.
- Depurar divergências exige ferramentas específicas, não um simples diff de arquivo.

### Neutras

- A escolha não impede migrar para outro CRDT no futuro, mas a migração exigiria converter o histórico de snapshots.
- O modelo de permissões continua centralizado na API; o serviço de colaboração apenas aplica o que recebe.

## Critérios de conformidade

A decisão só está implementada corretamente quando:

1. Duas réplicas que recebem as mesmas atualizações chegam ao mesmo estado, verificado por teste de convergência.
2. Um cliente offline por 10 minutos reconecta e sincroniza sem perder texto.
3. Um `viewer` ou `commenter` não consegue enviar atualização de texto, mesmo com cliente alterado.
4. Duas instâncias de Hocuspocus sincronizam o mesmo roteiro via Redis.
5. O documento persiste no PostgreSQL e é reconstruível a partir do snapshot mais recente.
6. A estrutura inválida produzida por edição concorrente é normalizada ou colocada em quarentena, nunca renderizada silenciosamente.
7. Nenhuma atualização de texto aparece em log de aplicação.

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Crescimento de memória por sala | Limite de 300 páginas, monitoramento por sala, desconexão de clientes inativos, compactação de estado |
| Divergência estrutural | Normalização no cliente e no servidor, validação de schema, testes de concorrência |
| Indisponibilidade do Redis | Modo de instância única com aviso, buffer local, reconexão; Redis não é fonte de verdade |
| Perda de atualizações na persistência | Debounce com limite, log append-only, snapshot periódico, alerta de falha de gravação |
| Vazamento entre projetos | Token vinculado a projeto e roteiro, verificação de papel no handshake e em cada mensagem sensível |
| Complexidade de operação | Serviço isolado, métricas próprias, runbook dedicado, limites de conexão e de payload |

## Referências

- [`../colaboracao-tempo-real.md`](../colaboracao-tempo-real.md)
- [`../modelo-de-dados.md`](../modelo-de-dados.md)
- [`../api.md`](../api.md)
- [`../../01-requisitos/srs.md`](../../01-requisitos/srs.md)
