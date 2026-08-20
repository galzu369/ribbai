# Potential quantity / unit anomalies

Gerado em 2026-07-27 por `npm run kitchen:anomalies`.

**Nada nesta lista foi corrigido.** São sinais para revisão humana: uma quantidade fora de escala relativamente a outras fichas, ou uma linha que domina o custo de um prato. Um alerta não é prova de erro — algumas quantidades elevadas são legítimas (ex.: o ingrediente principal de um prato).

## Potential batch / yield costing issues

Fichas de item de menu que podem representar um **lote** e estar a ser custeadas como uma dose. Resolve-se declarando o rendimento em `mappings/recipe-yields.json` (como já foi feito para a Sopa), não alterando quantidades.

Nenhuma ficha sinalizada.

Fichas com rendimento já declarado (excluídas desta lista): `Petiscos/Sopa`.

## Fichas com food cost implausível (> 50%)

Nenhuma.

## Linhas com quantidade potencialmente fora de escala

| Ficha | Ingrediente | Célula | Quantidade | Custo da linha | Razão do alerta | Confiança |
| --- | --- | --- | ---: | ---: | --- | --- |
| Guarnições/Molho Figo | Azeite | C7 | 0,569 | 1,70 € | 0,569 é 45× a mediana deste artigo noutras 12 receitas-mãe (0,0128) | alta |
| Guarnições/Maionese Caju | Azeite | C9 | 0,27 | 0,80 € | 0,27 é 21× a mediana deste artigo noutras 12 receitas-mãe (0,0128) | alta |
| Guarnições/Manteiga A&E | Manteiga | C5 | 0,649 | 1,72 € | 0,649 é 11× a mediana deste artigo noutras 5 receitas-mãe (0,06) | média |
| Guarnições/Húmmus | Azeite | C6 | 0,198 | 0,59 € | 0,198 é 16× a mediana deste artigo noutras 12 receitas-mãe (0,0128) | média |
| Sobremesas Caseiras/Mousse#1 | Manteiga | J6 | 0,4 | 1,06 € | 0,4 é 7× a mediana deste artigo noutras 5 receitas-mãe (0,06) | baixa |
| Guarnições/Cebola Caramelizada | Cebola | C5 | 0,75 | 0,60 € | 0,75 é 7× a mediana deste artigo noutras 3 receitas-mãe (0,108) | baixa |
| Saladas/Caesar | Pimenta preta grão | C13 | 0,04 | 0,55 € | 0,04 é 8× a mediana deste artigo noutras 3 doses (0,005) | baixa |
| Saladas/Burrata | Salada Ibérica | C5 | 0,06 | 0,53 € | 0,06 é 8× a mediana deste artigo noutras 6 doses (0,0075) | baixa |
| Petiscos/Nachos | Queijo cheddar | C6 | 0,075 | 0,38 € | 0,075 é 8× a mediana deste artigo noutras 3 doses (0,01) | baixa |
| Guarnições/Compota Frutos Vermelhos | Limão | C10 | 0,18 | 0,29 € | 0,18 é 5× a mediana deste artigo noutras 7 receitas-mãe (0,0355) | baixa |
| Guarnições/Cebola Caramelizada | Azeite | C6 | 0,08 | 0,24 € | 0,08 é 6× a mediana deste artigo noutras 12 receitas-mãe (0,0128) | baixa |
| Guarnições/Cogumelos Assados | Azeite | C6 | 0,07 | 0,21 € | 0,07 é 5× a mediana deste artigo noutras 12 receitas-mãe (0,0128) | baixa |
| Acompanhamentos/Batatas | Sal fino | C7 | 0,08 | 0,11 € | 0,08 é 8× a mediana deste artigo noutras 8 doses (0,01) | baixa |
| Vegetariano/Salada Vegan | Sal fino | C12 | 0,05 | 0,07 € | 0,05 é 5× a mediana deste artigo noutras 8 doses (0,01) | baixa |

## Heurísticas usadas

1. **Escala relativa** — a quantidade é ≥5× a mediana do mesmo artigo nas outras fichas (≥20× ⇒ confiança alta, ≥10× ⇒ média). Requer o artigo usado em pelo menos 3 fichas.
2. **Custo dominante** — a linha vale ≥50% do custo do prato **e** ≥30% do preço de venda s/IVA (≥50% do preço ⇒ confiança alta).
