# EcoExploradores — Um novo começo

Aventura educativa em pixel art para navegador, ambientada em uma versão lúdica de Campo Mourão. Explore, recolha materiais, separe-os corretamente e recupere espaços comunitários. A versão funciona sem conexão, contas, anúncios ou serviços externos.

## Jogar

Extraia o ZIP inteiro e abra `index.html` em um navegador moderno. No Windows, também é possível abrir `INICIAR_ECOEXPLORADORES.bat`.

Se o navegador restringir arquivos locais, use o servidor opcional: `python3 tools/serve.py`. Abra a porta 8000 no navegador local. Em hospedagens estáticas, publique o conteúdo da pasta mantendo os caminhos relativos. Não é necessário compilar nem instalar dependências para jogar.

## Controles

| Ação | Tecla |
| --- | --- |
| Caminhar | WASD ou setas |
| Correr | Shift |
| Coletar, conversar, separar e plantar | E ou espaço |
| Selecionar material | Q, 1–8 ou clique no espaço da mochila |
| Mapa | M |
| Som | V |
| Pausar | Esc |

No celular, use os botões de direção, Correr, Trocar e Agir. A orientação horizontal oferece mais espaço.

## Objetivo

Separe 12 materiais, encontre a peça reaproveitável no bairro, reative a estação no laboratório e restaure três canteiros da horta. O laboratório abre depois de três separações corretas. Continue explorando depois de concluir a missão.

O progresso é salvo automaticamente no armazenamento local do navegador. Use o mesmo navegador e endereço para continuar; o salvamento não é transferido entre dispositivos ou entre `file://` e um site. A navegação privada pode apagar ou bloquear esse armazenamento. A opção de nova aventura pede confirmação antes de substituir o progresso.

## Desenvolvimento

- `game.js`: mundo, colisões, regras, controles, salvamento e renderização Canvas.
- `style.css` e `index.html`: interface responsiva e acessível por teclado.
- `assets/`: arte local; o jogo não carrega recursos da internet.
- `data/cronograma.js`: dados locais do cronograma de coleta.
- `tools/`: ferramentas opcionais de desenvolvimento.
- `tests/browser-smoke.cjs`: testes funcionais em Chromium com Playwright.

Use `python3 tools/serve.py` para desenvolver. Teste com `node tests/browser-smoke.cjs` em um ambiente que disponha de Playwright e Chromium. `CHROMIUM_PATH` permite selecionar o executável. O painel de depuração só é exposto quando o endereço contém `?debug=1`.

## Antes de publicar

Esta revisão prepara uma versão candidata para avaliação. O cronograma municipal foi preservado da versão fornecida e precisa ser confirmado junto aos canais oficiais antes da divulgação. A identidade SENAI e a associação institucional devem ser revisadas pelo responsável pelo projeto. Valide a abertura local e o áudio no navegador/dispositivo usado pelo público; testes automatizados não substituem uma sessão de avaliação com jogadores.

A inspiração visual é o gênero de aventuras rurais em pixel art. Os novos recursos visuais foram criados para este projeto; não incluem texturas, personagens, músicas ou mapas extraídos de Stardew Valley. Consulte os créditos da arte para detalhes de criação.
