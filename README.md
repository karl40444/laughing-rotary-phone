# 1878: Draw the Borders

A browser game. It's 1878, the Russo-Turkish War is over, and the Congress of Berlin hands you the pen. Draw the fairest borders you can across the Balkans and try to prevent the wars to come.

## How to play

Built for phones first: the map fills the screen, the tools sit in a bar at the bottom, and it can be added to the home screen and played offline.

1. **Draw** border lines with one finger (or the mouse). A line cuts the land when it runs coast to coast or meets another line; loose ends within about 60 km snap shut. A magnifier follows your finger while you draw.
2. **Claim** the pieces: pick a country from the bar at the bottom, then tap or drag across pieces. **Press and hold** anywhere to see who lives there; use **two fingers** to move and zoom.
3. **Sign the Treaty** to see which states go to war, which fall into revolt, and your peace score out of 100.

### Daily puzzle

A new small border problem every day, the same for everyone, like Wordle or Tradle: *Serbia or Bulgaria?*, *Transylvania*, *Kosovo*, *Smyrna* and so on (16 puzzles, repeating). Each has a fixed area, two or three named states and a limit of one to three lines. You get three tries. Each try is graded against **par**, the score of a strong reference map: 🟩 at 90% of par, 🟨 at 75%, 🟧 at 50%, otherwise 🟥. Share the emoji result in one tap; played games, wins and streaks are kept on your device.

### Free play

Redraw the whole peninsula with as many countries as you like, compare your score with the real Congress of Berlin, and share the result as an image or as a link that reopens your exact map.

## How the score works

- **Stranded minorities:** a nation's people left under a neighbour's flag raise tension between the two states.
- **Religious and ethnic tension:** hostile groups forced into one state cause unrest, and so do nations with no state of their own.
- **Holy sites and historic claims:** places such as Peć, Ohrid, Tarnovo, Constantinople and Salonica held by the "wrong" state add tension.

Each tense border and each unstable state becomes a chance of war or revolt within a generation. In a daily puzzle each state stands for its whole nation beyond the puzzle area, so every state counts as a neighbour and is the homeland its people look to. The score decays as the expected number of conflicts rises, rewards people living in their own nation's state, and penalises unclaimed land and countries too small to survive (under 150,000 people).

## The data

`site/data/ethnic.js` is an original, simplified reconstruction made for this game, **not** a scholarly dataset. About 330 regional anchor points give a population density and an ethnic mix, the map is interpolated between them, and cities are added on top. The mixes draw on the Bosnian census of 1879, the Hungarian census of 1880, the Eastern Rumelian census of 1880, Romanian figures for Dobruja (1878–80), the Ottoman census of 1881/82–93, Ottoman figures for Thessaly (1877/8), and the period maps of Kiepert, Synvet and Stanford, as discussed in [Ethnographic cartography of the Balkans in the late 19th and early 20th century](https://en.wikipedia.org/wiki/Ethnographic_cartography_of_the_Balkans_in_the_late_19th_and_early_20th_century). The period sources disagree, above all about Macedonia, Thrace, Epirus and Kosovo; the game takes a middle reading.

Coastlines are from [Natural Earth](https://www.naturalearthdata.com/) (public domain) via `world-atlas`. The 1878 borders in `site/js/history.js` are traced by hand and approximate.

## Development

The game is plain HTML, CSS and ES modules in `site/`, with no build step.

```sh
npm install          # only needed to rebuild the coastline data or run tests
npm test             # engine tests (Node 22+)
npm run serve        # or any static server pointed at site/
npm run build:geo    # regenerate site/data/geo.js from Natural Earth
```

| Path | What it does |
| --- | --- |
| `site/js/grid.js` | Map grid (~5.6 km cells) and projection |
| `site/js/model.js` | Population and ethnic-mix model built from the anchors |
| `site/js/regions.js` | Turns drawn lines into walls and splits the land into pieces |
| `site/js/score.js` | War, unrest and peace scoring |
| `site/js/history.js` | Approximate Congress of Berlin borders |
| `site/js/daily.js` | Daily puzzles, par, grades, streaks and share text |
| `site/js/app.js` | Rendering, touch and mouse input, UI and sharing |
| `site/sw.js`, `site/manifest.webmanifest` | Offline support and home-screen install |

Tests run on every pull request, and the site deploys to GitHub Pages from `main` through `.github/workflows/pages.yml`.

---

# Partition (working title)

A second, separate game in `site/partition/` (served at `/partition/`). Each day you get a map of a mixed region, coloured by local majority. Draw a border that splits it into two or three territories. In each territory the largest group is the majority, and everyone else is **on the wrong side**. Lower is better.

After you submit, the game shows your score as a number of people and as a percentage. It compares that with no border at all, the best border its search found, and the **floor**: what would remain even if every square became its own country. The best score is never zero, and that is the point: people are too mixed for a line to separate them.

This is the first playable loop, with one hardcoded map: a simplified Bosnia and Herzegovina, 220 squares of about 16 km.

- **Drawing:** drag along grid lines to draw; drag back over a line or tap it to erase. Lines count once they close off a territory; loose ends show dashed. Tap inside a square to see who lives there.
- **Score:** misplaced people and share of the population. **Efficiency** is how much of the avoidable misplacement you removed, from 0% (no better than no border) to 100% (as good as the best border).
- **Daily:** puzzle #1 is 26 September 2026. The first result each day counts towards streaks and personal best (best efficiency), kept in `localStorage`. After that, "Practise again" replays without counting. Only one map exists so far, so every day uses it.
- **Share card:** efficiency bar, one purity square per territory (🟩 ≥80% majority, 🟨 ≥65%, 🟧 ≥55%, 🟥 below) and the percentages. It never shows the border.

### Data and the best border

`tools/build-partition-bosnia.mjs` builds `site/partition/data/bosnia.json`. It spreads roughly 100 municipalities, with approximate 1991 census figures (Bosniaks, Serbs and Croats only; Yugoslavs and others left out), over the grid with a 6 km Gaussian kernel. It then runs `tools/partition-solve.mjs`, a simulated-annealing search over contiguous three-territory splits with 40 restarts, and stores the best result. That result is the best found, not a proven optimum; a test checks that a quick independent search never beats it. Rebuild with `npm run build:partition` (about 10 s).

| | Wrong side |
| --- | --- |
| No border | 52.9% |
| Best 2-territory border | 45.0% |
| Best 3-territory border | 41.4% |
| Floor (every square its own country) | 38.4% |

| Path | What it does |
| --- | --- |
| `site/partition/js/engine.js` | Grid, edges, territories and scoring (pure; shared with Node) |
| `site/partition/js/daily.js` | Puzzle number, efficiency, streaks, share text |
| `site/partition/js/app.js` | SVG rendering, pointer drawing, results UI |
| `test/partition.test.mjs` | Engine, data, stored optimum and daily tests |
