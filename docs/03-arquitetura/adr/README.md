# Decisões arquiteturais (ADRs)

Registro das decisões que moldam o FREEX e que seriam caras de reverter. Um ADR não descreve como o código funciona hoje em detalhe; ele registra **por que** uma escolha foi feita, quais alternativas foram descartadas e o que ela custa.

## 1. Como ler

| ID | Decisão | Status | Data |
|---|---|---|---|
| [ADR-001](ADR-001-colaboracao-crdt.md) | Colaboração com CRDT (Yjs + Hocuspocus) | Aceito | 2026-10-23 |
| [ADR-002](ADR-002-editor-prosemirror.md) | Editor estruturado com ProseMirror | Aceito | 2026-10-23 |
| [ADR-003](ADR-003-pdf-chromium.md) | PDF a partir de HTML pré-paginado no Chromium | Aceito | 2026-10-23 |
| [ADR-004](ADR-004-paper-letter.md) | US Letter como perfil canônico | Aceito | 2026-10-23 |
| [ADR-005](ADR-005-monolito-modular.md) | Monólito modular com serviços stateful separados | Aceito (parcialmente substituído pelo ADR-006) | 2026-10-23 |
| [ADR-006](ADR-006-api-fastify.md) | API REST em serviço Fastify separado | Aceito | 2026-10-23 |

## 2. Regras

1. **ADRs são imutáveis.** Corrigir um erro de digitação é permitido. Mudar a decisão não: cria-se um ADR novo com `Substitui: ADR-00X` e o antigo recebe `Substituído por: ADR-00Y`.
2. **Uma decisão por ADR.** Se o texto começa a explicar três assuntos independentes, provavelmente são três ADRs.
3. **Toda decisão tem alternativa.** Um ADR sem alternativas registradas é uma justificativa, não uma decisão.
4. **Consequências negativas são obrigatórias.** Se não houver custo, a análise está incompleta.
5. **Implementação não é decisão.** O ADR diz o que foi escolhido e por quê; o documento de arquitetura diz como funciona.

## 3. Modelo

```markdown
# ADR-00X: Título curto no imperativo

- **Status:** Proposto | Aceito | Substituído | Rejeitado
- **Data:** AAAA-MM-DD
- **Substitui:** ADR-00Y ou —
- **Substituído por:** ADR-00Z ou —
- **Relaciona-se com:** documentos e requisitos

## Contexto
## Decisão
## Alternativas consideradas
## Consequências
## Critérios de conformidade
## Riscos e mitigação
## Referências
```

## 4. Quando criar um ADR

Crie um ADR quando a escolha:

- afeta mais de um módulo ou serviço;
- é difícil de desfazer depois do lançamento;
- impõe uma dependência tecnológica relevante;
- muda o modelo de dados, o modelo de segurança ou o contrato público;
- resolve um conflito entre requisitos que não pode ser resolvido só com código.

Não crie ADR para escolha de biblioteca de UI, nome de variável ou estrutura de pasta reversível.
