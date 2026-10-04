# ParivaarSaathi — one container serves the API, the WebSocket and the built React app from the same origin.

# ---- Stage 1: build the React frontend ----
FROM node:22-alpine AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: FastAPI app ----
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FRONTEND_DIST=/app/frontend/dist \
    DATABASE_PATH=/tmp/parivaarsaathi.db
WORKDIR /app/backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
COPY --from=frontend /build/dist /app/frontend/dist
EXPOSE 8000
# Hosts such as Render inject $PORT. One worker on purpose: the live-event hub lives in memory.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
