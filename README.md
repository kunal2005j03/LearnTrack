# LearnTrack

LearnTrack is a web application with a separate code execution microservice.

## Deployment

1. The main LearnTrack app is separate from the execution service.
2. `execution-sandbox/` is deployed separately to Cloud Run.
3. The resulting Cloud Run URL becomes:
   `EXECUTION_SERVICE_URL`
