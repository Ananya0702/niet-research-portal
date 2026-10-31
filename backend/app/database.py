from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DB_USER     = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST     = os.getenv("DB_HOST", "localhost")
DB_PORT     = os.getenv("DB_PORT", "3306")
DB_NAME     = os.getenv("DB_NAME", "niet_research")
DB_CONNECT_TIMEOUT = int(os.getenv("DB_CONNECT_TIMEOUT", "8"))

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Managed MySQL providers (Aiven, Railway public proxy, PlanetScale, ...)
# usually require TLS. Set DB_SSL=true to encrypt the connection; set
# DB_SSL_CA=/path/to/ca.pem when the provider's CA certificate is available.
connect_args = {"connect_timeout": DB_CONNECT_TIMEOUT}
if os.getenv("DB_SSL", "").strip().lower() in ("1", "true", "yes"):
    ca = os.getenv("DB_SSL_CA", "").strip()
    if ca:
        connect_args["ssl_ca"] = ca
        connect_args["ssl_verify_cert"] = True
    else:
        connect_args["ssl_verify_cert"] = False
        connect_args["ssl_verify_identity"] = False

engine = create_engine(
    DATABASE_URL,
    echo=os.getenv("DB_ECHO", "false").strip().lower() == "true",
    pool_pre_ping=True,
    pool_recycle=280,
    connect_args=connect_args,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
