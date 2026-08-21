# NIET ML Classification API — standalone service.
# Identical base to backend/Dockerfile but boots the ml_api entrypoint and
# defaults to port 8002, so it deploys as a fully independent container.
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    APP_MODULE=ml_api:app \
    PORT=8002

WORKDIR /srv

COPY requirements.prod.txt ./
RUN pip install --no-cache-dir -r requirements.prod.txt

COPY app ./app
COPY ml_api.py ./

EXPOSE 8002

CMD ["sh", "-c", "uvicorn ${APP_MODULE} --host 0.0.0.0 --port ${PORT}"]
