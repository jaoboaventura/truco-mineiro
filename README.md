# Truco Mineiro

Truco mineiro no navegador, com a cara da Belo Horizonte dos anos 60.

- Partida avulsa contra bots em 4 níveis (Fácil, Médio, Difícil e Mestre), sempre em melhor de 3
- Torneio da Pampulha: quartas, semi e final, com a dificuldade subindo a cada fase
- Mão de ferro aberta ou fechada, jogada coberta, truco, seis, nove e doze
- Dicas do parceiro quando pedem truco
- Rádio com músicas de época, sons da rua e do boteco, efeitos do jogo
- Salas online com código, chat e placar (em migração para o Supabase)

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
```

## Próximos passos

- Contas, ranking semanal e salas online no Supabase (Auth, Postgres e Realtime)
- Login com Google
