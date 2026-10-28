# Faith Steps — Plano do MVP

> Nome decidido: **Faith Steps** (passos de fé). O app em si é todo em português. Antes de publicar, conferir a disponibilidade do nome nas lojas e no INPI.

---

## 1. O que é

Um app de hábitos cristãos com cara de The Sims, no celular e no computador. Você cria uma pessoinha parecida com você. Ela tem necessidades espirituais e físicas que caem com o tempo. Elas só sobem quando **você**, na vida real, faz devocional, ora, lê a Bíblia, vai à igreja, ensaia, ouve louvor ou se exercita, e registra no app.

Quando você registra, seu personagem faz a mesma coisa na tela: ajoelha e ora, lê na poltrona, coloca o tênis e corre. Quem cuida bem da vida real ganha bônus dentro do jogo (moedas, roupas, móveis, níveis).

**O gancho:** "acabei de orar, deixa eu salvar meu personagem". A vida real alimenta o jogo, e o jogo dá vontade de manter a vida real.

## 2. Para quem

- Evangélicos jovens e adultos (16–35) que querem constância no devocional e se motivam com jogos e metas. Só evangélicos: linguagem, versículos e atividades pensados para esse público.
- Primeiro teste: 30–50 pessoas da sua igreja e dos seus amigos.

## 3. Objetivos, não-objetivos e anti-objetivos

**Objetivos do MVP**
- Provar que o loop "faço lá fora, registro aqui, meu personagem melhora" faz a pessoa voltar todo dia.
- Ajudar a pessoa a manter o devocional diário e a ir à igreja toda semana.
- Ter um visual bonito o suficiente para as pessoas quererem mostrar para os amigos.
- Funcionar no celular e no computador com o mesmo personagem, sincronizado.

**Não-objetivos (fica para depois)**
- Rede social, amigos e grupos.
- Bíblia completa dentro do app.
- Cidade ou mundo aberto: o MVP tem só um cômodo.
- Ganhar dinheiro.

**Anti-objetivos (se acontecer, falhou, mesmo funcionando)**
- O app virar fonte de culpa ou de legalismo ("se não orar, sou mau cristão").
- Fé virar vitrine: nada de ranking público de quem ora mais (Mateus 6).
- Pessoa se sentir mal com o próprio corpo por causa do personagem.
- Vender vantagem espiritual com dinheiro (pagar para ter o "Espírito cheio").

## 4. Um dia típico

1. **7h:** notificação: "Seu personagem acordou com sede da Palavra". Você faz seu devocional, abre o app e toca na Bíblia do quarto. O personagem senta na poltrona e lê. A barra Espírito enche, aparecem +30 XP e +10 talentos, e a ofensiva vai para 12 dias.
2. **12h:** você ouve louvor no almoço e registra "Ouvi louvor · 30 min". O personagem coloca fones e balança a cabeça.
3. **19h:** você corre 30 min. O Apple Saúde manda o treino sozinho. Na próxima vez que você abre o app, o personagem está suado e sorrindo, e a barra Corpo cheia.
4. **21h:** com todas as barras acima de 60, o personagem fica **Radiante** (brilho dourado, talentos ×1,5). Você gasta os talentos numa estante nova.
5. **Domingo:** culto. Você registra Igreja, o personagem sai de casa arrumado e volta, e a Comunhão enche para a semana.

## 5. O personagem

**Criação (MVP):** nome, avatar feminino ou masculino (escolhido só na criação), 6 tons de pele, rosto, olhos, sobrancelha, nariz e 16 cabelos. Cabelos, barba e roupas seguem o sexo do avatar. Depois, rosto e cabelo mudam no espelho do banheiro e as roupas no guarda-roupa; peças e móveis novos ficam na Loja, num menu separado.

**O que muda nele:**
- **Corpo (forma física):** 5 estágios visuais, de "fora de forma" (barriguinha, cansado) a "atlético". Muda devagar, mais ou menos um estágio por semana de comportamento consistente.
- **Expressão e postura:** acompanham as necessidades (sereno e erguido, ou abatido e curvado).
- **Brilho:** aparece quando ele está Radiante.

**Animações espelho (MVP, 7):** orar, ler a Bíblia, estudar (caderno e Bíblia), ouvir louvor, ir à igreja (sai e volta arrumado), ensaiar (canta ou toca violão), exercitar-se (corrida ou flexão).

**Animações de estado:** parado (respira, pisca, olha o celular), Radiante, Abatido e Adormecido.

## 6. Necessidades

Todas vão de 0 a 100, começam em 55 (abaixo do Radiante, para o personagem não nascer Radiante) e caem continuamente com o tempo.

| Necessidade | O que enche | Queda | Dura cheia por |
|---|---|---|---|
| **Espírito** | devocional, oração, igreja | −50/dia | ~2 dias |
| **Palavra** | leitura bíblica, estudo, devocional | −35/dia | ~3 dias |
| **Louvor** | ouvir louvor, ensaio | −30/dia | ~3 dias |
| **Comunhão** | igreja, ensaio, estudo em grupo | −15/dia | ~1 semana |
| **Corpo** | exercício | −35/dia | ~3 dias |

**Forma física** (separada da barra Corpo, é o que muda o desenho do corpo):
- Vai de 0 a 100 e começa em 50.
- Uma vez por dia o app olha os minutos de exercício dos últimos 7 dias, com meta de 150 min por semana (referência da OMS):
  - meta batida: +3;
  - entre 50% e 99% da meta: 0;
  - abaixo de 50%: −3.
- Estágios: 0–19 fora de forma, 20–39 cheinho, 40–59 normal, 60–79 em forma, 80–100 atlético.

## 7. Atividades

| Atividade | Enche | Como registra | XP | Talentos | Limite por dia |
|---|---|---|---|---|---|
| Devocional (inclui meditação) | Espírito +60, Palavra +20 | 1 toque (timer opcional) | 30 | 10 | 2 |
| Oração | Espírito +40 | 1 toque ou timer | 15 | 5 | 3 |
| Leitura bíblica | Palavra +25 por capítulo | livro + capítulos | 10 por capítulo | 3 por capítulo | 10 capítulos |
| Estudo bíblico | Palavra +60 (+ Comunhão +20 se em grupo) | 1 toque + "sozinho ou grupo" | 40 | 15 | 1 |
| Ouvir louvor | Louvor +30 a cada 30 min | escolhe a duração | 10 | 3 | 3 |
| Igreja / culto | Comunhão +80, Espírito +20 | 1 toque | 50 | 20 | 2 |
| Ensaio / ministério | Louvor +40, Comunhão +30 | 1 toque + duração | 30 | 10 | 1 |
| Exercício | Corpo +50 a cada 30 min, conta para a forma física | automático (Saúde) ou manual | 20 a cada 30 min | 8 a cada 30 min | 3 blocos |

O limite diário existe para ninguém registrar 50 orações e quebrar a economia do jogo. O registro é por honra: fé é entre a pessoa e Deus, e o app não tenta policiar.

## 8. Progresso e recompensas

- **XP e nível:** o próximo nível custa 100 × nível atual. Cada nível desbloqueia itens na loja.
- **Talentos** (moeda, pela parábola dos talentos): ganhos fazendo coisas fora do app e gastos na loja.
- **Ofensiva:** dias seguidos com pelo menos uma atividade que enche o Espírito (devocional, oração ou igreja).
- **Graça:** 1 por semana, com no máximo 2 guardadas. Protege a ofensiva automaticamente no dia em que você esquecer. É o recurso mais importante contra a culpa.
- **Marcos da ofensiva:**
  - 7 dias: baú com item raro (ex.: lâmpada de azeite);
  - 30 dias: roupa exclusiva;
  - 100 dias: móvel lendário.
- **Radiante:** todas as necessidades em 60 ou mais. O personagem ganha brilho e os talentos rendem ×1,5.
- **Missão do dia:** 3 tarefas simples tiradas das metas que você escolheu. Completar as 3 dá +30 talentos.
- **Semana fiel:** bater as metas da semana (ex.: igreja 1×, 150 min de exercício, devocional em 5 dias) abre o baú semanal.
- **Conquistas:** cerca de 20 no MVP (primeiro devocional, ler um livro inteiro, 10 cultos…).

## 9. Quando as coisas vão mal (sem morte)

| Situação | O que acontece |
|---|---|
| Necessidade abaixo de 30 | Aparece um balão ("sinto falta de orar") e o rosto fica cansado. |
| Espírito em 0 | **Abatido:** perde o brilho, fica sentado no canto e não ganha bônus de talentos. |
| Espírito em 0 por 3 dias | **Adormecido:** dorme na cama, e loja e decoração ficam travadas até você fazer um devocional. Ao acordar ele mostra Efésios 5:14 ("Desperta, ó tu que dormes"). |

**Sem morte permanente (decidido).** Perder tudo faz a pessoa desistir do app, justo quando ela mais precisaria voltar. A mensagem é de graça, não de condenação.

## 10. Dentro do jogo

> Versão atual: a casa é 3D, com quarto, sala de estudo, sala, cozinha e banheiro numa planta só. A câmera gira em volta da casa (presa nela), dá zoom e foca em cada cômodo pelo menu. As paredes da frente abaixam como no The Sims. A pessoinha anda livre pela casa (toque no chão para mandá-la ir) e cada objeto abre um menu de ações: atividades de verdade (devocional, oração, leitura, estudo, louvor, ensaio, igreja, exercício) abrem o registro; ações do jogo (deitar, sentar, lavar louça, cozinhar, lanchar, tomar banho, escovar os dentes) são só animações. A interface fica por cima da cena, em tela cheia: status em cima, cômodos ao lado, retrato com necessidades num canto e botões redondos no outro.

**O quarto é o menu.** Um cômodo 2D em vista lateral, como um palco, e cada objeto é um atalho de registro:

| Objeto | Registra |
|---|---|
| Bíblia na estante | leitura ou estudo |
| Lugar de joelhos ou almofada | oração ou devocional |
| Fone na mesa | louvor |
| Violão ou microfone | ensaio |
| Tênis na porta | exercício |
| Porta | igreja |

Também existe um botão "+" grande para quem prefere lista.

- **Tocar no personagem:** ele reage e fala o versículo do dia.
- **Decorar:** 8 lugares no quarto (parede, quadro, chão, cama, estante, poltrona, planta, luminária).
- **Loja:** cerca de 40 itens no MVP (20 roupas e 20 móveis), com preço em talentos e alguns liberados só por nível.

## 11. Telas do MVP

1. **Boas-vindas, login e criação do personagem:** login com e-mail, Google ou Apple; depois aparência e nome.
2. **Metas:** você escolhe o que quer cultivar e com que frequência (ex.: devocional diário, igreja aos domingos, exercício 3× por semana). Depois vêm os pedidos de permissão para notificações e para o Apple Saúde ou Health Connect.
3. **Casa (principal):** o quarto com o personagem animado, as 5 barras no topo, ofensiva e talentos, a missão do dia e o botão "+".
4. **Registrar:** grade com as 9 atividades. Um toque registra; detalhes como duração, livro ou "em grupo" são opcionais.
5. **Recompensa:** sobreposição depois do registro, com a animação espelho e +XP e +talentos subindo.
6. **Jornada:** ofensiva, calendário do mês (dias com bolinha), nível, conquistas e o resumo da semana.
7. **Loja:** roupas e móveis.
8. **Ajustes:** horários de lembrete, conexão com o Saúde, metas e apagar dados.

**No computador:** as mesmas telas, em layout largo. Na Casa, o quarto fica grande no centro, as barras, a ofensiva e os talentos numa coluna à esquerda, e a missão do dia com o registro rápido numa coluna à direita. Loja e Jornada abrem como painel lateral, sem trocar de tela.

## 12. Identidade visual

Inspirada nas referências: só o estilo. Nada de raposa nem marca do Firefox. A paleta é própria: ameixa, pink e lima.

**Cores**

| Uso | Cor |
|---|---|
| **Linho:** fundo do app (bege quase branco) | `#FAF6F0` |
| **Areia:** superfícies, paredes e trilhos das barras | `#F1E8DD` |
| **Ameixa:** texto, títulos e destaques escuros | `#42124C` |
| **Pink:** botões, moletom do personagem, destaques | `#FE0472` |
| **Lima:** recompensas, XP, brilho do Radiante, nome da marca | `#8AFF00` |
| Noite (apoio): fundo mais escuro, sombras | `#2A0A31` |
| Pink escuro (apoio): texto pink sobre fundo claro | `#C8005A` |
| Rosa claro (apoio) | `#FFD1E6` |
| Névoa (apoio): cards claros | `#FBF3F8` |

**Regras de uso:**
- A base é clara (linho e areia). Pink e lima entram só em detalhes: botões, barras, recompensas.
- Pink e lima nunca entram no mesmo degradê, porque a mistura fica marrom.
- Texto sobre lima é sempre ameixa.
- Pink puro só em texto grande. Para texto pequeno sobre fundo claro, usar o pink escuro.

**Tipografia**
- **Títulos:** Barlow Condensed Black no app, que lembra o "Download Firefox". O pacote de fontes do app não traz a Archivo condensada; a página de conceito usa a Archivo condensada direto do Google Fonts.
- **Textos:** Archivo.

**Formas**
- Cards bem arredondados (raio 28–40), botões em pílula e muito espaço vazio.
- Ícones 3D leves em degradê, como o escudo, o cursor e o raio das referências.

**Ilustração**
- Personagem e objetos em vetor plano com degradê de pink.
- Fundos com ondas suaves em rosa claro.

**Símbolo da marca:** duas pegadas subindo, uma pink e uma lima (passos de fé), usadas no ícone do app. A primeira versão está em `arte/conceito-personagem.html`.

**Tom de voz:** acolhedor, leve e com um pouco de humor. Nunca culpa. Exemplos: "Seu personagem tá com saudade de orar 🙏" e "Sem problema, a Graça cobriu ontem."

## 13. Tecnologia

| Parte | Escolha | Por quê |
|---|---|---|
| App | **React Native + Expo + TypeScript** (Expo Router) | Um código só para iPhone, Android **e computador** (a versão web do Expo roda no navegador). |
| Desktop | **Versão web no navegador, instalável como app (PWA)** | Funciona em Mac, Windows e Linux sem código separado e abre em janela própria, com ícone. Programa instalável (.exe/.dmg) só se o navegador não bastar. |
| Login e dados | **Supabase** (login + banco Postgres), com cópia local no aparelho | O mesmo personagem no celular e no computador. O plano grátis cobre o teste. |
| Personagem | **SVG em camadas desenhado em código** (`react-native-svg`), animado com **Reanimated** | Eu desenho e mantenho a arte, e ela roda igual no celular e no navegador. O corpo é calculado a partir da forma física (0–100), sem precisar de um desenho por estágio. Rive só se um animador entrar depois. |
| Exercício | **HealthKit** (iOS) e **Health Connect** (Android) | Lê treinos e minutos de exercício sozinho. Exige build próprio (EAS), não funciona no Expo Go. No computador, entra pela sincronização. |
| Lembretes | **expo-notifications** (locais, só no celular) | Sem servidor. No computador, nada de lembretes no MVP. |
| Métricas | **PostHog** (plano grátis) | Medir retenção no teste. |
| Distribuição | **EAS Build** (TestFlight e Play, teste interno) e versão web na **Vercel** | Teste fechado com a igreja, por link no computador. |

**Como os dados ficam iguais em todos os aparelhos:** tudo que acontece vira uma linha nova num histórico que nunca é editado (registros de atividade, compras). Barras, XP, talentos, ofensiva e Graça são **calculados** a partir desse histórico, e a queda das barras depende só do horário de cada registro:

```
valor = max(0, valor − queda_por_hora × horas_passadas)
```

Depois de aplicar a queda, soma-se o bônus da atividade, com teto de 100. Celular e computador só trocam linhas novas, então não existe conflito entre os dois, e nada precisa rodar em segundo plano.

**Sem internet:** o registro fica guardado no aparelho e é enviado quando a conexão voltar. Nada se perde.

> Limite conhecido: recalcular tudo do zero fica lento depois de milhares de registros. Quando chegar lá, salva-se um resumo periódico e calcula-se só a partir dele.

**Dados principais**
- `usuarios`: login (cuidado pelo Supabase).
- `personagem`: aparência e nome.
- `registros`: atividade, data e hora, duração, detalhes (livro, capítulos, em grupo), origem (manual ou saúde), aparelho.
- `compras`: item, preço, data.
- `inventario`: item e se está equipado.
- `metas`: atividade e frequência.
- Barras, nível, XP, talentos, ofensiva, Graça e forma física não são guardados: são calculados a partir do histórico.
- O catálogo de itens, conquistas e versículos vem num arquivo fixo dentro do app.

**Bíblia:** o MVP **não** traz o texto bíblico; você só registra livro e capítulo. O versículo do dia usa uma tradução de domínio público ou de licença aberta (verificar a Bíblia Livre). NVI, ARA e NAA exigem licença.

## 14. Fora do MVP (fase 2 em diante)

- Programa de desktop instalável (Tauri ou Electron), se a versão no navegador não bastar.
- Lembretes no computador (notificação do navegador).
- Amigos e grupos da igreja ou célula: ver o personagem dos amigos, visitar casas e fazer desafios em grupo (21 dias de oração, jejum coletivo). Sem ranking de "mais espiritual".
- Check-in na igreja por localização.
- Música automática. A API do Spotify ficou muito restrita para apps pequenos em 2025; a alternativa é "compartilhar a música" do Spotify ou do Apple Music direto para o app.
- Bíblia completa no app e planos de leitura.
- **Frutos do Espírito** (Gálatas 5:22) como atributos do personagem.
- Jejum como atividade.
- Bairro ou cidade: igreja, praça e academia como lugares visitáveis.
- Sono e alimentação via Saúde.
- Widgets e Apple Watch.
- Monetização: só cosméticos (roupas, temas, cômodos extras). Nunca progresso espiritual.

## 15. Etapas de construção

| Etapa | Entrega | Dá para testar? |
|---|---|---|
| **0. Identidade** | conceito do personagem e ícone (feito), mockups das telas, guia visual | ver e opinar |
| **1. Base** | app rodando no celular e no navegador, login, sincronização, registrar atividades, necessidades caindo e subindo, tela Casa com personagem provisório (silhueta), layouts de celular e de computador | sim, você já usa no dia a dia |
| **2. Progresso** | XP, nível, talentos, ofensiva, Graça, missão do dia, lembretes | sim |
| **3. Personagem** | personagem em SVG no app, criação, estados, 7 animações espelho, forma física | sim |
| **4. Quarto e loja** | objetos como atalhos, decoração, 40 itens | sim |
| **5. Saúde** | exercício automático (iOS e Android) | sim |
| **6. Teste fechado** | polimento, política de privacidade, TestFlight e Play, 4 semanas com 30–50 pessoas | é o teste |

**Estimativa:** com meio período de dedicação e a programação feita junto comigo, algo como 10 a 14 semanas. A versão desktop soma cerca de 2, por causa do login, da sincronização e do layout largo. A arte fica comigo, então não depende de contratar ninguém. O limite é que animações feitas em código são mais simples que as de um animador profissional.

## 16. Como saber se deu certo (teste de 4 semanas)

- Pelo menos 50% dos testadores ainda usando no 7º dia e 30% no 28º.
- Entre quem usa, registro espiritual em 4 ou mais dias por semana, em média.
- Pelo menos 70% dizem na pesquisa que o app ajudou a manter o devocional.
- Menos de 15% dizem que o app os fez sentir culpa (checagem do anti-objetivo).

## 17. Riscos e cuidados

1. **Arte e animação:** feitas em código, o que tem um teto de sofisticação. O MVP tem personagem simples, poucas peças e só 7 animações. Se o teste pedir mais, contratar um animador (Rive).
2. **Culpa e legalismo:** Graça, sem morte, sem ranking e tom acolhedor.
3. **Trapaça:** aceitar. Limites diários, registro automático onde der e honra no resto.
4. **Denominações:** linguagem evangélica ampla, sem conteúdo doutrinário específico.
5. **Imagem corporal:** a forma física é do personagem, com tom brincalhão, e o app nunca comenta o corpo do usuário.
6. **Lojas de apps:** HealthKit exige explicar o uso e o app precisa de política de privacidade.
7. **Direitos autorais:** texto bíblico, músicas e marcas (The Sims, Firefox) entram só como inspiração.
8. **Dois tamanhos de tela:** toda tela precisa funcionar estreita e larga. A regra é começar pelo celular e esticar para o computador, sem telas exclusivas.

## 18. Decisões suas

**Já decidido:**
- Nome: **Faith Steps**.
- Morte: fica o **Adormecido**, sem morte permanente.
- Público: **só evangélicos**.
- Arte: **feita por mim**, em código, no estilo das referências.
- Teste: **iPhone e Android**.

**Em aberto:**
- **Desktop:** o navegador (instalável) basta ou você precisa de um programa para baixar (.exe/.dmg)?

## 19. Decisões que eu tomei (revise)

- Personagem 2D em SVG desenhado em código, animado com Reanimated. Sem 3D.
- Desktop como versão web, com o mesmo código, instalável pelo navegador.
- Login e sincronização (Supabase) já no MVP, por causa do desktop. O histórico só recebe linhas novas, sem edição, para celular e computador nunca entrarem em conflito.
- 5 necessidades, os números de queda e de bônus e a meta de 150 min de exercício (todos ajustáveis no teste).
- Sem morte: Abatido e Adormecido, mais a Graça.
- O quarto como menu de registro.
- Spotify, GPS, social, Bíblia completa e Frutos do Espírito ficam para a fase 2.
- Moeda "talentos".
