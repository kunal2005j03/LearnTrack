FROM python:3.11-slim

# Install compilers for C, C++, Java, and Go
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    default-jdk \
    golang \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set up working directory
WORKDIR /app

# Install FastAPI dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the execution service code
COPY main.py .

# Run the FastAPI server as a non-root user for security
RUN useradd -m sandboxuser && \
    mkdir -p /home/sandboxuser/.cache/go-build /tmp/gocache && \
    echo 'package main\nimport "fmt"\nfunc main() { fmt.Println("warm") }' > /tmp/warm.go && \
    GO111MODULE=off GOPROXY=off GOCACHE=/home/sandboxuser/.cache/go-build go build -o /tmp/warm /tmp/warm.go && \
    rm -f /tmp/warm.go /tmp/warm && \
    chown -R sandboxuser:sandboxuser /home/sandboxuser /tmp/gocache /app

USER sandboxuser

# Port 8080 for Cloud Run
EXPOSE 8080

CMD ["python", "main.py"]
