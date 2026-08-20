# Costing update — 2026-07-27

- Workbooks processados: 12 (Guarnições, Açaí Bowls, Acompanhamentos, Carne, Hambúrgueres, Peixe, Petiscos, Pokes, Saladas, Sobremesas Caseiras, Tostas, Vegetariano)
- Blocos/fichas: 86 · linhas: 502
- Mutações aplicadas: 11 células + 4 estruturais/correções
- Estados: EXACT=351, NO_COST=16, ALIAS=37, UNMATCHED=4, NORMALIZED=26, SUBRECIPE=68

## Correções estruturais e de receita
- [Petiscos] xl/worksheets/sheet11.xml: Sopa!C5 "Abóbora": quantidade 0.04 -> 4 — REVERSÃO 2026-07-28: a interpretação de erro de escala foi revogada. As quantidades da Sopa estão corretas — a ficha é de um LOTE, não de uma dose. O custo por dose resolve-se pelo rendimento declarado em recipe-yields.json.
- [Petiscos] xl/worksheets/sheet11.xml: Sopa!C6 "Batata branca": quantidade 0.05 -> 5 — REVERSÃO 2026-07-28: a interpretação de erro de escala foi revogada. As quantidades da Sopa estão corretas — a ficha é de um LOTE, não de uma dose. O custo por dose resolve-se pelo rendimento declarado em recipe-yields.json.
- [Petiscos] xl/worksheets/sheet11.xml: Sopa!C7 "Cebola branca": quantidade 0.02 -> 2 — REVERSÃO 2026-07-28: a interpretação de erro de escala foi revogada. As quantidades da Sopa estão corretas — a ficha é de um LOTE, não de uma dose. O custo por dose resolve-se pelo rendimento declarado em recipe-yields.json.
- [Petiscos] xl/worksheets/sheet11.xml: Sopa!C8 "Cenoura": quantidade 0.05 -> 5 — REVERSÃO 2026-07-28: a interpretação de erro de escala foi revogada. As quantidades da Sopa estão corretas — a ficha é de um LOTE, não de uma dose. O custo por dose resolve-se pelo rendimento declarado em recipe-yields.json.

## Por resolver
- Guarnições/Húmmus · "Tahine" [UNMATCHED]
- Guarnições/Molho Ponzu · "Laranja" [UNMATCHED]
- Pokes/Fresh "Ribeira" · "Milho crocante" [UNMATCHED]
- Pokes/Cream "Coxos" · "Molho teryaki" [UNMATCHED]

## Avisos
- Guarnições/Cebola Caramelizada · "Molho soja": UNIT_WARNING
- Guarnições/Quinoa.Grão.Tofu · "Molho soja": UNIT_WARNING
- Guarnições/Croutons · "Pão tosta": UNIT_WARNING
- Guarnições/Granola · "Côco laminado": MISSING_QTY
- Guarnições/Molho Ponzu · "Molho soja": UNIT_WARNING
- Carne/Bife à Ribbaí · "Ovo": UNIT_WARNING
- Hambúrgueres/Ribbaí · "Pão hambúrguer": UNIT_WARNING
- Hambúrgueres/BBK · "Pão hambúrguer": UNIT_WARNING
- Hambúrgueres/Queijo e Bacon · "Pão hambúrguer": UNIT_WARNING
- Peixe/Bife Atum · "Ovo": UNIT_WARNING
- Peixe/Camarão à Brás · "Ovo": UNIT_WARNING
- Petiscos/Camarão ao Alho · "Pão Mafra": UNIT_WARNING
- Petiscos/Ceviche · "Molho ceviche": MISSING_QTY
- Petiscos/Choco Frito · "Farinha s/ fermento": MISSING_QTY
- Petiscos/Choco Frito · "Limão": MISSING_QTY
- Petiscos/Ovos Rotos · "Ovo": UNIT_WARNING
- Petiscos/Croquete · "Croquete cong": UNIT_WARNING
- Petiscos/Pica-Pau · "Pão Mafra": UNIT_WARNING
- Petiscos/Prego de Novilho · "Pão bolinha": UNIT_WARNING
- Petiscos/Prego de Atum · "Bolo do caco": UNIT_WARNING
- Saladas/Burrata · "Burrata": UNIT_WARNING
- Sobremesas Caseiras/Mousse#1 · "Ovos": UNIT_WARNING
- Sobremesas Caseiras/Bolo Banana#1 · "Ovos": UNIT_WARNING
- Sobremesas Caseiras/Cheesecake#1 · "Ovos": UNIT_WARNING
- Tostas/Torrada · "Pão tosta": UNIT_WARNING
- Tostas/Mista · "Pão tosta": UNIT_WARNING
- Tostas/Atum · "Pão tosta": UNIT_WARNING
- Tostas/Frango · "Pão tosta": UNIT_WARNING
- Tostas/Vegetariana · "Pão tosta": UNIT_WARNING
- Tostas/Salmão · "Pão tosta": UNIT_WARNING
- Tostas/Guacamole · "Pão tosta": UNIT_WARNING
- Tostas/Guacamole · "Ovo": UNIT_WARNING
- Vegetariano/Hamburguer Veggie · "Pão hamburguer": UNIT_WARNING
- Vegetariano/Hamburguer Veggie · "Hamburguer vegetariano": UNIT_WARNING

## Custo Mercadoria s/Iva por bloco

| Nó | Papel | Custo | Venda s/IVA | Food cost |
| --- | --- | ---: | ---: | ---: |
| Guarnições/Manteiga A&E | garnish | 2.9357 € | — | — |
| Guarnições/Molho DG | garnish | 1.2136 € | — | — |
| Guarnições/Molho Tártaro | garnish | 2.4620 € | — | — |
| Guarnições/Puré Bat Doce | garnish | 0.8436 € | — | — |
| Guarnições/Guacamole | garnish | 4.1494 € | — | — |
| Guarnições/Pico de Gallo | garnish | 2.0849 € | — | — |
| Guarnições/Cebola Caramelizada | garnish | 1.0749 € | — | — |
| Guarnições/Cogumelos Assados | garnish | 3.8483 € | — | — |
| Guarnições/Quinoa.Grão.Tofu | garnish | 4.2567 € | — | — |
| Guarnições/Maionese Caju | garnish | 5.0266 € | — | — |
| Guarnições/Pasta atum | garnish | 4.4817 € | — | — |
| Guarnições/Pasta Frango | garnish | 4.0283 € | — | — |
| Guarnições/Húmmus | garnish | 1.2821 € | — | — |
| Guarnições/Granola Salgada | garnish | 2.3900 € | — | — |
| Guarnições/Molho Figo | garnish | 3.9759 € | — | — |
| Guarnições/Croutons | garnish | 0.1686 € | — | — |
| Guarnições/Granola | garnish | 7.2918 € | — | — |
| Guarnições/Choco Frito | garnish | 2.5710 € | — | — |
| Guarnições/Molho Ponzu | garnish | 1.9360 € | — | — |
| Guarnições/Arroz Sushi | garnish | 1.1294 € | — | — |
| Guarnições/Maionese Picante | garnish | 4.5110 € | — | — |
| Guarnições/Sú | garnish | 1.2687 € | — | — |
| Guarnições/Molho Ceviche | garnish | 2.0480 € | — | — |
| Guarnições/Praline Amendoim | garnish | 2.2130 € | — | — |
| Guarnições/Compota Frutos Vermelhos | garnish | 4.3686 € | — | — |
| Açaí Bowls/9 Combinações | menu | 1.8552 € | 9.7345 € | 19.1% |
| Açaí Bowls/9 Combinações#1 | menu | 1.6825 € | 9.7345 € | 17.3% |
| Açaí Bowls/9 Combinações#2 | menu | 1.7708 € | 9.7345 € | 18.2% |
| Açaí Bowls/9 Combinações#3 | menu | 2.0582 € | 9.7345 € | 21.1% |
| Açaí Bowls/9 Combinações#4 | menu | 1.8855 € | 9.7345 € | 19.4% |
| Açaí Bowls/9 Combinações#5 | menu | 1.9738 € | 9.7345 € | 20.3% |
| Açaí Bowls/9 Combinações#6 | menu | 1.9302 € | 9.7345 € | 19.8% |
| Açaí Bowls/9 Combinações#7 | menu | 1.7575 € | 9.7345 € | 18.1% |
| Açaí Bowls/9 Combinações#8 | menu | 1.8458 € | 9.7345 € | 19.0% |
| Acompanhamentos/Arroz | side | 0.0852 € | 3.0973 € | 2.7% |
| Acompanhamentos/Arroz#1 | batch | 0.7097 € | — | — |
| Acompanhamentos/Feijão | side | 0.6649 € | 3.0973 € | 21.5% |
| Acompanhamentos/Feijão#1 | batch | 2.7705 € | — | — |
| Acompanhamentos/Salada | side | 0.4044 € | 3.0973 € | 13.1% |
| Acompanhamentos/Mix Legumes | side | 0.5299 € | 3.0973 € | 17.1% |
| Acompanhamentos/Batatas | side | 0.5528 € | 3.0973 € | 17.8% |
| Carne/Bife à Ribbaí | menu | 2.9149 € | 14.1593 € | 20.6% |
| Carne/Picanha | menu | 5.6977 € | 18.5841 € | 30.7% |
| Carne/Lombo | menu | 5.4042 € | 21.2389 € | 25.4% |
| Carne/Perna Frango | menu | 2.1690 € | 12.3894 € | 17.5% |
| Hambúrgueres/Ribbaí | menu | 2.7208 € | 15.4867 € | 17.6% |
| Hambúrgueres/BBK | menu | 2.8468 € | 14.6018 € | 19.5% |
| Hambúrgueres/Queijo e Bacon | menu | 2.7762 € | 14.6018 € | 19.0% |
| Peixe/Bife Atum | menu | 3.1721 € | 15.0442 € | 21.1% |
| Peixe/Choco Frito | menu | 1.8493 € | 14.1593 € | 13.1% |
| Peixe/Camarão à Brás | menu | 2.9606 € | 12.3894 € | 23.9% |
| Peixe/Lombo de Salmão | menu | 2.2775 € | 13.2743 € | 17.2% |
| Petiscos/Batatas (dose) | menu | 0.5528 € | 3.0973 € | 17.8% |
| Petiscos/Camarão ao Alho | menu | 1.6579 € | 10.6195 € | 15.6% |
| Petiscos/Ceviche | menu | 1.6632 € | 13.2743 € | 12.5% |
| Petiscos/Choco Frito | menu | 0.6395 € | 11.5044 € | 5.6% |
| Petiscos/Ovos Rotos | menu | 1.5913 € | 10.6195 € | 15.0% |
| Petiscos/Croquete | menu | 0.3394 € | 2.6549 € | 12.8% |
| Petiscos/Pica-Pau | menu | 3.2603 € | 18.5841 € | 17.5% |
| Petiscos/Prego de Novilho | menu | 2.8424 € | 10.6195 € | 26.8% |
| Petiscos/Prego de Atum | menu | 4.0618 € | 10.6195 € | 38.2% |
| Petiscos/Nachos | menu | 2.0921 € | 7.0796 € | 29.6% |
| Petiscos/Sopa | menu | 20.5753 € | 3.0973 € | 13.3% |
| Pokes/Fresh "Ribeira" | menu | 2.0760 € | 14.1593 € | 14.7% |
| Pokes/Spicy "Cave" | menu | 2.5090 € | 14.1593 € | 17.7% |
| Pokes/Veggie "Reef" | menu | 1.8554 € | 14.1593 € | 13.1% |
| Pokes/Cream "Coxos" | menu | 2.1506 € | 14.1593 € | 15.2% |
| Saladas/Burrata | menu | 2.8991 € | 13.2743 € | 21.8% |
| Saladas/Caesar | menu | 2.6484 € | 14.1593 € | 18.7% |
| Saladas/Camarão | menu | 2.7098 € | 15.0442 € | 18.0% |
| Sobremesas Caseiras/Mousse | menu | 0.4486 € | 5.3097 € | 8.4% |
| Sobremesas Caseiras/Mousse#1 | batch | 6.2849 € | 5.3097 € | 118.4% |
| Sobremesas Caseiras/Bolo Banana | menu | 0.3250 € | 4.4248 € | 7.3% |
| Sobremesas Caseiras/Bolo Banana#1 | batch | 3.2149 € | — | — |
| Sobremesas Caseiras/Cheesecake | menu | 0.7013 € | 5.3097 € | 13.2% |
| Sobremesas Caseiras/Cheesecake#1 | batch | 6.3191 € | 5.3097 € | 119.0% |
| Sobremesas Caseiras/Fruta | menu | 0.0000 € | 4.4248 € | 0.0% |
| Tostas/Torrada | menu | 0.5524 € | 3.5398 € | 15.6% |
| Tostas/Mista | menu | 1.0498 € | 7.5221 € | 14.0% |
| Tostas/Atum | menu | 1.3808 € | 8.4071 € | 16.4% |
| Tostas/Frango | menu | 1.3154 € | 8.4071 € | 15.6% |
| Tostas/Vegetariana | menu | 1.1248 € | 8.4071 € | 13.4% |
| Tostas/Salmão | menu | 3.2729 € | 10.6195 € | 30.8% |
| Tostas/Guacamole | menu | 1.4030 € | 8.8496 € | 15.9% |
| Vegetariano/Salada Vegan | menu | 2.1504 € | 12.3894 € | 17.4% |
| Vegetariano/Hamburguer Veggie | menu | 2.0976 € | 14.1593 € | 14.8% |
