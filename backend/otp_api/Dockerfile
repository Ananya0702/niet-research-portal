# Email OTP API — standalone service (delegated OTP sending/verification).
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8001

WORKDIR /srv

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py ./

EXPOSE 8001

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
