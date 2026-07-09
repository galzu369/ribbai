## Conversão das Embalagens Take Away de caixas para sacos

- **Data da alteração**: 07-07-2026  
- **Artigos abrangidos (Embalagens Take Away)**:
  - `CONS-TAKEAWAY-SOUP-BOX-LID` – Box de Sopas + Tampas  
  - `CONS-TAKEAWAY-BURGER-BOX` – Box grande 1980ml  
  - `CONS-TAKEAWAY-TOAST-BOX` – Box Media 1350  
  - `CONS-TAKEAWAY-BOX-750ML` – Box Pequena 750ml  
  - `CONS-TAKEAWAY-ROUND-BOX-LID` – Box POKE + Tampas  

### Motivo

- Alinhar a unidade de trabalho com a **embalagem física utilizada em operação** (sacos por caixa), tal como foi feito para os copos Take Away.
- Permitir **contagens físicas mais granulares** (em sacos) mantendo, nos relatórios, a possibilidade de analisar também em caixas através de uma conversão padronizada.

### Nova configuração canónica

- Ficheiro de referência: `config/inventory-weekly-master-list.json`.
- Para cada SKU:

| SKU | Nome | Unidade base | caseUnit | packsPerCase (sacos/caixa) |
| --- | --- | --- | --- | ---: |
| CONS-TAKEAWAY-SOUP-BOX-LID | Box de Sopas + Tampas | saco | caixa | 15 |
| CONS-TAKEAWAY-BURGER-BOX | Box grande 1980ml | saco | caixa | 4 |
| CONS-TAKEAWAY-TOAST-BOX | Box Media 1350 | saco | caixa | 4 |
| CONS-TAKEAWAY-BOX-750ML | Box Pequena 750ml | saco | caixa | 12 |
| CONS-TAKEAWAY-ROUND-BOX-LID | Box POKE + Tampas | saco | caixa | 9 |

### Impacto nos processos

- **Inventário semanal / folhas de contagem**
  - O gerador `scripts/generate-weekly-inventory-count-sheet-pdf.mjs` passou a ler a nova master list e a folha `2026-06-12-inventario-semanal-contagem-fisica.html` foi regenerada.
  - Nas secções de \"Take Away\" das folhas mensais (Junho–Dezembro 2026), os itens de Box aparecem agora como:
    - `Box de Sopas + Tampas (saco)`
    - `Box grande 1980ml (saco)`
    - `Box Media 1350 (saco)`
    - `Box Pequena 750ml (saco)`
    - `Box POKE + Tampas (saco)`.

- **Base de dados e normalização**
  - O script `scripts/normalize-inventory-items-for-weekly-count.mjs` continuará a alinhar `inventory_items.unit` com o valor definido na master list (`saco`) para estes SKUs.
  - A conversão para caixas em relatórios é feita a partir de `packsPerCase`, usando:
    - `caixas = sacos / packsPerCase`
    - `sacos = caixas × packsPerCase` (para interpretação de históricos antigos em caixas).

- **Histórico anterior a 07-07-2026**
  - Relatórios e JSONs de Junho 2026 mantêm-se como fotografia em **caixas**; não houve reprocessamento retrospetivo de quantidades.
  - A partir desta data, novos relatórios e contagens devem ser efetuados e apresentados em **sacos**, com conversão para caixas apenas como informação derivada quando necessário.

### Orientações operacionais

- **Contagem física**:
  - Contar sempre **sacos** para estes artigos.
  - Registar a contagem nos formulários RIBBAI OPS utilizando as linhas já atualizadas com a unidade `(saco)`.

- **Leitura de relatórios**:
  - Quando um relatório referir apenas sacos, a conversão aproximada em caixas é:
    - Box de Sopas + Tampas: sacos ÷ 15  
    - Box grande 1980ml: sacos ÷ 4  
    - Box Media 1350: sacos ÷ 4  
    - Box Pequena 750ml: sacos ÷ 12  
    - Box POKE + Tampas: sacos ÷ 6  

