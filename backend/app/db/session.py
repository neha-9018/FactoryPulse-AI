import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"))

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "ai_manufacturing")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Self-healing database handler: try to connect to PostgreSQL, fallback to SQLite if offline
try:
    engine = create_engine(
        DATABASE_URL,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,
        connect_args={"connect_timeout": 2}
    )
    # Test connectivity
    with engine.connect() as conn:
        pass
except Exception:
    print("[WARNING] PostgreSQL database is offline. Falling back to shared SQLite database: sqlite:///C:/Users/Nehay/.gemini/antigravity/scratch/ai_smart_factory/smart_factory.db")
    DATABASE_URL = "sqlite:///C:/Users/Nehay/.gemini/antigravity/scratch/ai_smart_factory/smart_factory.db"
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )

# SQLAlchemy Session Local
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
