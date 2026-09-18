# AI image evaluation

Checkpoint: `runs/spill_unet_tiles.pt`

Scenes: 3; seed: 20260911; threshold: 0.5; minimum slick area: 0.05 km².

| Metric | Value |
|---|---:|
| Scene tp | 1.0000 |
| Scene fp | 0.0000 |
| Scene fn | 0.0000 |
| Scene tn | 2.0000 |
| Scene accuracy | 1.0000 |
| Scene precision | 1.0000 |
| Scene recall | 1.0000 |
| Scene specificity | 1.0000 |
| Scene iou | 1.0000 |
| Scene dice | 1.0000 |
| All-category pixel iou | 0.8490 |
| All-category pixel dice | 0.9183 |
| All-category pixel precision | 0.8584 |
| All-category pixel recall | 0.9873 |
| All-category pixel accuracy | 0.9961 |

| Category | Scenes | Flagged | Pixel IoU |
|---|---:|---:|---:|
| Oil | 1 | 1 | 0.8490216832676636 |
| Lookalike | 1 | 0 | None |
| No oil | 1 | 0 | None |

Part III test imagery; fixed threshold, no fitting or calibration on test samples. Scene detection uses area filtering; pixel metrics use the raw thresholded mask. Empty positive denominators are null.

SAR detection only. Does not measure real-world drift or vessel attribution accuracy.

Sample panels: SAR input, labelled mask, predicted mask, and TP/FP/FN overlay.

Dataset source: https://zenodo.org/records/13761290. See manifest.json and samples.json for exact inputs, hashes and per-image results.
