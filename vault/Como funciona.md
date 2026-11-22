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

## A cidade de cada reino
Clique num reino no painel para voar até ele. A cidade mostra o que a sessão fez:
- **Castelo**: ganha torres conforme as ações crescem.
- **Casas**: uma para cada 3 ações.
- **Habitantes**: mais gente na rua quando a sessão trabalha; reunidos na praça quando ela precisa de você.
- **Praça do pedido**: o pergaminho flutuante guarda o último pedido.
- **Guildas**, uma por tipo de ferramenta (propriedade `oficios`): Ateliê dos Escribas (Edit/Write), Forja (Bash), Grande Biblioteca (Read/Grep, com um livro por arquivo tocado), Observatório (web), Porto dos Emissários (subagentes), Portal Arcano (MCP), Torre do Relógio (tarefas).
- **Estandartes**: um para cada registro recente da crônica.
