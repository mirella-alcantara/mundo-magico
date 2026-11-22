# Como funciona

Cada sessão do Claude Code neste Mac vira um **reino mágico** na pasta `Reinos/`.

- O hook em `hooks/reino.mjs` atualiza a nota do reino a cada evento da sessão.
- As propriedades (`status`, `acoes`, `emissarios`, `conexoes`…) são a fonte de verdade.
- `conexoes` guarda links `[[Outro reino]]`: aparecem no grafo do Obsidian e viram pontes de luz no painel.

## Status
- `trabalhando`: torres acesas, cascatas correndo, guardião voando.
- `chamando`: o farol acende, porque o reino precisa de você.
- `repousando`: o turno terminou e o reino espera um novo pedido.
- `adormecido`: a sessão acabou e o reino desce para o horizonte.

## Pontes
- Dourada: as sessões mexeram no mesmo arquivo.
- Lilás: as sessões são do mesmo projeto.

Para ver o painel: `npm start` na pasta do projeto e abra http://localhost:4747
