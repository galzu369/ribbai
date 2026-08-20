# Guia de instalação e transferência — sistema de custeio de cozinha

Como levar o sistema para outro computador (por exemplo, o do Chefe de Cozinha).

---

## Antes de copiar (no computador de origem)

O runtime portátil não vai no git — tem de existir fisicamente na pasta antes
de a copiar. Confirme, ou gere:

```bash
npm run kitchen:runtime:build    # motor num único ficheiro (~215 KB)
npm run kitchen:runtime:node     # node.exe portátil (~82 MB, verificado por checksum)
```

Ambos ficam em `runtime/`. Verifique que existem:

```text
runtime\kitchen-costing-sync.cjs
runtime\node\node.exe
runtime\run-engine.cmd
```

---

## Transferir

1. **Feche todos os ficheiros Excel** em ambos os computadores.
2. Copie a pasta **`RIBBAI` completa**.
3. Cole na localização escolhida no computador de destino.
4. Faça duplo clique em **`INSTALAR-SISTEMA-COZINHA.cmd`**.
5. Confirme que o health check termina em `SISTEMA PRONTO A UTILIZAR`.
6. Teste com **`VERIFICAR-FICHAS-TECNICAS.cmd`** (não altera nada).

O passo 4 não instala nada no Windows nem pede permissões de administrador —
apenas verifica que a pasta está completa e utilizável.

---

## Onde a pasta pode ficar

Qualquer sítio, desde que a **estrutura interna** se mantenha:

```text
C:\RIBBAI
D:\RIBBAI
C:\Users\<qualquer-utilizador>\Documents\RIBBAI
E:\Operações\RIBBAI
```

O nome da pasta principal também pode mudar (`RIBBAI-COZINHA`, por exemplo).
Recomenda-se manter `RIBBAI`, mas o sistema não depende disso.

**Testado**: o sistema foi validado numa cópia colocada noutra letra de disco,
fora do perfil do utilizador e com a pasta renomeada — sem qualquer
reconfiguração.

---

## Como a portabilidade funciona

Nenhum caminho absoluto está gravado no código nem na configuração.

O ficheiro **`.ribbai-root`**, na raiz do projeto, é o marcador. O motor sobe na
árvore de pastas a partir do sítio onde está o executável até encontrar esse
marcador, e resolve tudo a partir daí — Preçário, fichas, mappings, relatórios.

Os caminhos ficam em `config/kitchen-costing.json`, sempre **relativos**. O
motor recusa arrancar se algum deles for absoluto.

Por isso o sistema não depende de:

```text
o nome do utilizador Windows
a pasta Desktop
a letra do disco
o nome da pasta principal
```

**As fichas técnicas também não têm ligações externas do Excel** a outros
ficheiros. Os preços são gravados como valores pelo motor. Foi uma decisão
deliberada: as ligações por linha (`[1]Preçário!$E$132`) já apontaram a artigos
errados quando o Preçário foi reordenado.

---

## OneDrive / SharePoint

Funciona, com condições:

- a pasta tem de estar **disponível localmente** (não «apenas online»);
- os ficheiros têm de estar descarregados, não só sincronizados como atalhos;
- os workbooks têm de estar **fechados** durante a sincronização;
- **duas pessoas não podem sincronizar ao mesmo tempo**.

Em caso de dúvida, prefira uma pasta local.

---

## Se o Node portátil não estiver presente

O launcher usa, por esta ordem:

1. `runtime\node\node.exe` (portátil, preferido);
2. o `node` instalado no sistema, se existir.

Sem nenhum dos dois, o launcher explica o que falta e não altera ficheiros.

---

## Resolução de problemas

| Sintoma | Causa provável | O que fazer |
| --- | --- | --- |
| «motor de sincronizacao nao encontrado» | `runtime/` não foi copiado | Copiar a pasta outra vez, por inteiro |
| «nao foi encontrado o Node portatil» | falta `runtime\node\node.exe` | Correr `npm run kitchen:runtime:node` na origem e recopiar |
| «Não foi possível localizar a raiz do projeto» | falta o `.ribbai-root` | Repor o ficheiro na raiz da pasta |
| «existem ficheiros Excel abertos» | workbook aberto no Excel | Fechar os ficheiros listados |
| Preços não mudaram | Preçário não foi guardado | Guardar o Preçário antes de sincronizar |

---

## Comandos (só para quem mantém o sistema)

```bash
npm run kitchen:costing:check    # dry-run
npm run kitchen:costing:update   # aplica + valida + relatório
npm run kitchen:health           # health check de instalação
npm run kitchen:runtime:build    # reconstruir o bundle após alterar o motor
```

O bundle em `runtime/` é **gerado**. Depois de qualquer alteração ao motor, é
preciso reconstruí-lo — caso contrário o launcher continua a correr a versão
antiga.
