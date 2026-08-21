# NIET Research Portal — main FastAPI backend.
#
# The same image can also boot the standalone ML service by setting
# APP_MODULE=ml_api:app (see Dockerfile.ml for the dedicated variant).
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    APP_MODULE=app.main:app \
    PORT=8000

WORKDIR /srv

COPY requirements.prod.txt ./
RUN pip install --no-cache-dir -r requirements.prod.txt

COPY app ./app
COPY ml_api.py ./

EXPOSE 8000

# Railway/Render inject PORT; default to 8000 for local/docker runs.
CMD ["sh", "-c", "uvicorn ${APP_MODULE} --host 0.0.0.0 --port ${PORT}"]
