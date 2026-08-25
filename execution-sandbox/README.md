# LearnTrack Code Execution Sandbox (Google Cloud Run)

This is an isolated execution microservice designed to safely run user-submitted code from the LearnTrack web application. By deploying this separately to Google Cloud Run, the main LearnTrack server is protected from untrusted code execution and doesn't require compilers to be installed.

## Security Architecture

- **Isolation**: Runs inside a Google Cloud Run container.
- **Resource Constraints**: Cloud Run isolates memory and CPU per request. Execution time is capped at 7 seconds by `main.py`. 
- **Non-root**: The execution process runs as a low-privilege `sandboxuser`.
- **Ephemeral State**: Each run executes in a uniquely generated, temporary workspace that is destroyed immediately after execution.

## Supported Languages

- Python (`python`, `py`)
- C++ (`cpp`, `c++`)
- C (`c`)
- Java (`java`)
- Go (`go`, `golang`)

## Deployment Guide

Follow these exact steps to securely deploy the sandbox to Google Cloud Run.

### 1. Prerequisites

You need the Google Cloud CLI (`gcloud`) installed and authenticated on your deployment machine.

```bash
# Login to your GCP account
gcloud auth login

# Set your target project
gcloud config set project YOUR_PROJECT_ID
```

### 2. Enable Required GCP APIs

Ensure your GCP project has the required APIs enabled for Cloud Run and Cloud Build.

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

### 3. Deploy to Cloud Run

Navigate to this `execution-sandbox/` directory and run the following command. This will build the Docker image remotely using Cloud Build and deploy it to a dedicated Cloud Run service.

```bash
cd execution-sandbox

gcloud run deploy learntrack-execution-sandbox \
  --source . \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10 \
  --port 8080 \
  --region us-central1
```

*(Note: We set `--allow-unauthenticated` so the main LearnTrack backend can call it directly. You can restrict this later using IAM if your LearnTrack backend is also hosted on GCP).*

### 4. Configure LearnTrack

After a successful deployment, the `gcloud` command will output a Service URL. It will look something like:
`https://learntrack-execution-sandbox-xxxxxxxxxx-uc.a.run.app`

Copy this URL and set it as an environment variable in your main LearnTrack deployment (or in the AI Studio Settings / `.env` for production).

```env
EXECUTION_SERVICE_URL=https://learntrack-execution-sandbox-xxxxxxxxxx-uc.a.run.app
```

Restart your main LearnTrack server. The web app will now cleanly route all code execution requests to this secure, isolated Google Cloud Run endpoint.
