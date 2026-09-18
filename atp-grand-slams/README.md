# Who owns the Grand Slams? Men's tennis, 2000-2026

A two-page data website about men's Grand Slam tennis, built from ATP match results.

* **Report** (`index.html`): ten findings, each with a chart, plus a globe and a data section.
* **Dashboard** (`dashboard.html`): filters, summary numbers, four charts with measure and breakdown switches, a globe, and a table. All calculations run in the browser.

**Live site:** _add your GitHub Pages address here_  
**Author:** _add your name here_

## Where the data came from

`data/atp_matches.csv` is a ten-column subset of the **ATP Tennis 2000-2023 Daily Pull** data set by dissfya on Kaggle:
<https://www.kaggle.com/datasets/dissfya/atp-tennis-2000-2023daily-pull>

It has 68,635 rows (one main-draw ATP match each) from 3 January 2000 to 29 August 2026, with columns
`Tournament, Date, Series, Court, Surface, Round, Best of, Player_1, Player_2, Winner`. I did not change any value in this file.

Two small files of my own sit next to it:

* `data/corrections.csv` - one row: the **2019 US Open final (Nadal beat Medvedev, 8 September 2019)**, which is missing from the Kaggle file. Without it Nadal has one fewer title. Delete the file to see the effect; the scripts and the dashboard both handle its absence.
* `data/champion_countries.csv` - typed by hand: which country each Grand Slam champion is from, plus an approximate marker position for the globe. It is not part of the Kaggle data.

## Files

| File | What it does |
| --- | --- |
| `index.html` | The report page. **Generated** by `scripts/build_site.py` - do not edit by hand. |
| `dashboard.html` | The dashboard page (hand written). |
| `css/style.css` | One stylesheet and colour palette shared by both pages. |
| `js/charts.js` | Small SVG chart toolkit (bar, lollipop, line, scatter, heat map, stacked bar, checklist grid). No libraries. |
| `js/globe.js` | Dot-matrix globe drawn on a canvas, with arcs from champion countries to Slam venues. |
| `js/land.js` | Hand-drawn coarse world outline used only to place the globe's dots (works offline). |
| `js/report.js` | Draws the report's charts from the JSON embedded in `index.html`. |
| `js/dashboard.js` | Loads the CSV in the browser, applies filters, and recomputes charts, numbers and the table. |
| `scripts/build_site.py` | Reads the data, computes **every number in the report**, writes `data/report_data.json`, and renders `index.html` from the template. |
| `scripts/report_template.html` | The report's text with `{{placeholders}}` for numbers. Edit the wording here. |
| `data/atp_matches.csv` | The match data (see above). |
| `data/corrections.csv` | One added row (see above). |
| `data/champion_countries.csv` | Champion to country table (see above). |
| `data/report_data.json` | Output of the build script: every figure and chart series in the report. |

## Reproducing the report numbers

```bash
pip install pandas
python3 scripts/build_site.py      # rewrites data/report_data.json and index.html
```

Set your name by changing `AUTHOR` near the bottom of `scripts/build_site.py`, then run the script again.

To view the site locally (the dashboard needs a web server because it loads the CSV):

```bash
python3 -m http.server 8000        # then open http://localhost:8000
```

## Publishing with GitHub Pages

Repository settings > Pages > "Deploy from a branch" > branch `main`, folder `/ (root)`.

## Definitions (also in the report's data section)

* **Grand Slam match:** `Series` = "Grand Slam" (Australian Open, French Open/Roland Garros, Wimbledon, US Open).
* **Title:** the winner of a Grand Slam row whose `Round` is "The Final".
* **Career Grand Slam:** at least one title at each of the four Slams.
* **Win rate:** wins divided by matches played.
* **Streak:** consecutive Grand Slam match wins in date order; a loss resets it.
* **Tier (dashboard):** `Series` names changed in 2009, so International = ATP 250, International Gold = ATP 500, Masters = Masters 1000, Masters Cup = Tour Finals.

## Known data limits

* A full Slam draw has 127 matches; the file has 113-126 per tournament (4.4% fewer overall), so win rates and streaks are "as recorded".
* Wimbledon 2020 was cancelled and the 2026 US Open had not started when the data ends.
* The order of `Player_1` and `Player_2` carries no information (Player_1 wins 50.0% of matches).

## AI tools

The site was built with help from Claude. The data set, the questions, the findings and every number are mine to check: run the build script and compare with the dashboard.
