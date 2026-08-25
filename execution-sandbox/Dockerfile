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
RUN useradd -m sandboxuser
RUN chown -R sandboxuser:sandboxuser /app
USER sandboxuser

# Port 8080 for Cloud Run
EXPOSE 8080

CMD ["python", "main.py"]
