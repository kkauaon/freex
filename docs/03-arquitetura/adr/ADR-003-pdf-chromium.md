# ADR-003: PDF a partir de HTML pré-paginado no Chromium

- **Status:** Aceito
- **Data:** 2026-10-23
- **Substitui:** —
- **Substituído por:** —
- **Relaciona-se com:** [`../exportacao-pdf.md`](../exportacao-pdf.md), [`../../05-qualidade/testes-e-aceite.md`](../../05-qualidade/testes-e-aceite.md)

## Contexto

O PDF é o artefato que o roteirista entrega. Ele precisa ser idêntico à prévia: mesmo número de páginas, mesmas quebras, mesma fonte, mesmas margens. Uma diferença de uma linha muda a contagem de páginas e a percepção de tempo de tela.

Há duas famílias de solução:

1. **Gerar o PDF por um motor de layout dedicado**, como PDFKit, LaTeX ou PrinceXML. O motor posiciona o texto e escreve o arquivo.
2. **Compor HTML e mandar o navegador imprimir**. O layout é calculado antes, e o navegador apenas rasteriza o que já está posicionado.

A primeira família duplica o motor de layout: a prévia no navegador usa CSS, o PDF usa outra engine. A segunda pode parecer frágil se o HTML deixar o navegador decidir quebras. O risco não está em usar o Chromium; está em deixá-lo paginar.

## Decisão

O PDF é gerado no servidor, em um worker isolado, a partir de **HTML pré-paginado**, renderizado por um **Chromium de versão fixada** via Playwright.

O fluxo é:

1. O worker lê um snapshot imutável.
2. `@freex/layout` calcula páginas, linhas e coordenadas.
3. O renderer monta um HTML com uma `section.page` por página e uma `div.line` por linha, com `left` e `top` absolutos.
4. O Chromium carrega o HTML, confirma que a fonte está disponível e imprime com tamanho de página fixo, margem zero e escala 1.
5. O PDF é verificado (fonte incorporada, número de páginas, texto extraível), enviado ao storage e registrado no banco.

Regras que tornam o resultado determinístico:

- o CSS não participa da quebra; cada linha já tem posição absoluta;
- `@page` define 8,5 × 11 pol e margem zero;
- `preferCSSPageSize: true`, `scale: 1`, sem `displayHeaderFooter`;
- JavaScript desabilitado no contexto de impressão;
- nenhum recurso externo no HTML; CSS inline e fonte local;
- a versão do Chromium, do Playwright e da fonte é registrada em `renderer_version`;
- se a fonte não carregar, o job falha com `EXPORT_FONT_ERROR`; não há fallback silencioso;
- o mesmo `document_json`, o mesmo `profile_version` e o mesmo motor são usados pela prévia e pelo PDF.

O navegador do usuário nunca é usado para gerar o PDF de entrega. Impressão pelo navegador é uma opção de conveniência, não o caminho oficial.

## Alternativas consideradas

| Alternativa | Por que foi descartada |
|---|---|
| PDFKit ou pdf-lib | Exige implementar posicionamento, quebra de linha, fontes e paginação em uma segunda engine. O layout divergiria da prévia. |
| LaTeX | Excelente tipografia, mas é outra linguagem, outra toolchain e outra fonte de divergência. O layout do roteiro é uma grade, não um problema de tipos. |
| PrinceXML | Maturidade e suporte a CSS paged media, porém é licenciado, caro e continua sendo uma engine separada da prévia. |
| `window.print()` no cliente | Depende do navegador, da impressora, das margens e das configurações do usuário. Não é reproduzível. |
| React-PDF | Boa opção para documentos componentizados, mas recria o layout em outro modelo e não garante paridade com o editor. |
| wkhtmltopdf | Projeto antigo, motor WebKit desatualizado, suporte pobre a fontes modernas e a CSS. |
| Serviço externo de PDF | Cria dependência de terceiro para o artefato principal, com custo por página e risco de privacidade. |

## Consequências

### Positivas

- Uma única composição serve prévia, editor paginado e PDF.
- O PDF tem exatamente as páginas e quebras calculadas pelo motor.
- Texto permanece selecionável e a fonte é incorporada.
- O worker é isolado; um PDF problemático não derruba a API.
- A versão fixada permite reprocessar um snapshot e obter o mesmo resultado.
- O cache por hash evita re-renderizar o mesmo conteúdo.

### Negativas

- Chromium é uma dependência pesada: imagem maior, consumo de memória e superfície de segurança.
- A versão precisa ser atualizada com cuidado; uma atualização pode mudar métricas de fonte e quebras.
- O worker exige concorrência limitada e isolamento por job.
- Tagging de PDF para acessibilidade depende da versão e não é garantido em todas as builds.
- O tempo de cold start do navegador afeta a latência da primeira exportação.

### Neutras

- O formato HTML é um detalhe do renderer; o contrato público é o snapshot mais as opções.
- A fonte é parte da versão do renderer. Trocar Courier Prime por outra fonte métrica exigiria novo perfil.

## Critérios de conformidade

1. Para o mesmo snapshot e as mesmas opções, a prévia e o PDF têm o mesmo número de páginas.
2. As quebras ocorrem nas mesmas linhas, com tolerância zero para página e 0,01 pol para posição.
3. O PDF incorpora Courier Prime e não usa fonte substituta.
4. O texto do PDF é extraível e os acentos estão corretos.
5. Nenhum recurso externo é carregado durante a impressão.
6. A versão do Chromium, do Playwright, da fonte e do perfil aparece em `renderer_version`.
7. Um job que não consegue carregar a fonte falha de forma explícita, sem entregar arquivo incorreto.
8. Um PDF de 120 páginas é gerado em p95 inferior a 15 s e nunca acima de 120 s.

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Vulnerabilidade no Chromium | Imagem mínima, execução sem rede, usuário sem privilégio, atualização mensal com regressão visual |
| Mudança de métricas após atualização | Golden PDFs, comparação de layout hash, atualização só com aprovação e novo `renderer_version` |
| Consumo de memória | Um contexto por job, limite de concorrência, timeout, limite de 300 páginas |
| Fonte não carregada | `document.fonts.load` e `document.fonts.check` antes de imprimir; falha explícita |
| Diferença entre sistemas operacionais | Worker em container Linux fixo; nenhuma renderização oficial fora dele |
| PDF com informação residual | Contexto novo por job, sem cache de página, sem acesso a outros snapshots |

## Referências

- [`../exportacao-pdf.md`](../exportacao-pdf.md)
- [`../../02-roteiro/normas-de-formatacao.md`](../../02-roteiro/normas-de-formatacao.md)
- [`../../05-qualidade/testes-e-aceite.md`](../../05-qualidade/testes-e-aceite.md)
- [`../../06-operacoes/deploy-e-observabilidade.md`](../../06-operacoes/deploy-e-observabilidade.md)
