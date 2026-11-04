# Revisão de ambientes 3D — 03/11/2026

## Alterações

- Rotinas autônomas: 36 vínculos explícitos entre atividade e objeto. Objetos guardados e grupos de cômodos ocultos deixam de receber ações.
- Contato com assentos: ajustes de sofá, cama, poltrona, cadeira de estudo, banco, bateria e varanda; cadeiras adicionadas à varanda.
- Animações específicas: halteres, alongamento, natação, teclado e regador. Ciclos preservam o rig e têm fechamento contínuo.
- Geometria: 15 objetos revisados, além do vaso sanitário. Banco com ripas e encosto, bancada com estrutura/gavetas/morsa/ferramentas, bicicleta com quadro tubular e raios, acabamento de aquário, banheiro, guarda-roupa, instrumentos e cafeteira.
- Navegação: aproximação já alcançada passa a concluir a ação; rota inclui a conexão à célula inicial; colisão contínua substitui amostragem de células que interrompia um segmento válido durante o percurso. Falha de acesso informa o jogador.
- Câmera: fachadas que bloqueiam a linha até a casa são ocultadas na câmera normal; câmera livre preserva a vizinhança.

## Verificação

Testes visuais locais usam o mesmo fluxo de caminhada e execução das ações dos menus normais. O painel `?revisao3d=1` existe apenas em desenvolvimento e mantém as ações por 60 segundos para inspeção. Não modifica os tempos de produção.

| Ambiente | Ações inspecionadas visualmente |
| --- | --- |
| Quarto | Sentar na cama, deitar |
| Sala | Ler no sofá |
| Estudo | Sentar à mesa |
| Cozinha | Sentar à mesa de jantar |
| Banheiro | Escovar os dentes |
| Estúdio | Tocar teclado; posição de aproximação e obstrução da câmera corrigidas |
| Academia | Levantar halteres, alongar |
| Jardim | Regar, sentar; regressão horta → banco reproduzida e corrigida |
| Piscina | Nadar com corpo imerso |
| Garagem | Restaurar madeira na bancada |
| Varanda | Sentar à mesa, passar café |

Cobertura visual por ações representativas; não é uma verificação exaustiva de todas as combinações de roupas, móveis reposicionados, horários e atividades registradas.

Validação automatizada: `npm run check`, TypeScript sem emissão, lint e exportação web. Lint mantém 28 avisos existentes, sem erros. Inclui geometria finita, disponibilidade de objetos, cobertura dos vínculos de rotina, ciclos de animação e colisão contínua.
