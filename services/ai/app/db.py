import psycopg
from pgvector.psycopg import register_vector
from app.config import settings
from typing import Optional, List, Dict, Any

class DB:
    def __init__(self):
        self.conn_str = settings.supabase_db_url

    def get_connection(self):
        conn = psycopg.connect(self.conn_str, autocommit=True)
        register_vector(conn)
        return conn

db = DB()

def get_db():
    conn = db.get_connection()
    try:
        yield conn
    finally:
        conn.close()
