# ADR-004: US Letter como perfil canônico de página

- **Status:** Aceito
- **Data:** 2026-10-23
- **Substitui:** —
- **Substituído por:** —
- **Relaciona-se com:** [`../../02-roteiro/normas-de-formatacao.md`](../../02-roteiro/normas-de-formatacao.md), [`../../02-roteiro/paginacao-e-quebras.md`](../../02-roteiro/paginacao-e-quebras.md), [`../../02-roteiro/referencias.md`](../../02-roteiro/referencias.md)

## Contexto

O FREEX precisa escolher um perfil de página canônico. A escolha afeta a contagem de páginas, a geometria dos elementos, a paginação, o PDF e a expectativa de quem lê. Não existe norma ISO de formato de roteiro. O que existe é um consenso de mercado, formalizado por softwares, concursos e práticas de leitura nos Estados Unidos, onde o roteiro de cinema e TV tem seu mercado de referência.

As fontes consultadas convergem em:

- papel US Letter, 8,5 × 11 pol;
- Courier 12 pt, 10 caracteres por polegada;
- margem esquerda de 1,5 pol;
- margens superior, inferior e direita de 1 pol;
- área de texto de 6 × 9 pol;
- cerca de 55 linhas por página, com variação entre implementações.

Há divergência em detalhes. O Celtx documenta 51 ou 53 linhas conforme a versão; outras ferramentas arredondam para 55. A escolha do FREEX precisa ser explícita, estável e testável. Também precisa lidar com usuários fora dos Estados Unidos, que imprimem em A4.

## Decisão

Adotamos **US Letter** como perfil canônico, com as constantes abaixo.

| Constante | Valor |
|---|---|
| Página | 8,5 × 11 pol (215,9 × 279,4 mm), retrato |
| Margem esquerda | 1,5 pol |
| Margem direita | 1,0 pol |
| Margem superior | 1,0 pol |
| Margem inferior | 1,0 pol |
| Área de texto | 6,0 × 9,0 pol |
| Grade | 60 colunas × 54 linhas de corpo |
| Fonte | Courier Prime 12 pt, 10 cpi, 6 lpi |
| Número de página | topo direito, 0,5 pol da borda, formato `2.` |
| Página de título | sem número, fora da numeração |

A4 é uma opção de impressão e exportação, nunca o padrão de submissão. Quando selecionado, o produto:

- avisa que o arquivo não segue o padrão de submissão americano;
- usa um perfil separado, com margens equivalentes e área de texto recalculada;
- registra o perfil no PDF e no histórico de exportação;
- calcula um layout A4 próprio, sem alterar o documento canônico nem sua paginação em US Letter.

A escolha de 54 linhas, em vez das "aproximadamente 55" citadas pela indústria, é deliberada: 9 pol × 6 linhas/pol = 54 linhas exatas. O número de página fica fora do corpo, a 0,5 pol, e não consome uma linha da grade. Isso torna a paginação reproduzível e o hash de layout estável.

## Alternativas consideradas

| Alternativa | Por que foi descartada |
|---|---|
| A4 como padrão | Contraria o mercado de submissão que o produto quer atender e muda a contagem de páginas em relação à referência que produtores e leitores esperam. |
| Oferecer A4 e Letter como iguais, sem padrão | Cria ambiguidade em todo documento, exportação e comparação. O usuário não saberia qual contagem de páginas é a "real". |
| Página definida pelo usuário | Transforma o formato em configuração livre e destrói a promessa de layout determinístico. |
| 55 linhas como número redondo | Não corresponde à grade exata de 9 pol a 6 lpi e cria uma linha fantasma fora da área de texto. |
| Seguir literalmente a contagem do Celtx | As próprias versões do Celtx divergem (51 e 53). Copiar um número instável não é adotar um padrão. |

## Consequências

### Positivas

- A contagem de páginas corresponde ao padrão de leitura do mercado de referência.
- A grade de 60 × 54 é exata e reproduzível.
- O perfil pode ser versionado e testado com golden files.
- A4 continua disponível sem contaminar o documento canônico.
- A escolha é defensável com fontes, não com preferência interna.

### Negativas

- Usuários europeus e brasileiros que imprimem em A4 precisam de uma etapa adicional e veem um aviso.
- A numeração e a paginação em A4 não são idênticas às de Letter; o produto precisa explicar isso.
- A constante de 54 linhas diverge de ferramentas que usam 55, então uma comparação página a página com outro software pode não bater.
- Qualquer mudança futura de margem ou linha exige novo `profile_version`, novos golden files e comunicação.

### Neutras

- O formato do roteiro é uma convenção, não uma lei. O ADR registra a escolha, não a apresenta como norma universal.
- A fonte Courier Prime é uma decisão separada, ainda que interdependente das métricas.

## Critérios de conformidade

1. Todo documento novo nasce em US Letter, salvo escolha explícita de A4.
2. O PDF de submissão usa 8,5 × 11 pol, margem esquerda de 1,5 pol e demais margens de 1 pol.
3. A área de texto tem 6 × 9 pol e a grade tem 60 colunas por 54 linhas.
4. O número de página aparece a 0,5 pol do topo, alinhado à direita em 7,5 pol, a partir da página 2.
5. A página de título não é numerada e não conta na numeração.
6. Uma exportação A4 registra o perfil e avisa que não é o padrão de submissão.
7. Alterar qualquer constante exige atualização de [`../../02-roteiro/referencias.md`](../../02-roteiro/referencias.md), dos fixtures e do `profile_version`.

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Usuário esperar A4 | Aviso claro na criação e na exportação; opção A4 com perfil próprio |
| Comparação com outro software | Documentar a diferença de 54 versus 55 linhas e oferecer relatório de layout |
| Mudança de constante quebrar documentos | Versionamento de perfil, migração explícita, golden tests |
| Interpretação de que o padrão é lei | Linguagem normativa separa regra de indústria, convenção forte e escolha de produto |

## Referências

- [`../../02-roteiro/normas-de-formatacao.md`](../../02-roteiro/normas-de-formatacao.md)
- [`../../02-roteiro/paginacao-e-quebras.md`](../../02-roteiro/paginacao-e-quebras.md)
- [`../../02-roteiro/referencias.md`](../../02-roteiro/referencias.md)
- [`../../03-arquitetura/exportacao-pdf.md`](../exportacao-pdf.md)
