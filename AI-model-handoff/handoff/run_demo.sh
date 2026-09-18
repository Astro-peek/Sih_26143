#!/usr/bin/env bash
# Proof the install works: analyse the bundled scene and print the slick area.
set -euo pipefail
cd "$(dirname "$0")"
PY=".venv/bin/python"; [ -x "$PY" ] || PY="python3"
$PY -m oilspill.web_bridge --out runs/demo_out \
  --lat 20.83 --lon 38.91 --image demo/scenes/Oil_00023.tif --when 2026-06-12T06:00:00Z
$PY -c "
import json; d = json.load(open('runs/demo_out/web.json'))['detection']
print(f\"detected={d['detected']}  area={d['areaKm2']} km2  confidence={d['confidence']}%\")
print('expected:      detected=True   area=29.93 km2  confidence=93%')"
