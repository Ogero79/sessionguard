FROM python:3.11-slim
WORKDIR /app

# Install dependencies
RUN pip install --no-cache-dir --default-timeout=1000 --upgrade pip
COPY apps/ml-service/requirements.txt ./
RUN pip install --no-cache-dir --default-timeout=1000 --retries=10 -r requirements.txt

# Copy application
COPY apps/ml-service/app ./app

# Create models directory for persisted IsolationForest files
RUN mkdir -p ./models

ENV ML_MODELS_DIR=/app/models

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
