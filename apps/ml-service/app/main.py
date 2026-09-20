import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import router

app = FastAPI(
    title="SessionGuard ML Service",
    description="Production ML microservice for behavioural anomaly detection using IsolationForest",
    version="0.1.0",
)

allowed_origins = os.getenv("CORS_ORIGIN", "http://localhost:3000,http://localhost:4000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins if origin.strip()] or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "ml-service"}
