# Normas de formatação de roteiro

**Perfil:** FREEX Standard 1.0  
**Status:** normativo  
**Aplica-se a:** roteiros cinematográficos e teleplays em formato spec  
**Última revisão:** 2026-10-23

---

## 1. Leia isto primeiro

### 1.1 O que este documento é

Este é o contrato de formatação do FREEX. Ele define página, fonte, margens, posições, espaçamento, paginação, página de título e critérios de validação. O editor, a prévia e o PDF devem obedecer a este documento.

O contrato descreve o documento, não o tamanho da tela. No celular, o editor pode usar uma visão linear de edição; a geometria canônica continua sendo aplicada na prévia paginada e no PDF. Nenhum ajuste de interface altera o layout do arquivo.

### 1.2 O que este documento não é

Não existe uma norma ISO, ABNT ou W3C para roteiros. O chamado "padrão da indústria" é um conjunto de convenções que se consolidou no cinema e na televisão dos Estados Unidos e foi codificado por softwares como Final Draft, Celtx, WriterDuet e outros. Consequência prática:

- Alguns valores são **rígidos** porque afetam a leitura e a contagem de páginas.
- Alguns são **convenções fortes**, mas têm variantes aceitas.
- Alguns são **preferências de software**, e não regras de mercado.

Sempre que houver variante, este documento diz qual é a escolha do FREEX e por quê. As fontes estão em [`referencias.md`](referencias.md).

### 1.3 Termos normativos

- **DEVE**: obrigatório.
- **NÃO DEVE**: proibido.
- **DEVERIA**: recomendação forte; desvio exige justificativa.
- **PODE**: opcional.
- **PADRÃO FREEX**: decisão de produto dentro de uma faixa aceita pela indústria.

### 1.4 Escopo de formatos

O perfil cobre:

- longa-metragem;
- curta-metragem;
- teleplay de comédia ou drama em formato spec;
- piloto de série.

Não cobre peça teatral, quadrinhos, audiodrama, publicidade ou roteiro técnico de animação. Esses formatos têm convenções próprias e não devem ser forçados no perfil de cinema/TV.

---

## 2. Página

### 2.1 Papel

| Propriedade | Valor |
|---|---|
| Tamanho canônico | US Letter |
| Dimensões | 8,5 × 11 pol |
| Dimensões métricas | 215,9 × 279,4 mm |
| Orientação | Retrato |
| Cor | Branco |
| Margem de impressão | Nenhuma margem adicional do navegador ou da impressora |

O padrão de submissão da indústria americana é US Letter. A4 é uma opção de impressão local, não o padrão de submissão. Ver seção 13.3.

### 2.2 Fonte

| Propriedade | Valor |
|---|---|
| Família canônica | Courier |
| Variante padrão FREEX | Courier Prime |
| Tamanho | 12 pt |
| Avanço horizontal | 10 caracteres por polegada (10 cpi) |
| Altura de linha | 12 pt = 1/6 pol |
| Peso | Regular |
| Estilo | Permitido negrito, itálico e sublinhado com moderação |
| Justificação | Nunca. Alinhamento à esquerda, com margem direita irregular |
| Hifenização automática | Nunca |
| Kerning e tracking | Zero. Não ajustar espaçamento entre caracteres |

Por que Courier: é uma fonte monoespaçada. Cada caractere ocupa a mesma largura, então uma página tem um número previsível de caracteres e linhas. Isso permite estimar tempo de tela e comparar versões.

Fonte Courier Prime: licença SIL Open Font License, métricas compatíveis com Courier, boa cobertura de Latino. O PDF DEVE incorporar a fonte. Fonte substituta é proibida no perfil padrão. Se a fonte não carregar, a exportação falha; não sai um PDF "quase certo".

Courier Prime é a única variante do perfil FREEX. Courier Final Draft não é usada, nem como opção futura. Qualquer troca de fonte exige novo perfil, nova versão e novo ADR.

> **Não use** Times New Roman, Arial, Calibri, Georgia, Helvetica ou qualquer fonte proporcional. Não use corpo 11, 12,5 ou 13. Não use "Courier New" com espaçamento manual para simular 10 cpi.

### 2.3 Margens

| Margem | Valor | Observação |
|---|---|---|
| Esquerda | 1,5 pol | Espaço para encadernação e anotações |
| Direita | 1,0 pol | Margem irregular; não justificar |
| Superior | 1,0 pol | O número de página fica acima, a 0,5 pol |
| Inferior | 1,0 pol | Última linha de texto termina a 10 pol do topo |

```
0"                                                            8,5"
+----------------------------------------------------------------+
|                                            2.                  | 0,5"  número de página
|   +--------------------------------------------------------+   | 1,0"  início do texto
|   |                                                        |   |
|   |              área de texto: 6,0 × 9,0 pol              |   |
|   |                                                        |   |
|   |                                                        |   |
|   +--------------------------------------------------------+   | 10,0" fim do texto
|                                                                | 11,0"
+----------------------------------------------------------------+
    ^1,5"                                          ^1,0"
```

### 2.4 Área de texto e grade

| Propriedade | Valor |
|---|---|
| Largura da área de texto | 8,5 − 1,5 − 1,0 = 6,0 pol |
| Altura da área de texto | 11,0 − 1,0 − 1,0 = 9,0 pol |
| Colunas de caracteres | 60 (6,0 pol × 10 cpi) |
| Linhas de corpo | 54 (9,0 pol × 6 linhas/pol) |
| Unidade vertical | 1 linha = 12 pt = 1/6 pol |
| Unidade horizontal | 1 caractere = 0,1 pol |

O padrão da indústria fala em "aproximadamente 55 linhas por página". A diferença de uma linha vem de arredondamentos e de espaço de cabeçalho. O FREEX usa 54 linhas de corpo, com o número de página fora do corpo. Isso mantém a grade exata e reproduzível.

### 2.5 Número de página

| Propriedade | Valor |
|---|---|
| Posição | Canto superior direito |
| Distância do topo | 0,5 pol |
| Alinhamento | À direita, na borda de 7,5 pol |
| Formato | Número seguido de ponto: `2.` |
| Página 1 | Sem número |
| Página de título | Sem número e não conta na numeração |
| Rodapé | Não existe |
| Cabeçalho de cena | Não existe no perfil spec |

A página 1 não é numerada porque o leitor assume que está na página 1. A numeração impressa começa na página 2. Se a página de título for incluída, ela é a primeira folha física, mas a primeira página do roteiro continua sendo a página 1, não numerada.

Em modo de produção, o cabeçalho pode incluir a cor e a data da revisão antes do número:

```
BLUE 10/23/2026                                        56.
```

---

## 3. Geometria dos elementos

### 3.1 Tabela normativa

Posições medidas da **borda esquerda da página**. A coluna "da área" é a posição relativa ao início da área de texto (1,5 pol).

| Elemento | Da borda | Da área | Largura | Borda direita | Alinhamento | Caixa |
|---|---:|---:|---:|---:|---|---|
| Cabeçalho de cena | 1,5 pol | 0,0 pol | 6,0 pol | 7,5 pol | Esquerda | MAIÚSCULAS |
| Ação | 1,5 pol | 0,0 pol | 6,0 pol | 7,5 pol | Esquerda | Mista |
| Personagem | 3,7 pol | 2,2 pol | 2,2 pol | 5,9 pol | Esquerda | MAIÚSCULAS |
| Parêntese | 3,1 pol | 1,6 pol | 2,0 pol | 5,1 pol | Esquerda | Mista/lowercase |
| Diálogo | 2,5 pol | 1,0 pol | 3,5 pol | 6,0 pol | Esquerda | Mista |
| Transição | — | — | — | 7,5 pol | Direita | MAIÚSCULAS |
| Plano (shot) | 1,5 pol | 0,0 pol | 6,0 pol | 7,5 pol | Esquerda | MAIÚSCULAS |
| Número de página | — | — | — | 7,5 pol | Direita | `2.` |

### 3.2 Diagrama horizontal

```
1,5"                                                          7,5"
|                                                               |
| Cena/Ação   |================================================|
|                                                               |
| Personagem               |==========|  3,7" → 5,9"         |
| Parêntese             |========|      3,1" → 5,1"           |
| Diálogo            |=================| 2,5" → 6,0"           |
| Transição                                        =============|
|                                                               |
```

### 3.3 Larguras em caracteres

Como a fonte é monoespaçada a 10 cpi, a largura em polegadas converte-se diretamente em número de caracteres.

| Elemento | Largura | Caracteres por linha |
|---|---:|---:|
| Cabeçalho de cena | 6,0 pol | 60 |
| Ação | 6,0 pol | 60 |
| Personagem | 2,2 pol | 22 (nome pode avançar; ver 5.3) |
| Parêntese | 2,0 pol | 20 |
| Diálogo | 3,5 pol | 35 |
| Transição | 6,0 pol | 60 (mas transições curtas) |
| Plano | 6,0 pol | 60 |

### 3.4 Por que essas posições

- **1,5 pol à esquerda** cria espaço para três furos e encadernação sem invadir o texto.
- **3,7 pol para o personagem** separa visualmente o nome de quem fala do corpo da ação e do diálogo.
- **2,5 pol para o diálogo** cria uma coluna estreita, que o olho percorre na velocidade da fala.
- **3,1 pol para o parêntese** deixa o parêntese dentro da coluna de diálogo, mas recuado o suficiente para não se confundir com a fala.
- **Transição à direita** marca uma instrução de montagem, não uma fala.
- **60 caracteres por linha** é o que cabe em 6 pol a 10 cpi. É a régua invisível de todo o roteiro.

---

## 4. Ritmo vertical

### 4.1 Linha e espaço

- Cada linha de texto ocupa exatamente 12 pt de altura.
- Não há espaço extra entre linhas dentro de um mesmo elemento.
- Linhas em branco também ocupam 12 pt.
- O espaçamento é sempre em linhas inteiras. Nunca use "espaço antes de 6 pt" ou "depois de 3 pt".
- O editor não deve introduzir `line-height` variável, margens fracionadas ou `padding` que quebre a grade.

### 4.2 Espaço antes dos elementos

| Elemento | Linhas em branco antes | Observação |
|---|---:|---|
| Cabeçalho de cena | 1 | 0 se for o primeiro elemento da página |
| Ação | 1 | 0 se for o primeiro elemento da página |
| Personagem | 1 | 0 se for o primeiro elemento da página |
| Parêntese | 0 | Fica imediatamente após o personagem ou outra linha de diálogo |
| Diálogo | 0 | Fica imediatamente após o personagem ou parêntese |
| Transição | 1 | 0 se for o primeiro elemento da página |
| Plano | 1 | 0 se for o primeiro elemento da página |
| Nova cena após transição | 1 | O espaço pertence ao novo cabeçalho |
| Continuação de diálogo | 0 | Ver `(MORE)` / `(CONT'D)` |

O FREEX usa **uma** linha em branco entre blocos. Alguns roteiristas usam duas antes de cabeçalhos de cena para dar mais respiro. É uma variação aceita, mas altera a contagem de páginas. O perfil padrão usa uma para manter a paginação determinística.

### 4.3 Exemplo de ritmo

```text
INT. COZINHA - NOITE

Ana abre a geladeira. Nada além de uma garrafa de água.

ANA
Você comeu?

JOÃO
(da sala)
Não.

Ana fecha a geladeira devagar.
```

Em termos de grade:

| Linha | Conteúdo |
|---:|---|
| 1 | `INT. COZINHA - NOITE` |
| 2 | em branco |
| 3 | `Ana abre a geladeira...` |
| 4 | em branco |
| 5 | `ANA` |
| 6 | `Você comeu?` |
| 7 | em branco |
| 8 | `JOÃO` |
| 9 | `(da sala)` |
| 10 | `Não.` |
| 11 | em branco |
| 12 | `Ana fecha a geladeira devagar.` |

### 4.4 Primeira página

A primeira página começa com `FADE IN:` quando o roteiro usa essa abertura. `FADE IN:` é uma transição especial, alinhada à esquerda em 1,5 pol, não à direita.

```text
FADE IN:

INT. APARTAMENTO - MANHÃ

O sol entra pela persiana.
```

Se o roteiro não usa `FADE IN:`, a primeira página começa diretamente no cabeçalho de cena. Não há linha em branco no topo da página.

---

## 5. Regras de conteúdo por elemento

Esta seção define o que cada elemento significa e como deve ser escrito. A gramática completa, com casos especiais e exemplos, está em [`elementos-e-convencoes.md`](elementos-e-convencoes.md).

### 5.1 Cabeçalho de cena (slugline)

**Forma:**

```text
INT. LOCAÇÃO - DIA
EXT. LOCAÇÃO - NOITE
INT./EXT. CARRO - CONTINUOUS
I/E. CARRO - DIA
```

**Regras:**

- DEVE começar com `INT.`, `EXT.`, `INT./EXT.` ou `I/E.`.
- DEVE usar ponto após a abreviação.
- A locação DEVE estar em MAIÚSCULAS.
- DEVE haver um espaço, um hífen e outro espaço antes do tempo: ` - `.
- O tempo DEVE estar em MAIÚSCULAS: `DAY`, `NIGHT`, `DAWN`, `DUSK`, `MORNING`, `AFTERNOON`, `EVENING`, `CONTINUOUS`, `LATER`, `MOMENTS LATER`, `SAME TIME`, `MAGIC HOUR`.
- NÃO DEVE terminar com ponto.
- DEVERIA caber em uma linha de 60 caracteres. Se ultrapassar, o FREEX quebra e emite aviso; a recomendação é encurtar a locação.
- NÃO DEVE conter número de cena no perfil spec. Números são recurso de produção (seção 9.1).

**Exemplos corretos:**

```text
INT. COZINHA - NOITE
EXT. PRAÇA CENTRAL - DIA
INT./EXT. TÁXI - CONTINUOUS
I/E. CARRO DE POLÍCIA - NOITE
INT. CASA DE ANA - QUARTO - MANHÃ
```

**Exemplos incorretos:**

```text
INT COZINHA - NOITE          (falta o ponto)
Int. Cozinha - Noite         (caixa mista)
INT. COZINHA/NOITE           (separador errado)
INT. COZINHA - NOITE.        (ponto final)
INT. COZINHA - 22H           (hora específica; prefira NOITE)
```

**Sub-cabeçalhos.** Quando a locação e o tempo não mudam, mas o foco muda, use um sub-cabeçalho em maiúsculas, na margem da ação:

```text
LATER
MOMENTS LATER
CONTINUOUS
SAME TIME
AT THE WINDOW
```

Não use sub-cabeçalho para evitar um novo cabeçalho quando a locação realmente muda. Isso confunde a decupagem.

### 5.2 Ação

**Regras:**

- DEVE ser escrita no presente do indicativo.
- DEVE descrever apenas o que pode ser visto ou ouvido.
- DEVE usar voz ativa e verbos concretos.
- DEVERIA ter de 1 a 3 linhas por parágrafo; no máximo 4.
- Nomes de personagens em sua primeira aparição DEVEM estar em MAIÚSCULAS, com idade e descrição breve quando útil: `ANA (30s), de moletom, entra.`
- Sons importantes PODEM estar em MAIÚSCULAS: `Um TIRO.`
- NÃO DEVE descrever pensamentos, memórias ou sentimentos internos que não apareçam em cena.
- NÃO DEVE usar "nós vemos" ou "nós ouvimos" como muleta; descreva o que a câmera mostra.
- NÃO DEVE dirigir a câmera no perfil spec, a menos que seja essencial para a história.
- NÃO DEVE explicar o subtexto do diálogo.
- NÃO DEVE usar parágrafos longos como um romance.

**Exemplo:**

```text
Ana empurra a porta com o ombro. O apartamento está vazio.
Sobre a mesa, uma chave e um bilhete.

O bilhete diz: "Não procure."

Ana pega a chave. A mão treme.
```

### 5.3 Personagem

**Forma:**

```text
ANA
(whispering)
Você ouviu isso?
```

**Regras:**

- DEVE começar em 3,7 pol da borda esquerda.
- DEVE estar em MAIÚSCULAS.
- NÃO DEVE ter ponto ou dois-pontos.
- O nome DEVE ser consistente em todo o roteiro. Não alterne `ANA`, `Ana` e `ANA MARIA`.
- Extensões vão entre parênteses, imediatamente após o nome, com um espaço:
  - `(V.O.)` voz de quem não está fisicamente na cena;
  - `(O.S.)` pessoa presente na cena, mas fora do enquadramento;
  - `(O.C.)` fora de câmera, uso mais comum em TV;
  - `(CONT'D)` continuação de fala;
  - `(PRE-LAP)` som ou fala que começa antes da imagem;
  - `(FILTERED)` voz filtrada por telefone, rádio ou parede;
  - `(ON TV)`, `(ON RADIO)` voz em aparelho;
  - `(SINGING)` cantando;
  - `(SUBTITLED)` falando em outro idioma, legendado.
- Nomes longos PODEM avançar para a direita do bloco. O FREEX alinha o início em 3,7 pol e emite aviso acima de 22 caracteres.
- A idade e a descrição do personagem vão na ação da primeira aparição, não no cabeçalho de fala.
- Personagens sem nome DEVEM ser descritos de forma consistente: `MULHER DE VERMELHO`, `SEGURANÇA #1`.

**V.O. versus O.S.**: use `V.O.` quando a voz não pertence ao mundo físico da cena (narrador, pensamento, gravação). Use `O.S.` quando a pessoa está na cena, mas fora do quadro. Trocar os dois é um erro que leitores profissionais percebem.

### 5.4 Parêntese

**Forma:**

```text
JOÃO
(sem olhar)
Eu já disse que não.
```

**Regras:**

- DEVE começar em 3,1 pol da borda.
- DEVE estar entre parênteses.
- DEVE estar em minúsculas, salvo nomes próprios.
- DEVE ficar em sua própria linha.
- NÃO DEVE terminar com ponto.
- DEVE ser curto: 1 linha, no máximo 2. Acima de 20 caracteres, o FREEX emite aviso.
- DEVE ser usado para indicar como a fala é dita ou o que o personagem faz enquanto fala, quando isso não é óbvio.
- NÃO DEVE dirigir o ator em detalhe, explicar emoção ou substituir a ação.
- NÃO DEVE ser usado em todas as falas.
- NÃO DEVE ficar sozinho no fim da página; deve haver pelo menos uma linha de diálogo na mesma página.

**Bons usos:** `(whispering)`, `(to João)`, `(no telefone)`, `(rindo)`, `(beat)`.

**Maus usos:** `(muito triste e cansada, mas tentando esconder)`, `(como se estivesse lembrando da infância)`, `(ele quer que ela vá embora)`.

### 5.5 Diálogo

**Regras:**

- DEVE começar em 2,5 pol da borda.
- DEVE ter 3,5 pol de largura.
- DEVE estar em caixa mista.
- NÃO DEVE usar aspas em volta da fala.
- NÃO DEVE ter mais de um personagem falando no mesmo bloco; use diálogo duplo para simultaneidade.
- Interrupções: travessão (`—`) no fim da fala.
- Suspensão: reticências (`...`).
- Pausa: use `(beat)` com moderação; não insira linha em branco no meio da fala. O ritmo vem da própria escrita.
- Idioma estrangeiro: parêntese `(em francês)` ou `(legendado)`.
- Música: parêntese `(cantando)`.
- Telefone: use `(V.O.)` se só a voz é ouvida; `(O.S.)` se a pessoa está fisicamente presente, mas fora de quadro.
- DEVERIA ter menos de 10 linhas por fala. Falas longas quebram a página e exigem `(MORE)` / `(CONT'D)`.

**Exemplo:**

```text
ANA
Eu não vou embora.

JOÃO
Então me diz por quê.

ANA
Porque você já sabe.
```

### 5.6 Transição

**Regras:**

- DEVE estar em MAIÚSCULAS.
- DEVE terminar com dois-pontos, exceto `FADE OUT.` e `FADE TO BLACK.`.
- Transições de corte DEVEM ser alinhadas à direita, na borda de 7,5 pol.
- `FADE IN:` é a exceção: alinhado à esquerda, em 1,5 pol, como primeiro elemento do roteiro.
- `FADE OUT.` e `FADE TO BLACK.` são alinhados à direita.
- DEVERIA ser usado com moderação. Em roteiros modernos, a mudança de cena já implica corte; `CUT TO:` é opcional e muitas vezes desnecessário.
- NÃO DEVE ser usado para decorar a página.

**Transições comuns:**

```text
CUT TO:
DISSOLVE TO:
SMASH CUT TO:
MATCH CUT TO:
JUMP CUT TO:
WIPE TO:
FADE OUT.
FADE TO BLACK.
```

### 5.7 Plano (shot)

O elemento "plano" é opcional. No perfil spec, evite dirigir a câmera. Quando necessário, use uma linha de ação em maiúsculas, na margem da ação:

```text
CLOSE ON: a chave na mão de Ana.
```

Em roteiro de produção, o elemento pode ser formalizado com a mesma geometria da ação. Não é um dos seis elementos clássicos; é uma conveniência de software.

### 5.8 Diálogo duplo

Usado quando dois personagens falam ao mesmo tempo. As duas colunas ficam lado a lado, alinhadas pela primeira linha.

| Medida | Coluna esquerda | Coluna direita |
|---|---:|---:|
| Personagem | 2,75 pol | 5,75 pol |
| Parêntese | 2,25 pol a 4,0 pol | 5,25 pol a 7,25 pol |
| Diálogo | 2,0 pol a 4,5 pol | 5,0 pol a 7,5 pol |
| Largura do diálogo | 2,5 pol | 2,5 pol |
| Distância entre colunas | 0,5 pol | — |

**Regras:**

- As duas colunas DEVEM começar na mesma linha vertical.
- O bloco DEVE caber inteiro na página. Se não couber, move-se para a próxima.
- NÃO DEVE haver linha em branco entre os dois nomes.
- Cada coluna segue as regras normais de personagem, parêntese e diálogo.
- O bloco não recebe rótulo "DUAL DIALOGUE" no texto; a disposição já comunica.
- Se uma coluna for muito mais longa, a próxima ação começa depois da coluna mais longa.

**Exemplo:**

```text
        ANA                              JOÃO
Eu não vou embora.              Então me diz por quê.
Por que você não confia       Eu confio. Só não
em mim?                       acredito em você.
```

As posições exatas variam entre softwares. O FREEX adota a convenção acima, documentada em [`referencias.md`](referencias.md), como padrão de produto. O importante é que as duas colunas sejam legíveis, simétricas e não invadam a margem direita.

---

## 6. Página de título

### 6.1 Princípio

A página de título é a capa do roteiro. Deve ser sóbria. O leitor precisa saber, em três segundos, o título, o autor e como contatá-lo. Nada de imagem de fundo, logotipo, fonte decorativa ou frase de efeito.

### 6.2 Layout

| Elemento | Posição | Estilo |
|---|---|---|
| Título | Centralizado horizontalmente em 4,5 pol; topo do bloco a 3,25 pol do topo | MAIÚSCULAS, Courier Prime 12 pt, até 3 linhas |
| "Written by" | Uma linha em branco abaixo do título; centralizado | Caixa mista, 12 pt |
| Autor | Uma linha em branco abaixo; centralizado | Iniciais maiúsculas |
| "Based on..." | Opcional, uma linha abaixo do autor; centralizado | Caixa mista |
| Contato | Canto inferior esquerdo, a 1,5 pol da borda; última linha a 9,5 pol do topo | Caixa mista, uma linha por dado |
| Data | Canto inferior direito, alinhada à direita em 7,5 pol; mesma linha de base do contato | Caixa mista |

```
+----------------------------------------------------------------+
|                                                                |
|                                                                |
|                                                                |
|                        TÍTULO DO ROTEIRO                        | 3,25"
|                                                                |
|                          Written by                            |
|                                                                |
|                          Ana Silva                             |
|                                                                |
|                                                                |
|                                                                |
|                                                                |
| Ana Silva                                    Draft: 2026-10-23 |
| ana@exemplo.com                                                |
| +55 11 99999-9999                                              |
|                                                                |
+----------------------------------------------------------------+
```

### 6.3 Regras

- A página de título NÃO DEVE ter número.
- NÃO DEVE contar na numeração do roteiro.
- O título DEVE estar em MAIÚSCULAS. Aspas são opcionais; o padrão FREEX não usa.
- "Written by" é a formulação padrão. "By" ou "An original screenplay by" são variações aceitas.
- O nome do autor DEVE estar em iniciais maiúsculas, não em caixa alta.
- O bloco de contato DEVE incluir nome e e-mail. Telefone e representação são opcionais.
- A data DEVE ser a data do draft, não a data de copyright.
- NÃO DEVE incluir número de registro do WGA, aviso de copyright ou logotipo por padrão. São opcionais e não ajudam na leitura.
- Imagens: o MVP não oferece imagem na página de título. Se o usuário precisar, uma segunda página de título com imagem pode ser adicionada fora do padrão; isso deve ser exceção, não regra.
- Centralização: o centro do bloco é 4,5 pol, e não 4,25 pol (centro geométrico da página). O deslocamento de 0,25 pol à direita compensa a margem esquerda maior e a encadernação. É a convenção usada por Celtx e por modelos de mercado.

### 6.4 Exemplo em texto

```text
                        O ÚLTIMO ANDAR

                          Written by

                          Ana Silva




Ana Silva
ana@exemplo.com
+55 11 99999-9999                              Draft: 2026-10-23
```

---

## 7. Paginação e quebras

A especificação completa, com algoritmo e casos de teste, está em [`paginacao-e-quebras.md`](paginacao-e-quebras.md). O resumo normativo:

### 7.1 Regras gerais

- A página tem 54 linhas de corpo.
- O número de página fica no cabeçalho, fora do corpo.
- Um elemento nunca começa na última linha da página se precisar de continuação.
- Cabeçalho de cena NÃO DEVE ficar sozinho no fim da página; deve ter pelo menos duas linhas do elemento seguinte na mesma página.
- Personagem NÃO DEVE ficar sozinho no fim da página; deve ter pelo menos uma linha de parêntese ou diálogo na mesma página.
- Parêntese NÃO DEVE ficar sozinho no fim da página; deve ter pelo menos uma linha de diálogo na mesma página.
- Diálogo PODE ser dividido entre páginas, mas DEVE usar `(MORE)` no fim da página anterior e `(CONT'D)` no nome do personagem na página seguinte.
- Ação PODE ser dividida entre páginas, sem `(MORE)` / `(CONT'D)`.
- Transição DEVERIA ficar na mesma página que a última linha da cena; se não couber, move-se para a página seguinte com a cena.
- Diálogo duplo NÃO DEVE ser dividido entre páginas.

### 7.2 `(MORE)` e `(CONT'D)`

Quando uma fala não cabe inteira na página:

**Fim da página anterior:**

```text
ANA
Eu não vou embora. Eu passei anos
esperando por isso e agora você
(MORE)
```

**Início da página seguinte:**

```text
ANA (CONT'D)
quer que eu desista como se nada
tivesse acontecido.
```

Regras:

- `(MORE)` fica alinhado como um cabeçalho de personagem, em 3,7 pol, na última linha da página.
- `(CONT'D)` fica imediatamente após o nome do personagem, com um espaço.
- O nome do personagem é repetido no topo da página seguinte.
- A fala NÃO DEVE ser cortada no meio de uma palavra.
- DEVERIA ser cortada em fim de frase ou, no mínimo, em fim de linha.
- Se a fala tiver menos de duas linhas na página seguinte, o bloco inteiro deve ser movido para a próxima página, se possível.

### 7.3 Viúvas e órfãs

| Situação | Regra |
|---|---|
| Cabeçalho de cena no fim da página | Mover para a próxima |
| Personagem no fim da página | Mover para a próxima |
| Parêntese no fim da página | Mover para a próxima |
| Uma linha de diálogo no topo da página | Evitar; manter pelo menos 2 linhas |
| Uma linha de ação no topo da página | Evitar; manter pelo menos 2 linhas |
| Cena com uma linha no fim da página | Mover a cena inteira, se possível |

### 7.4 Continuação de cena

Em roteiro de produção, uma cena que atravessa páginas pode receber:

- `(CONTINUED)` no canto inferior direito da página anterior;
- `CONTINUED:` no canto superior esquerdo da página seguinte.

No perfil spec, esses marcadores ficam desligados por padrão. São úteis em produção, mas adicionam ruído à leitura.

---

## 8. Validação

### 8.1 Erros bloqueantes

Um erro bloqueia a exportação até ser corrigido.

| Código | Condição | Ação |
|---|---|---|
| `FMT001` | Página diferente de US Letter sem opção A4 explícita | Corrigir ou escolher A4 |
| `FMT002` | Fonte diferente de Courier Prime | Corrigir |
| `FMT003` | Texto ultrapassa a área de texto | Corrigir |
| `FMT004` | Personagem sem diálogo ou parêntese seguinte | Corrigir |
| `FMT005` | Parêntese sem diálogo seguinte | Corrigir |
| `FMT006` | Cabeçalho de cena vazio | Corrigir |
| `FMT007` | Personagem vazio | Corrigir |
| `FMT008` | Diálogo fora de um bloco de personagem | Corrigir |
| `FMT009` | Fonte não carregada ou não incorporável | Corrigir |
| `FMT010` | PDF com sobreposição de texto | Corrigir |

### 8.2 Avisos não bloqueantes

Um aviso permite exportar após confirmação.

| Código | Condição | Recomendação |
|---|---|---|
| `FMT101` | Cabeçalho de cena com mais de 60 caracteres | Encurtar a locação |
| `FMT102` | Cabeçalho sem ` - TEMPO` | Adicionar tempo |
| `FMT103` | Cabeçalho sem `INT.`/`EXT.` | Corrigir prefixo |
| `FMT104` | Personagem com mais de 22 caracteres | Abreviar |
| `FMT105` | Parêntese com mais de 20 caracteres | Encurtar |
| `FMT106` | Parágrafo de ação com mais de 4 linhas | Dividir |
| `FMT107` | Fala com mais de 10 linhas | Considerar dividir ou encurtar |
| `FMT108` | "we see" / "we hear" | Reescrever |
| `FMT109` | Direção de câmera no perfil spec | Remover ou confirmar |
| `FMT110` | Página fora da faixa orientativa | Revisar |
| `FMT111` | Título ou autor ausente na página de título | Preencher |
| `FMT112` | Espaços duplos ou tabs | Auto-corrigir |
| `FMT113` | Caixa mista em elemento que deve ser maiúsculo | Auto-corrigir |
| `FMT114` | Aspas tipográficas em diálogo | Informativo |
| `FMT115` | Cena sem cabeçalho após transição | Verificar |
| `FMT116` | Cabeçalho de cena terminado em ponto (seção 5.1) | Remover o ponto |
| `FMT117` | Parêntese sem parênteses ou terminado em ponto (seção 5.4) | Corrigir |
| `FMT118` | Personagem terminado em ponto ou dois-pontos (seção 5.3) | Remover |
| `FMT119` | Transição sem dois-pontos, exceto `FADE OUT.` e `FADE TO BLACK.` (seção 5.6) | Corrigir |
| `FMT120` | Diálogo inteiro entre aspas (seção 5.5) | Remover as aspas |
| `FMT121` | Primeira menção, na ação, a um personagem que fala não está em maiúsculas (seção 5.2) | Escrever o nome em maiúsculas |

Os códigos `FMT116` a `FMT121` formalizam regras já normativas nas seções 5.1 a 5.6; a implementação está em `packages/screenplay/src/validate.ts`. `FMT001`, `FMT002`, `FMT009` e `FMT010` dependem de fonte e de PDF e são verificados na exportação, não no validador de blocos.

### 8.3 Auto-correções permitidas

O FREEX PODE corrigir automaticamente, sem alterar o sentido:

- remover espaços no fim das linhas;
- colapsar espaços múltiplos;
- converter tabs em espaços;
- aplicar maiúsculas a cabeçalho, personagem e transição;
- remover linhas em branco no início e no fim do documento;
- normalizar quebras de linha (`CRLF` → `LF`);
- remover espaços antes de pontuação.

O FREEX NÃO DEVE:

- reescrever frases;
- corrigir gramática sem confirmação;
- encurtar um cabeçalho de cena automaticamente;
- remover parênteses;
- mudar nomes de personagens;
- converter aspas sem confirmação;
- alterar o texto para caber na página.

### 8.4 Faixas orientativas de páginas

| Formato | Faixa típica |
|---|---|
| Curta-metragem | 5 a 30 páginas |
| Longa-metragem | 90 a 120 páginas |
| Piloto de TV, 1 h | 45 a 65 páginas |
| Comédia de TV, 30 min | 25 a 40 páginas |
| Telefilme | 90 a 110 páginas |

São orientações, não erros. Um longa de 130 páginas pode ser intencional; um piloto de 70 páginas também. O aviso serve para o autor comparar com a expectativa do mercado.

---

## 9. Formatação de produção

O perfil spec é o padrão do MVP. Os recursos abaixo estão especificados para a fase de produção e devem ser previstos no modelo de dados, mesmo que a interface chegue depois.

### 9.1 Números de cena

- Números aparecem à esquerda e à direita do cabeçalho de cena.
- À esquerda: alinhados à direita em 1,35 pol, dentro da margem esquerda.
- À direita: alinhados à esquerda em 7,65 pol, dentro da margem direita.
- Fonte Courier Prime 12 pt; negrito opcional.
- A numeração é atribuída em ordem de leitura.
- No draft de produção, os números são travados.
- Cenas novas recebem letras: `12A`, `12B`.
- Cenas removidas mantêm o número e recebem `OMITTED`, sem conteúdo.
- Números não entram na largura de 60 caracteres.

```text
1    INT. COZINHA - NOITE    1

     Ana abre a geladeira.

2    EXT. RUA - NOITE        2
```

### 9.2 Cores de revisão

A ordem padrão da WGA é:

| Ordem | Cor |
|---:|---|
| 0 | White (draft original de produção) |
| 1 | Blue |
| 2 | Pink |
| 3 | Yellow |
| 4 | Green |
| 5 | Goldenrod |
| 6 | Buff |
| 7 | Salmon |
| 8 | Cherry |
| 9 | Second Blue |
| 10 | Second Pink |
| ... | ... |

- Cada conjunto de revisões tem uma data.
- Páginas alteradas recebem a cor e a data no cabeçalho.
- Linhas alteradas recebem um asterisco na margem.
- A página de título lista o histórico de revisões.
- PDFs de revisão podem simular a cor da folha com uma faixa ou cabeçalho colorido; a impressão em papel colorido é a prática de produção.
- A cor não substitui a data. As duas informações devem aparecer juntas.

### 9.3 Cabeçalho de produção

```text
BLUE 10/23/2026                                        56.
```

- A cor e a data ficam à esquerda do número de página, no topo direito.
- Em páginas não revisadas, apenas o número.
- O cabeçalho não altera o corpo do texto.

### 9.4 Continuação de cena

- `(CONTINUED)` no canto inferior direito da página anterior.
- `CONTINUED:` no canto superior esquerdo da página seguinte.
- Opcional no perfil spec; ligado no perfil de produção.
- Não confundir com `(CONT'D)` de diálogo.

### 9.5 Shooting script versus spec script

| Recurso | Spec | Produção |
|---|---|---|
| Números de cena | Não | Sim |
| Cores de revisão | Não | Sim |
| `(CONTINUED)` de cena | Opcional | Sim |
| Direções de câmera | Evitar | Permitido |
| Numeração de planos | Não | Sim |
| Página de título | Sim | Sim |
| Fonte e margens | Iguais | Iguais |

---

## 10. Localização

### 10.1 O que muda

O FREEX tem interface em português do Brasil. O roteiro pode usar vocabulário de elementos em inglês (padrão de submissão internacional) ou em português (leitura local). A geometria, a fonte e a paginação NÃO mudam.

| Inglês | Português |
|---|---|
| `INT.` | `INT.` |
| `EXT.` | `EXT.` |
| `DAY` | `DIA` |
| `NIGHT` | `NOITE` |
| `MORNING` | `MANHÃ` |
| `AFTERNOON` | `TARDE` |
| `EVENING` | `NOITE` |
| `CONTINUOUS` | `CONTÍNUO` |
| `LATER` | `DEPOIS` |
| `MOMENTS LATER` | `MOMENTOS DEPOIS` |
| `CUT TO:` | `CORTA PARA:` |
| `DISSOLVE TO:` | `DISSOLVE PARA:` |
| `FADE IN:` | `FADE IN:` |
| `FADE OUT.` | `FADE OUT.` |
| `(V.O.)` | `(V.O.)` |
| `(O.S.)` | `(O.S.)` |
| `(CONT'D)` | `(CONT'D)` |
| `Written by` | `Escrito por` |

### 10.2 Regras

- O idioma do roteiro é metadado, não tradução automática.
- O FREEX NÃO DEVE traduzir o texto do usuário.
- O autocompletar de cabeçalhos e transições usa o idioma escolhido.
- Para submissão a concursos e produtoras internacionais, use o vocabulário em inglês.
- `FADE IN:` e `FADE OUT.` são mantidos em inglês por convenção, mesmo em roteiros em português.
- Nomes de personagens e locais não são traduzidos.

### 10.3 Limite de alfabeto

Courier Prime cobre Latino, incluindo acentos e cedilha. Para alfabetos não latinos (cirílico, árabe, CJK), o perfil padrão não garante a mesma métrica. O FREEX PODE oferecer um "modo de compatibilidade" com fonte monoespaçada alternativa, mas DEVE avisar que a contagem de páginas pode variar e que o PDF não segue o padrão de submissão ocidental. O MVP pode limitar o texto a Latino e informar o usuário.

---

## 11. Exportação em PDF

### 11.1 Requisitos de fidelidade

- O PDF DEVE ser gerado a partir do mesmo snapshot e do mesmo motor de layout da prévia.
- O número de páginas DEVE ser idêntico ao da prévia.
- Os pontos de quebra DEVEM ser idênticos.
- A fonte DEVE estar incorporada e subsetada.
- O texto DEVE ser selecionável e copiável.
- Acentos, cedilha, travessões e aspas DEVEM renderizar corretamente.
- A página DEVE ter exatamente 8,5 × 11 pol, sem margens adicionais do navegador.
- NÃO DEVE haver cabeçalho ou rodapé do navegador.
- NÃO DEVE haver marcas de impressão, sombras ou bordas de página.
- O PDF DEVE ter metadados de título, autor, assunto e criador.
- O PDF DEVE ser gerado em modo retrato, escala 100%.

### 11.2 Opções

| Opção | Padrão | Efeito |
|---|---|---|
| Página de título | Incluir | Adiciona uma página não numerada |
| Número de páginas | Sim | Numera a partir da página 2 |
| Nomes de personagens em maiúsculas | Sim | Aplica a regra de elemento |
| `(MORE)` / `(CONT'D)` | Sim | Marcadores de continuação |
| `(CONTINUED)` de cena | Não | Marcadores de produção |
| Números de cena | Não | Apenas produção |
| Cores de revisão | Não | Apenas produção |
| Lista de cenas | Não | Anexo antes do roteiro |
| Lista de personagens | Não | Anexo antes do roteiro |
| Marca d'água | Não | Texto claro em diagonal |
| Intervalo de páginas | Todas | Exporta trecho sem renumerar |
| Tamanho do papel | US Letter | A4 disponível com aviso |

### 11.3 O que não pode acontecer

- PDF com fonte diferente da prévia.
- PDF com uma página a mais ou a menos por causa de margem do navegador.
- PDF com a página de título numerada.
- PDF com texto cortado na borda direita.
- PDF com sobreposição de colunas no diálogo duplo.
- PDF com `(MORE)` sem `(CONT'D)` correspondente.
- PDF gerado a partir de um estado intermediário da edição.
- PDF com conteúdo de outro projeto por erro de cache.

### 11.4 Nome do arquivo

```text
titulo-do-roteiro-2026-10-23-v3.pdf
```

Regras: minúsculas, hífens no lugar de espaços, sem acentos, sem caracteres especiais, data ISO e número da versão. O nome é sanitizado no servidor; o usuário pode escolher outro, mas o padrão é este.

---

## 12. Testes de conformidade

### 12.1 Fixtures obrigatórias

| Fixture | O que cobre |
|---|---|
| `sample-10-pages` | Todos os elementos, três cenas, diálogo, ação, transição |
| `dialogue-break` | Fala que atravessa página, `(MORE)` / `(CONT'D)` |
| `dual-dialogue` | Duas colunas, alinhamento, não quebra |
| `long-slugline` | Cabeçalho acima de 60 caracteres, aviso |
| `title-page` | Título, crédito, autor, contato, data |
| `accents` | Acentos, cedilha, travessão, aspas, caracteres latinos |
| `empty-scene` | Cabeçalho sem ação, validação |
| `orphan-character` | Personagem no fim da página, movimento |
| `production-scene-numbers` | Números à esquerda e à direita |
| `revision-colors` | Cabeçalho azul, data, asteriscos |

### 12.2 Critérios de aceite

- A contagem de páginas do PDF é igual à da prévia.
- O texto extraído do PDF contém o conteúdo completo, sem perda.
- A fonte incorporada é Courier Prime, não uma substituta.
- As posições dos elementos estão dentro de ±0,01 pol do especificado.
- Nenhuma linha ultrapassa a área de texto.
- Nenhum cabeçalho, personagem ou parêntese fica isolado no fim da página.
- O PDF abre em visualizadores padrão (Adobe Acrobat, Preview, Chrome, Firefox).
- O PDF passa em teste de acessibilidade básica (texto selecionável, ordem de leitura).
- O hash de layout é estável para o mesmo documento e perfil.

---

## 13. Compatibilidade e variantes

### 13.1 Celtx

Celtx usa Courier 12 pt, margens de 1,5 pol à esquerda e 1 pol nas demais, e posições de personagem/diálogo compatíveis com este documento. Algumas diferenças:

- Celtx oferece espaçamento "regular" e "tight", com contagens de linha por página que podem variar (51/53 no US Letter, segundo a documentação de Script Settings).
- Celtx pode centralizar visualmente o nome do personagem; o FREEX usa início fixo em 3,7 pol.
- A contagem de páginas de um mesmo texto pode diferir em poucas páginas entre Celtx e FREEX por causa do espaçamento vertical.

O FREEX NÃO DEVE prometer paridade de página com Celtx. DEVE prometer fidelidade ao próprio perfil e documentar a diferença.

### 13.2 Final Draft

Final Draft é a referência de fato em produção. As posições principais coincidem: 3,7 pol para personagem, 3,1 pol para parêntese, 2,5 pol para diálogo, 1,5 pol de margem esquerda. Pequenas diferenças de espaçamento e de tratamento de `(MORE)` / `(CONT'D)` existem entre versões. O FREEX adota a convenção descrita neste documento e testa contra PDFs de referência.

### 13.3 A4

A4 é 210 × 297 mm (8,27 × 11,69 pol). Com as mesmas margens de 1,5 pol à esquerda e 1 pol nas demais:

- largura útil: 5,77 pol ≈ 57 caracteres;
- altura útil: 9,69 pol ≈ 58 linhas.

O perfil A4 do FREEX usa 57 caracteres por linha e 58 linhas por página, mantendo a fonte e as posições relativas. A paginação resultante é diferente da do US Letter. O PDF A4 DEVE exibir um aviso de que não é o padrão de submissão da indústria americana. Para concursos e produtoras, exporte em US Letter.

### 13.4 Variações aceitas

| Variação | Aceita? | Observação |
|---|---|---|
| Duas linhas em branco antes de cena | Sim | Altera a paginação; não é o padrão FREEX |
| Personagem centralizado sobre o diálogo | Sim | O FREEX usa início fixo |
| `CUT TO:` em todas as cenas | Sim, mas redundante | Prefira omitir |
| `FADE IN:` à direita | Aceito por alguns | O padrão é à esquerda |
| `(MORE)` à direita | Aceito por alguns | O padrão é em 3,7 pol |
| `CONT'D` em toda fala interrompida por ação | Não recomendado | Use apenas para continuação entre páginas |
| Fonte Courier New | Não no perfil FREEX | O perfil usa Courier Prime; Courier New não é incorporada |
| Aspas curvas | Aceitas | O texto do usuário é preservado |
| Justificar o texto | Não | A margem direita deve ser irregular |

---

## 14. Controle de mudanças

### 14.1 Versionamento do perfil

O perfil tem versão (`FREEX Standard 1.0`). Cada exportação registra:

- versão do perfil;
- hash do documento;
- hash do layout;
- versão do renderizador;
- opções de exportação.

Mudanças de geometria, fonte ou paginação exigem nova versão do perfil. PDFs antigos não são regerados; permanecem como foram emitidos.

### 14.2 Processo para alterar uma regra

1. Abrir uma proposta com a fonte externa que sustenta a mudança.
2. Verificar se é regra de indústria ou preferência de produto.
3. Atualizar este documento e, se necessário, [`elementos-e-convencoes.md`](elementos-e-convencoes.md) e [`paginacao-e-quebras.md`](paginacao-e-quebras.md).
4. Atualizar as fixtures e os testes golden.
5. Registrar a decisão em um ADR, se afetar arquitetura ou exportação.
6. Subir a versão do perfil.
7. Comunicar usuários se a paginação de documentos existentes mudar.

### 14.3 O que nunca muda sem aviso

- tamanho de página;
- fonte e tamanho;
- margens;
- posições de personagem, parêntese e diálogo;
- regra de numeração;
- regra de `(MORE)` / `(CONT'D)`;
- página de título.

---

## 15. Referências

As fontes externas, com o que cada uma sustenta e onde há divergência, estão em [`referencias.md`](referencias.md). Leia antes de alterar qualquer número deste documento.
