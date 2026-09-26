# 1878: Draw the Borders

A browser game. It's 1878, the Russo-Turkish War is over, and the Congress of Berlin hands you the pen. Draw the fairest borders you can across the Balkans and try to prevent the wars to come.

## How to play

1. **Draw** border lines on the ethnographic map. A line cuts the land when it runs coast to coast or meets another line; loose ends within about 60 km snap shut.
2. **Claim** each piece for a country: make a new country, then tap or drag across pieces. Small islands join the nearest country automatically. Countries name themselves after their largest people until you rename them.
3. **Sign the Treaty** to see which states go to war, which fall into revolt, and your peace score out of 100, compared with the real Congress of Berlin.

Share your result as an image, or as a link that reopens your exact map.

## How the score works

- **Stranded minorities:** a nation's people left under a neighbour's flag raise tension between the two states.
- **Religious and ethnic tension:** hostile groups forced into one state cause unrest, and so do nations with no state of their own.
- **Holy sites and historic claims:** places such as Peć, Ohrid, Tarnovo, Constantinople and Salonica held by the "wrong" state add tension.

Each tense border and each unstable state becomes a chance of war or revolt within a generation. The score decays as the expected number of conflicts rises, rewards people living in their own nation's state, and penalises unclaimed land and countries too small to survive (under 150,000 people).

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
| `site/js/app.js` | Rendering, input, UI and sharing |

Tests run on every pull request, and the site deploys to GitHub Pages from `main` through `.github/workflows/pages.yml`.
