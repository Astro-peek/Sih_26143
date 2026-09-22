const { execFile } = require('node:child_process');
const { readFile, rm } = require('node:fs/promises');
const { promisify } = require('node:util');
const path = require('node:path');

// Target the new Hugging Face Space API
const HF_SPACE_URL = "https://astrocode01-ocean-trace-ai.hf.space/api/predict";

async function runFullPipeline(lat, lon, env, imagePath) {
  try {
    const payload = {
      data: [
        parseFloat(lat),
        parseFloat(lon),
        JSON.stringify(env)
      ]
    };

    // The fetch API is globally available in modern Node.js
    const res = await fetch(HF_SPACE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`Hugging Face API Error: ${res.status} ${res.statusText}`);
    }

    const hfData = await res.json();
    
    // Gradio wraps the return value in a "data" array
    const rawResultJson = hfData.data[0];
    const data = JSON.parse(rawResultJson);
    
    if (data.error) {
       throw new Error(`Hugging Face Python Error: ${data.error}`);
    }
    
    return data;
  } catch (error) {
    console.error('HF Pipeline error:', error);
    throw new Error('AI pipeline failed to run on Hugging Face: ' + (error.message || 'Unknown error'));
  }
}

module.exports = { runFullPipeline };
