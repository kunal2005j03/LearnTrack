# LearnTrack

LearnTrack is a learning productivity application with video course tracking, interactive notes, study plans, an AI assistant, and an isolated multi-language code execution microservice.

---

## Architecture Overview

The system consists of two separate, decoupled services:

1. **Main LearnTrack Application** (`/`):
   - Node.js & Express server with Vite React frontend.
   - Handles application logic, course tracking, AI features, and user interface.
   - Proxies code execution requests (`/api/code/run`) to the private execution sandbox with Google Cloud IAM service-to-service authentication.
   - Containerized via the root `Dockerfile`.

2. **Execution Sandbox Microservice** (`execution-sandbox/`):
   - Dedicated FastAPI microservice running Python, GCC/G++, OpenJDK, and Go.
   - Executes untrusted user code in ephemeral sandboxes with non-root security.
   - Deployed as a private Cloud Run service (`learntrack-execution-sandbox`).
   - Containerized via `execution-sandbox/Dockerfile`.

---

## Deployment Guide (Google Cloud Run)

### Project Configuration
- **GCP Project ID**: `learntrack-506616`
- **Backend Service Account**: `learntrack-backend-sa@learntrack-506616.iam.gserviceaccount.com`

---

### Step 1: Enable Required GCP APIs

```bash
gcloud config set project learntrack-506616
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

---

### Step 2: Deploy the Private Execution Sandbox

Navigate to the `execution-sandbox/` directory and deploy with `--no-allow-unauthenticated`:

```bash
cd execution-sandbox

gcloud run deploy learntrack-execution-sandbox \
  --source . \
  --no-allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10 \
  --port 8080 \
  --region us-central1
```

Copy the generated Service URL (e.g. `https://learntrack-execution-sandbox-xxxxxxxxxx-uc.a.run.app`).

---

### Step 3: Configure IAM Permissions for the Backend Service Account

Grant the `roles/run.invoker` role to `learntrack-backend-sa` so it can invoke the private execution service:

```bash
gcloud run services add-iam-policy-binding learntrack-execution-sandbox \
  --region=us-central1 \
  --member="serviceAccount:learntrack-backend-sa@learntrack-506616.iam.gserviceaccount.com" \
  --role="roles/run.invoker"
```

---

### Step 4: Deploy the Main LearnTrack Application

From the project root:

```bash
cd ..

gcloud run deploy learntrack-main \
  --source . \
  --allow-unauthenticated \
  --service-account="learntrack-backend-sa@learntrack-506616.iam.gserviceaccount.com" \
  --set-env-vars="EXECUTION_SERVICE_URL=https://learntrack-execution-sandbox-gxgprgtggq-uc.a.run.app" \
  --memory 1Gi \
  --cpu 1 \
  --port 8080 \
  --region us-central1
```

---

## Environment Variables

| Variable | Description |
| :--- | :--- |
| `PORT` | Cloud Run server port (injected automatically by Cloud Run, defaults to `8080` in container or `3000` locally). |
| `EXECUTION_SERVICE_URL` | HTTPS URL of the private `learntrack-execution-sandbox` Cloud Run service. |
| `GEMINI_API_KEY` | (Optional) Server-side Gemini API key for AI Assistant features. |
| `YOUTUBE_API_KEY` | (Optional) Server-side YouTube Data API v3 key for playlist imports. |

---

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```
