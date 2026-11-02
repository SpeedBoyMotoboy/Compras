# Compras no Mercado

App de lista de compras para o celular. Funciona offline e pode ser instalado na tela inicial (PWA). Sem servidor e sem cadastro: os dados ficam salvos no próprio aparelho.

## Funções

- Várias listas (ex.: "Compra do mês", "Churrasco")
- Itens com quantidade, unidade (un, kg, g, L, pct, cx), preço e categoria
- Itens agrupados por setor do mercado (Hortifruti, Açougue, Limpeza...)
- Marcar o que já foi para o carrinho; se o item não tem preço, o app pergunta na hora
- Total do carrinho e total previsto da lista
- Orçamento com barra de progresso e aviso quando passa do limite
- Autocompletar com o último preço pago de cada item
- Finalizar compra: registra no histórico com data e valor
- Compartilhar a lista pelo WhatsApp ou copiar como texto
- Duplicar lista, desmarcar todos, remover pegos (com "Desfazer")
- Tema escuro automático

## Como usar

Abra o `index.html` num navegador, ou publique no GitHub Pages:

1. No GitHub: **Settings → Pages → Branch** e escolha a branch com estes arquivos, pasta `/ (root)`.
2. Abra o endereço gerado no celular.
3. No Chrome (Android): menu **⋮ → Instalar app**. No Safari (iPhone): **Compartilhar → Adicionar à Tela de Início**.

Para rodar localmente: `python3 -m http.server 8000` e acesse `http://localhost:8000`.
