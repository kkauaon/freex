# Paginação e quebras de página

**Status:** normativo  
**Implementa:** [`normas-de-formatacao.md`](normas-de-formatacao.md)  
**Público:** engenharia, design de produto e QA

---

## 1. Objetivo

Definir como o motor de layout transforma uma sequência de elementos em páginas de 54 linhas, com quebras previsíveis, sem viúvas, sem órfãs e com os marcadores `(MORE)` / `(CONT'D)` quando um diálogo atravessa a página.

Este documento é a especificação de comportamento. O código pode usar estruturas diferentes, mas o resultado observável deve ser o descrito aqui.

---

## 2. Unidades e modelo

### 2.1 Unidades inteiras

O layout NÃO DEVE usar ponto flutuante para decidir posições. Use unidades inteiras:

| Unidade | Equivalência |
|---|---|
| 1 linha | 12 pt = 1/6 pol |
| 1 caractere | 0,1 pol |
| 1 página | 54 linhas de corpo |
| 1 coluna | 60 caracteres (US Letter) |

A conversão para pontos, polegadas ou pixels acontece apenas na renderização. A decisão de quebra usa inteiros.

### 2.2 Estrutura de entrada

O motor recebe:

```json
{
  "profile": "FREEX_STANDARD_1_0",
  "pageSize": "LETTER",
  "language": "en-US",
  "elements": [
    { "id": "e1", "type": "scene_heading", "text": "INT. COZINHA - NOITE" },
    { "id": "e2", "type": "action", "text": "Ana abre a geladeira." },
    { "id": "e3", "type": "character", "text": "ANA" },
    { "id": "e4", "type": "dialogue", "text": "Você comeu?" }
  ]
}
```

Cada elemento tem:

- `type`: `scene_heading`, `action`, `character`, `parenthetical`, `dialogue`, `transition`, `shot`, `dual_dialogue`.
- `text`: string sem quebras de linha internas; o motor quebra.
- `attrs`: opcionais (número de cena, cor de revisão, `continued`, etc.).
- `marks`: negrito, itálico, sublinhado; não afetam a largura.

### 2.3 Estrutura de saída

```json
{
  "profile": "FREEX_STANDARD_1_0",
  "layoutVersion": 1,
  "pages": [
    {
      "number": 1,
      "printedNumber": null,
      "lines": [
        { "y": 0, "x": 15, "elementId": "e1", "text": "INT. COZINHA - NOITE" }
      ]
    }
  ],
  "hash": "sha256:..."
}
```

Coordenadas em unidades de 0,1 pol (ou twips), nunca em pixels. O renderizador decide a unidade final.

---

## 3. Blocos de layout

O motor não pagina elemento por elemento. Ele agrupa elementos em blocos com regras de coesão.

### 3.1 Tipos de bloco

| Bloco | Composição | Pode quebrar? |
|---|---|---|
| Cena | Cabeçalho de cena | Não; mantém com o próximo bloco |
| Ação | Um parágrafo de ação | Sim, entre linhas |
| Fala | Personagem + parênteses + diálogo | Sim, apenas no diálogo |
| Diálogo duplo | Duas falas lado a lado | Não |
| Transição | Uma transição | Não |
| Plano | Uma linha de plano | Não |
| Abertura | `FADE IN:` | Não |

### 3.2 Coesão

- **Cena** deve ter pelo menos 2 linhas do bloco seguinte na mesma página.
- **Fala** deve ter o personagem e pelo menos 2 linhas de diálogo na mesma página, sempre que possível.
- **Parêntese** deve ter pelo menos 1 linha de diálogo na mesma página.
- **Transição** deve ficar com pelo menos 2 linhas do bloco anterior, se possível.
- **Diálogo duplo** deve caber inteiro.
- **Ação** deve ter pelo menos 2 linhas em cada lado da quebra, se possível.

### 3.3 Espaço antes

Cada bloco tem `spaceBefore` em linhas:

| Bloco | spaceBefore |
|---|---:|
| Cena | 1 |
| Ação | 1 |
| Fala | 1 |
| Transição | 1 |
| Plano | 1 |
| Diálogo duplo | 1 |

Se o bloco for o primeiro da página, `spaceBefore = 0`.

---

## 4. Algoritmo

### 4.1 Visão geral

```text
1. Normalizar o documento.
2. Construir blocos.
3. Medir linhas de cada bloco.
4. Distribuir blocos nas páginas.
5. Tratar falas que precisam ser divididas.
6. Adicionar números de página.
7. Calcular hash do layout.
```

### 4.2 Pseudocódigo

```text
function paginate(document, profile):
    pages = [new Page()]
    blocks = buildBlocks(document)

    for block in blocks:
        if block.type == SPEECH:
            placeSpeech(block, pages, profile)
        else if block.type == DUAL_DIALOGUE:
            placeWhole(block, pages, profile)
        else if block.type == SCENE_HEADING:
            placeSceneHeading(block, pages, profile)
        else:
            placeFlow(block, pages, profile)

    assignPageNumbers(pages)
    return pages
```

### 4.3 Colocação de bloco inteiro

```text
function placeWhole(block, pages, profile):
    page = pages.last()
    space = page.isEmpty() ? 0 : block.spaceBefore
    if page.remaining >= space + block.height:
        page.writeBlank(space)
        page.write(block.lines)
    else:
        page = new Page()
        page.write(block.lines)
```

### 4.4 Cabeçalho de cena

```text
function placeSceneHeading(block, pages, profile):
    page = pages.last()
    space = page.isEmpty() ? 0 : 1
    minimumFollowing = 2
    if page.remaining >= space + 1 + minimumFollowing:
        page.writeBlank(space)
        page.write(block.lines)
    else:
        page = new Page()
        page.write(block.lines)
```

Se o bloco seguinte for uma fala, as "2 linhas" podem ser o personagem + 1 linha de diálogo. Se for ação, 2 linhas de ação. Se for uma transição, o cabeçalho deve ir para a próxima página (uma cena seguida imediatamente de transição é um erro de conteúdo).

### 4.5 Ação

```text
function placeAction(block, pages, profile):
    page = pages.last()
    space = page.isEmpty() ? 0 : 1
    available = page.remaining - space

    if available >= block.height:
        page.writeBlank(space)
        page.write(block.lines)
        return

    // Precisa dividir
    if available < 2:
        page = new Page()
        page.write(block.lines)
        return

    // Escolhe o melhor ponto de corte
    split = chooseSplit(block.lines, available)
    page.writeBlank(space)
    page.write(block.lines[0..split])

    newPage = new Page()
    newPage.write(block.lines[split..])
```

Regras do corte de ação:

- Preferir fim de frase.
- Se não houver fim de frase, cortar em fim de linha.
- Evitar deixar 1 linha na página anterior ou na seguinte.
- Não usar `(MORE)` / `(CONT'D)`.
- Não repetir o parágrafo na página seguinte; a continuação é natural.

### 4.6 Fala

Uma fala é composta por:

```text
character cue (1 linha)
parenthetical(s) (0..n linhas)
dialogue (n linhas)
```

O personagem e os parênteses não podem ficar no fim da página. O diálogo pode ser dividido.

```text
function placeSpeech(block, pages, profile):
    page = pages.last()
    space = page.isEmpty() ? 0 : 1
    cueHeight = block.cueLines
    parenHeight = block.parentheticalLines
    dialogueLines = block.dialogueLines
    total = space + cueHeight + parenHeight + dialogueLines.length

    if page.remaining >= total:
        page.writeBlank(space)
        page.write(block.allLines)
        return

    // Não cabe inteira. Tenta dividir o diálogo.
    reserveForMore = 1
    availableForDialogue = page.remaining - space - cueHeight - parenHeight - reserveForMore

    if availableForDialogue >= 2:
        split = chooseDialogueSplit(dialogueLines, availableForDialogue)
        page.writeBlank(space)
        page.write(block.cue)
        page.write(block.parentheticals)
        page.write(dialogueLines[0..split])
        page.write(moreLine())

        newPage = new Page()
        newPage.write(block.cueWithContd())
        newPage.write(dialogueLines[split..])
    else:
        newPage = new Page()
        newPage.write(block.allLines)
```

Regras:

- `reserveForMore = 1` porque `(MORE)` ocupa uma linha.
- `availableForDialogue >= 2` garante pelo menos 2 linhas de fala antes do `(MORE)`.
- Se não houver espaço para 2 linhas, a fala inteira desce.
- O corte deve preferir fim de frase. Se não houver, corte em fim de linha e emita aviso `FMT107`.
- A página seguinte repete o personagem com `(CONT'D)`.
- O parêntese não é repetido na página seguinte, a menos que o autor tenha inserido outro.
- Se a fala continuar por mais de uma página, o processo se repete: `(MORE)` ao fim de cada página e `(CONT'D)` no topo da seguinte.

### 4.7 `(MORE)` e `(CONT'D)`

- `(MORE)` é alinhado como personagem, em 3,7 pol, na última linha disponível da página.
- `(CONT'D)` é anexado ao nome do personagem, com um espaço: `ANA (CONT'D)`.
- Se o personagem tiver extensão, a ordem é `NOME (EXTENSÃO) (CONT'D)`, por exemplo `ANA (V.O.) (CONT'D)`. Sem extensão, use `ANA (CONT'D)`.
- Se a fala for interrompida por ação no meio da página, não use `(CONT'D)`; `(CONT'D)` é para quebra de página.
- Não use `(MORE)` para ação.

### 4.8 Diálogo duplo

```text
function placeDualDialogue(block, pages, profile):
    page = pages.last()
    space = page.isEmpty() ? 0 : 1
    height = max(block.left.height, block.right.height) + block.cueHeight

    if page.remaining >= space + height:
        page.writeBlank(space)
        page.writeDual(block)
    else:
        page = new Page()
        page.writeDual(block)
```

- As duas colunas começam na mesma linha.
- O bloco não é dividido.
- Se não couber em uma página inteira, é um erro de conteúdo; o validador avisa e o autor deve encurtar.

### 4.9 Transição

```text
function placeTransition(block, pages, profile):
    page = pages.last()
    space = page.isEmpty() ? 0 : 1

    if page.isEmpty():
        // Transição no topo da página: evitar, mas permitir com aviso
        page.write(block.lines)
        warn("FMT115")
        return

    if page.remaining >= space + 1:
        page.writeBlank(space)
        page.write(block.lines)
    else:
        page = new Page()
        page.write(block.lines)
```

Uma transição no topo de uma página é aceitável em casos raros, mas o validador avisa. `FADE OUT.` deve ficar na última página, após a última linha da cena.

---

## 5. Escolha do ponto de corte

### 5.1 Diálogo

```text
function chooseDialogueSplit(lines, available):
    // 1. Preferir fim de frase dentro do limite
    for i from available down to 2:
        if endsSentence(lines[i-1]):
            return i

    // 2. Preferir fim de linha, mas não cortar palavra
    return available
```

- `endsSentence` considera `.`, `!`, `?`, `...`, `—` no fim da linha.
- Se o corte cair no meio de uma palavra, o wrapper já garantiu que a linha termina em palavra inteira; a palavra é movida para a linha seguinte.
- Se uma única palavra for maior que a largura, ela é quebrada por caractere e o validador avisa.

### 5.2 Ação

```text
function chooseSplit(lines, available):
    // 1. Fim de frase
    for i from available down to 2:
        if endsSentence(lines[i-1]):
            return i
    // 2. Fim de linha
    return available
```

### 5.3 Mínimos

- Diálogo: pelo menos 2 linhas antes do `(MORE)` e 2 linhas depois, se possível.
- Ação: pelo menos 2 linhas em cada lado, se possível.
- Se o bloco tiver menos de 2 linhas, ele não é dividido; desce inteiro.

---

## 6. Numeração e páginas físicas

### 6.1 Mapeamento

| Cenário | Página física | Número impresso |
|---|---:|---:|
| Sem título | 1 | nenhum |
| Sem título | 2 | `2.` |
| Com título | 1 | nenhum (título) |
| Com título | 2 | nenhum (roteiro, página 1) |
| Com título | 3 | `2.` |
| Com lista de cenas | 1 | nenhum (lista) |
| Com lista de cenas | 2 | nenhum (roteiro, página 1) |
| Com lista de cenas | 3 | `2.` |

Regras:

- A página de título não conta.
- Listas de cenas e personagens não contam.
- A primeira página do roteiro é sempre a página 1, mesmo que não tenha número impresso.
- O número impresso é o número lógico da página do roteiro, não a página física do PDF.
- O PDF PODE usar page labels para que o visualizador mostre "1" na primeira página do roteiro, mas isso é opcional.

### 6.2 Intervalo de páginas

Se o usuário exporta as páginas 10 a 20:

- O PDF contém 11 páginas.
- Os números impressos continuam `10.` a `20.`; não renumerar.
- A primeira página do intervalo não é tratada como página 1.
- O cabeçalho e o rodapé seguem o número original.

### 6.3 Página em branco

Uma página em branco só existe se:

- o documento estiver vazio; ou
- uma opção explícita de "quebra antes de ato" criar uma página nova.

Nunca insira página em branco para "ajustar" a paridade de impressão. Isso é trabalho da impressora, não do roteiro.

---

## 7. Casos de borda

### 7.1 Cabeçalho de cena muito longo

Se o cabeçalho tiver mais de 60 caracteres:

- O texto quebra em duas linhas.
- A segunda linha começa na mesma posição da primeira (1,5 pol).
- O validador emite `FMT101`.
- A cena continua válida, mas o padrão recomenda encurtar.

### 7.2 Palavra maior que a coluna

Se uma palavra tiver mais caracteres que a largura:

- Ela é quebrada por caractere.
- O validador emite aviso.
- Isso é raro em diálogo, mas comum em URLs e nomes técnicos.

### 7.3 Fala com um único monossílabo

Uma fala de uma linha não é dividida. Se não couber, desce inteira.

### 7.4 Fala maior que uma página

Uma fala de 80 linhas ocupa mais de uma página. O algoritmo:

1. Coloca o personagem no topo.
2. Preenche até o limite, reservando `(MORE)`.
3. Repete `(CONT'D)` no topo da página seguinte.
4. Repete até acabar.

Cada página deve ter pelo menos 2 linhas de fala, além do cue e do `(MORE)`.

### 7.5 Duas falas seguidas sem ação

```text
ANA
Primeira.

JOÃO
Segunda.
```

Cada fala é um bloco. Entre elas, uma linha em branco. O algoritmo não junta falas.

### 7.6 Parêntese entre falas

```text
ANA
Primeira.

(beat)

Segunda.
```

Um parêntese solto entre falas é inválido. O parêntese pertence a uma fala. O validador emite `FMT005`.

### 7.7 Diálogo duplo com colunas de alturas diferentes

A altura do bloco é a maior das duas colunas. A próxima ação começa depois da coluna mais longa. Não se preenche a coluna curta com espaço.

### 7.8 Cena que começa no fim da página

Se o cabeçalho cabe, mas não há 2 linhas para o próximo bloco, o cabeçalho desce. Isso pode deixar uma área em branco no fim da página anterior. É o comportamento correto: melhor uma página com respiro do que uma cena órfã.

### 7.9 Ação com uma linha no fim da página

Se a ação tem 3 linhas e só cabe 1, o parágrafo inteiro desce. Se tem 5 linhas e cabem 3, divide em 3 + 2.

### 7.10 Transição no fim da página

Se a transição cabe, fica. Se não, desce. Se a transição for `FADE OUT.`, ela deve ficar após a última linha, mesmo que isso crie uma página extra com uma linha. É aceitável.

---

## 8. Exemplo de quebra de diálogo

Considere uma página com 4 linhas restantes e a fala:

```text
ANA
Eu não vou embora. Eu passei anos
esperando por isso e agora você quer
que eu desista como se nada tivesse
acontecido.
```

Passos:

1. Cue: 1 linha.
2. Diálogo: 4 linhas.
3. Total: 5 linhas. Não cabe em 4.
4. Reservar 1 linha para `(MORE)`.
5. Disponível para diálogo: 4 − 1 (cue) − 1 (MORE) = 2 linhas.
6. Colocar cue + 2 linhas + `(MORE)`.
7. Próxima página: `ANA (CONT'D)` + 2 linhas restantes.

Resultado:

**Página anterior:**

```text
ANA
Eu não vou embora. Eu passei anos
esperando por isso e agora você
(MORE)
```

**Página seguinte:**

```text
ANA (CONT'D)
quer que eu desista como se nada
tivesse acontecido.
```

Se a fala tivesse apenas 1 linha restante após o cue, o algoritmo moveria a fala inteira para a página seguinte, porque não há 2 linhas para justificar a divisão.

---

## 9. Determinismo

### 9.1 Requisitos

- O mesmo documento, com o mesmo perfil e a mesma versão de layout, DEVE produzir o mesmo resultado.
- O layout NÃO DEVE depender de largura de janela, zoom, fonte do sistema, navegador ou sistema operacional.
- O layout NÃO DEVE usar medições de texto do DOM para decidir quebras.
- O layout DEVE usar contagem de caracteres e uma tabela de largura fixa.
- O hash DEVE ser calculado sobre a saída canônica, não sobre o HTML.

### 9.2 Hash

```text
hash = SHA-256(
  profileVersion +
  pageSize +
  language +
  elements.map(canonical) +
  pages.map(lines)
)
```

O hash é registrado na exportação. Se o hash mudar sem mudança de conteúdo, há um defeito de determinismo.

### 9.3 Versão do motor

O layout tem `layoutVersion`. Mudanças de algoritmo que alterem a paginação exigem nova versão. PDFs antigos não são regerados.

---

## 10. Testes obrigatórios

| # | Cenário | Resultado esperado |
|---:|---|---|
| 1 | Documento vazio | 1 página, sem número |
| 2 | Exatamente 54 linhas | 1 página |
| 3 | 55 linhas | 2 páginas; 1 linha na segunda |
| 4 | Cena na linha 53 | Cena desce para a página 2 |
| 5 | Cena na linha 52, seguida de 2 linhas de ação | Cena fica, ação fica |
| 6 | Personagem na linha 54 | Personagem desce |
| 7 | Personagem na linha 53, diálogo de 1 linha | Personagem + diálogo cabem? 2 linhas; sim |
| 8 | Diálogo de 40 linhas | Divide com `(MORE)` / `(CONT'D)` |
| 9 | Diálogo de 3 linhas com 4 linhas livres | Cabe inteiro, sem `(MORE)` |
| 10 | Diálogo de 3 linhas com 3 linhas livres | Cabe? Cue + 3 = 4; não. Move inteiro |
| 11 | Diálogo duplo de 8 linhas | Cabe ou move inteiro |
| 12 | Diálogo duplo de 60 linhas | Erro de conteúdo; não divide |
| 13 | Ação de 5 linhas com 3 livres | Divide 3 + 2 |
| 14 | Ação de 5 linhas com 1 livre | Move inteiro |
| 15 | Transição no fim da página | Fica se cabe; desce se não |
| 16 | Título + roteiro | Título sem número; página 1 do roteiro sem número |
| 17 | Intervalo 10–20 | 11 páginas; números 10 a 20 |
| 18 | A4 | 57 caracteres × 58 linhas |
| 19 | Acento e cedilha | Largura não muda; PDF correto |
| 20 | Palavra de 40 caracteres | Quebra por caractere; aviso |

---

## 11. Integração com o editor

### 11.1 Prévia

A prévia paginada usa o mesmo motor. Ela não deve "aproximar" a paginação com CSS. O CSS posiciona os elementos, mas a decisão de página vem do motor.

### 11.2 Edição

Enquanto o usuário digita, o editor pode mostrar um fluxo contínuo com marcadores de página. A paginação definitiva é recalculada:

- a cada 200 ms de inatividade; ou
- ao sair do elemento; ou
- ao abrir a prévia.

O usuário NÃO DEVE ver a página mudar no meio de uma palavra enquanto digita. O recálculo deve ser estável e, se possível, preservar a posição do cursor.

### 11.3 PDF

O PDF usa a mesma saída do motor. O renderizador não decide quebras; ele apenas desenha as linhas nas coordenadas calculadas.

---

## 12. Compatibilidade

### 12.1 Celtx

Celtx permite espaçamento "regular" e "tight", com 51/53 linhas por página no US Letter, segundo sua documentação. O FREEX usa 54. Um mesmo texto pode ter uma ou duas páginas de diferença. Isso é esperado e deve ser comunicado.

### 12.2 Final Draft

Final Draft usa uma grade semelhante, mas o tratamento de `(MORE)` / `(CONT'D)` e de espaçamento pode variar por versão. O FREEX documenta sua escolha e testa contra PDFs de referência.

### 12.3 A4

O perfil A4 usa 57 caracteres por linha e 58 linhas por página. A paginação é diferente; não compare página a página com o perfil Letter.

---

## 13. Checklist de implementação

- [ ] O motor usa unidades inteiras.
- [ ] A largura é calculada por caracteres, não por medição do DOM.
- [ ] A fonte é monoespaçada e incorporada.
- [ ] O espaço antes é 0 na primeira linha da página.
- [ ] Cabeçalho de cena mantém 2 linhas seguintes.
- [ ] Personagem mantém 2 linhas de fala.
- [ ] Parêntese mantém 1 linha de fala.
- [ ] `(MORE)` reserva 1 linha.
- [ ] `(CONT'D)` é repetido no topo.
- [ ] Diálogo duplo não quebra.
- [ ] Numeração não conta título nem front matter.
- [ ] Hash é estável.
- [ ] Testes 1–20 passam.
- [ ] PDF e prévia têm o mesmo número de páginas.
