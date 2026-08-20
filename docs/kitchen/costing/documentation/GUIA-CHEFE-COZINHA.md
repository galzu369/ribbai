# Guia do Chefe de Cozinha — fichas técnicas e relatório

Este guia não tem informática. São passos curtos.

---

## O que este sistema faz

1. Você atualiza os **preços de compra** num único sítio — o **Preçário**.
2. Você edita as **receitas** diretamente nas **fichas técnicas** (ingredientes e quantidades).
3. O sistema recalcula custos, food cost, margens e **gera o relatório** (HTML + PDF).

```text
Preçário  ──▶  preços nas fichas  ──▶  food cost e margens  ──▶  relatório
     ▲
Fichas (ingredientes / quantidades) ─── o Chefe edita aqui
```

---

## Atualizar preços (Preçário)

**1.** Abra o Preçário:

```text
docs\kitchen\costing\price-lists\Preçário.xlsx
```

**2.** Altere os preços na coluna **Preço s/IVA**.

> É esta a coluna que conta. A coluna *Preço c/IVA* calcula-se sozinha — não a
> preencha à mão.

**3.** Confirme a **unidade** (Kg, L, Un) e o **IVA** do artigo.

**4.** **Guarde** (Ctrl+S) e **feche o Excel**.

---

## Editar receitas (fichas técnicas)

Pode abrir e editar as fichas em:

```text
docs\kitchen\costing\technical-sheets\garnishes\
docs\kitchen\costing\technical-sheets\menu-items\
```

**Pode alterar:**
- Nomes dos ingredientes (coluna do nome)
- Quantidades (coluna da quantidade)
- Acrescentar ou remover linhas de ingredientes
- Preço de venda c/IVA no rodapé da ficha

**Não altere à mão:**
- Colunas de preço de compra / IVA / custo da linha — o sistema preenche-as a
  partir do Preçário na próxima sincronização
- Fórmulas do template

**Guarde e feche todas as fichas** no Excel antes de sincronizar.

---

## Sincronizar e gerar o relatório

**1.** Faça **duplo clique** em:

```text
ATUALIZAR-FICHAS-TECNICAS.cmd
```

**2.** Espere pela mensagem:

```text
Sincronização concluída com sucesso.
```

**3.** O sistema atualiza as fichas **e** regenera o relatório em:

```text
docs\kitchen\costing\reports\
```

Ficheiros principais:
- `ribbai-kitchen-menu-costing-technical-sheets-v3-1-landscape-readable.html`
- `ribbai-kitchen-menu-costing-technical-sheets-v3-1-landscape-readable.pdf`

Abra o HTML no browser ou o PDF diretamente.

---

## Espreitar antes de atualizar

Se quiser ver o que vai mudar **sem alterar nada**, use:

```text
VERIFICAR-FICHAS-TECNICAS.cmd
```

Mostra tudo o que mudaria e não grava nada. Pode usar à vontade.

---

## Se aparecer um erro

### «existem ficheiros Excel abertos»

O sistema diz-lhe **quais**. Feche-os no Excel e volte a fazer duplo clique.

Nada foi alterado — pode repetir sem receio.

### «A atualização NÃO foi concluída»

Nenhum ficheiro fica a meio: ou muda tudo, ou não muda nada. Antes de cada
atualização é guardada uma cópia de segurança em:

```text
docs\kitchen\costing\backups\price-sync\
```

Leia a mensagem no ecrã e, se não perceber, contacte o responsável pelo sistema.

---

## Ingredientes «por resolver»

Às vezes aparece uma lista assim:

```text
Por resolver (sem preço atribuído — nada foi inventado):
    Guarnições/Húmmus · "Tahine" [UNMATCHED]
```

Quer dizer que **o nome do ingrediente na ficha não existe no Preçário**. O
sistema **não inventa preços** — prefere deixar em branco a pôr um valor errado
que estragaria o custo do prato.

Para resolver, há dois caminhos:

- o artigo existe no Preçário com outro nome → é preciso registar essa
  correspondência (peça ao responsável pelo sistema);
- o artigo não existe mesmo → acrescente-o ao Preçário com o nome tal como
  aparece na ficha.

---

## O que NÃO precisa de fazer

- Atualizar ligações do Excel
- Aceitar avisos do Excel sobre «ligações a outros ficheiros»
- Escrever preços de compra dentro das fichas (vêm do Preçário)
- Usar linha de comandos

---

## O que NUNCA deve fazer

- **Não mude o nome nem a localização das pastas** dentro do sistema.
- **Não apague o ficheiro `.ribbai-root`** que está na pasta principal.
- **Não trabalhe com os ficheiros dentro de um ZIP.** Extraia primeiro.
