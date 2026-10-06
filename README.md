# Epidemic-Aware Travel Optimization Demo

A zero-build static web demo for the optimizer outputs in this project. It is designed to deploy directly with **GitHub Pages**.

## What the demo shows

- Select among **Binary Edge**, **Continuous Edge**, **Binary Node**, and **Cluster** optimizers.
- Interactive directed mobility network over the physical map of the selected U.S. states, using the optimized flow matrices.
- Switch between a 30-day aggregate network and a single-day network.
- Inspect daily retained travel for the selected optimizer.
- Compare daily retained travel across all four optimizers.
- Compare infection reduction against travel removed.
- Review the experiment summary table, including Baseline and Uniform Reduction.

The dashboard uses optimized travel-flow matrices for **2020-07-30 through 2020-08-28** (30 transitions). Epidemic outcomes are evaluated from **2020-07-30 through 2020-08-29** (31 state points).

> Important: the Cluster result is not budget-matched to the other methods. It removes 86.89% of travel, while the main reference budget is 20%.

## Run locally

Because this is a static site, you can either open `index.html` directly or serve the folder:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

The charts use Chart.js. The physical state map uses D3, TopoJSON, and the public `us-atlas` state boundary dataset from jsDelivr, so an internet connection is needed when loading the page.

## Deploy with GitHub Pages

### Option A: repository root

1. Create a GitHub repository.
2. Copy these files to the repository root.
3. Push to `main`.
4. Open **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select branch `main` and folder `/ (root)`.
7. Save. GitHub will publish the demo at a `github.io` URL.

### Option B: `/docs` folder

You can also place this entire demo in a `docs/` directory and choose `/docs` in GitHub Pages settings.

## Files

```text
index.html   Main dashboard
styles.css   Responsive presentation styling
app.js       Interactions, charts, physical-map network
data.js      Preprocessed optimized flow matrices for the evaluation horizon
.nojekyll    Prevents Jekyll processing
```

## Data provenance

`data.js` was generated from the optimizer comparison output supplied for this project. The matrix node order is:

1. Pennsylvania
2. New York
3. New Jersey
4. Delaware
5. Maryland
6. West Virginia
7. Ohio
8. Virginia
9. Kentucky
10. Michigan

The summary metrics shown in the dashboard are the same values reported in the supplied comparison output.


## Optimizer comparison figure

The page includes the original saved epidemic comparison plot at `assets/optimizer_compare_infected.png`. It is shown in a full-width **Epidemic Outcome Comparison** section and can be clicked to open at full resolution.

## Flow view toggle

The demo now includes a **Flow view** selector:

- **Retained flow**: mobility that remains after the selected optimizer is applied.
- **Reduced flow**: mobility removed by the selected optimizer, computed as `original flow - retained flow`.

The physical-map arrows, selected-optimizer daily chart, and cross-optimizer comparison chart all switch together. Original daily flow is reconstructed from the continuous-edge optimizer's saved keep ratios and optimized flow matrices, matching the reported 30-day total travel of 192,956,585.
