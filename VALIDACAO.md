# Validação da edição Florescer — candidata 4.0

Verificação executada em 29/10/2026 com Chromium e Playwright, servindo os arquivos locais por HTTP. O jogo não fez requisições para serviços externos.

## Resultado

18 verificações funcionais aprovadas, sem exceções JavaScript. O arquivo `tests/resultados-release.json` registra os resultados da execução entregue.

- Carregamento de todos os 100 sprites/tiles do jogo.
- Movimento por teclado, corrida e limites do mapa.
- Coleta; rejeição de separação incorreta; pontuação da separação correta.
- Bloqueio do laboratório antes de três separações.
- Pausa, ajuda e pesquisa do cronograma.
- Acesso a todos os 114 pontos de objetivo/interação das cinco regiões, por busca de caminhos em uma grade de colisões (amostragem a cada 12 pixels).
- Pré-requisitos da horta e da máquina; missão só concluída após todas as etapas e recompensa concedida uma única vez.
- Salvamento e retomada de região, itens recolhidos, pontuação, canteiros e conclusão.
- Recuperação quando o salvamento contém JSON inválido.
- Limite de oito itens e seleção por teclado/clique.
- Pausas repetidas sem perda da partida.
- Ausência de requisições externas e de exceções JavaScript no fluxo testado.
- Ferramentas de depuração ausentes no modo normal.
- Movimento por toque; interface sem transbordamento horizontal; pausa e mapa acessíveis em orientação horizontal.

Também foram revisadas capturas das cinco regiões, da abertura e da interface móvel. A checagem de sintaxe de game.js passou. Os 100 PNGs originais foram substituídos e as dimensões verificadas; a capa é um novo arquivo adicional.

## Limites e avaliação final

O Chromium gerenciado bloqueia endereços file:// por política administrativa. Portanto, a abertura direta de index.html no Windows não foi validada aqui; o funcionamento via servidor local foi validado. O pacote mantém recursos locais e caminhos relativos, sem módulos, fetch ou serviços de rede necessários para jogar.

Os testes automatizados usam posicionamento controlado do personagem para verificar missões, além de eventos reais de teclado e ponteiro. A busca de caminhos verifica acessibilidade em grade; não equivale a uma pessoa percorrendo integralmente cada rota. Ainda é recomendada uma sessão com jogadores para avaliar ritmo e dificuldade, além de teste no dispositivo/navegador do público. Não foram feitos testes em Safari/iOS ou aparelhos físicos.

O cronograma municipal foi mantido do material fornecido e ainda precisa de confirmação oficial antes da divulgação. O jogo foi preparado como versão candidata; não foi publicado em uma hospedagem nem enviado ao GitHub.
