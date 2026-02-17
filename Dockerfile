FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies for audio processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libsndfile1 \
    ffmpeg \
    espeak \
    libespeak-dev \
    portaudio19-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file from backend folder
COPY backend/requirements.txt .

# Create a modified requirements file for Linux (exclude Windows-specific packages)
RUN grep -v "pywin32" requirements.txt | grep -v "pyttsx3" > requirements-linux.txt \
    && pip install --no-cache-dir -r requirements-linux.txt \
    && pip install --no-cache-dir pyttsx3==2.90

# Copy backend application code
COPY backend/ .

# Create necessary directories
RUN mkdir -p audio_samples progress_logs

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
