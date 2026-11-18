# Pancadaria Celeste: A Torre da Fenda

Third-person action game (souls-like) in a single HTML file, with Three.js r128. The previous version (2.5D platform fighter with local versus and online tournament) is kept in `versoes/plataforma-2.5d.html`, with its doc in `versoes/ARQUITETURA-plataforma.md`.

## 1. Overview

- **Mode of play:** player versus boss in a circular arena (radius `ARENA_R = 900`), free camera or lock-on camera.
- **Combat:** Sekiro-style **health + posture**. Deflecting at the moment of the hit (弾き) fills the boss's posture. Full posture or zero health → **deathblow** (斬). Perilous attacks (危) by type.
- **Progression:** the **Tower of the Rift** (8 floors, Mortal Kombat-style ladder), JoJo-style 3D intro cutscene for every fight, a rank (S+ to C) per fight, **fragments** to buy relics (permanent perks), defeated bosses become playable.
- **Units:** a character is about 100 tall (head at ~70). Y up. Fixed 60 Hz step with interpolated rendering.

## 2. Code structure (in the order it appears in the file)

| Block | Contents |
|---|---|
| `LOOKS`, `LORE`, `sfx` | character appearance, lore texts, synthesized sound (WebAudio) |
| renderer | `initR3()`: WebGL, shadows, sky shader, `EffectComposer` with bloom + **grade pass** (contrast, saturation, vignette, chromatic aberration, and cutscene effects: `manga` posterization/halftone, `inv` inversion, `tint`, `red` damage flash, `gray` death) |
| particles | `makeParts` / `E()`: instanced billboards with modes 0 (rotation), 1 (stretched along velocity: sparks, blood) and 2 (lying on the ground: shockwaves, decals). `fx` simulates particles, blood decals and floating texts |
| `lib3d` | toon materials, camera-space outline, `buildRig` (procedural characters), `applyPose`, `weaponMesh`/`setWeapon`, scenery helpers (tree, pine, mountain, tower, lantern, column, roof, island) |
| `ARENAS` | 7 circular arenas: Temple, Aeris, Neo-Kairo, Nordheim, Shirayuki, Lunária, Heart of the Rift. Each defines sky, fog, lights, bloom, sun direction and animations (`ups`) |
| `CHARS`, `STANCE`, `ANIM`, `JOJO`, `POSES` | characters, stance per weapon class, attack keyframes (start→end), JoJo poses for intros/victory |
| moves | `M(anim,wind,act,rec,dmg,post,range,arc,opts)`. `playerMoves(weapon)` builds the player kit; `BOSS[id].moves` holds each boss's moveset |
| `SAVE` / `PERKS` | local save (`localStorage 'pc-torre'`) and relics |
| input | keyboard, mouse (pointer lock) and gamepad, with an 8-frame buffer (`pressedWithin`) |
| `Fighter` | state machine shared by player and boss |
| `resolveHit` | hit, block, deflect, mikiri, perfect dodge, jump over a sweep |
| hazards | projectiles (with homing), shockwaves, spikes with a warning |
| `bossThink` | boss AI |
| camera | `updateCam` (lock-on / free / cinematic), `shake`, `punch` (FOV + aberration), `slowmo` |
| `poseFor` / `syncFighter` | state → pose → rig, weapon trail (`makeTrail`) |
| HUD | bars, posture, deathblow reticle/dot, combo, 危 kanji, big texts |
| cinematics | `cineStep` + `drawCine`: intro, `exec` (deathblow), `phase` (Varek phase 2), `win` |
| tower / screens | `TOWER`, `startFight`, `finishFight`, `rankOf`, menus, background scene (`attract`) |

## 3. Fighter (`Fighter`)

States: `idle` (movement), `atk`, `guard`, `recoil`, `hit`, `broken`, `dodge`, `heal`, `dead`, `exec`, `execd`, `intro`, `win`.

- **Attack:** `wind` (startup, scaled by `windMul` for bosses, plus `delay` for feints) → `act` (active frames, hit tested every frame by range + arc + height) → `rec`. `lunge` pulls the attacker toward the target, stopping at half the range (a magnetism effect). `hits>1` makes flurries.
- **Player:** combo of 3–4 lights by weapon class (`blade`, `fist`, `spear`, `heavy`), a chargeable heavy attack, an air attack, an attack out of a dodge, and a **kick** after jumping a sweep (big posture damage).
- **Posture:** regenerates after 45 frames without taking posture damage, faster with high HP and while guarding.

## 4. Hit resolution (`resolveHit`)

1. Defender with i-frames → miss. Within the first 9 frames of a dodge it counts as a **perfect dodge** (slow motion, posture to the attacker).
2. `sweep` and defender in the air → miss (+ kick available).
3. Defender in `guard`, facing the attacker, and the attack is not `grab`:
   - **Deflect** if `guardT ≤ DEFLECT_WIN` (15 frames; +9 with the *assisted parry* option, on by default; +3 with the Watcher's Eye relic). The boss's weapon **glints** 11 frames before the hit (white = normal, red = perilous) to show the timing. No damage; the attacker's posture goes up (×2.1 if `thrust` = **mikiri**). Sparks, hitstop, chain counter.
   - Otherwise **block** (not valid against `thrust`): posture goes up for the defender.
4. Clean hit: damage + half the posture, blood, numbers, hitstun. Boss at 0 HP → `broken` with a long timer (deathblow).

Bosses defend with probability `guardP` and deflect with `deflP`; after 2–3 blocked hits they counterattack fast (`bossCounter`).

## 5. Boss AI (`bossThink`)

Circles the player at its preferred distance (`pref`) during the `cool` cooldown; then picks a move by weight among those whose `minD..maxD` fits the distance. Moves chain via `next` with probability `chainP`. Punishes healing. Per-floor scaling in `startFight` (`lvl` 0–7): startup, damage, HP, posture, aggression, guard/deflect, turn rate while winding up.

Specials: Kara (aerial dive, dash thrust), Iara (perilous thrust, triple arrows), Torvo (sweep, slam with a shockwave you jump), Brasa (flurry, burning grab, fire nova), Sora (feints, spin sweep), Kael (delayed attacks, high deflect rate, iai from long range), Varek (teleports behind, homing orbs, thrust; **phase 2** adds spikes and a sweep).

## 6. Cinematics

- **Intro (JoJo):** 0–80 low-angle shot rising up the boss; 80–130 orbit whip with speed lines; 130–330 dutch angle + manga filter tinted with the boss's color + name splash + dialogue line; 330–420 the player; 420 "VS"; then "始め LUTE!". Skippable with J/Enter.
- **Deathblow:** side camera, slow motion, inversion flash, blood, `斬`. With extra lives the fight continues (Varek goes to phase 2 with `まだだ`).
- **Victory:** orbit around the player in a JoJo pose, `勝利`, then the results screen with a score count-up and a rank stamp.
- **Death:** gray screen, `死`, one resurrection per fight (`回生`).

## 7. Score and progression

`rankOf`: base 1000 + deflects, mikiri, chain, perfect dodges, jumps, combo − damage taken − time (+600 for no damage). S+ ≥ 2300, S ≥ 1800, A ≥ 1400, B ≥ 1000. Fragments = score / 8. Relics: extra gourd, iron posture, rift edge, watcher's eye, Aeris blood.

## 8. Tests

`testes/` (Playwright, with `node -r ./pw3d.js`, which serves a local Three.js; see `LEIA-ME.txt`):
- `fluxo.js`: menu → tower → intro → fight with keyboard input, screenshots.
- `robo_torre.js <floors>`: a bot that deflects on timing and attacks in the openings; plays whole fights per floor and checks victory, rank, unlocks and the save (e.g. `node -r ./pw3d.js robo_torre.js 0,1,2,3,4,5,6,7`).

## 9. Fluidity and extra mechanics

- **Cancels:** the player can cancel the start (first 60% of the windup) and the recovery of an attack into guard or dodge; can also leave `recoil`/light `hit` straight into guard. Attack presses are queued from the start of the active frames and the next combo hit comes out right after them. Player recovery is 28% shorter. Movement continues slowly during attacks.
- **Riposte (反撃):** attacking up to 26 frames after a deflect fires a hit with 45% of the startup, +70% posture and +25% damage.
- **Rift Time:** a perfect dodge makes the boss update every other frame for 70 frames (purple filter) and also opens a riposte.
- **Full charge** (≥30 frames) on the heavy attack ignores the boss's guard (破).
- **Camera:** over the shoulder when locked on (62 to the side), faster lock-on yaw (0.14) and position (0.32). Shorter hitstop and slow motion.
- **Visuals:** rim light (fresnel) on the character materials using the arena's rim color, dust from footsteps, impact star, softer blood stains.

## 10. Mobility, Arts and weapon clashes

- **Mobility:** double jump (`jump()`, with a flip and a ring of energy), air dash (`airDash`, once per jump, nearly no gravity), circular dodge (`orbit`: with lock-on, a sideways dodge circles the boss), sprint attack (`moves.sprint`, sprint + attack), cancelling an attack's recovery into a jump.
- **Energy and Arts:** `P.art` (0–100, starts at 50). Gains: hit +5, deflect +13, mikiri +25, perfect dodge +15, clash +15. Each Art costs 50 and grants i-frames during its startup. `U`/`1` and `I`/`2` (Y and LT on a gamepad). Arts by weapon class (`playerMoves().arts`):
  - blade: *Corte da Fenda* (`dash` 30, goes through the boss with `passThru`) and *Lua Crescente* (360° spin + a homing crescent).
  - fist: *Punho Meteoro* (6 burning punches) and *Erupção* (jump + shockwave on landing).
  - spear: *Maré Perfurante* (`dash` thrust) and *Redemoinho* (spin + 3 crescents).
  - heavy: *Salto do Norte* (slam with a shockwave) and *Furacão* (5-hit spin).
  - Anime-style cut-in (`fi.cutin`), slow motion and a flash when an Art is used.
- **Clash (激突):** in `checkHit`, if the defender is in the active frames (or within 4 frames of them) of an attack aimed at the attacker, `clash()` happens instead of a hit: sparks at the midpoint between the two blade tips, a ground shockwave, hitstop and slow motion. A riposte, a charge ≥20 or an Art wins the clash (the boss is pushed back with big posture damage). Otherwise both recoil and the player gets a riposte.
- **Real contact:** `contact()` uses the world position of the weapon tip (`tip`). When the defender is guarding, it uses the midpoint between the two blades, so sparks come out where the weapons meet.
- **Real spin:** `spin` attacks turn the whole body (`root.rotation.y`) during the active frames. A deflect plays a quick weapon flick (`flick`).

## 11. Music, boss fury and Endless Ascension

- **`MUSIC`:** procedural WebAudio sequencer (16th notes with a 150 ms look-ahead). Each arena has a root note, a scale (Japanese *in*, pentatonic, minor...), a tempo and a timbre. Layers: drone, bass, taiko, percussion and plucked notes. The intensity (`int`) rises in a fight, in the boss's fury and when your HP is low, and drops in menus. It follows the "Som" (sound) button.
- **Fury (`FURY`):** when a boss drops below 50% HP (not in the tutorial), it enters a fury: a cut-in with the name of its signature attack, embers in the boss's color, faster startups, more aggression, and the signature attack fires right away and stays in its moveset. Kara: *Tempestade de Aeris* (3 perilous thrusts + a dive). Iara: *Maré Alta* (7 arrows). Torvo: *Martelo do Norte* (double slam, shockwaves you jump). Brasa: *Inferno Rubro* (a big nova + a grab). Sora: *Dança Livre* (sweeps + a dive). Kael: *Lua Cortante* (double iai). Varek: *Olhos da Fenda* (5 homing orbs).
- **Critical hit:** a riposte, a charge or an Art shows gold numbers with "!", a ring and a screen shake.
- **Endless Ascension (`startEndless`):** random bosses (never the same twice in a row), level `2+n`, two lives from the 5th onward. You keep part of your health (current + 50%), the energy bar refills, and each fight gives fragments. Dying ends the run; the record (`SAVE.ascBest`) shows on the title screen. Test: `testes/ascensao.js`.

## 12. Story scenes (lore)

- `STORY[floor]` (in `storydata.js`, assembled into the HTML) has `pre`, `post` and, on the final floor, `mid`. Beats: `nar(text,{fx,sfx})` for narration and `say(id,side,text,{pose,big,fx})` for dialogue. Effects: `flash`, `invert`, `shake`, `speed`, `menace`, and big kana (`big`).
- Flow on a tower floor: **pre story** → JoJo intro → fight → (final floor: **mid** story when Varek loses his 1st life → `phase`) → deathblow → victory → **post story** (the defeated boss kneels and reveals the next clue) → results. "Restart" skips the scenes.
- `storyStep`/`drawStory`: the camera frames whoever is speaking in the arena itself (L = player, R = boss; an absent character speaks over a wide shot), with a dramatic pose (`CUTP`), a 3D portrait (`portC`), a name tag, typewriter text, ▶. J/Enter advances (the first press completes the text), Esc skips the scene.
- Story order: Prologue (Varek, Temple) → Aeris (Kara) → Nordheim (Torvo) → Neo-Kairo Arena (Brasa) → Docks (Iara) → Shirayuki (Sora) → Lunária (Kael) → Heart of the Rift (Varek) → ending. The tower follows this order.

## 13. Fluidity and finish (round 2)

- **Spring animation:** `syncFighter` drives each joint with a damped spring (`F.pv`), so movements accelerate, slightly overshoot the pose and settle. Faster during attacks, hits and dodges. Rendering is independent of the monitor's refresh rate (`R3.dt60`).
- **Landing:** squash and stretch on landing (`squash`), proportional to the fall speed.
- **Camera:** FOV opens with speed (sprint, dash), a light breathing sway outside cutscenes, and **depth of field** (`BokehPass`) in cutscenes, focused on the target.
- **Grading:** split toning per arena (shadows tinted with the fog color, highlights with the sun color) and a subtle film grain (on high quality).
- **Atmosphere (`addAtmos`):** 3 layers of ground mist with a scrolling texture, soft light shafts that pulse, and trees swaying in the wind (`SWAY`).

## 14. Gui as the fixed protagonist and the Evolution system (`evo.js`)

- The player is always **Gui** (tower, Ascension, duel, training). Bosses are no longer unlocked as characters; instead, each tower floor cleared **teaches Gui a technique** from that boss.
- Saved in `SAVE.up = {vit,post,str,rift,focus,gourd,tech[],blade}`. Old relics (`SAVE.perks`) are refunded as fragments on load.
- **Attributes** (cost 120/250/420/650/900 per level; the gourd costs double): Vitality +12% HP, Posture +12%, Strength +8% damage, Rift +15% energy gained and +10 starting energy, Focus +1 frame of deflect window, Gourd +1 heal (max 3). Applied in `playerOpts()` and `gainArt()`.
- **Techniques** (`TECHS`, unlocked when `SAVE.floor > floor`):
  - Kara *Passo do Vento*: 2 air dashes, longer dodge.
  - Torvo *Punho do Norte*: a fully charged heavy releases a shockwave.
  - Brasa *Brasa Interior*: a riposte sets the boss on fire (`burn`: damage over time + posture).
  - Iara *Corte de Maré*: the last hit of the combo fires a homing crescent.
  - Sora *Pés Livres*: triple jump, and a jump restores the air dash.
  - Kael *Olho do Vigia*: from the 3rd deflect in a row, +60% posture.
  - Varek *Despertar da Fenda*: `O`/`3`/L3 with a full bar, 8 s of power (startups ×0.7, damage ×1.3, extra posture, speed ×1.18, golden aura).
- **Forge** (`BLADES`): 3 tiers (400/900/1500), +10% damage each, recolors the Rift Blade's glow (pink, gold, celestial) via `bladeTint`, plus the trail color and sparks at the tip from tier 2 up.
- **Gui's level** = 1 + attribute levels + techniques + 2×forge (shown in the tower and in Evolution).
- **Bosses dodge:** besides guarding, bosses can sidestep/backstep with i-frames (`evadeP`, rising with the floor, 0 in the tutorial).

## 15. Movesets and fluidity (round 3)

**Player (Gui)**
- **Directional attacks** with lock-on (first attack of the sequence): forward → `fwd` (advancing thrust), backward → `back` (cut while stepping back, `retreat`), sideways → `side` (cut with a side step, `strafe`).
- **Combo finisher:** light, light, **heavy** → `finisher` (裂: 3-hit spin + a homing crescent).
- **Heavy chain:** heavy → `heavy2` (rising cut) → `heavy3` (jump + slam with a shockwave).
- **Air combo:** `air1` → `air2` (Gui hovers in the air while cutting, `hover`) → `air` (downward thrust). Resets on landing.

**Bosses**
- `bossExtras(weapon)` gives every boss: `aa` (anti-air, only when the player is airborne), `run` (charge from a distance), `bk` (cut while stepping back when the player crowds them).
- Combos with **branches**: `next` can be a list (`pick`), e.g. Kara k2 → k3 or a flurry; Kael c2 → thrust, overhead or quick thrust; Varek v2 → overhead, perilous thrust or a teleport. Bosses don't use sweeps against an airborne player.

**Animation and camera**
- Strikes with *ease-out-back* (the weapon slightly overshoots the end of the swing, follow-through).
- Moving backward reverses the step cycle and the lean; the body **banks** into turns (`bank`, proportional to the turn rate and speed).
- Spring camera (damped spring per axis) instead of linear smoothing.
- Weapon trail with **Catmull-Rom**: 10 samples of the blade become 30 points along a continuous curve, with a smooth alpha falloff.

## 16. Expanded campaign (target: 3+ hours)

**Tower: 19 floors in 3 acts** (`TOWER[i].act`, `ACTS`, headers in the floor list).
- **Act I · The Rift** (floors 1–8): the original story.
- **Act II · The Rift's Echoes** (9–16): corrupted echoes of Kara, Torvo, Brasa, Iara, Sora, Kael and Varek (`echo:1` → purple glow, name "Echo of X", the boss's fury moves available from the start), then the **Herald** (new character: porcelain mask with the spiral, hood, robe, scythe; `BOSS.arauto`, `FURY.arauto`).
- **Act III · The Convergence** (17–19): Reborn Herald, Awakened Varek (3 lives + a mid-fight scene) and the **Heir's Echo** (`guiEco`: an evil copy of Gui with the player's style of moves, a dash-through, a crescent and a finisher), and the true ending.
- Story: `content2.js` adds 11 chapters to `STORY` (pre/post/mid). Lines from allies who aren't in the fight use `side:'N'` (wide shot + portrait). Echoes use `name` to override the name tag. The Archive gains "Os Ecos" and "Arauto".
- Each Act II/III floor cleared for the first time gives **+2 Seals (印)**.

**Ally quests (`QUESTS`, 24):** 4 per ally (Kara, Torvo, Brasa, Iara, Sora, Kael), unlocked by tower progress (`req` = floor). Each has an opening scene with the ally, a goal (`GOALS`: win, no damage, time, deflects, mikiri, chain, clashes, Arts, combo) and modifiers (`mods`: reduced HP, no Arts, no heals, deathblows). If the goal is met: fragments + Seals (1–3). If you win but miss the goal: half the fragments and "missão falhou" (quest failed).

**Seals (`SAVE.selos`):** attributes go from level 5 to level 8 (1/2/3 Seals + 1200/1500/1800 fragments) and a 4th forge, *Lâmina Convergente* (white, 1800 + 5 Seals).

**Duration estimate:** 19 floors × ~6–8 min (scenes, intro, fight and retries; Acts II/III need upgrades) ≈ 2–2.5 h, plus 24 quests × ~4–5 min ≈ 1.5–2 h, plus the fragment grind for Evolution and Ascension.

**Balance:** with no upgrades, the test bot (which deflects perfectly but does not heal, dodge or use Arts) beats Act I and the start of Act II. With an evolved Gui (`testes/robo_evoluido.js`) it beats the end of Act II and the true final boss; it only loses to Awakened Varek, whose phase-2 spikes it cannot dodge. Boss damage and HP grow more gently past level 8.
