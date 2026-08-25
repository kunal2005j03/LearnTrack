# LearnTrack Code Execution Sandbox (Google Cloud Run)

This is an isolated execution microservice designed to safely run user-submitted code from the LearnTrack web application. By deploying this separately to Google Cloud Run, the main LearnTrack server is protected from untrusted code execution and doesn't require compilers to be installed.

## Security Architecture

- **Private Cloud Run Service**: Deployed with `--no-allow-unauthenticated` so the service cannot be called by the public internet.
- **IAM Authentication**: Only callers with `roles/run.invoker` (such as the LearnTrack backend service account) can invoke the sandbox using Google-signed OpenID Connect (OIDC) ID tokens.
- **Container Isolation**: Runs inside an isolated Google Cloud Run container.
- **Resource Constraints**: Cloud Run isolates memory (1GiB) and CPU (1 vCPU) per container. Execution time is strictly capped at 7 seconds by `main.py`.
- **Non-root**: The execution process runs as a low-privilege `sandboxuser`.
- **Ephemeral State**: Each run executes in a uniquely generated, temporary workspace that is destroyed immediately after execution.

## Supported Languages

- Python (`python`, `py`)
- C++ (`cpp`, `c++`)
- C (`c`)
- Java (`java`)
- Go (`go`, `golang`)

## Deployment Guide (Private Service-to-Service)

Follow these exact steps to securely deploy the sandbox to Google Cloud Run with IAM service-to-service authentication.

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

### 3. Deploy Private Execution Sandbox to Cloud Run

Navigate to this `execution-sandbox/` directory and deploy with `--no-allow-unauthenticated`:

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

### 4. Create Service Account & Grant Invoker Role

Create a dedicated service account for your main LearnTrack backend:

```bash
# 1. Create the backend service account
gcloud iam service-accounts create learntrack-backend-sa \
  --description="Service account for LearnTrack Backend to invoke execution sandbox" \
  --display-name="LearnTrack Backend SA"

# 2. Grant roles/run.invoker on the private execution sandbox
gcloud run services add-iam-policy-binding learntrack-execution-sandbox \
  --region=us-central1 \
  --member="serviceAccount:learntrack-backend-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.invoker"
```

### 5. Deploy / Configure Main LearnTrack Backend

When deploying your main LearnTrack backend to Cloud Run, attach the service account and set `EXECUTION_SERVICE_URL`:

```bash
gcloud run deploy learntrack-main \
  --source . \
  --service-account="learntrack-backend-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --set-env-vars="EXECUTION_SERVICE_URL=https://learntrack-execution-sandbox-xxxxxxxxxx-uc.a.run.app" \
  --region=us-central1
```

The LearnTrack backend will automatically obtain Google-authenticated ID tokens from the Cloud Run metadata server to securely invoke the private execution service.
