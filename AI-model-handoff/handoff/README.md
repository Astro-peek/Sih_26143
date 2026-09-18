# Integrating the OceanTrace AI

This folder is a self-contained copy of the oil-spill AI. You run it as a **subprocess** and read
one JSON file. No Python knowledge is needed on your side, and it works from any language.

```
your backend  ──exec──▶  python -m oilspill.web_bridge  ──writes──▶  <out>/web.json  ──▶  you read it
```

---

## 1. What is in this folder

```
.
├── README.md                     this file
├── oilspill/                     the AI package (detection, geometry, drift, ship ranking)
├── runs/spill_unet_tiles.pt      the trained model, 94 MB (keep it at this exact path)
├── models.json                   model checksum and input/output contract
├── requirements.txt              pinned Python dependencies
├── run_demo.sh                   one-command proof it works
└── demo/
    ├── previews/*.png            what the AI sees and what it decides (open these first)
    ├── scenes/Oil_00023.tif      a real Sentinel-1 scene you can run on
    └── example_output.json       exactly what web.json looks like for that scene
```

Open `demo/previews/Oil_00023.png` before anything else. Each panel is, left to right: the raw VV
radar image, the human-labelled ground truth, the model's prediction, and an overlay where
**green = correct, red = false positive, blue = missed**. The three previews are the whole story:

| Preview | Scene | Model says | Correct? |
|---|---|---|---|
| `Oil_00023.png` | real oil slick | **detected**, 29.93 km², IoU 0.849 | yes |
| `Lookalike_00000.png` | a dark patch that is *not* oil | not flagged | yes |
| `No_oil_00000.png` | clean sea | not flagged | yes |

---

## 2. Setup (once)

Built and tested on Python 3.14; CPU-only machines are fine.

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
./run_demo.sh
```

`run_demo.sh` analyses the bundled scene and prints the detected area. If it prints
**29.93 km²**, your install is correct and matches ours.

---

## 3. The one call you need to make

```bash
python -m oilspill.web_bridge \
  --out /tmp/run_42 \
  --lat 20.83 --lon 38.91 \
  --image /path/to/scene.tif \
  --when 2026-06-12T06:00:00Z \
  --env '{"windSpeed":12,"windDir":45,"currentSpeed":0.8,"currentDir":30}'
```

**Run it with this folder as the working directory.** The model is loaded from the relative path
`runs/spill_unet_tiles.pt`, so a different cwd will fail to find it.

| Argument | Required | Meaning |
|---|---|---|
| `--out` | yes | Output directory. Created if missing. `web.json` is written inside it. |
| `--lat`, `--lon` | yes | Scene centre. Used to place the synthetic scene when `--image` is omitted. |
| `--image` | no | A Sentinel-1 **VV+VH GeoTIFF** (2 bands, Sigma0 in dB, georeferenced). **Omit it and the AI generates a synthetic scene at `--lat`/`--lon`** — that is your "Try demo" button, with no upload needed. |
| `--when` | no | Acquisition time, UTC ISO-8601. Drift is measured from this. Defaults to a fixed demo timestamp. |
| `--env` | no | Wind and current forcing as JSON: `windSpeed` (knots), `windDir`, `currentSpeed` (knots), `currentDir`. Directions are "toward" bearings in degrees. |

Set the environment variable `OILSPILL_DEVICE=cuda` to use an NVIDIA GPU. The default is `cpu`,
which is the safe choice for a server.

**Exit code 0 means success** and `<out>/web.json` exists. Any non-zero exit means the run
failed; stderr carries the Python traceback. Always check the exit code before reading the file.

---

## 4. What you get back: `<out>/web.json`

One JSON object with four top-level keys. These are real values from the bundled demo scene, and
the full file is in `demo/example_output.json`.

```jsonc
{
  "detection": {
    "detected": true,              // if false, see "When nothing is detected" below
    "confidence": 93,              // 0-100, mean model probability over the slick
    "areaKm2": 29.93,
    "centroid": { "lat": 20.826884, "lon": 38.908996 },
    "slickAgeHours": 12.0,         // how long ago the oil was probably released
    "lookAlikeRisk": false,        // true = looks like it could be a false alarm
    "polygon": { "type": "Polygon", "coordinates": [...] }   // GeoJSON, lon/lat order
  },

  "drift": {
    "trajectoryBack":    [[lat, lon], ...],   // where the oil came from, backward in time
    "trajectoryForward": [[lat, lon], ...],   // where it is heading
    "origin": { "lat": 20.50837, "lon": 38.68583, "radiusKm": 43.5 },  // estimated spill point
    "uncertaintyCone":   [[lat, lon], ...]    // polygon ring for the forecast spread
  },

  "vessels": [                     // ranked suspects, best first
    {
      "id": "v1",
      "mmsi": "999000001",
      "name": "SUSPECT_A",
      "sog": "12.0 kts",           // preformatted strings, ready to display
      "cog": "008°",
      "distKm": 0.22,              // closest approach to the estimated origin
      "score": 100,                // 0-100 match score
      "timeMatch": "High",
      "anomaly": true,
      "reasons": [...],            // plain-English justification, safe to show a user
      "trackPoints": [[lat, lon], ...]
    }
  ],

  "evidenceChain": [               // ordered audit trail, ready for a timeline UI
    {
      "event_type": "success",     // success | warning | info
      "occurred_label": "T-0h",
      "title": "SAR oil candidate detected",
      "description": "29.93 km² slick, 20.8 × 2.84 km, mean model probability 93%.",
      "source": "U-Net (dual-pol SAR)"
    }
  ]
}
```

### When nothing is detected

The shape never changes — all four top-level keys are always present — but the fields go **null or
empty**, which will crash a naive `result.detection.centroid.lat`. Verified output for the clean-sea
demo scene:

```json
{
  "detection": { "detected": false, "confidence": 0, "areaKm2": 0,
                 "centroid": null, "slickAgeHours": null, "polygon": null, "lookAlikeRisk": false },
  "drift":     { "origin": null, "trajectoryBack": [], "trajectoryForward": [], "uncertaintyCone": [] },
  "vessels":   [],
  "evidenceChain": [ { "title": "No oil candidate found", ... } ]
}
```

**Branch on `detection.detected` before touching anything else.** `centroid`, `polygon` and
`drift.origin` are `null`, not missing, and `vessels` is an empty array.

**All coordinate pairs in `drift`, `uncertaintyCone` and `trackPoints` are `[latitude, longitude]`**
— ready to hand straight to Leaflet or Google Maps. The one exception is `detection.polygon`, which
is standard GeoJSON and therefore `[longitude, latitude]`. Leaflet needs those swapped.

Other files land in `<out>/ai/` (probability raster, mask GeoTIFF, GeoJSON outlines, and
`analysis.json` with the full provenance and SHA-256 hashes). Ignore them unless you want them.

---

## 5. Example: Node.js

```js
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

const AI_DIR = "/srv/oceantrace-ai";          // this folder
const PY = `${AI_DIR}/.venv/bin/python`;

export async function analyze({ lat, lon, imagePath, when, env }) {
  const out = `/tmp/oceantrace-${Date.now()}`;
  const args = ["-m", "oilspill.web_bridge", "--out", out, "--lat", String(lat), "--lon", String(lon)];
  if (imagePath) args.push("--image", imagePath);
  if (when) args.push("--when", when);
  if (env) args.push("--env", JSON.stringify(env));

  // cwd matters: the model path is relative to the bundle root.
  await promisify(execFile)(PY, args, {
    cwd: AI_DIR,
    timeout: 300_000,
    maxBuffer: 10 * 1024 * 1024,
    env: { ...process.env, OILSPILL_DEVICE: "cpu" },
  });

  return JSON.parse(await readFile(`${out}/web.json`, "utf8"));
}
```

`execFile` (not `exec`) avoids a shell, so a user-supplied filename cannot be injected as a
command. Clean up `out` when you are done; a run leaves about 8 MB of rasters behind.

## 6. Example: Python, same process

If your backend is already Python, skip the subprocess and call the class directly. The model then
loads once instead of on every request, which saves a few seconds per call.

```python
from oilspill.ai_pipeline import OilSpillAI

ai = OilSpillAI(device="cpu")          # load once, at startup
result = ai.analyze("scene.tif", "out_dir", "2026-06-12T06:00:00Z", demo=True)
print(result["summary"]["total_area_km2"])
```

---

## 7. Practical notes

- **Timing.** Measured at **21 seconds** end-to-end on CPU for the bundled 2048×2048 scene,
  including model load; a smaller 1024×1024 scene is about 3 seconds. GPU is faster but the
  default is CPU. Treat it as a background job, not a blocking request handler.
- **Concurrency.** Each subprocess loads its own copy of the model (roughly 400 MB of RAM). Cap
  how many you run at once, or use the in-process Python API above.
- **Input format.** Two-band VV+VH GeoTIFF, float32 Sigma0 in dB, with a CRS and a geotransform.
  A plain PNG or JPEG will not work: the AI needs radar values and real-world coordinates to
  report areas in km² and positions in lat/lon.
- **Disk.** Each run writes about 8 MB into `--out`. Delete it after reading `web.json`.

## 8. Honest limits — please carry these into your UI

- The detector finds 98% of real oil scenes but also flags some look-alikes; on the full 450-scene
  test set its precision is 61%. Show detections as **candidates needing review**, not as facts.
- **Drift uses the wind and current numbers you pass in `--env` as uniform forcing.** It is not
  reading a live ocean forecast. Real current and wind files are supported by the underlying
  pipeline but are not wired into this entry point.
- **The vessel list is synthetic AIS traffic**, generated around the estimated origin to
  demonstrate the ranking logic. It is not real ship data. Label it clearly.
- Vessel scores are **investigation leads, not proof of guilt.**

Accuracy numbers and method: `docs/ACCURACY_REPORT.md` and `docs/MODEL_CARD.md` in the main
repository.
