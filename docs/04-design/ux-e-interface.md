# UX e interface

**Status:** proposta para validação com usuários
**Relaciona-se com:** [`../00-visao/personas-e-jornadas.md`](../00-visao/personas-e-jornadas.md), [`../01-requisitos/srs.md`](../01-requisitos/srs.md), [`../02-roteiro/normas-de-formatacao.md`](../02-roteiro/normas-de-formatacao.md), [`../03-arquitetura/api.md`](../03-arquitetura/api.md)

---

## 1. Princípio central

A interface existe para uma coisa: permitir que alguém escreva um roteiro sem pensar em formato. Tudo o que não serve a essa tarefa fica fora do caminho.

Isso não significa uma tela vazia. Significa que a complexidade aparece quando é necessária:

- o formato é automático e não tem painel de margens;
- a paginação é visível, mas não editável à mão;
- a colaboração é perceptível, mas não vira um painel de controle;
- a validação avisa, mas não interrompe a escrita;
- a exportação é um fluxo curto, com opções em linguagem de roteirista.

## 2. Princípios de design

1. **O texto é o herói.** A página tem contraste, espaço e silêncio ao redor. Barras e painéis são secundários.
2. **Formato invisível, consequência visível.** O usuário vê a página formatada e a contagem de páginas, não campos de margem.
3. **Uma página de verdade.** No desktop e no tablet o editor **é** a página: o texto é escrito direto nas folhas de 8,5 × 11 pol, com a capa, as quebras de página, o número, `(MORE)` e `(CONT'D)` no lugar em que o PDF os terá, e não há uma segunda visualização ao lado. No celular, o editor usa modo linear e a prévia paginada, idêntica ao PDF, fica em uma aba própria.
4. **Nenhuma ação destrutiva silenciosa.** Restaurar, excluir, remover membro e sobrescrever exigem confirmação clara.
5. **Estado sempre visível.** Salvo, sincronizando, offline, somente leitura. O usuário nunca precisa adivinhar.
6. **Teclado e toque.** Escrever é teclado no desktop; no celular, a barra de elementos e os controles de toque têm o mesmo peso. Toda ação continua acessível sem mouse.
7. **Erro explicável.** A mensagem diz o que aconteceu, por que e o que fazer. Sem "algo deu errado".
8. **Aprender fazendo.** O editor sugere o próximo elemento e explica o formato no momento em que ele importa.

## 3. Arquitetura de informação

### 3.1 Mapa de telas

```text
/                              Marketing e entrada
/login                         Entrar
/signup                        Criar conta
/forgot-password               Recuperar senha
/reset-password                Redefinir senha
/verify-email                  Confirmar e-mail
/invite/:token                 Aceitar convite

/app                           Projetos
/app/projects/:projectId       Visão do projeto
/app/projects/:projectId/scripts/:scriptId    Editor
/app/projects/:projectId/members               Membros e convites
/app/projects/:projectId/activity              Atividade e exportações
/app/settings/profile          Perfil
/app/settings/security         Segurança e sessões
/app/settings/notifications    Notificações

/read/:token                   Leitura por link
```

### 3.2 Navegação principal

- **Nível 1:** projetos, conta, ajuda.
- **Nível 2:** dentro do projeto, abas `Roteiros`, `Membros`, `Atividade` e `Configurações`.
- **Nível 3:** dentro do roteiro, o editor ocupa a tela inteira. Sair exige confirmação apenas se houver algo não sincronizado.

O editor não tem menu lateral permanente de configurações. As ações vivem na barra superior e em painéis contextuais, para não roubar largura da página.

## 4. Jornadas e telas

### 4.1 Entrada e ativação

**Objetivo:** levar Ana do cadastro ao primeiro PDF sem configurar formato.

1. A página inicial mostra uma página de roteiro real, não uma ilustração genérica.
2. O cadastro pede nome, e-mail e senha. OAuth é uma alternativa, não a única porta.
3. Após verificar o e-mail, Ana cai em `/app` com um projeto de exemplo curto e a opção "Novo roteiro".
4. O projeto de exemplo pode ser aberto, editado e excluído. Ele ensina os elementos e o atalho de exportação.
5. O primeiro roteiro abre no editor com o cursor no primeiro cabeçalho de cena e uma dica discreta: "Digite a cena. `Tab` muda o elemento. `Enter` cria o próximo."

Não há tour modal de sete passos. A orientação é contextual e desaparece depois do primeiro uso.

### 4.2 Lista de projetos

Cada cartão mostra:

- título do projeto;
- quantidade de roteiros;
- último roteiro editado e quando;
- avatares dos membros ativos;
- indicador de projeto arquivado.

Ações: abrir, renomear, arquivar, duplicar, excluir. A busca filtra por título e nome de roteiro. Projetos arquivados ficam em uma aba separada.

Estado vazio: uma frase curta e um único botão "Criar projeto". Sem ilustração gigante.

### 4.3 Visão do projeto

- Cabeçalho com título, membros e botão "Novo roteiro".
- Lista de roteiros com título, formato, status, páginas, última edição e autor.
- Aba de atividade com convites, versões, exportações e mudanças de permissão.
- Acesso rápido a "Convidar" e "Exportar" quando houver permissão.

O número de páginas vem do último layout calculado, com indicação de "calculando" quando o documento mudou e ainda não foi paginado.

### 4.4 Editor

O editor é a tela principal do produto. A estrutura é:

```text
+--------------------------------------------------------------------------+
| ← Projeto / Roteiro        Sincronizado   [avatares]   [Compartilhar] [PDF] |
+--------------------------------------------------------------------------+
| Cenas      |                                                             |
| 1. INT...  |                 página 1                                   |
| 2. EXT...  |        +--------------------------------+                  |
| 3. INT...  |        |                                |                  |
|            |        |          texto do roteiro      |                  |
|            |        |                                |                  |
|            |        +--------------------------------+                  |
|            |                                                             |
|            |        [ Comentários ]  [ Versões ]  [ Validação ]          |
+--------------------------------------------------------------------------+
| Cena 12 · Personagem · 1.234 palavras · 98 páginas · 100%      Aa  [-] [+] |
+--------------------------------------------------------------------------+
```

Regiões:

| Região | Conteúdo | Comportamento |
|---|---|---|
| Barra superior | Caminho, estado de sincronização, presença, compartilhar, exportar | Fixa; some em modo foco |
| Navegador de cenas | Lista numerada com página e indicador da cena atual | Colapsável; largura de 240 px |
| Canvas | Páginas empilhadas com sombra e zoom | Área central; fundo neutro |
| Painel direito | Comentários, versões ou validação | Abas; fecha com `Esc` |
| Barra inferior | Elemento atual, palavras, páginas, conexão, zoom | Fixa; discreta |

O canvas não usa rolagem horizontal. O zoom é `75%`, `100%`, `125%` ou "ajustar à largura". O padrão é "ajustar à largura" em telas menores que 1440 px e `100%` acima disso.

A anatomia acima é a do desktop. Em telas menores que 768 px, o editor usa o modo mobile descrito na seção 10.1.

### 4.5 Página de título

A página de título é editada em um modo próprio, acessível por "Título" no topo do editor. Ela não é um elemento do roteiro e não entra na paginação.

Campos:

- título;
- crédito ("Escrito por", "Roteiro de");
- autores, um por linha;
- contato;
- data;
- sinopse opcional para leitura, fora do PDF de submissão.

À direita, uma prévia da página. O botão "Voltar ao roteiro" retorna à posição anterior.

### 4.6 Exportação

O diálogo de exportação tem uma coluna de opções e uma de prévia/validação.

Opções:

- incluir página de título;
- intervalo de páginas;
- formato: Letter (padrão) ou A4 (com aviso);
- marca d'água;
- lista de cenas e lista de personagens como anexos;
- comentários como apêndice (opcional, fora da paginação).

O rodapé mostra "~98 páginas · Letter · Courier Prime" e o botão "Exportar PDF". Se houver erro bloqueante, o botão fica desabilitado e o painel de validação explica. Se houver apenas avisos, o botão permanece ativo e pede confirmação.

Durante a exportação, o diálogo vira um estado de progresso com etapas: "Preparando versão", "Paginando", "Gerando PDF", "Finalizando". O usuário pode fechar e continuar editando; o job segue e aparece na atividade do projeto. No celular, o diálogo ocupa a tela inteira e mantém as mesmas opções.

### 4.7 Versões

Lista com:

- tipo (automática, manual, exportação, restauração);
- nome e descrição, quando houver;
- autor;
- data e hora;
- número de páginas;
- ação "Comparar" e "Restaurar".

A comparação abre um diff lado a lado, com navegação por alteração e destaque de texto. Restaurar mostra um resumo do que será feito: "Uma nova versão será criada a partir desta. O histórico atual será mantido." Nunca há um botão "Substituir tudo" sem essa frase.

### 4.8 Comentários

- Selecionar texto abre uma ação flutuante "Comentar" e o atalho `Ctrl/Cmd+Alt+M`.
- O painel direito mostra threads abertas, resolvidas e desanexadas.
- Cada thread tem autor, horário, trecho citado e ações responder, resolver, reabrir e copiar link.
- O trecho comentado fica destacado no texto com uma faixa discreta.
- Se o trecho for apagado, a thread vai para "Desanexados", com o texto original preservado e sem tentar adivinhar uma nova posição.
- Menções usam `@nome` e geram notificação apenas para membros do projeto.
- O painel não bloqueia a escrita; ele empurra o canvas apenas quando aberto em tela larga. Em tela estreita, vira uma gaveta sobreposta; no modo mobile, uma folha inferior.

## 5. Modelo de interação do editor

### 5.1 Teclas

| Tecla | Ação |
|---|---|
| `Enter` | Cria o próximo elemento conforme a máquina de estados |
| `Tab` | Avança o tipo do elemento atual |
| `Shift+Tab` | Retrocede o tipo do elemento atual |
| `Backspace` no início | Converte para o elemento anterior ou mescla com o bloco acima, conforme a regra |
| `Ctrl/Cmd+Z` | Desfazer local |
| `Ctrl/Cmd+Shift+Z` | Refazer local |
| `Ctrl/Cmd+B` | Negrito |
| `Ctrl/Cmd+I` | Itálico |
| `Ctrl/Cmd+U` | Sublinhado |
| `Ctrl/Cmd+K` | Paleta de comandos |
| `Ctrl/Cmd+F` | Localizar no roteiro |
| `Ctrl/Cmd+Alt+M` | Comentar seleção |
| `Ctrl/Cmd+Shift+E` | Exportar |
| `Ctrl/Cmd+Shift+H` | Histórico de versões |
| `Ctrl/Cmd+S` | Criar checkpoint manual |
| `Ctrl/Cmd+Enter` | Inserir cabeçalho de cena após o bloco atual |
| `Esc` | Fechar painel, diálogo ou modo foco |

Atalhos usam `Ctrl` no Windows e Linux, `Cmd` no macOS. A paleta de comandos mostra os dois quando o sistema não é identificável. No celular, a barra de elementos substitui `Tab` e `Shift+Tab`; teclado físico, quando presente, continua funcionando.

### 5.2 Máquina de estados dos elementos

`Enter` cria o próximo elemento conforme a tabela. `Tab` e `Shift+Tab` percorrem **todos** os elementos, na ordem da barra de elementos, e voltam ao início ao chegar ao fim:

```text
Cabeçalho de cena → Ação → Personagem → Parêntese → Diálogo → Transição → Plano → (Cabeçalho de cena)
```

`Shift+Tab` percorre a mesma ordem ao contrário. Dentro de um diálogo duplo, `Tab` alterna as colunas antes de sair do bloco (ver abaixo).

| Elemento atual | `Enter` | `Enter` em elemento vazio |
|---|---|---|
| Cabeçalho de cena | Ação | Ação |
| Ação | Ação | Cabeçalho de cena |
| Personagem | Diálogo | Ação |
| Parêntese | Diálogo | Diálogo |
| Diálogo | Ação | Personagem |
| Transição | Cabeçalho de cena | Cabeçalho de cena |
| Plano | Ação | Cabeçalho de cena |
| Diálogo duplo | Ação | Ação |

Ao trocar o elemento o texto segue a regra do novo elemento (maiúsculas em cena, personagem e transição; parênteses no parêntese) e os blocos vazios que uma troca anterior deixou para manter a fala válida são removidos, de modo que percorrer todos os elementos não acumula blocos vazios.

Regras adicionais:

- `Tab` dentro de um diálogo duplo alterna entre as duas colunas antes de sair do bloco.
- `Enter` em um diálogo duplo cria uma nova linha na coluna ativa; `Ctrl/Cmd+Enter` insere um cabeçalho de cena após o bloco e sai do diálogo duplo.
- O editor não converte uma linha em outro elemento por palpite: um nome em maiúsculas digitado como ação continua ação. O autor escolhe o elemento pela barra de elementos, por `Tab` ou por `Alt+Shift+3`. (A conversão automática de que o texto anterior falava era opcional e foi desativada por decisão de produto.)
- Nenhuma tecla cria uma quebra de página manual. A paginação é consequência do conteúdo.

**Implementação** (`apps/web/app/editor/commands.ts`, testada sem navegador, inclusive com sequências aleatórias de teclas que exigem documento válido):

- `Tab` e `Shift+Tab` percorrem os sete elementos (`nextOnTab` e `nextOnShiftTab` em `packages/screenplay/src/elements.ts`); a tabela de contexto que havia antes só alternava pares de elementos e não atendia o critério de aceite 3.
- `Enter` no meio do texto divide o bloco; a segunda metade mantém o tipo em ação e diálogo e ganha o tipo seguinte da tabela nos demais. Em personagem ou parêntese que já tem a linha seguinte, o cursor passa para ela em vez de criar outra.
- Um parêntese guarda os parênteses no texto. O cursor fica dentro deles e o `)` conta como fim do conteúdo.
- `Backspace` no início de um bloco: bloco vazio some e o cursor sobe; bloco de outro elemento volta a ação; ação (ou bloco do mesmo elemento) junta com o de cima. `Delete` no fim puxa o bloco seguinte.
- `Alt+Shift+1…7` escolhe o elemento (cena, ação, personagem, parêntese, diálogo, transição, plano). A barra de elementos faz o mesmo e é o caminho no celular. Os botões não tiram o foco do roteiro.
- Estrutura (fala, diálogo duplo) é mantida por reconstrução do trecho com o motor (`normalizeBlocks` e `blocksToDocument`): converter um bloco nunca deixa o documento fora do esquema; um diálogo sem personagem ganha um personagem vazio, e um personagem sem diálogo, um diálogo vazio.
- Só texto puro é colado. Várias linhas são lidas como Fountain e entram como novos blocos.
- **O editor é a página** (`apps/web/app/editor/pageBreaks.ts`). A paginação do motor é calculada a cada mudança do texto (150 ms depois da última tecla) e vira widgets não editáveis do ProseMirror: a capa como primeira folha, a margem de cada folha, o intervalo entre folhas, o número da página, `(MORE)` e as linhas `NOME (CONT'D)`. Uma linha é 16 px e uma coluna 9,6 px (Courier Prime 12 pt a 96 px por polegada), a mesma grade do PDF; o navegador quebra as linhas de cada bloco com a mesma regra do motor (guloso, por caracteres), e a altura de cada quebra é calculada pelas linhas que o motor contou. Enquanto a paginação nova não chega, as quebras acompanham o texto.
- A folha encolhe (zoom) quando a coluna é mais estreita que 8,5 pol, a partir de 640 px. Abaixo disso o editor usa o modo linear (sem a geometria da página, com o nome do elemento acima do bloco atual e a coluna do diálogo duplo identificada) e a prévia paginada está na aba **Páginas**. Em telas largas (a partir de 1100 px) a folha ocupa a janela, centralizada sobre uma mesa neutra, e cresce até 125% para facilitar a leitura; a barra de ferramentas é uma linha só e Problemas, Capa e Atalhos abrem numa gaveta à direita (`Esc` fecha), sem empurrar o texto. Abaixo de 1100 px essas seções ficam na barra inferior.
- A capa aparece como a primeira folha e se edita na seção Capa; nenhum controle de margem, fonte ou espaçamento existe.
- Ainda não existem: autocompletar de personagens na digitação (FR-EDT-008), localizar e substituir, navegador de cenas e modo foco.

### 5.3 Normalização

- Cabeçalho de cena, personagem, transição e plano são convertidos para maiúsculas ao confirmar o elemento, não a cada tecla.
- Espaços duplicados são reduzidos, exceto em diálogo e ação, onde podem ser intencionais.
- Um cabeçalho de cena inválido não é corrigido em silêncio: recebe sublinhado de aviso e uma sugestão.
- A normalização nunca move o cursor para o fim do texto.

## 6. Paginação na interface

- As páginas são exibidas como folhas separadas, com uma sombra leve e um espaço de 24 px entre elas.
- A quebra é indicada por uma linha tracejada apenas quando o usuário está com o cursor próximo; fora disso, a página fala por si.
- O número aparece no topo direito, em Courier Prime 12 pt, exatamente como no PDF.
- A página 1 não mostra número. A página de título, quando exibida no editor, também não.
- O contador "98 páginas" exclui a página de título, conforme a SRS.
- O editor não permite arrastar a margem, aumentar a fonte ou "espremer" o texto para caber. Se o usuário tentar, a interface explica que o formato é fixo.
- A prévia pode ser aberta em modo leitura, sem barras, com navegação por setas e `Page Up`/`Page Down`.

Atualização:

- a paginação é recalculada após uma pausa de digitação, com debounce de 200 ms, respeitando o limite de 500 ms da SRS;
- o layout usa o mesmo hash do PDF;
- enquanto recalcula, o contador mostra o valor anterior com um indicador discreto, nunca um salto de página no meio da digitação;
- o cursor permanece ancorado ao texto, não à coordenada da página.

## 7. Colaboração na interface

### 7.1 Presença

- Avatares no topo, com no máximo cinco visíveis e um contador "+N".
- Cada usuário tem uma cor estável, escolhida de uma paleta acessível, não apenas por matiz.
- Cursor remoto com uma etiqueta de nome que desaparece após 2 s de inatividade.
- Seleção remota com fundo translúcido, sem cobrir o texto.
- A cor nunca é o único indicador de papel ou status.

### 7.2 Estado da conexão

| Estado | Indicador | Texto |
|---|---|---|
| Conectado | Ponto verde e "Sincronizado" | Nenhum alerta |
| Sincronizando | Ícone girando e "Sincronizando" | Nenhum bloqueio |
| Offline | Ícone de nuvem cortada e "Offline" | "Suas edições serão sincronizadas quando a conexão voltar." |
| Erro | Ícone de alerta e "Não foi possível sincronizar" | Ação "Tentar novamente" e link para diagnóstico |
| Somente leitura | Cadeado e "Somente leitura" | Motivo: papel ou link |

O estado offline não bloqueia a escrita. O usuário continua editando; a interface informa e preserva a cópia local.

### 7.3 Conflitos e permissões

- O usuário nunca vê um diálogo de "conflito de versão". O CRDT resolve o texto; a interface mostra o resultado.
- Se uma edição não puder ser aplicada por permissão, a interface reverte a alteração local e explica: "Seu acesso foi alterado para leitura. Esta edição não foi salva."
- Se o usuário for removido do projeto, a sessão entra em somente leitura e oferece "Copiar meu texto" antes de sair.
- "Seguir usuário" é opcional: clicar no avatar centraliza a viewport no cursor daquela pessoa.

## 8. Validação

O painel de validação tem duas seções:

- **Erros bloqueantes:** impedem a exportação. Exemplo: personagem sem diálogo, cabeçalho de cena inválido, fonte indisponível.
- **Avisos:** não bloqueiam. Exemplo: cena longa, transição desnecessária, nome de personagem inconsistente, diálogo que quebra com `(MORE)`.

Cada item mostra:

- ícone e severidade;
- trecho ou número da cena;
- explicação em uma frase;
- ação "Ir para o trecho";
- ação "Corrigir" quando houver correção segura.

O painel não abre automaticamente a cada erro. Ele mostra um contador na barra inferior e um ponto de atenção no botão de exportação. Abrir o painel é decisão do usuário, exceto antes de exportar.

## 9. Acessibilidade

Meta: WCAG 2.2 nível AA.

- Toda ação tem equivalente de teclado e foco visível.
- A ordem de foco segue a ordem visual; o canvas é uma região com `aria-label` e o elemento atual é anunciado.
- O leitor de tela anuncia: tipo de elemento, número da cena, posição na página e texto.
- Cabeçalhos de página usam landmarks; o número da página tem texto alternativo.
- Contraste mínimo de 4,5:1 para texto e 3:1 para componentes.
- A interface respeita `prefers-reduced-motion`; animações de cursor e de painel são reduzidas ou removidas.
- Zoom de 200% sem perda de função; o layout do editor pode rolar, mas não pode cortar controles.
- Mensagens de erro são associadas ao campo e anunciadas em `aria-live="polite"`.
- Nenhum estado depende apenas de cor.
- O modo foco remove distrações, não remove controles essenciais.

## 10. Responsividade

| Faixa | Comportamento |
|---|---|
| ≥ 1440 px | Editor completo, navegador de cenas e painel direito abertos |
| 1024–1439 px | Editor completo, painel direito como gaveta |
| 768–1023 px | Navegador de cenas colapsado, canvas com zoom ajustado |
| 360–767 px | Editor mobile linear, barra de elementos e prévia paginada |
| < 360 px | Leitura e comentários; edição não é prometida |

### 10.1 Modo mobile de edição

Uma página US Letter tem 8,5 pol de largura. Em 360 px, ela apareceria a menos da metade do tamanho real, com texto abaixo de 6 pt, pequeno demais para escrever. Em vez de fingir que a página inteira é editável nessa largura, o FREEX usa um **modo linear** no celular. A geometria canônica não muda: ela continua sendo aplicada na prévia paginada e no PDF.

**Estrutura:**

- Os elementos aparecem empilhados em uma coluna, com etiqueta discreta do tipo (cena, ação, personagem, diálogo) e guias de indentação que preservam a hierarquia.
- Cabeçalho de cena, personagem e transição continuam em maiúsculas; a normalização é a mesma do desktop.
- As quebras de página aparecem como marcadores somente leitura ("Fim da página 12"), calculados pelo motor de layout. Não há quebra manual.
- A barra inferior fixa oferece: tipo de elemento, comentário, desfazer, refazer, prévia e exportar. Alvos de toque têm no mínimo 44 × 44 px e respeitam `safe-area-inset`.
- A seleção usa os controles nativos do sistema; a ação "Comentar" aparece junto da seleção e em um botão da barra.
- Diálogo duplo aparece como dois blocos de fala consecutivos, com etiqueta "duplo" e indicação de coluna esquerda/direita; a prévia e o PDF mantêm as colunas lado a lado.
- Comentários e validação abrem em uma folha inferior, não em uma coluna lateral.
- Presença e cursores remotos são compactados: avatar ao lado do bloco e indicador no topo, sem cobrir o texto.
- A página de título usa um formulário de tela cheia com os mesmos campos e a mesma prévia.

**Teclado e foco:**

- `Enter` mantém a máquina de estados da seção 5.2.
- `Tab` é substituído pela barra de elementos; teclado físico continua aceitando `Tab` e `Shift+Tab`.
- Com teclado virtual aberto, o bloco ativo rola para uma área visível acima do teclado; a barra de elementos permanece acessível.
- A composição de IME não é interrompida por normalização ou recálculo de layout.
- Girar o dispositivo preserva o bloco ativo, a seleção e a posição de rolagem.

**Prévia:**

- A prévia paginada é somente leitura, com uma página por vez, zoom por pinça e navegação por cena.
- O botão "Editar" retorna ao bloco correspondente no modo linear.
- O canvas paginado não aceita edição no celular. Isso evita a falsa impressão de que a página US Letter está sendo editada em 360 px.

**Offline e colaboração:**

- O shell do aplicativo é servido por service worker (PWA); o documento usa persistência local e sincroniza ao reconectar.
- O modo offline não bloqueia a escrita, como no desktop.
- Limitações de armazenamento e de execução em segundo plano do navegador são informadas antes de o usuário contar com edição offline prolongada.

**Limites explícitos:**

- Não há réguas, margens arrastáveis, controle de fonte ou quebra manual no modo mobile.
- A largura exata do diálogo e a posição horizontal são conferidas na prévia e no PDF, não no modo linear.
- O modo mobile não é um aplicativo nativo e não promete os mesmos atalhos de um teclado físico.

Em 320 px, a leitura continua funcional, mas a edição pode ser limitada; a faixa oficial de edição começa em 360 px.

## 11. Design system

### 11.1 Tipografia

- **Interface:** Inter, 14 px base, 16 px em formulários, peso 400/500/600.
- **Roteiro:** Courier Prime 12 pt, sempre.
- **Números e metadados:** Inter com `font-variant-numeric: tabular-nums`.

A interface nunca usa Courier para texto de UI, e o roteiro nunca usa Inter.

### 11.2 Cores

Paleta proposta, sujeita a revisão de marca:

| Token | Valor | Uso |
|---|---|---|
| `--ink` | `#16181D` | Texto principal |
| `--muted` | `#5C6470` | Texto secundário |
| `--paper` | `#FFFFFF` | Página do roteiro |
| `--canvas` | `#F4F2ED` | Fundo do editor |
| `--line` | `#E2DED5` | Bordas e divisores |
| `--accent` | `#1F5EFF` | Ação primária e foco |
| `--danger` | `#B42318` | Erro |
| `--warning` | `#9A6700` | Aviso |
| `--success` | `#067647` | Sucesso |

Cores de colaboração são uma paleta categórica separada, testada para contraste e para daltonismo. Cada usuário recebe uma cor e um padrão de etiqueta com nome; a cor não carrega sozinha a informação.

### 11.3 Espaçamento e forma

- Escala de 4 px: 4, 8, 12, 16, 24, 32, 48.
- Raio de 6 px em controles, 10 px em cartões, 0 na página do roteiro.
- Sombra da página: `0 1px 2px rgba(0,0,0,.08), 0 8px 24px rgba(0,0,0,.06)`.
- Nenhuma borda arredondada no papel; a página é uma folha.

### 11.4 Componentes

- Botão primário, secundário, fantasma e destrutivo.
- Campo de texto, seleção, combobox e área de texto.
- Diálogo, gaveta, popover e tooltip.
- Abas, banner, toast e indicador de progresso.
- Avatar, badge de papel e cursor remoto.
- Cartão de projeto, item de cena e item de validação.

Componentes usam Radix UI como base de comportamento e Tailwind para estilo. Nenhum componente replica lógica de permissão; ele recebe a capacidade pronta do servidor.

## 12. Conteúdo e tom

- Interface em pt-BR no MVP; nomes de elementos podem aparecer em inglês ou português, conforme a preferência do roteiro.
- Voz direta, sem marketing dentro do editor.
- Erros dizem o que fazer: "O cabeçalho precisa começar com INT. ou EXT." em vez de "Cabeçalho inválido".
- Nunca culpar o usuário. "Não foi possível exportar porque a fonte não carregou. Tente novamente." não é "Erro 500".
- Datas no formato local; nos documentos técnicos, ISO 8601.
- Números de página e contagem usam separador de milhar local.

## 13. Estados vazios, carregamento e erro

| Situação | Interface |
|---|---|
| Sem projetos | Frase curta e botão "Criar projeto" |
| Projeto sem roteiros | Botão "Novo roteiro" e link para o exemplo |
| Roteiro vazio | Cursor no primeiro cabeçalho e dica de teclado |
| Carregando projeto | Esqueleto com a mesma estrutura do conteúdo |
| Carregando editor | Página em branco com barra de progresso discreta; nunca um spinner de tela inteira |
| Falha ao carregar | Mensagem, "Tentar novamente" e código de suporte |
| Exportação falhou | Motivo, ação e link para o histórico |
| Sem permissão | Explicação e ação para pedir acesso |
| Offline | Banner persistente, edição permitida |

Nenhum estado de erro mostra stack trace, caminho de arquivo, consulta SQL ou ID interno desnecessário.

## 14. Métricas de UX

| Métrica | Como medir | Meta inicial |
|---|---|---|
| Tempo até o primeiro PDF | Evento de cadastro até download | < 7 dias para 40% dos usuários |
| Tempo até a primeira cena | Cadastro até primeira edição | < 5 min |
| Uso de atalhos no desktop | Proporção de sessões com Tab/Enter | > 60% |
| Edição mobile concluída | Sessões mobile com ao menos uma edição salva | > 50% |
| Exportações concluídas | Exportações prontas / iniciadas | > 95% |
| Comentários resolvidos | Resolvidos / criados | > 70% |
| Sessões colaborativas | Projetos com 2+ editores ativos | > 30% |
| Erros de formato | Validações bloqueantes por 100 páginas | Tendência de queda |
| Abandono do editor | Sessões < 2 min | < 20% |

Métricas são agregadas e não incluem conteúdo de roteiro. Nenhum evento carrega texto, título de cena ou nome de personagem.

## 15. Pesquisa e validação

Antes do beta:

1. Teste de usabilidade com 5 roteiristas, cobrindo criação, escrita, comentário e exportação.
2. Teste com 2 duplas de roteiro em sessão colaborativa real.
3. Teste de edição e leitura em tablet e celular com 3 participantes.
4. Teste de teclado e leitor de tela com 2 usuários de tecnologia assistiva.
5. Entrevistas com 3 coordenadores de produtora sobre permissões e histórico.

Critérios para avançar:

- 4 de 5 roteiristas exportam sem ajuda;
- nenhum participante tenta ajustar margem ou fonte;
- todos entendem a diferença entre erro e aviso;
- nenhuma dupla perde texto em sessão com queda de rede simulada;
- todos os participantes de teclado completam o fluxo principal.

## 16. Critérios de aceite

1. Um usuário novo cria conta, escreve uma cena e exporta um PDF sem abrir configurações de formato.
2. O editor mostra a mesma paginação do PDF, com número de página no lugar correto.
3. No desktop, `Tab` e `Shift+Tab` percorrem todos os elementos sem sair do documento.
4. `Enter` segue a máquina de estados da seção 5.2.
5. Um diálogo quebrado entre páginas mostra `(MORE)` e `(CONT'D)` na posição correta.
6. A interface nunca oferece controle de margem, fonte ou espaçamento do roteiro.
7. Um usuário offline continua editando e vê o estado "Offline".
8. Um `viewer` vê a interface em somente leitura, sem botões de edição.
9. Um comentário sobrevive a uma edição ao redor ou fica explicitamente desanexado.
10. O fluxo principal passa em teste de teclado e em auditoria WCAG 2.2 AA.
11. Em 360 px, criar, editar, comentar e exportar funcionam no modo mobile; a prévia paginada é somente leitura.
12. Nenhum fluxo exige pagamento, assinatura ou cartão de crédito.
13. Nenhuma mensagem de erro expõe detalhe interno.

## 17. Referências

- [`../00-visao/personas-e-jornadas.md`](../00-visao/personas-e-jornadas.md)
- [`../01-requisitos/srs.md`](../01-requisitos/srs.md)
- [`../02-roteiro/normas-de-formatacao.md`](../02-roteiro/normas-de-formatacao.md)
- [`../02-roteiro/elementos-e-convencoes.md`](../02-roteiro/elementos-e-convencoes.md)
- [`../03-arquitetura/api.md`](../03-arquitetura/api.md)
- [`../05-qualidade/testes-e-aceite.md`](../05-qualidade/testes-e-aceite.md)
