import gradio as gr
import spaces
import json
import os
import uuid
from pathlib import Path
from oilspill.web_bridge import synthetic_scene, to_frontend
from oilspill.ai_pipeline import OilSpillAI

ai_model = None

@spaces.GPU(duration=60)
def run_pipeline(lat, lon, env_json):
    global ai_model
    try:
        # Load model into GPU memory and keep it hot
        if not ai_model:
            # Hugging Face ZeroGPU passes CUDA, otherwise fall back to cpu
            device = 'cuda' if os.environ.get('SPACES_ZERO_GPU') else os.environ.get('OILSPILL_DEVICE', 'cpu')
            ai_model = OilSpillAI(device=device)
        
        out = Path(f"/tmp/oceantrace_{uuid.uuid4()}")
        out.mkdir(parents=True, exist_ok=True)
        
        # We generate the synthetic satellite footprint using their coordinates
        image = out / 'synthetic_scene.tif'
        synthetic_scene(image, lat, lon)
        
        when = '2026-09-13T06:42:00Z'
        env_dict = json.loads(env_json)
        
        # Execute pipeline
        result = ai_model.analyze(image, out / 'ai', when)
        web = to_frontend(result, out / 'ai', env_dict, when, ai_model)
        
        return json.dumps(web)
    except Exception as e:
        return json.dumps({"error": str(e)})

iface = gr.Interface(
    fn=run_pipeline,
    inputs=[
        gr.Number(label="Latitude"),
        gr.Number(label="Longitude"),
        gr.Textbox(label="Environment JSON")
    ],
    outputs="text"
)

if __name__ == "__main__":
    iface.launch()
