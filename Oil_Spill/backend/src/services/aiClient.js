const { execFile } = require('node:child_process');
const { readFile, rm } = require('node:fs/promises');
const { promisify } = require('node:util');
const path = require('node:path');

// Target the new Hugging Face Space API using Gradio Client
const HF_SPACE = "ASTROcode01/ocean-ai";

async function runFullPipeline(lat, lon, env, imagePath) {
  try {
    // Dynamically import @gradio/client since it's an ES Module
    const { Client } = await import('@gradio/client');
    
    // Connect tightly to the Gradio Space
    const app = await Client.connect(HF_SPACE);
    
    // Issue the prediction to the exact endpoint Hugging Face exposed
    const result = await app.predict("/run_pipeline", [
      parseFloat(lat), // Latitude
      parseFloat(lon), // Longitude
      JSON.stringify(env) // Environment JSON
    ]);

    // Gradio returns output in a "data" array
    const rawResultJson = result.data[0];
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
