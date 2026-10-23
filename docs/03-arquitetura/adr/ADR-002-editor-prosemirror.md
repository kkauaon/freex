# ADR-002: Editor estruturado com ProseMirror

- **Status:** Aceito
- **Data:** 2026-10-23
- **Substitui:** —
- **Substituído por:** —
- **Relaciona-se com:** [`../colaboracao-tempo-real.md`](../colaboracao-tempo-real.md), [`../modelo-de-dados.md`](../modelo-de-dados.md), [`../../02-roteiro/elementos-e-convencoes.md`](../../02-roteiro/elementos-e-convencoes.md)

## Contexto

Um roteiro não é uma sequência de parágrafos com estilos. É uma árvore de elementos com regras de composição: um diálogo pertence a um personagem, um parêntese só existe dentro de uma fala, uma transição é um bloco próprio, um diálogo duplo contém duas colunas de fala. O layout precisa saber o tipo de cada bloco para aplicar geometria e regras de quebra.

Se o editor tratar o documento como texto puro e inferir o tipo pela linha, cada recurso novo vira uma heurística frágil. Se tratar como HTML livre, o usuário consegue produzir estruturas que o layout não sabe renderizar. O editor precisa de um schema explícito e de transações controladas.

Ao mesmo tempo, o editor é uma superfície de escrita. O comportamento de teclado tem de ser previsível: `Enter` cria o próximo elemento esperado, `Tab` avança, `Shift+Tab` retrocede, e a formatação automática nunca surpreende o roteirista.

## Decisão

Adotamos **ProseMirror** com um schema customizado de roteiro.

O schema define nós de bloco para cada elemento: `scene_heading`, `action`, `speech`, `dual_dialogue`, `transition` e `shot`. O nó `speech` agrupa `character`, `parenthetical` e `dialogue`, o que impede um parêntese solto ou um diálogo sem personagem. `dual_dialogue` contém exatamente duas colunas de fala.

Regras da decisão:

- toda mutação passa por uma transação ProseMirror; nenhum código de interface altera o `Y.Doc` diretamente;
- plugins de normalização corrigem estruturas inválidas depois de edições concorrentes;
- o binding com Yjs usa `y-prosemirror` (`ySyncPlugin`, `yCursorPlugin`, `yUndoPlugin`);
- o schema tem versão explícita, gravada no documento e nos snapshots;
- a conversão para o modelo canônico de layout é uma função pura, testável sem navegador;
- a interface pode usar node views para desenhar diálogo duplo e indicadores de quebra, mas o conteúdo continua sendo o documento do schema.

O schema é a autoridade de estrutura no cliente. O layout é a autoridade de geometria. Nenhum dos dois tenta fazer o trabalho do outro.

## Alternativas consideradas

| Alternativa | Por que foi descartada |
|---|---|
| `textarea` com parser de linhas | Simples para começar, mas não representa diálogo duplo, parêntese aninhado ou ênfase inline. A posição do cursor e o undo colaborativo ficam frágeis. |
| `contenteditable` livre com HTML | Permite estruturas que o layout não entende. Exige sanitização constante e não oferece schema transacional. |
| Slate | Bom modelo de documento, mas o ecossistema de colaboração e o binding com Yjs são menos maduros para o caso de árvore XML com regras rígidas. |
| Lexical | Rápido e moderno, porém o schema e a colaboração ainda exigem mais trabalho próprio para o nível de controle necessário. |
| TipTap | É uma camada sobre ProseMirror. Útil para produtos genéricos, mas adiciona abstração sobre exatamente os pontos que precisamos controlar: schema, transações e normalização. |
| CodeMirror | Excelente para texto e código, não para documentos estruturados com nós compostos. |
| Editor próprio do zero | Custo altíssimo de seleção, composição, IME, undo e acessibilidade. Não é o diferencial do produto. |

## Consequências

### Positivas

- Estrutura válida é garantida por schema, não por convenção.
- Layout e validação recebem um documento tipado, sem adivinhação.
- Transações permitem normalização atômica e undo previsível.
- O binding com Yjs é direto e preserva tipos de nó.
- Node views permitem interface rica sem contaminar o modelo.
- O documento pode ser serializado, comparado e testado fora do navegador.

### Negativas

- Curva de aprendizado real: schema, plugins, transações, decorations e node views.
- Toda evolução de elemento exige migração de schema e compatibilidade com documentos antigos.
- Acessibilidade não vem pronta; precisa de trabalho explícito de foco, anúncio e navegação.
- Edições concorrentes podem produzir estruturas que o schema aceita mas a semântica rejeita; a normalização é responsabilidade nossa.

### Neutras

- ProseMirror não impõe interface. A aparência e o comportamento de teclado são decisões de produto documentadas em [`../../04-design/ux-e-interface.md`](../../04-design/ux-e-interface.md).
- O schema pode ganhar nós novos (número de cena, marca de revisão) sem trocar o editor.

## Critérios de conformidade

1. O documento só aceita nós previstos no schema; colar HTML externo é convertido ou rejeitado.
2. Um `speech` sempre tem personagem e pelo menos uma linha de diálogo.
3. Um `dual_dialogue` tem exatamente duas colunas.
4. `Tab` e `Shift+Tab` percorrem elementos sem sair do editor.
5. `Enter` cria o próximo elemento esperado conforme a tabela de transições.
6. Desfazer e refazer são locais por usuário e não desfazem edições de terceiros.
7. O documento serializado é idêntico antes e depois de um ciclo de carregar e salvar.
8. Um documento com schema antigo é migrado ou abre em modo somente leitura com aviso, nunca quebrado em silêncio.

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Schema rígido demais para casos especiais | Nós de extensão e atributos opcionais, com validação que aceita variações documentadas |
| Migração de schema mal feita | Versionamento, migrações testadas com fixtures reais, possibilidade de abrir versão antiga em leitura |
| Complexidade de plugins | Poucos plugins, cada um com teste próprio e responsabilidade única |
| Problemas de IME e acentuação | Testes com teclado pt-BR, composição e colagem; não interceptar eventos de composição |
| Acessibilidade incompleta | Checklist WCAG 2.2 AA no editor, testes com leitor de tela, foco visível e anúncio de elemento |

## Referências

- [`../colaboracao-tempo-real.md`](../colaboracao-tempo-real.md)
- [`../modelo-de-dados.md`](../modelo-de-dados.md)
- [`../../02-roteiro/elementos-e-convencoes.md`](../../02-roteiro/elementos-e-convencoes.md)
- [`../../04-design/ux-e-interface.md`](../../04-design/ux-e-interface.md)
