# Kitchen costing — arquitetura e regras

## Cadeia de custeio

```text
PREÇÁRIO (preço compra s/IVA)
    ↓
INGREDIENTES
    ↓
GUARNIÇÕES / SUBRECEITAS / LOTES
    ↓
ITENS DO MENU
    ↓
CUSTO MERCADORIA S/IVA  +  PREÇO VENDA S/IVA
    ↓
FOOD COST %  ·  MARGEM BRUTA €/%  ·  MARKUP
    ↓
MENU FINANCIAL HEALTH
```

## Fontes de verdade

| O quê | Fonte |
| --- | --- |
| Matérias-primas compradas | `price-lists/Preçário.xlsx`, folha `Preçário` — colunas **E (Preço s/IVA)** e **F (IVA)**, mais unidade e fornecedor |
| Guarnições/subreceitas/lotes | célula `Custo Mercadoria s/Iva` da respetiva ficha técnica |
| Item final do menu | soma dos custos dos ingredientes + subreceitas da sua ficha |
| Nome comercial, categoria e preço de venda | `menu/menu-2026-07.json` (transcrito do menu físico em vigor) |

**A coluna G do Preçário (Preço c/IVA) nunca é usada como custo** — é
formula-driven (`=E+(E×F)`) e serve apenas de informação. Todo o custeio
interno é em EUR **sem IVA**: `Custo = Quantidade × Preço s/IVA`.

**IVA de venda:** 13% (taxa de restauração), conforme as fórmulas
`Preço Venda s/Iva = Preço c/IVA ÷ 1,13` que já existiam nas próprias fichas.
O IVA de compra dos ingredientes é informação separada e nunca entra no custo.

## Workbooks e papéis dos blocos

O sistema processa 12 workbooks. Uma folha pode conter vários **blocos** de
ficha lado a lado (detetados pela célula "Ingredientes"), cada um com o seu
identificador `Workbook/Folha` ou `Workbook/Folha#N`:

| Papel | Onde | Significado |
| --- | --- | --- |
| `garnish` | Guarnições (25 folhas) | subreceita clássica |
| `side` | Acompanhamentos, bloco 0 | dose vendável **e** subreceita de outros pratos |
| `batch` | bloco ≥1 de Acompanhamentos e Sobremesas | receita interna por lote (1 kg, 15 doses…) |
| `menu` | restantes | item final; nunca é alvo de subreceita |

**Regra dose/lote:** uma referência vinda de *fora* da folha resolve para a
dose (ex.: "Arroz (dose)" no Bife à Ribbaí = 1 dose); uma referência *dentro*
da própria folha resolve para o lote (ex.: "Arroz (dose)" 0,12 no bloco
esquerdo do Arroz = 0,12 kg do lote de 1 kg). É isto que permite ter a dose e
a receita-mãe na mesma folha sem dupla contagem.

## Mecanismo de linking (decisão de 2026-07-27)

Os preços são **valores geridos por script**, não links externos do Excel.
O workbook de Guarnições tinha links `[1]Preçário!$E$linha` que apontavam a
linhas fixas; quando o Preçário foi reordenado, todos passaram a apontar a
artigos errados (ex.: Manteiga a custar €23,49/kg = preço do Lombo novilho).
Por isso `scripts/kitchen/update-costing.ts` resolve cada ingrediente **por
nome** e escreve o valor em D (Preço s/IVA) e E (IVA); os external links foram
removidos de todos os workbooks. Propagar preços novos = voltar a correr o script.

As fórmulas do template são sempre preservadas:

- `F = D+(D×E)` (Preço c/IVA) — nunca preenchida à mão;
- `G = C×D` (Custo da linha);
- `Custo Mercadoria s/Iva = SUM(G…)`;
- `Preço Venda s/Iva = Preço c/IVA ÷ 1,13` e `% food cost` — só o valor em cache é recalculado.

**Subreceitas no mesmo workbook** recebem uma fórmula Excel real
(ex.: `='Sú'!G9`). **Entre workbooks** o valor é gerido pelo script — não se
criam external links, precisamente pelo problema histórico acima.

## Correções de receita

Desde 2026-08-20 o Chefe edita **diretamente** as fichas em
`technical-sheets/` (nomes de ingredientes e quantidades). Os arrays
`RECIPE_CORRECTIONS` e `QUANTITY_CORRECTIONS` em `scripts/kitchen/lib/config.ts`
ficam vazios e só se usam se for preciso forçar uma correção auditável sem
tocar no xlsx.

Os preços de compra (colunas D/E) continuam a ser geridos pelo script a partir
do Preçário — nunca se preenchem à mão.

## Matching em camadas (sem fuzzy matching)

1. **NO-COST** — linhas com `-` na coluna de preço ou de custo (Água, Óleo AR) ficam intactas;
2. **SUBRECIPE** — o nome corresponde a uma ficha de guarnição/dose/lote (regra dose/lote acima), excluindo auto-referências;
3. **EXACT** — nome exatamente igual a um artigo do Preçário;
4. **ALIAS** — entrada validada em `mappings/ingredient-aliases.json` (pode apontar a um artigo **ou** a uma subreceita);
5. **NORMALIZED** — igual após normalização não semântica (acentos, maiúsculas, espaços, conectores de/da/do/em) **com candidato único**; vários candidatos ⇒ `AMBIGUOUS`;
6. **UNMATCHED/AMBIGUOUS/PENDING** — a linha **não é alterada** e aparece no relatório para decisão humana. Zero preços inventados.

### Aliases

- `mappings/ingredient-aliases.json` — ingrediente → artigo/subreceita.
  `{ ingredient, ficha (null = global), article, confirmed, note }`; entrada com
  `ficha` ganha à global; `confirmed: false` ⇒ PENDING (linha intocada).
- `mappings/menu-item-aliases.json` — nome do menu → nó de ficha técnica
  (`Workbook/Folha`), para quando o nome comercial não é literalmente igual ao
  título da ficha.

## Alergénios e Gluten Free

Perfis por ingrediente em `mappings/ingredient-allergens.json` (14 alergénios
UE). `status: "confirmed"` = composição inequívoca do próprio ingrediente;
`status: "review"` = produto processado por validar com o rótulo/fornecedor —
o perfil da ficha fica **incompleto** até validação. Ingrediente ausente do
ficheiro = `ALLERGEN DATA REQUIRED`. Propagação automática ingrediente →
subreceita → item de menu, sem duplicados.

Estados GF: «Contém glúten», «GF✱ — sem ingredientes com glúten identificados»
(perfil completo e zero fontes de glúten; **sempre** sujeito a validação de
contaminação cruzada antes de comunicar ao cliente) e «Indeterminado» (perfil
incompleto — nunca classificar GF por omissão).

## Indicadores financeiros

```text
Food Cost %                  = Custo Mercadoria s/IVA ÷ Preço Venda s/IVA
Margem Bruta sobre Mercadoria = Preço Venda s/IVA − Custo Mercadoria s/IVA
Margem Bruta %               = Margem Bruta € ÷ Preço Venda s/IVA
Markup                       = Preço Venda s/IVA ÷ Custo Mercadoria s/IVA
```

**Terminologia:** estas métricas medem a economia do menu. Não são lucro
líquido, rentabilidade líquida, resultado operacional nem EBITDA — não incluem
mão de obra, energia, renda, comissões, desperdício, amortizações ou impostos.
A *Margem de Contribuição Simplificada sobre Mercadoria* coincide nesta fase
com a Margem Bruta €, porque ainda não há outros custos variáveis integrados.

**Escala analítica de food cost** (instrumento de análise, **não** política
oficial RIBBAÍ): Excelente < 25% · Controlado 25–30% · Atenção 30–35% ·
Elevado > 35%.

**Menu Financial Health** é um *Internal Analytical Health Score*: média
ponderada de cobertura de costing (30%), food cost na banda ≤35% (25%),
consistência da margem bruta ≥65% (25%), cobertura de preços (10%) e completude
dos dados (10%). Não é métrica contabilística.

## Atualizar no futuro

1. Substituir/editar `price-lists/Preçário.xlsx` e/ou as fichas em `technical-sheets/`
   (o Chefe edita ingredientes e quantidades nas fichas; preços de compra só no Preçário);
2. Atualizar `menu/menu-<ano>-<mês>.json` se o menu ou os preços mudarem (e apontar `MENU_JSON_PATH` em `lib/config.ts` para o ficheiro novo);
3. `npm run kitchen:costing:check` (dry-run) e rever;
4. `npm run kitchen:costing:update` — sincroniza fichas **e** regenera HTML + PDF do relatório;
5. (opcional) `npm run kitchen:report:fit` se as fichas mudarem de tamanho tipográfico.

## Validação

Cada `--apply` valida em memória **antes** de escrever: tokens de erro
(`#REF!`, `#VALUE!`, `#DIV/0!`, `#NAME?`, `#N/A`), estrutura (sem restos de
external links/calcChain), validação financeira (F=D+(D×E), G=C×D, total=ΣG,
venda s/IVA = c/IVA ÷ 1,13, food cost = custo ÷ venda s/IVA, D de subreceita =
Custo Mercadoria da origem) e idempotência (2ª passagem = 0 mutações). Se algo
falha, **nenhum** ficheiro é alterado. Originais intactos em `archive/*_SOURCE.xlsx`.

O gerador do relatório valida ainda: identidade `food cost % + margem bruta % = 100%`,
markup, herança de alergénios, coerência GF, âncoras HTML e ausência de
terminologia financeira indevida em rótulos.

## Receitas de lote e rendimento (yield)

Uma ficha pode representar um **lote** e não uma dose. Nesse caso o
`Custo Mercadoria s/Iva` da folha é o custo do lote inteiro, e o custo que entra
no menu é o **custo por dose**:

```text
INGREDIENTES → BATCH COST → ÷ RENDIMENTO → PORTION COST → CUSTO DO ITEM DE MENU
```

O rendimento declara-se em `mappings/recipe-yields.json`
(`node`, `yieldQuantity`, `yieldUnit`). Quando a entrada tem `sheetCells`, o
pipeline materializa o rendimento e o custo por dose na própria folha e faz o
`% food cost` da folha passar a usar o custo por dose — a fórmula referencia a
célula do rendimento, sem hardcode do divisor.

Uma ficha com rendimento cede o **custo unitário** a quem a consome como
subreceita. Food cost, margem bruta e markup usam sempre o custo por dose.

**Não declarar rendimento** em fichas que já separam dose e lote em dois blocos
(Acompanhamentos, Sobremesas): nessas a dose já consome uma fração do lote pela
quantidade da linha, e declarar rendimento dividiria o custo duas vezes.

Exemplo atual: `Petiscos/Sopa` — lote de 20,58 € que rende 50 doses ⇒ 0,41 €/dose.

## Relatório executivo — V1, V2, V3 e V3.1

**A versão recomendada para uso operacional é a V3.1.**

A V3.1 mantém a tipografia da V3 e acrescenta duas garantias de paginação:

- **cada ficha técnica cabe inteira numa página** — 86/86, nenhuma dividida, sem
  «continuação». As fichas de item de menu começam sempre em página nova; as
  guarnições podem partilhar página desde que ambas caibam completas;
- **os rankings enchem a página** (98% e 91% de ocupação, contra 66% na V3),
  porque passaram de 3 partes de 16 barras a 2 partes de 23 com linhas mais altas.

O ajuste das fichas é **individual e automático**: `npm run kitchen:report:fit`
mede cada ficha no browser em modo de impressão e, só nas que não cabem, aplica
o maior perfil que serve. O espaçamento (`--ficha-density`) é apertado primeiro
e mais fundo; a tipografia (`--ficha-scale`) só desce depois e nunca abaixo de
0,88. Resultado atual: **81 fichas no tamanho base**, 4 apenas com espaçamento
apertado e letra intacta a 14px, e só a Granola (16 ingredientes) a 94% —
13,2px, acima do mínimo de 12px. As escalas ficam em
`mappings/ficha-layout-scales.json`, que é um **artefacto de layout, não um dado
de negócio**, e é regenerado sempre que as fichas mudarem.

```bash
npm run kitchen:report:fit        # mede e ajusta as fichas (regenera o HTML)
npm run kitchen:report:tight:pdf  # exporta a V3.1 para PDF
```

Se acrescentares ingredientes a uma ficha, corre `:fit` antes de exportar o PDF
— caso contrário essa ficha pode voltar a exceder a página.

## Histórico das versões

O relatório existe em três variantes de apresentação sobre **exatamente os mesmos
dados**. Não há dados duplicados: `buildModel()` produz um único modelo e só a
camada de renderização muda (`LayoutName = "portrait" | "landscape" | "readable"`).

| | V1 | V2 | V3 | V3.1 |
| --- | --- | --- | --- | --- |
| Formato | A4 vertical | A4 horizontal | A4 horizontal | A4 horizontal |
| Corpo (print) | 10,8 px | 12,5 px | 14 px | 14 px |
| Tabelas | 12,3 px | 12,5 px | 13,25 px | 13,25 px |
| Fichas técnicas | 12,3 px | 12,5 px | 14 px | 14 px |
| Fichas divididas | várias | várias | 2 | **0** |
| Ocupação dos rankings | — | 66% | 66% | **98% / 91%** |
| Páginas | 122 | 108 | 140 | 140 |
| Sufixo | — | `-v2-landscape` | `-v3-landscape-readable` | `-v3-1-landscape-readable` |

```bash
npm run kitchen:report                  # V1 HTML     npm run kitchen:report:pdf
npm run kitchen:report:landscape        # V2 HTML     …:landscape:pdf
npm run kitchen:report:readable         # V3 HTML     …:readable:pdf
npm run kitchen:report:tight            # V3.1 HTML   …:tight:pdf
```

As três versões devem ser regeneradas em conjunto sempre que o Preçário, o menu
ou as fichas mudarem — caso contrário divergem. O PDF usa `preferCSSPageSize` e
`scale: 1`: a orientação vem do `@page` do próprio CSS e o documento **nunca** é
encolhido para caber.

### O que a V3 muda além do tamanho da letra

Aumentar a fonte não chegava: na V2 os dois gráficos de ranking mediam 1,5× a
altura de uma página e tinham `break-inside: avoid`, o que os empurrava por
inteiro para a página seguinte e deixava a anterior quase vazia. A V3 corrige a
paginação na origem:

- **rankings longos divididos em partes numeradas** (`longRanking()`), com a
  mesma escala em todas as partes e a legenda repetida — cada parte cabe numa página;
- **quebras seletivas**: `break-inside: avoid` só em elementos que cabem numa
  página; fichas com mais de 8 ingredientes levam `.ficha-long` e podem partir de
  forma controlada, com cabeçalho e KPIs colados ao início;
- **espaçamento apertado em vez de letra menor**: margens de página 9 mm,
  `section` a 30 px, padding das tabelas largas a 4 px;
- **rótulos de coluna abreviados** só na V3 (`PVP c/IVA`, `FC %`), explicados no
  texto introdutório da secção — nenhuma coluna foi removida;
- contraste ligeiramente reforçado em `--muted` e `--ink2`.

O perfil tipográfico foi escolhido por teste progressivo: três perfis (A 13,5px,
B 13,75px, C 14px) foram gerados e validados; ficou o **C**, o maior sem
overflow, clipping ou quebras incorretas. Os perfis vivem em `TYPO_PROFILES`
(`scripts/kitchen/lib/report-html.ts`) e podem ser trocados com
`KITCHEN_TYPO=A npm run kitchen:report:readable`.

## Correções de dados

Correções ao source validadas pelo utilizador são **declaradas em código**, não
editadas à mão no xlsx — assim ficam auditáveis, idempotentes e sobrevivem a um
restauro de backup:

- `RECIPE_CORRECTIONS` — substituição de um ingrediente (verifica o nome atual antes de escrever);
- `QUANTITY_CORRECTIONS` — correção de quantidade (verifica o nome do ingrediente na coluna B antes de escrever na coluna C).

Ambas em `scripts/kitchen/lib/config.ts`. Cada correção tem `from`, `to` e nota
com a origem da decisão. O registo de impacto fica em `audit/`.

Deteção de possíveis erros de escala: `npm run kitchen:anomalies` compara cada
quantidade com a mediana do mesmo artigo em fichas da mesma classe (receitas-mãe
vs doses) e sinaliza linhas que dominam o custo de um prato. **Nunca corrige
nada** — produz `reports/quantity-anomalies.md` para revisão humana.

## Portabilidade (2026-07-30)

O sistema corre em qualquer computador Windows onde a pasta `RIBBAI` seja
copiada por inteiro — outro utilizador, outro disco, outro nome de pasta.

**Marcador de raiz.** `.ribbai-root`, na raiz do projeto. `lib/project-root.ts`
sobe na árvore a partir do ficheiro em execução (`process.argv[1]`) e só depois
do cwd, e resolve tudo a partir daí. É esta ordem que faz o duplo clique
funcionar: o cwd pode ser qualquer coisa, mas o binário está sempre dentro do
projeto. `lib/project-root.mjs` é a mesma deteção para os scripts `.mjs`.

**Configuração.** `config/kitchen-costing.json`, com caminhos **sempre
relativos**. O motor recusa arrancar se algum for absoluto.

**Runtime portátil.** `npm run kitchen:runtime:build` empacota o motor num único
CommonJS (~215 KB, sem dependências) e `npm run kitchen:runtime:node` obtém um
`node.exe` verificado contra o SHASUMS256 oficial. Assim o computador do Chefe
não precisa de Node, npm, `node_modules` nem tsx. Ambos são gerados e estão em
`.gitignore` — viajam na cópia da pasta, não no repositório. **Depois de alterar
o motor é preciso reconstruir o bundle**, ou o launcher corre a versão antiga.

**Launchers** (raiz do projeto, duplo clique):

| Ficheiro | O que faz |
| --- | --- |
| `ATUALIZAR-FICHAS-TECNICAS.cmd` | sincroniza (`--apply`) |
| `VERIFICAR-FICHAS-TECNICAS.cmd` | dry-run, não altera nada |
| `INSTALAR-SISTEMA-COZINHA.cmd` | health check de instalação |

**Segurança da escrita.** Antes de `--apply`: deteção de workbooks abertos no
Excel (sentinela `~$*.xlsx` e teste de escrita) — se algum estiver aberto, aborta
sem tocar em nada. Depois: backup datado em `backups/price-sync/<timestamp>/`
com manifesto SHA-256, e rollback dos ficheiros já escritos se uma escrita falhar
a meio. As validações financeira, estrutural e de idempotência continuam a correr
**em memória antes** da primeira escrita.

Documentação de utilização: `documentation/GUIA-CHEFE-COZINHA.md` (para quem usa)
e `documentation/INSTALLATION-GUIDE.md` (para quem transfere e mantém).

## Pendentes conhecidos (2026-07-28)

**Ingredientes sem artigo no Preçário** (custo subavaliado nas fichas afetadas):
`Tahine` (Húmmus), `Laranja` (Molho Ponzu), `Milho crocante` (Fresh "Ribeira"),
`Molho teryaki` (Cream "Coxos").

**Quantidades em falta nas fichas:** `Côco laminado` (Granola), `Molho ceviche`
(Ceviche), `Farinha s/ fermento` e `Limão` (Choco Frito — Petiscos).

**`Sobremesas/Fruta da Época`** — ficha sem ingredientes (custo 0).

**Cobertura de alergénios 17%** — a maioria das fichas tem pelo menos um
ingrediente processado por validar com o fornecedor. Resolver validando
rótulos e mudando `status` para `confirmed` em `ingredient-allergens.json`.
