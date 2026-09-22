FROM python:3.12-slim

# Install system dependencies (including OpenCV requirements)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Set up working directory
WORKDIR /app

# Copy the entire repository
COPY . .

# Install Python requirements for the AI model
WORKDIR /app/AI-model-handoff/handoff
# Using a venv is recommended even in Docker, but we can install system-wide here for simplicity
RUN pip install --no-cache-dir -r requirements.txt

# Install Node.js dependencies for the Backend
WORKDIR /app/Oil_Spill/backend
RUN npm install

# Expose the API port
EXPOSE 4000

# Start the Node.js server
CMD ["npm", "start"]
