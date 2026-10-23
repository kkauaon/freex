# Elementos e convenções de roteiro

**Status:** normativo  
**Complementa:** [`normas-de-formatacao.md`](normas-de-formatacao.md)  
**Objetivo:** definir a gramática de conteúdo de cada elemento, os casos especiais e os erros mais comuns.

---

## 1. A lógica dos elementos

Um roteiro é feito de blocos. Cada bloco tem uma função e uma posição. O leitor profissional reconhece a função antes de ler o texto. É por isso que a formatação precisa ser consistente: ela é a sinalização visual do documento.

Os seis elementos clássicos são:

1. Cabeçalho de cena (scene heading ou slugline).
2. Ação (action).
3. Personagem (character).
4. Parêntese (parenthetical).
5. Diálogo (dialogue).
6. Transição (transition).

O FREEX acrescenta "plano" (shot) como elemento opcional de produção e "diálogo duplo" como variação do bloco de diálogo. Nada disso cria um formato novo: são conveniências de edição dentro do padrão.

---

## 2. Cabeçalho de cena

### 2.1 Função

Dizer onde e quando a ação acontece. É a unidade de organização do roteiro e a base da decupagem.

### 2.2 Estrutura

```text
PREFIXO. LOCAÇÃO - TEMPO
```

- **Prefixo:** `INT.` (interior), `EXT.` (exterior), `INT./EXT.` (interior e exterior na mesma cena), `I/E.` (variação de produção).
- **Locação:** o lugar específico, em maiúsculas.
- **Tempo:** `DAY`, `NIGHT`, `CONTINUOUS`, `LATER`, etc.

### 2.3 Exemplos

```text
INT. COZINHA - NOITE
EXT. ESTACIONAMENTO - DIA
INT./EXT. CARRO - CONTINUOUS
I/E. HELICÓPTERO - DUSK
INT. ESCOLA - CORREDOR - MANHÃ
```

### 2.4 O que evitar

- Prefixo sem ponto: `INT COZINHA`.
- Caixa mista: `Int. Cozinha`.
- Separador errado: `INT. COZINHA / NOITE`, `INT. COZINHA, NOITE`.
- Hora específica: `INT. COZINHA - 22H`. Prefira `NOITE`, a menos que a hora seja dramática.
- Ponto final: `INT. COZINHA - NOITE.`.
- Duas locações que mudam no meio da cena. Se a cena muda de lugar, é outra cena.
- Cabeçalho com direção de câmera: `INT. COZINHA - NOITE - CLOSE NO ROSTO`. A câmera vai na ação, e mesmo assim com moderação.

### 2.5 Sub-cabeçalhos

Quando o tempo ou o foco muda dentro da mesma locação, use uma linha em maiúsculas na margem da ação:

```text
LATER

Ana termina de arrumar as caixas.

MOMENTS LATER

A campainha toca.
```

Não use sub-cabeçalho para evitar um novo cabeçalho quando a locação muda de verdade. Isso quebra a decupagem.

### 2.6 Cena de transição

Uma cena que começa em um lugar e termina em outro pode ser dividida em duas cenas. Se a intenção é mostrar deslocamento, use uma transição ou uma cena curta de passagem. Não escreva um cabeçalho que tenta cobrir dois lugares ao mesmo tempo, a menos que seja `INT./EXT.` de um veículo em movimento.

### 2.7 Cabeçalho de cena e tempo de tela

O cabeçalho não estima duração. Uma cena de uma página pode durar 30 segundos; uma cena de meia página pode durar três minutos, se houver silêncio e ação física. A regra de uma página por minuto é uma média de leitura, não uma cronometragem.

---

## 3. Ação

### 3.1 Função

Descrever o que o público vê e ouve. A ação é o filme no papel.

### 3.2 Regras de escrita

- Presente do indicativo.
- Voz ativa.
- Frases curtas.
- Detalhes concretos e filmáveis.
- Um parágrafo, uma ideia.
- De 1 a 3 linhas por parágrafo; no máximo 4.
- Nomes próprios em maiúsculas na primeira aparição.
- Sons importantes em maiúsculas.
- Nada de pensamentos, memórias ou sentimentos internos que não se transformem em comportamento.

### 3.3 Exemplos

**Fraco:**

```text
Ana se sente perdida e triste, lembrando da infância.
```

**Forte:**

```text
Ana encara a caixa aberta. Pega uma foto. A mão para no ar.
```

**Fraco:**

```text
Nós vemos que João está nervoso.
```

**Forte:**

```text
João gira o anel no dedo. Olha para a porta.
```

### 3.4 Primeira aparição de personagem

Na primeira vez que um personagem aparece, o nome vai em maiúsculas, com idade e uma descrição curta que ajude a visualizar:

```text
ANA (30s), de moletom e cabelo preso, abre a porta.
```

Nas aparições seguintes, use o nome em caixa mista:

```text
Ana deixa a chave sobre a mesa.
```

### 3.5 Sons e objetos

Sons que importam para a cena podem ir em maiúsculas:

```text
Um TIRO ecoa no corredor.
O TELEFONE vibra contra a mesa.
```

Objetos não precisam de maiúsculas, a menos que sejam um som ou um letreiro.

### 3.6 Câmera

No perfil spec, evite direções de câmera. O roteirista não deve dirigir o filme no papel, a menos que a angulação seja essencial para a história.

**Evite:**

```text
CLOSE NO ROSTO DE ANA. A CÂMERA SE AFASTA.
```

**Prefira:**

```text
Ana olha para a janela. O reflexo dela se sobrepõe ao prédio.
```

Se a direção for indispensável, use uma linha curta em maiúsculas, com moderação:

```text
CLOSE ON: a chave na mão de Ana.
```

### 3.7 Ação e diálogo

A ação não deve repetir o que o diálogo já diz. Se o personagem fala "estou com medo" e a ação mostra a mão tremendo, uma das duas está sobrando. Na dúvida, mostre.

---

## 4. Personagem

### 4.1 Função

Indicar quem fala. O nome é um marcador de leitura, não uma apresentação.

### 4.2 Regras

- Maiúsculas.
- Sem ponto, sem dois-pontos.
- Consistente em todo o roteiro.
- Extensões entre parênteses, com um espaço após o nome.
- Idade e descrição vão na ação, não no cabeçalho.

### 4.3 Extensões

| Extensão | Uso |
|---|---|
| `(V.O.)` | Voz fora da realidade física da cena: narrador, pensamento, gravação |
| `(O.S.)` | Personagem presente na cena, mas fora do quadro |
| `(O.C.)` | Fora de câmera; comum em TV |
| `(CONT'D)` | Continuação de fala entre páginas ou após interrupção |
| `(PRE-LAP)` | Som ou fala que começa antes da imagem |
| `(FILTERED)` | Voz filtrada por telefone, rádio ou parede |
| `(ON TV)` | Voz vinda de uma TV |
| `(ON RADIO)` | Voz vinda de um rádio |
| `(SINGING)` | Personagem cantando |
| `(SUBTITLED)` | Fala em outro idioma, legendada |

### 4.4 V.O. e O.S. não são sinônimos

- `V.O.` (voice-over): a voz não pertence ao espaço físico da cena. Exemplo: narrador, carta lida em voz alta, gravação.
- `O.S.` (off-screen): a pessoa está no espaço da cena, mas fora do enquadramento. Exemplo: João fala da cozinha enquanto Ana está na sala.

Trocar os dois muda a decupagem e confunde o leitor.

### 4.5 Nomes

- Use o mesmo nome para o mesmo personagem. Não alterne `ANA`, `ANA MARIA` e `A MÃE`.
- Personagens sem nome devem ser descritos de forma consistente: `SEGURANÇA #1`, `MULHER DE VERMELHO`, `MOTORISTA`.
- Personagens com o mesmo nome em idades diferentes: use `JOVEM ANA` e `ANA`, ou `ANA (25)` e `ANA (50)` na primeira aparição, mantendo o mesmo cue.
- Grupos: `OS TRÊS AMIGOS`, `A MULTIDÃO`, `OS POLICIAIS`.
- Vozes: `NARRADOR (V.O.)`, `VOZ NO TELEFONE (V.O.)`.

### 4.6 Personagem que não fala

Não crie um cue de personagem para quem não fala. Descreva na ação. O cue existe para introduzir uma fala.

---

## 5. Parêntese

### 5.1 Função

Dar uma indicação rápida de como a fala é dita ou do que o personagem faz enquanto fala. Também é chamado de "wryly" no jargão americano.

### 5.2 Regras

- Minúsculas, salvo nomes próprios.
- Entre parênteses.
- Em linha própria.
- Curto: 1 linha, no máximo 2.
- Sem ponto final.
- Usado com moderação.

### 5.3 Bons usos

```text
JOÃO
(sem olhar)
Eu já disse que não.
```

```text
ANA
(no telefone)
Quem está aí?
```

```text
JOÃO
(rindo)
Você não está falando sério.
```

### 5.4 Maus usos

```text
JOÃO
(muito triste, cansado, com raiva, mas tentando
esconder)
Eu já disse que não.
```

```text
ANA
(como se estivesse lembrando da infância, quando
o pai a levava ao parque)
Eu já disse que não.
```

```text
JOÃO
(ele quer que ela vá embora)
Eu já disse que não.
```

O parêntese não é um espaço para direção de ator, backstory ou explicação de subtexto. Se a informação é importante, escreva na ação. Se não é, corte.

### 5.5 `(beat)`

`(beat)` indica uma pausa curta. É aceito, mas usado em excesso vira muleta. Prefira construir a pausa com a própria estrutura da fala ou com uma linha de ação.

### 5.6 Parêntese e quebra de página

Um parêntese nunca deve ficar no fim da página. Ele precisa de pelo menos uma linha de diálogo na mesma página. Se não couber, o bloco inteiro (personagem, parêntese e primeira linha) desce para a página seguinte.

---

## 6. Diálogo

### 6.1 Função

O que o personagem diz, canta ou transmite por voz.

### 6.2 Regras

- Caixa mista.
- Sem aspas.
- Uma fala por bloco.
- Interrupções com travessão.
- Suspensões com reticências.
- Sem explicações de subtexto.
- Sem repetir a ação.

### 6.3 Pontuação

| Intenção | Recurso | Exemplo |
|---|---|---|
| Interrupção | Travessão no fim | `Eu ia dizer—` |
| Suspensão | Reticências | `Eu não sei se...` |
| Pausa | `(beat)` ou linha de ação | `(beat)` |
| Ênfase | Itálico ou sublinhado | `Eu *não* vou.` |
| Simultaneidade | Diálogo duplo | Ver seção 7 |

### 6.4 Diálogo e ação

Não escreva:

```text
ANA
Estou com medo.
```

se a ação já mostra a mão tremendo e o olhar preso na porta. Escolha o canal mais forte. O roteiro ganha quando a imagem e a fala não são redundantes.

### 6.5 Falas longas

Uma fala de 15 linhas ocupa meia página e quebra o ritmo. Se a fala for realmente longa, divida com ação, reação ou silêncio. Se precisar atravessar a página, use `(MORE)` / `(CONT'D)`.

### 6.6 Idiomas

```text
ANA
(em francês)
Je ne sais pas.
```

ou

```text
ANA
(legendado)
Je ne sais pas.
```

Escolha uma convenção e mantenha. Se o público deve entender a fala, escreva em português e indique no parêntese que é falada em outro idioma. Se o público não deve entender, escreva no idioma e indique a legenda.

### 6.7 Música

```text
ANA
(cantando)
Parabéns pra você...
```

Para letras longas, use ação e descreva a música; o roteiro não é uma partitura.

---

## 7. Diálogo duplo

### 7.1 Quando usar

Quando dois personagens falam ao mesmo tempo, ou quando uma fala começa enquanto a outra ainda está no ar. É comum em comédia, discussão e cenas de sobreposição.

### 7.2 Como formatar

As duas colunas ficam lado a lado, com os nomes na mesma linha. A coluna esquerda usa 2,0 a 4,5 pol; a direita, 5,0 a 7,5 pol. O espaço entre elas é de 0,5 pol.

```text
        ANA                              JOÃO
Eu não vou embora.              Então me diz por quê.
Por que você não confia       Eu confio. Só não
em mim?                       acredito em você.
```

### 7.3 Regras

- O bloco inteiro deve caber na página.
- Cada coluna segue as regras de personagem, parêntese e diálogo.
- Não use rótulo "DUAL DIALOGUE".
- Não use diálogo duplo para economizar espaço. Use quando a simultaneidade é dramática.

---

## 8. Transição

### 8.1 Função

Indicar uma passagem de tempo, um corte deliberado ou o fim de uma sequência.

### 8.2 Regras

- Maiúsculas.
- Alinhadas à direita, exceto `FADE IN:`.
- Terminam com dois-pontos, exceto `FADE OUT.` e `FADE TO BLACK.`.
- Usadas com moderação.

### 8.3 Catálogo

| Transição | Uso |
|---|---|
| `CUT TO:` | Corte simples; muitas vezes redundante |
| `DISSOLVE TO:` | Passagem de tempo ou tom suave |
| `SMASH CUT TO:` | Corte abrupto, choque |
| `MATCH CUT TO:` | Ligação visual entre duas imagens |
| `JUMP CUT TO:` | Salto dentro da mesma cena |
| `WIPE TO:` | Transição estilizada |
| `FADE IN:` | Abertura; alinhada à esquerda |
| `FADE OUT.` | Encerramento; alinhada à direita |
| `FADE TO BLACK.` | Encerramento ou pausa dramática |

### 8.4 O erro do `CUT TO:` em tudo

Em roteiros modernos, a mudança de cena já implica corte. Usar `CUT TO:` depois de cada cena é redundante e ocupa espaço. Use quando a transição tem intenção: um corte seco, um dissolve, um match cut.

---

## 9. Plano (shot)

### 9.1 Quando usar

Em roteiro de produção, para indicar um enquadramento específico. No perfil spec, use com muita moderação.

### 9.2 Formas aceitas

```text
CLOSE ON: a chave na mão de Ana.
```

```text
WIDE SHOT: a praia vazia.
```

```text
ANGLE ON: a porta.
```

### 9.3 Regras

- Maiúsculas na abertura.
- Uma linha.
- Não substitui a ação; complementa.
- Não use para dirigir ator.

---

## 10. Sequências especiais

### 10.1 Montagem

Uma montagem mostra uma série de imagens condensadas no tempo. Não há uma única forma aceita. O FREEX recomenda uma abertura explícita e um fechamento explícito.

```text
MONTAGE - MANHÃ

- Ana embala os pratos.
- Ana bebe café em pé.
- Ana tranca a porta.

END MONTAGE
```

Variantes aceitas:

```text
SERIES OF SHOTS:

A) Ana embala os pratos.
B) Ana bebe café em pé.
C) Ana tranca a porta.

END SERIES OF SHOTS
```

Regras:

- A abertura vai em maiúsculas, na margem da ação.
- Cada imagem é uma linha de ação curta.
- O fechamento indica o retorno à cena.
- Se houver V.O., use `NARRADOR (V.O.)` ou o personagem com `(V.O.)`.
- Não use música como muleta; descreva a ação.

### 10.2 Série de planos

Semelhante à montagem, mas com planos rápidos e justapostos:

```text
SERIES OF SHOTS:

- A chave gira na fechadura.
- A porta abre.
- O corredor vazio.

END SERIES OF SHOTS
```

### 10.3 Insert

Um insert mostra um detalhe dentro da cena: uma tela, um bilhete, uma foto.

```text
INSERT - CELULAR

A tela mostra: "Não venha."

BACK TO SCENE
```

Regras:

- `INSERT` em maiúsculas.
- O detalhe é descrito na ação.
- `BACK TO SCENE` indica o retorno, quando necessário.
- Não use insert para uma cena inteira.

### 10.4 Intercut

Intercut alterna entre duas ou mais cenas que acontecem ao mesmo tempo, sem repetir cabeçalhos a cada corte.

```text
INT. APARTAMENTO DE ANA - NOITE

Ana disca o número.

INT. CARRO DE JOÃO - NOITE

João atende.

INTERCUT - TELEFONE

ANA
Onde você está?

JOÃO
Dirigindo.

END INTERCUT
```

Regras:

- Estabeleça as duas locações antes do `INTERCUT`.
- Use `INTERCUT - TELEFONE` ou `INTERCUT - APARTAMENTO/CARRO`.
- Alterne ação e diálogo sem novos cabeçalhos.
- Feche com `END INTERCUT` ou volte a um cabeçalho de cena.
- Não use intercut para ações que não são simultâneas.

### 10.5 Flashback

Há três formas aceitas:

**Como sub-cabeçalho:**

```text
FLASHBACK - 1999

INT. COZINHA - DAY
```

**Como modificador no cabeçalho:**

```text
INT. COZINHA - DAY (FLASHBACK)
```

**Como transição:**

```text
FLASHBACK:
...
END FLASHBACK
```

O FREEX recomenda a primeira ou a segunda, com `END FLASHBACK` ou `BACK TO PRESENT` no retorno. O importante é que o leitor saiba quando o flashback começa e quando termina.

### 10.6 Sonho e fantasia

```text
DREAM SEQUENCE

INT. PRAIA - DIA

...
END DREAM SEQUENCE
```

Ou use `(DREAM)` no cabeçalho. Mantenha a consistência.

### 10.7 Telefone

```text
INT. APARTAMENTO DE ANA - NOITE

Ana atende o telefone.

ANA
Alô?

INTERCUT - TELEFONE

JOÃO (V.O.)
Sou eu.

ANA
Onde você está?

END INTERCUT
```

Use `V.O.` para a voz do outro lado da linha. Use `O.S.` se a pessoa estiver no mesmo ambiente, fora do quadro.

### 10.8 Mensagens de texto

```text
INSERT - CELULAR

Na tela: "CHEGUEI. DESCULPA."

BACK TO SCENE
```

Não escreva mensagens como diálogo, a menos que alguém as leia em voz alta. Se a mensagem for lida, use `(V.O.)` ou `(reading)`.

### 10.9 Super, título e letreiro

```text
SUPER: "TRÊS ANOS DEPOIS"
```

```text
TITLE CARD: "LISBOA, 1974"
```

```text
ON SCREEN TEXT: "ARQUIVO CONFIDENCIAL"
```

São linhas de ação em maiúsculas. Não são diálogo.

### 10.10 Legendas

```text
ANA
(legendado)
Je ne sais pas.
```

ou, se a legenda é diegética:

```text
SUBTITLE: "Eu não sei."
```

Escolha uma convenção por roteiro.

---

## 11. Abertura e encerramento

### 11.1 `FADE IN:`

- Primeiro elemento do roteiro, quando usado.
- Alinhado à esquerda, em 1,5 pol.
- Seguido de uma linha em branco e do primeiro cabeçalho de cena.

### 11.2 `FADE OUT.`

- Último elemento do roteiro.
- Alinhado à direita.
- Sem `THE END` por padrão. `THE END` é opcional e não é necessário em roteiros spec.

### 11.3 Cold open

Em TV, algumas séries abrem com uma cena antes dos créditos. O rótulo `COLD OPEN` pode aparecer como sub-cabeçalho ou como cabeçalho de ato. Siga o padrão da série.

### 11.4 Atos

Em teleplays, os blocos podem ser marcados:

```text
COLD OPEN

...

END OF COLD OPEN

ACT ONE

...

END OF ACT ONE
```

Os rótulos vão em maiúsculas, na margem da ação. O FREEX PODE iniciar cada ato em nova página; é opção de projeto.

---

## 12. Erros comuns

| Erro | Por que é problema | Correção |
|---|---|---|
| Diálogo entre aspas | Aspas são de prosa, não de roteiro | Remover aspas |
| Personagem em caixa mista | Quebra a leitura e a convenção | `ANA`, não `Ana` |
| Cabeçalho em caixa mista | Idem | `INT. COZINHA - NOITE` |
| Parêntese com frase inteira | Vira direção de ator | Encurtar ou mover para ação |
| Ação com pensamentos | Não é filmável | Mostrar comportamento |
| "Nós vemos" | Muleta de direção | Descrever a imagem |
| `CUT TO:` em toda cena | Redundante | Omitir ou usar com intenção |
| Idade no cue de personagem | O cue é para fala | Idade na ação |
| `V.O.` para pessoa em cena | Confunde decupagem | Usar `O.S.` |
| Cabeçalho com hora exata | Engessa a produção | `NOITE`, `DIA` |
| Duas linhas em branco antes de cena | Altera paginação | Uma linha |
| Fonte proporcional | Muda a contagem de páginas | Courier Prime 12 pt |
| Justificar o texto | Margem irregular é padrão | Alinhar à esquerda |
| Número de página no texto | Não é corpo | Cabeçalho, 0,5 pol |
| Tabs para indentar | Quebra a grade | O layout posiciona |
| Espaço duplo após ponto | Desnecessário | Um espaço |

---

## 13. Exemplo completo

O exemplo abaixo é original e serve como fixture de teste. Ele cabe em duas páginas no perfil FREEX Standard.

```text
FADE IN:

INT. APARTAMENTO DE ANA - NOITE

Caixas de mudança se acumulam junto à porta. A
janela dá para o prédio em frente.

ANA (30s), de moletom e cabelo preso, olha a rua.
Uma luz acende no apartamento da frente.

ANA
Ele está lá.

JOÃO (30s), na porta, segura as chaves.

JOÃO
Você não devia ficar olhando.

ANA
Eu não estou olhando.

JOÃO
Então por que a janela está aberta?

Ana fecha a janela. O vidro treme.

ANA
Porque está calor.

JOÃO
Está frio.

ANA
Então por que você está de casaco?

João olha para o próprio casaco. Não responde.

ANA
Eu vou dormir.

JOÃO
Ana.

Ela para.

JOÃO
Ele ligou?

ANA
Não.

JOÃO
E você vai esperar?

ANA
Eu não estou esperando. Eu estou morando aqui.

João deixa as chaves sobre a caixa.

JOÃO
Eu volto amanhã.

ANA
Não precisa.

Ele sai. A porta fecha. Ana olha para a janela
outra vez.

CUT TO:

INT. APARTAMENTO DA FRENTE - NOITE

Um HOMEM (50s) apaga a luz. A janela fica escura.

FADE OUT.
```

Observações sobre o exemplo:

- O cabeçalho de cena tem 31 caracteres.
- A ação tem no máximo 3 linhas por parágrafo.
- O diálogo tem menos de 35 caracteres por linha.
- `CUT TO:` é usado uma vez, com intenção.
- A última imagem responde à pergunta da cena anterior sem diálogo.
- `FADE OUT.` encerra o roteiro.

---

## 14. Checklist de conteúdo

Antes de exportar, verifique:

- [ ] Todo cabeçalho tem prefixo, locação e tempo.
- [ ] Nenhum cabeçalho passa de 60 caracteres.
- [ ] Personagens estão em maiúsculas e com nome consistente.
- [ ] A primeira aparição de cada personagem está descrita na ação.
- [ ] Parênteses são curtos e necessários.
- [ ] Diálogos não têm aspas.
- [ ] Ação está no presente e é filmável.
- [ ] Transições têm intenção.
- [ ] `V.O.` e `O.S.` estão corretos.
- [ ] O roteiro começa e termina de forma clara.
- [ ] Não há direções de câmera desnecessárias.
- [ ] Não há erros de `(MORE)` / `(CONT'D)`.
- [ ] A página de título está preenchida.
- [ ] O PDF foi conferido contra a prévia.

---

## 15. Referências

- Normas de formatação: [`normas-de-formatacao.md`](normas-de-formatacao.md)
- Paginação: [`paginacao-e-quebras.md`](paginacao-e-quebras.md)
- Fontes externas: [`referencias.md`](referencias.md)
