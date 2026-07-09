# 8. Gestão de Inventário

## Inventário Contínuo e Imutável
A filosofia basilar da gestão de inventário do RIBBAI 2.0 é o funcionamento através de um *Ledger Financeiro*. Ao contrário de sistemas tradicionais onde uma quantidade é simplesmente apagada ou sobreescrita, o sistema preserva uma integridade absoluta de dados, num conceito referenciado como Zero Deleção. 

Qualquer oscilação — seja por introdução de matéria, venda ou anomalia — é processada como uma **Inventory Transaction** (Movimentação de Inventário). As transações podem ter a natureza de:
* **Entradas (IN):** Faturas ou notas de receção.
* **Saídas (OUT / WASTAGE):** Consumos, quebras, desperdícios, ou consumos indevidos.

## O Custo Médio Ponderado (CMP)
O motor financeiro e matemático nuclear da componente de *Stock*. Sempre que uma nova transação de entrada (*IN*) com uma flutuação de preço mercantil é submetida, o sistema recalcula e estabiliza em tempo real o novo valor absoluto unitário do artigo e a valoração holística do armazém (*Stock Valuation*). Isto assegura que todas as análises de custos que se seguem sejam dotadas de um rigor referencial sem paralelo no mercado de restauração local.

## Gestão de Quebras, Consumos e Alertas
* As quebras deixam de ser simples itens em falta e traduzem-se para **custo efetivo e atualizado ao cêntimo**, promovendo uma leitura de balanço diário imediata.
* O sistema processa cruzamentos de margens e monitoriza as oscilações de fornecedores. Se a alteração monetária de aquisição for perigosamente superior ou inferior às métricas referenciais (ex: variação do fornecedor > 15%), gera automaticamente alertas preventivos.

## Auditorias e Contagens
A fiabilidade entre o armazém "virtual" e o mundo físico assegura-se por metodologias de verificação fechadas. O RIBBAI integra contagens semanais rigorosas (*Weekly Inventory Counts*), as quais cruzam as expetativas sistémicas contra a presença real das matérias e submetem instantaneamente os dados das discrepâncias (*Variances*) para análise e relatórios.

---

> **Objetivo:** Dominar na íntegra a gestão logística e o ciclo de custos dos bens transacionáveis de um restaurante.
> 
> **Benefícios para a Gestão:** Monitorização sem sobressaltos e sem falhas dos custos da matéria-prima, combatendo frontalmente as perdas escondidas devido a roubos ou quebras informais.
> 
> **Estado Atual:** Arquitetura do modelo perfeitamente desenvolvida e automatizada. Todo o algoritmo e motor CMP funcionam ativamente a processar as oscilações.
> 
> **Próximos Desenvolvimentos:** Construir a camada de visualização Web (formulários de *Click-and-Generate*) que permitirá introduzir interativamente registos de entrada ou despistes de *stock*.