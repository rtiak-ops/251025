import os

from sqlalchemy import create_engine, text

db_url = os.getenv('DATABASE_URL').replace('postgresql+asyncpg', 'postgresql')
engine = create_engine(db_url)

with engine.connect() as conn:
    print("Checking/Adding role column to users table...")
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' NOT NULL"))
    conn.commit()
    print("Done.")
