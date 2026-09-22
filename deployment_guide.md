# OceanTrace Full-Stack Deployment Guide (Whole Repository)

Deploying the **full Sih_26143** project requires special care because your **Node.js backend** relies on a **Python AI model** running via a background process (`child_process`). Standard Node.js environments (like basic Render or Heroku Node setups) don't have Python or PyTorch installed by default.

To solve this, I've created a `Dockerfile` in the root of your project. This Docker container will package **both** Python and Node.js along with all your dependencies, so they can run happily together on a single server.

Here is exactly how to make the entire project live:

---

## Step 1: Deploy the Backend + AI Environment (Render.com via Docker)

We will use **Render** to run our custom `Dockerfile`. It will host the Node Server and the AI environment on the same instance.

1. **Push your code to GitHub**: Commit the new `Dockerfile` and `.dockerignore` files and push the entire `sih_26143` repository to GitHub.
2. Sign up / login to [Render](https://render.com/).
3. Click **New** -> **Web Service**.
4. Connect to your GitHub account and select your `sih_26143` repository.
5. In the configuration:
   * **Language / Environment**: Change this from Node to **Docker**.
   * **Root Directory**: Leave it completely empty (it will use the root of the repo).
6. **Environment Variables**:
   Scroll down and add the variables exactly as they are in your local `Oil_Spill/backend/.env`:
    * `PORT`: `4000`
    * `SUPABASE_URL`: (your Supabase URL)
    * `SUPABASE_ANON_KEY`: (your Supabase Key)
    * `SUPABASE_SERVICE_ROLE_KEY`: (your Supabase Service Key)
    * `GEMINI_API_KEY`: (your Gemini API key)
7. Click **Create Web Service**. 
8. The build process will take a few minutes as it installs PyTorch and Node.js. Once it finishes, Render will provide a live URL (e.g., `https://oceantrace-backend.onrender.com`). **Copy this URL**.

---

## Step 2: Update the Frontend API URL

Right now, your frontend (`script.js`) tries to talk to `localhost:4000`. You must redirect it to your new live backend server.

1. Open `Oil_Spill/frontend/script.js`.
2. Look at the top of the file:
   ```javascript
   const CONFIG = {
       API_BASE_URL: 'http://localhost:4000/api/v1',
       // ...
   }
   ```
3. Change `'http://localhost:4000/api/v1'` to the new live backend URL you just got from Render:
   ```javascript
   const CONFIG = {
       // Replace with your actual Render URL
       API_BASE_URL: 'https://oceantrace-backend.onrender.com/api/v1', 
       // ...
   }
   ```
4. **Commit and push** this change to GitHub.

---

## Step 3: Deploy the Frontend (via Vercel.com)

The frontend is a static UI (HTML/CSS/JS) and is completely separate from the backend's server logic. Vercel is the best and fastest place to host it for free.

1. Go to [Vercel](https://vercel.com/) and create a free account.
2. Click **Add New** -> **Project**.
3. Import your `sih_26143` GitHub repository.
4. **Configuration Details**:
    * **Root Directory**: Click the "Edit" button and select the `Oil_Spill/frontend` directory. (This tells Vercel to only host the files in the frontend folder).
    * **Framework Preset**: Leave as `Other`.
    * **Build/Install Commands**: Leave blank.
5. Click **Deploy**.
6. Vercel will instantly host your site and provide you with a live URL (e.g., `https://oceantrace.vercel.app`).

## 🎉 You're Live!

You can now visit your Vercel URL on any device. The frontend will communicate perfectly with your Docker container on Render, which has both the Node.js API and the Python AI natively installed!
