# Revisão da expansão — 30/10/2026

A revisão retoma o estúdio do commit c5f79a7 e a expansão 9d04c08. Ambos já haviam sido publicados no GitHub Pages.

## Correções desta revisão

- Barba: preserva a transformação original do GLB e compensa a escala em torno do centro da malha. A implementação anterior sobrescrevia a posição de vínculo ao esqueleto e escalava em torno da origem, deslocando a barba.
- HUD: mostra o período do dia em vez de uma temperatura calculada artificialmente. O relógio e a data usam o horário local do aparelho; não há integração meteorológica.

## Estado do plano

- Estúdio: catálogo com miniaturas 3D, categorias, cores, prévia e confirmação. Cancelamento e salvamento foram exercitados no navegador em desktop, retrato e paisagem na etapa anterior.
- Dia/noite: iluminação, céu e luzes internas seguem faixas do horário local. Não calcula nascer/pôr do sol pela localização e as transições entre faixas ainda são abruptas.
- Reforma: há grade com passo de 0,25/0,5, movimentação, rotação, validação e persistência. Requer teste manual adicional das portas e dos novos ambientes.
- Ambientes: garagem, varanda, jardim e piscina têm geometria e interações cadastradas. A piscina foi corrigida para que deck e bordas não cubram a água.
- Hábitos: novos hábitos estão registrados nas regras, mas isso não equivale aos minijogos e diários completos pedidos. Memorização com cartas, escrita de três gratidões e caderno de intercessão ainda precisam de interfaces e persistência próprias.
- Microinterações: existem ações e animações no cenário, mas sons, canais de TV completos, correspondências e interação social com pedestres não estão integralmente implementados.
- Roupas: parte dos novos itens reutiliza as malhas antigas. Estampas, macacão, pantufas temáticas e túnicas exclusivas ainda precisam de arte própria.

Não considerar o plano inteiro concluído com base apenas no título do commit de expansão. A publicação desta revisão entrega correções sobre a implementação existente.
