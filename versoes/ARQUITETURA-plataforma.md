# Pancadaria Celeste: documento técnico

Platform fighter 2D para multiplayer local (2 a 4 jogadores). A implementação de referência está em `index.html` (canvas + JavaScript puro, sem dependências). Toda a lógica roda em **passo fixo de 60 Hz**, então todos os tempos abaixo estão em **frames** e as velocidades em **px/frame**. Isso torna o jogo determinístico e fácil de portar para Godot, Unity ou Defold.

## 0. Mapa dos módulos

| Módulo | Responsabilidade | Onde fica no código |
|---|---|---|
| `CFG` | Todas as constantes de game feel num lugar só | topo do script |
| Input | Dispositivos (teclado A/B, gamepads, CPU), detecção de borda, `InputBuffer` | `KeyboardDevice`, `PadDevice`, `BotDevice`, `InputBuffer` |
| Dados | Kits de armas (leves) e lendas (pesados), hitboxes como dados | `KITS`, `LEGENDS`, `A()`, `B()` |
| Player | FSM + física + colisão por eixos | `S`, `Player`, `physics()` |
| Combate | Hitbox × hurtbox, dano por acúmulo, knockback, hitstop | `resolveHits()`, `applyHit()` |
| Itens | Pegar, arremessar, Weapon Drop Manager | `tryPickup()`, `throwOrPickup()`, `Spawner` |
| Câmera/FX/Som | Zoom dinâmico, shake, partículas, áudio sintetizado | `cam`, `fx`, `sfx` |
| Partida | Lobby, stocks, KO, vitória, pausa | `startMatch()`, `checkKO()`, `lobbyInput()` |

Ordem de um tick (`step()`):

```
pollDevices()            // 1 leitura por dispositivo por frame → cur/prev
for player: update()     // buffer ← bordas; hitstop; FSM; física
resolveHits()            // hitboxes ativas × hurtboxes vulneráveis
updateItems(); Spawner.update()
checkKO(); fx.update(); cam.update()
```

## 1. Character controller

### 1.1 Máquina de estados

| Estado | Entra quando | Sai para | Notas |
|---|---|---|---|
| `Grounded` | toca o chão (vy ≥ 0) | Airborne, Dashing, Dodging, Attacking | reseta pulos, recuperação, esquiva aérea, wall jumps |
| `Airborne` | sai do chão / pulo | Grounded, Dodging(ar), Attacking | air control, fast fall, wall slide |
| `Dashing` | duplo toque na direção (≤ 12 f) | Grounded, Airborne, ações | 14 f a 13 px/f; pulo herda o momento |
| `Dodging` | esquiva com cooldown livre | Grounded/Airborne, **Attacking (GC)** | `spot`, `dash` ou `air` |
| `Attacking` | ataque leve/pesado | Grounded/Airborne | startup → active → recovery |
| `Hitstun` | golpe com impulso < 8 | Grounded/Airborne | empurrão curto, sem lançamento |
| `Knockback` | golpe com impulso ≥ 8 | Grounded/Airborne | gravidade e arrasto próprios, quica no chão e na parede |

Cada estado é um objeto `{enter, update, exit}`. Estados "livres" chamam `actions(p, 'ground'|'air')`, que consome o buffer nesta prioridade: arremesso → leve → pesado → esquiva → pulo.

### 1.2 Movimento responsivo

```
alvo = dir * RUN
se dir ≠ 0: vx = approach(vx, alvo, G_ACCEL * (virando ? TURN_MUL : 1))
senão:      vx = approach(vx, 0, G_DECEL)      // 2.8 px/f² → para em ~3 frames
```

A aceleração chega à velocidade máxima em 4 frames e a desaceleração é mais forte que a aceleração. É isso que tira a sensação de gelo. Virar de lado usa aceleração 2,4× maior.

### 1.3 Controles aéreos

- **Pulos:** 1 no chão + `AIR_JUMPS = 2` no ar. Tomar dano devolve ao menos 1 pulo.
- **Recuperação:** pesado no ar (sem baixo) → golpe ascendente, `recUsed = true` até tocar o chão ou levar um golpe.
- **Fast fall:** segurar baixo com `vy > -1` → `vy = max(vy, 0.75·FF_MAX)` e gravidade `FF_GRAV` até `FF_MAX = 20`.
- **Wall slip / wall jump:** a sonda de parede detecta contato lateral com sólidos. Segurar na direção da parede limita a queda a `WALL_SLIDE = 2.6`. Pular na parede: `vx = -parede·9.5`, `vy = -14`, até 3 por voo, sem gastar pulos aéreos.

### 1.4 Input buffering

```
cada frame:   para ação em [jump, light, heavy, dodge, throw]:
                  se apertou agora: buffer.push(ação, relógio_do_jogador)
              se hitstop: return          // o relógio para, então o buffer não expira
              relógio++ ; buffer.prune(relógio)   // descarta entradas mais velhas que CFG.BUFFER (6)
estados livres: if buffer.has(a) && pode_executar: buffer.use(a); executar
```

Estados ocupados (`Attacking`, `Hitstun`, `Knockback`) não consomem nada. Um botão apertado até 6 frames antes do fim da animação sai no primeiro frame livre. O relógio é por jogador e congela no hitstop, então um input dado durante o impacto não se perde.

## 2. Combate

### 2.1 Hitbox e hurtbox

- **Hurtbox:** o AABB do corpo (`42×78`, ancorado nos pés). Fica desligada quando `inv > 0` (respawn) ou `dodgeInv` (janela da esquiva).
- **Hitbox:** dado puro no ataque, em coordenadas locais (x para frente, y negativo para cima). É espelhada pelo `facing` em `hbRect()` e só existe nos frames `[s, s+a)`.
- Cada ataque guarda um `Set` de alvos já atingidos, para acertar cada um uma única vez.

```js
A(startup, active, recovery, [B(x, y, w, h, dano, kbBase, escala, ângulo)], {mv, rec, gp})
```

### 2.2 Dano por acúmulo e impulso

```
alvo.dano += hb.dmg
Impulso    = (hb.kb + alvo.dano * hb.scl) / lenda.peso
vel        = (cos θ · Impulso · facing, -sin θ · Impulso)
se alvo no chão e vel.y > 0: vel.y = -0.6 · vel.y          // spike no chão vira pop-up
hitstop    = clamp(3 + dmg·0.35 + Impulso·0.12, 3, 13)      // atacante E alvo congelam
hitstun    = 6 + Impulso · 1.9
estado     = Impulso ≥ 8 ? Knockback : Hitstun
```

No `Knockback` o arrasto horizontal é `0.985`/frame e a gravidade cai para `0.36`, o que faz o voo ser longo e legível. O shake de câmera é proporcional ao impulso. Com os números atuais, um pesado forte de Torvo a 150% leva o alvo de perto da borda até a blast zone. Golpes leves praticamente nunca matam.

## 3. Esquiva e Gravity Cancel

| Tipo | Duração | Invulnerável | Cooldown |
|---|---|---|---|
| Spot (solo, neutro) | 22 f | f3–f18 | `G_DODGE_CD = 48` |
| Dash dodge (solo + direção) | 20 f, 12 px/f | f2–f16 | `G_DODGE_CD = 48` |
| Aérea (8 direções) | 24 f, 8 px/f, gravidade 0.12 | f2–f20 | `A_DODGE_CD = 84` + 1 por voo |

Os cooldowns são independentes: esquivar no ar não trava a esquiva no solo e vice-versa. O HUD mostra os dois (barras SOLO/AR).

**Gravity Cancel** (`S.Dodging.update`, tipo `air`):

```
se buffer tem light ou heavy durante a esquiva aérea:
    consome o botão
    chave = light ? groundLight(dir) : groundHeavy(dir)   // tabela de SOLO, não aérea
    setState(Attacking, {key: chave, gc: true})
        → Dodging.exit (aplica cooldown aéreo, desliga invulnerabilidade)
        → vy = 0 ; grav0 = duração total do ataque          // gravidade congelada
        → flag gc impede o landing-cancel do ataque
```

Enquanto `grav0 > 0` a física não aplica gravidade e amortece `vy`. Assim um uppercut de GC ainda sobe, mas o personagem não cai durante o golpe.

## 4. Armas e reutilização de kits

```
getAttack(p, chave):
    se chave termina em 'sig': p.legend.sig[p.weapon || 'unarmed'][chave]   // PESADO → lenda
    senão:                     KITS[p.weapon || 'unarmed'].light[chave]      // LEVE → arma
```

- Os leves (`nlight`, `slight`, `dlight`, `nair`, `sair`, `dair`) mais a recuperação e o ground pound vêm da **arma**. Qualquer lenda com Espada tem o mesmo kit leve.
- Os pesados (`nsig`, `ssig`, `dsig`) vêm da **lenda**, um trio por arma. Hoje são 2 lendas × 3 kits = 18 signatures.
- Para adicionar uma arma: uma entrada em `KITS` e um trio em cada lenda. Para adicionar uma lenda: uma entrada em `LEGENDS` com `speed`, `weight` e `sig`.

**Weapon Drop Manager** (`Spawner`): a cada 300–480 frames sorteia um ponto de spawn e solta uma arma do céu, só se houver menos de `ITEM_MAX = 3` no chão. O item cai com física simples, para em sólidos e plataformas, pisca nos últimos 2 s e some após 15 s. Arma arremessada vira projétil (6 de dano) e volta a ser item quando bate em algo.

## 5. Multiplayer local e inputs

- Todo dispositivo implementa `poll() → estado bruto` e guarda `cur`/`prev`. O jogador nunca sabe se está num teclado, num gamepad ou numa CPU.
- **Gamepads:** a Gamepad API é varrida a cada frame. Cada índice novo vira um `PadDevice`, então dá para conectar controles com o lobby aberto. Mapeamento "standard": A pula, X leve, B pesado, Y arremessa, LB/RB/LT/RT esquiva, Start pausa.
- **Teclado compartilhado:** dois mapas físicos (`e.code`, funciona em ABNT). Teclado A no padrão Brawlhalla: WASD + J leve, K pesado, L esquiva, H arma, Espaço/W pula. Teclado B: setas + Num1/Num2/Num3/Num0 (ou Del/End/PgDn/Ins).
- **Fluxo de telas:** Menu principal (Versus por vidas, Versus por tempo, Treino, Como jogar) → Seleção de lendas → Escolha de arena → Luta → Pausa/Resultados. Uma luta de CPUs roda ao fundo dos menus, e na escolha de arena ela troca para a arena em foco.
- **Seleção:** o ataque leve de um dispositivo livre ocupa o próximo slot (P1…P4). Cada jogador tem seu cursor na grade (4 lendas + Aleatório), confirma com leve e desfaz com esquiva. Os painéis mostram Força/Destreza/Defesa/Velocidade. Os menus aceitam direcional + leve/Start, esquiva/Esc para voltar, e mouse.
- **Arenas (`MAPS`):** cada uma é dado (`solids`, `soft`, `blast`, `spawnX`) mais três funções de desenho: `bg` (parallax em tela), `stage` (mundo) e `fg` opcional (neve, chuva). São quatro: Ilhas do Céu, Bonsai Nevado, Ramen Neon e Ilha da Lua.
- **CPU:** `BotDevice` escreve inputs como um jogador escreveria (aproximar, atacar, esquivar, pegar arma, recuperar). Serve para testar sozinho e para o modo demonstração.

## 6. Game feel: checklist do que já está ligado

Hitstop dos dois lados, shake proporcional, flash branco no golpe, rastro no knockback, quique no chão e na parede, squash na aterrissagem, poeira em dash/pulo/wall slide, feixe colorido no KO, câmera lenta no KO final, zoom dinâmico, número de % que treme e muda de cor (branco → amarelo → laranja → vermelho → vinho) e o modo hitboxes (tecla `'`) com estado da FSM e conteúdo do buffer em cima de cada jogador.

## 5.1 Combos e fluidez

- **Cancelamento no acerto:** quando um golpe conecta (`atk.hitAny`), depois da janela ativa o estado `Attacking` volta a chamar `actions()`. O fim do golpe vira pulo, esquiva ou outro ataque, e o buffer de 6 frames garante o encaixe.
- **Chase dodge:** acertar alguém abre `CHASE_T = 30` frames em que a esquiva aérea sempre está disponível, mais curta (14 f) e mais rápida (10 px/f), com cooldown de 40. Ela também aceita Gravity Cancel.
- **Atordoamento de combo:** `stun = (STUN_BASE 11 + impulso·1.8) · max(0.55, 1 − 0.09·(golpes−1))`. Os golpes fracos emendam em 0%, e cada golpe a mais na sequência encurta o atordoamento, então não existe loop infinito. O alvo vê "N GOLPES" sobre a cabeça e, quando escapa, aparece "COMBO N! +X%".
- **DI:** no `Knockback`, o alvo empurra a própria trajetória em 0.12 px/f² para os lados e 0.07 na vertical.
- **Movimento:** coyote time (6 f para pular depois de sair da borda), pulo curto ao soltar o botão (vy × 0.55), dash que conserva 85% do embalo no ataque e lag de aterrissagem de 2 f quando o aéreo já terminou a janela ativa.
- **Visual:** posição interpolada entre os passos de física (`ALPHA`), pose suavizada por mola (o braço da arma é exato para casar com a hitbox), rastro curvo nos golpes (`drawSwoosh`) e zoom de impacto proporcional ao impulso.

### Antispam e ataques com movimento

- **Golpe errado custa caro:** um golpe que não conecta ganha `WHIFF_LIGHT = 7` frames de recuperação (pesados: `WHIFF_HEAVY = 4`). Um golpe que conecta corta 35% da recuperação e ainda pode ser cancelado. Na prática, um golpe leve no vazio passou de 17 para 24 frames.
- **Golpes gastos (stale moves):** cada lutador guarda os últimos 8 golpes que acertaram (`STALE_LEN`). Cada repetição do mesmo golpe na fila tira 12% do dano e do impulso por escala, até o mínimo de 50%. A fila perde uma entrada a cada 150 frames sem uso. Repetir o golpe leve 8 vezes faz o dano cair de 4 para 2, e aparece "golpe gasto" no alvo.
- **Ataques que andam:** os golpes de solo sem movimento próprio dão um passo automático pouco antes de ficarem ativos (`STEP`: nlight 4.5, dlight 7 deslizando, sigs 3–6 px/f). Segurar para frente no startup mantém 50% da corrida (`ATK_WALK`), e o atrito do golpe é suave (0.9). Os aéreos têm 90% do controle aéreo. O ataque lateral feito na corrida avança cerca de 90 px.
- **Rastro de velocidade:** em dash, esquiva com direção ou acima de 9.5 px/f, o lutador deixa silhuetas fantasmas (`ghosts`) da própria pose, que somem em 10 frames. Nos golpes com avanço, a pose muda para uma passada larga com o tronco inclinado.

### Sequências, golpes de vários acertos e dash

- **Sequências (`next`):** um golpe pode apontar para a continuação. Apertar o mesmo botão em qualquer momento do golpe agenda a continuação (`queued`), que só sai se o golpe atual acertou e já está no fim da janela ativa. Golpe errado não continua e ainda paga a recuperação extra. Leves: Punhos jab → jab → gancho, lateral → chute giratório, baixo → chute subindo. Espada corte → corte reverso → estocada, rajada lateral → corte ascendente, rasteira → lançador. Martelo pancada → varrida, golpe lateral → giro. Pesados com continuação: Kara (Punhos lateral), Torvo e Iara (Espada lateral), Brasa (Espada baixo).
- **Golpes de vários acertos:** os hitboxes têm janela `t:[início,fim)` e grupo `g`. Cada grupo acerta o alvo uma vez (`hit` guarda `slot:grupo`). Os acertos de ligação (`L(...)`) têm impulso fixo baixo, atordoamento fixo de 16 f, hitstop de 3 e arrastam o alvo com 85% da velocidade do atacante. Eles não contam para o desgaste do golpe, e o último hitbox lança. Exemplos: rajada lateral da Espada (3 acertos), giro aéreo (3), redemoinho da Iara (4), rajada de fogo da Brasa (4), terremoto duplo do Torvo.
- **Arco do golpe (`swing`):** cada golpe define de onde até onde o braço gira. Isso permite golpes de revés, estocadas retas, ganchos e giros completos, e o rastro curvo acompanha o sentido do giro.
- **Efeitos de elemento:** cada lenda tem cor e elemento em `LOOKS` (Kara cristais, Torvo pedras, Iara gotas, Brasa brasas). Pesados soltam partículas do elemento dentro da hitbox ativa e uma explosão no acerto. Há brilho de carga no início do pesado, onda de choque nos golpes `shock` e um corte branco nos acertos de espada.
- **Dash:** no chão, esquiva + direção (ou toque duplo) entra em `Dashing`. O dash dura 12 f, começa a 15.4 px/f e desacelera até a velocidade de corrida. É ilimitado, com `DASH_CD = 9` f entre um início e outro, então dá para encadear e trocar de lado (dash dance). Atacar ou pular durante o dash mantém o embalo. A esquiva neutra no chão continua sendo a esquiva parada (com cooldown).
- **Ambientes:** cada arena recebeu uma camada animada (`env`). Céu: raios de sol, nuvens à deriva, cachoeiras, pássaros e pólen. Bonsai: aurora, névoa, pétalas, vaga-lumes e lanternas tremulando. Ramen Neon: holofotes, painel com cor cíclica, placa piscando e respingos de chuva. Lua: estrela cadente e poeira luminosa. Todas têm vinheta e sombra de contato sob os lutadores.

## 6.1 Visual dos personagens

As lendas são humanas, em estilo chibi, desenhadas por código com contorno de cartum. `drawFigure(L, cor, {pose})` monta um esqueleto simples: pernas e braços de dois segmentos (coxa/canela, braço/antebraço), tronco que inclina pelo quadril e cabeça grande com rosto em 3/4. `poseOf(p)` traduz o estado da FSM em ângulos: parado (respiração), corrida (ciclo pela distância percorrida), subida/queda/fast fall, wall slide, esquiva agachada, ataque (o braço da arma segue `weaponPose`) e dano (braços para cima, giro no knockback). Cada lenda tem paleta e silhueta próprias em `LOOKS`: Kara (rabo de cavalo roxo), Torvo (viking de capacete com chifres e barba), Iara (cabelo chanel turquesa) e Brasa (cabelo de fogo animado). A faixa da cintura usa a cor do slot (P1–P4).

## 7. Próximos passos sugeridos

1. Sprites e animações reais no lugar das cápsulas: trocar `drawPlayer`, que já recebe estado, frame do ataque e pose da arma.
2. DI (direcionar o knockback) e tech no chão (esquiva ao quicar).
3. Mais mapas: `STAGE` já é dado (sólidos, plataformas, blast zones e spawns).
4. Rollback netcode no futuro: o passo fixo determinístico e o input como dado já preparam isso.

## 8. Torneio online

**Onde ficam os dados.** O torneio usa a capability `db` do artifact. Cada torneio é um documento `torneios/<id>`:

```
{ name, max (4–16), stocks (vidas nas fases: 1–3), status: inscricoes | andamento | fim,
  host: <id do criador>, created,
  entries: { <id>: { nick, legend, at } },          // sair = entries.<id> = null
  matches: { r<rodada>m<i>: { a, b, w, sa, sb, stocks } },
  rounds, size, champion }
```

As gravações usam `update` com objetos aninhados, que o banco mescla campo a campo. Por isso duas inscrições simultâneas, ou dois resultados de partidas diferentes, não se sobrescrevem.

**Chaveamento.** O criador inicia o torneio com no mínimo 4 inscritos. A ordem é sorteada e o chaveamento usa a próxima potência de 2 (4, 8 ou 16 vagas). Na primeira rodada, a posição `i` enfrenta a posição `P−1−i`, e quem fica sem adversário passa direto. O vencedor de `rRmI` vai para `r(R+1)m(I/2)`, no lado `a` se `I` for par e no lado `b` se for ímpar. Todas as partidas são 1x1, as fases usam as vidas escolhidas na criação e a final é sempre com 3 vidas. Quando a final termina, o torneio vira `fim` e grava `champion`.

**Partida online** (capability `room`). Os dois jogadores entram na sala nomeada `t<id><partida>`. A simulação é autoritativa no jogador A:

- **A (anfitrião):** roda a simulação normal. A cada passo publica um retrato compacto do estado na própria presença (`presence.st`: posição, velocidade, estado, golpe e frame, dano, vidas, arma, itens e os últimos 12 eventos de acerto ou KO). O jogador B vira um `RemoteDevice`.
- **B (convidado):** não simula. Envia na presença `inp = { h: botões segurados (bitmask), c: contadores de toques por ação }`. Os contadores garantem que nenhum toque se perca, porque a presença é agregada em ~30 Hz. O B aplica o retrato com suavização e prevê no máximo 6 quadros sem dados novos. Os eventos de acerto e KO geram as faíscas e os sons do lado dele.
- **Fim:** o anfitrião detecta o vencedor, publica `over`, grava o resultado no `db` (`reportResult` avança o vencedor) e as duas telas mostram o resultado com "Voltar ao torneio". Se o oponente sumir por 4 s, a partida é cancelada e pode ser jogada de novo.
- A simulação continua mesmo com a aba do anfitrião oculta.

**Alternativas sem rede.** "Jogar aqui (mesmo PC)" roda a partida localmente (Teclado A/controle 1 contra Teclado B/controle 2) e grava o resultado. O criador do torneio pode registrar um vencedor manualmente (W.O.).

**Permissões.** Para se inscrever e jogar, cada pessoa precisa de acesso de Colaborador (Contributor) ou mais no compartilhamento do artifact. Quem só pode ver lê o chaveamento, mas não escreve.

## 9. Armas por lenda, orbes e novas armas

- **Par de armas:** cada lenda tem duas armas (`WEAPON_PAIRS`): Kara Espada + Foice, Torvo Martelo + Machado, Iara Lança + Arco, Brasa Manoplas + Espada, Kael Espada + Foice, Sora Manoplas + Lança. O spawner solta **orbes**. Ao pegar um, a lenda recebe `weapons[wIdx % 2]` e `wIdx` avança, então os orbes alternam entre a primeira e a segunda arma. O contador sobrevive à perda de vidas. Arma arremessada some ao cair. O HUD mostra "arma atual › próxima".
- **Armas novas:** Lança (alcance longo, ponta "em cheio", giro de hélice no ar, estocada para baixo), Machado (golpes em arco pesados, redemoinho), Manoplas (rajadas rápidas de vários acertos), Foice (puxa o adversário com ângulo invertido, giros completos) e Arco (projéteis: tiro reto, leque de 3, tiro baixo, tiro diagonal para baixo).
- **Ponto ideal (`SW(...)`):** um hitbox marcado como `sweet`, colocado antes do hitbox comum no mesmo grupo. Ele ganha a prioridade, aplica mais dano e impulso e mostra "EM CHEIO!".
- **Projéteis (`proj`):** `P(frame, x, y, vx, vy, dano, kb, escala, ângulo, {g, life, pierce, big, kind})` dispara em `game.shots`. O projétil acerta cada alvo uma vez, não congela o atirador e não gasta o golpe, e golpes só de projétil não pagam a recuperação extra de erro. `kind: 'wave'` é a onda em meia-lua, colorida e atravessando alvos. Os projéteis entram no estado da partida online.
- **Assinaturas das armas novas:** `SIGSETS[arma].A` (técnico) ou `.B` (força). Cada lenda pega o seu estilo com ajuste de ritmo e dano (`SIG_STYLE`).
- **Kael, o Vigia** e **Sora, a Libertá:** especiais próprios via `heroSigs` com alcance por arma.
  - **Pesado neutro:** espiral subindo, com vários acertos.
  - **Pesado lateral:** dash com 3 cortes, que emenda (pesado de novo) na onda em meia-lua azul ou roxa.
  - **Pesado para baixo:** espinhos de cristal brotando do chão em 3 ondas que se afastam.

  Visual: Kael tem cabelo preto espetado, cachecol azul com duas pontas ao vento, casaco escuro e olhos azuis. Sora tem rabo de cavalo alto branco com mechas lilás, top cropped com a barriga à mostra, calça escura e olhos roxos.

## 10. Visual adulto, sangue e desempenho

**Visual**
- Proporções menos infantis: a cabeça foi reduzida a 84%, o tronco ficou 10% mais alto e as pernas passaram de 15 para 16,5 px por segmento, mantendo a mesma hurtbox.
- Contorno quase preto, sombra no lado de trás do tronco, sobrancelhas marcadas e ferimentos (cortes no tronco e no rosto) que aparecem conforme o dano passa de 50%.
- Menus em aço escuro com faixa vermelha, tipografia condensada (Barlow Condensed), vinheta mais densa e granulação de filme leve.

**Sangue** (botão "Sangue ligado/desligado", lembrado no navegador)
- Cada acerto espirra gotas na direção do golpe, em quantidade proporcional ao impulso, com gravidade.
- Gota que cai em chão ou plataforma vira mancha, que dura cerca de 15 s e some aos poucos (no máximo 160 manchas).
- O KO solta uma explosão de sangue, e lutadores acima de 90% pingam sangue.
- Na partida online, o sangue é gerado localmente a partir dos eventos de acerto.

**Desempenho**
- Céu e vinheta viram imagens prontas por tamanho de tela (`skyCache`).
- As camadas estáticas de parallax são pré-renderizadas uma vez (`cached`): nuvens, ilhas, cordilheiras e prédios com milhares de janelas e letreiros. Só as partes animadas (dirigível, carros, névoa, letreiro cíclico) são desenhadas ao vivo.
- Brilhos usam um sprite por cor, e estrelas, neve, pétalas e poeira são desenhadas em lote.
- O canvas é opaco, a resolução interna vai no máximo a 1920 px e há um teto de 600 efeitos.
- **Qualidade adaptativa:** se o quadro custa mais de ~11 ms em média, a resolução interna cai 15% (até 55%). Quando sobra folga, ela volta a subir. A granulação só aparece com qualidade alta.
- Num navegador de teste sem placa de vídeo, o custo do quadro em tela de alta resolução caiu de 29–55 ms para 13–28 ms. Com aceleração de vídeo o custo é bem menor.

**Equilíbrio**
- O atordoamento dos acertos de ligação (multi-hit) também diminui ao longo do combo, para que nenhuma sequência fique infinita.
- Flechas leves passaram de 4 para 3 de dano (o leque, de 3 para 2 por flecha), perdem velocidade com a distância, e atirar o leve custa 4 quadros a mais. Isso reduz o abuso de ficar atirando de longe.

## 11. Modo História: "A Fenda"

**Lore.** Na Noite Celeste, há dez anos, a Fenda costurou pedaços de cinco mundos: Aeris (céu), Nordheim (gelo), Neo-Kairo (cidade neon), Shirayuki (monastério nevado) e Lunária (Ordem Lunar). Gui foi encontrado na borda da Fenda e criado pelo Mestre Varek no Templo do Limiar. A Lâmina da Fenda só obedece a ele.

Cada lutador tem um motivo para caçar Gui, e cada vitória revela uma pista:

| Capítulo | Lutador | Motivo para caçar Gui | Pista revelada |
|---|---|---|---|
| Ilhas de Aeris | Kara | Honra do clã: disseram que a lâmina foi roubada de Aeris | A máscara do mensageiro tinha a espiral do Templo |
| Ruínas de Nordheim | Torvo | Os tremores que engoliram a aldeia dele | A Fenda nasceu na montanha das lanternas vermelhas |
| Neo-Kairo: Arena | Brasa | Recompensa do Sindicato Rubro | O Sindicato paga tributo a "o Guardião" |
| Neo-Kairo: Docas | Iara | Contrato para entregar Gui vivo | O contrato tem o selo do Limiar |
| Shirayuki | Sora | Quer a lâmina para viajar entre mundos | O diário de Varek descreve a "Convergência" |
| Lunária | Kael | Lei da Ordem: todo poder da Fenda deve ser selado | Varek foi expulso da Ordem, e a Noite Celeste foi o ritual dele |

O vilão é Varek, o mestre: ele abriu a Fenda para fundir os mundos sob sua lei, os pais de Gui morreram no ritual, e ele criou Gui para usá-lo como chave.

**Estrutura** (`NODES`)
- O prólogo é um treino contra Varek, sem armas.
- Depois vêm três regiões livres: Aeris, Nordheim e a Arena, com as Docas logo depois da Arena.
- Shirayuki abre quando essas três regiões e as Docas estão vencidas. Depois vem Lunária.
- O final é no Coração da Fenda.
- O mapa de jornada (`#scrStory`) mostra os nós e as ligações em SVG, com os estados vencido, aberto e trancado.

Cada nó tem:
- `pre`: cena antes da luta.
- `post`: cena depois da luta.
- `lvl`: nível da CPU, de 1 a 5. Ele encurta o intervalo entre ataques e aumenta as esquivas.
- `stocks`: vidas de cada lado.
- `unlock`: o que a vitória libera.

**Chefe final.** Varek começa com a Lâmina. Ao perder a primeira vida, toca a cena "Convergência" no meio da luta, e ele volta:
- com velocidade de 1,15 e peso de 1,35;
- causando 1,2x de dano;
- com a CPU no nível 6;
- com uma aura;
- com espinhos da Fenda brotando do chão a cada ~3 s, perto do Gui, com aviso de 50 frames.

**Gui e Varek**
- Gui usa a Lâmina da Fenda nos dois slots. Os golpes:
  - (simplificado na seção 12) leve lateral é uma investida para a frente, sem teleporte;
  - estocada que sai de um portal (`portal`) no fim da sequência de leves;
  - teleporte para as costas do inimigo (`tpBehind`) no pesado lateral, que emenda na meia-lua violeta;
  - espiral subindo e espinhos.
- Varek usa Lâmina e Foice. Os golpes:
  - pilar da Fenda;
  - três esferas teleguiadas (`orb`);
  - espinhos largos.
- Os dois só aparecem no Versus depois de terminar a história. Eles ficam fora do torneio online (`BASE_N`) para que todas as máquinas tenham as mesmas lendas.

**Cenas** (`playCut` e `drawCut`). Cada cena é uma lista de falas `{s, side, t, pose, fx, big, sfx, wound}`, ou de narração, ou de `vs`. O que aparece:
- A arena congelada ao fundo, escurecida.
- Um painel diagonal na cor de quem fala, com retícula de mangá.
- O personagem gigante entrando de lado, com poses próprias (`CUT_POSES`).
- O texto de efeito "ゴゴゴゴ" ou "ドドドド" (fonte Dela Gothic One), linhas de velocidade e tremor.
- O quadro de impacto invertido (`difference`) e o clarão.
- A caixa de texto com o nome do personagem e efeito de digitação, além das faixas pretas de cinema.

J, Enter ou clique avançam a fala. Esc pula a cena.

**Progresso e desbloqueios** (`localStorage 'pc-historia'`). O jogo guarda os capítulos vencidos, as lendas, as arenas e as entradas do Arquivo da Fenda.
- O prólogo libera o Templo do Limiar e o capítulo de Nordheim libera as Ruínas de Nordheim.
- O final libera Gui, Varek e o Coração da Fenda.
- Cada capítulo libera a ficha de lore daquele personagem no Arquivo (`#scrLore`).
- "Recomeçar história" zera os capítulos, mas mantém os desbloqueios.
- As arenas trancadas não aparecem na escolha de arena nem no sorteio (`availMaps`/`randMap`).


## 12. Motor 3D (Three.js, 2.5D)

A simulação não mudou: física, combate, rede e história continuam no plano XY, em px, determinísticos. O que mudou é **todo o desenho**, que agora é 3D. O renderizador só lê o estado do jogo.

**Estrutura**
- `#gl` (WebGL, Three.js r128) fica embaixo; `#cv` (2D, transparente) fica por cima com HUD, etiquetas P1/P2, textos de combo, hitboxes de depuração e cutscenes.
- `initR3()` cria tudo uma vez. Sem `THREE` ou sem WebGL, `R3=false` e o jogo usa o renderizador 2D antigo, que continua no arquivo.
- Eixos: X = x da simulação, Y = −y, Z = profundidade (o palco tem ~300 de fundo; jogadores ficam em z=0).
- Câmera: `placeCam3(x, y, zoom, tilt)` converte o `cam` 2D para uma câmera perspectiva de 32°, com distância calculada para que a área visível bata com a do 2D (as hitboxes continuam coerentes com o que se vê).
- Pós-processamento: `UnrealBloomPass` + passe de gradação (contraste, saturação, vinheta e aberração cromática que pulsa nos impactos). Bloom e sombras desligam sozinhos quando `QUAL<0.7`.

**Personagens** (`buildRig`)
- Esqueleto com os mesmos ângulos de pose do 2D (`tF,kF,aF,eF,wF,lean,crouch`...), então todas as animações e golpes existentes funcionam sem alteração: `applyPose` só copia os ângulos para as juntas.
- Material toon (3 faixas) com contorno em espaço de câmera (largura fixa, independente da escala da peça).
- Detalhes por lenda: cabelo com correntes que balançam (rabo de cavalo, cachecol), chifres, chamas animadas da Brasa, manto do Varek, ombreiras, cinto, punhos, olhos com brilho.
- Virada suave (o personagem gira de frente para a câmera e espelha no meio do giro), inclinação pela velocidade, respiração parada, cabeça acompanhando o oponente, brilho na cor da lenda durante o carregamento de pesados, piscada branca ao levar golpe, translucidez na esquiva.
- Armas 3D (`weaponMesh`) para as 8 armas, na mão; armas arremessadas, flechas, ondas e orbes também são 3D.
- Rastro do golpe (`makeRibbon`): fita aditiva que segue o arco real da arma.

**Efeitos** (`fxTo3`)
- Toda a lista `fx.list` é convertida a cada quadro em duas malhas instanciadas (normal e aditiva, até 1800 cada) com formas no shader (suave, anel, losango, gota). Espinhos (`spike`) são cones instanciados de verdade, ondas de choque são anéis deitados no chão, sangue no chão vira decalque.
- Os 3 clarões mais recentes acendem luzes pontuais na cena; o bloom e a aberração cromática pulsam com eles.

**Arenas** (`buildMap3`) — uma por mapa, construída só na primeira vez:
- Ilhas do Céu: ilha de rocha flutuante, árvores, nuvens se movendo, ilhas ao longe.
- Bonsai Nevado: bonsai gigante, pinheiros, montanhas nevadas, neve caindo.
- Ramen Neon: placa de neon, torres com janelas, letreiros, chuva.
- Ilha da Lua: lua cheia, estrelas, mar, plataformas em cordas, vaga-lumes.
- Templo do Limiar: dojo com telhados, torii, cerejeiras, pétalas, pôr do sol.
- Ruínas de Nordheim: casa longa, colunas quebradas, fogueira, nevasca e relâmpagos.
- Coração da Fenda: anéis girando, rasgo de luz, fragmentos de outros mundos flutuando.

**Retratos, miniaturas e cutscenes**
- Um segundo `WebGLRenderer` (`R3.shot`) desenha retratos da seleção, o herói do menu e os personagens gigantes das cutscenes; o resultado é copiado para o canvas 2D. As cutscenes usam a arena 3D como fundo e mantêm painéis, linhas de velocidade, ゴゴゴ e texto em 2D por cima.

**Lâmina da Fenda simplificada**
- Leves: sequência neutra de 2 golpes (o 2º alcança pela Fenda), leve lateral é uma investida para a frente. Nada de teleporte nos leves.
- Assinatura lateral: atravessa a Fenda para a frente (sem trocar de lado) e solta a onda.

**Testes com 3D**: a CDN não é acessível no container de testes. `testes/pw3d.js` (carregar com `node -r ./pw3d.js teste.js`) faz o Playwright servir o Three.js local (`THREE_DIR` = pasta do pacote `three@0.128.0`, obtido com `npm pack three@0.128.0`) e liga o WebGL por software.
