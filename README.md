# Truco Mineiro

Truco mineiro no navegador, com a cara da Belo Horizonte dos anos 60.

- Partida avulsa contra bots em 4 níveis (Fácil, Médio, Difícil e Mestre), sempre em melhor de 3
- Torneio da Pampulha: quartas, semi e final, com a dificuldade subindo a cada fase
- Mão de ferro aberta ou fechada, jogada coberta, truco, seis, nove e doze
- Dicas do parceiro quando pedem truco
- Rádio com músicas de época, sons da rua e do boteco, efeitos do jogo
- Contas, ranking semanal e salas online com código, chat e placar, tudo no Supabase

## Rodando localmente

É um site estático, sem build. Basta servir a pasta:

```bash
python3 -m http.server 8000
# ou
npx serve .
```

Depois abra http://localhost:8000.

## Estrutura

```
index.html          telas e marcação
css/style.css       estilos
js/game.js          motor do jogo, bots, áudio e telas
assets/img/         retratos dos personagens e logo
assets/audio/sfx/   efeitos (seleção, vitória, derrota)
assets/audio/amb/   rádio, rua, boteco e sons avulsos
js/backend.js       ponte com o Supabase (contas, ranking e salas)
supabase/           banco (schema.sql) e a função de cadastro
```

## Supabase

- **Auth:** cadastro pela função `cadastro` (conta já confirmada, nome de usuário único) e login com e-mail ou nome de usuário.
- **Banco:** `profiles` (nome e personagem) e `ranking` (semana atual e anterior). Só a função `record_result` grava pontos.
- **Realtime:** cada sala é um canal privado `truco:sala-XXXXX`. A presença diz quem está na sala e o estado de cada jogador viaja por broadcast.

A URL e a chave pública ficam no topo de `js/backend.js`. Sem o Supabase (ou sem internet), o jogo continua funcionando contra os bots com contas salvas no navegador.

## Próximos passos

- Login com Google
- E-mail próprio (SMTP) para o link de troca de senha chegar a qualquer jogador
