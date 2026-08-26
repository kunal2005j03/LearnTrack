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
    # Pre-warm Go build cache for standard library
    echo 'package main\nimport ("fmt"; "os"; "strings"; "math"; "time"; "sync"; "bufio"; "io")\nfunc main() { fmt.Println("warm", os.Args, strings.Clone(""), math.Pi, time.Now(), sync.Mutex{}, bufio.NewReader(nil), io.EOF) }' > /tmp/warm.go && \
    GO111MODULE=off GOPROXY=off GOCACHE=/home/sandboxuser/.cache/go-build go build -ldflags="-s -w" -o /tmp/warm /tmp/warm.go && \
    rm -f /tmp/warm.go /tmp/warm && \
    # Pre-warm Java JVM and javac JIT cache
    echo 'public class Warm { public static void main(String[] args) { System.out.println("warm"); } }' > /tmp/Warm.java && \
    javac -J-XX:TieredStopAtLevel=1 -J-XX:+UseSerialGC /tmp/Warm.java && \
    java -XX:TieredStopAtLevel=1 -XX:+UseSerialGC -cp /tmp Warm && \
    rm -f /tmp/Warm.java /tmp/Warm.class && \
    # Pre-warm GCC / G++ toolchain execution
    echo '#include <iostream>\n#include <vector>\n#include <string>\nint main(){ std::cout << "warm" << std::endl; return 0; }' > /tmp/warm.cpp && \
    g++ -O0 -pipe -s /tmp/warm.cpp -o /tmp/warmcpp && \
    /tmp/warmcpp && \
    rm -f /tmp/warm.cpp /tmp/warmcpp && \
    # Set permissions
    chown -R sandboxuser:sandboxuser /home/sandboxuser /tmp/gocache /app

USER sandboxuser

# Port 8080 for Cloud Run
EXPOSE 8080

CMD ["python", "main.py"]
