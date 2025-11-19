# PostgreSQL Database Setup & Table Creation

import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import bcrypt

load_dotenv()

# PostgreSQL config
DB_CONFIG = {
    "host": os.getenv("POSTGRES_HOST", "localhost"),
    "port": os.getenv("POSTGRES_PORT", "5432"),
    "dbname": os.getenv("POSTGRES_DB", "matterai_db"),
    "user": os.getenv("POSTGRES_USER", "postgres"),
    "password": os.getenv("POSTGRES_PASSWORD", "postgres")
}

def get_connection():
    """
    Get a PostgreSQL connection
    """
    try:
        conn = psycopg2.connect(
            host=DB_CONFIG["host"],
            port=DB_CONFIG["port"],
            database=DB_CONFIG["dbname"],
            user=DB_CONFIG["user"],
            password=DB_CONFIG["password"]
        )
        return conn

    except Exception as e:
        print(f"❌ Failed to connect to PostgreSQL: {e}")
        return None


def create_tables_if_not_exist():
    """
    Create USERS & TIMESHEET_ENTRIES tables for PostgreSQL
    """
    conn = get_connection()
    if not conn:
        print("❌ Could not connect to PostgreSQL for table creation")
        return False

    try:
        cursor = conn.cursor()

        # USERS TABLE
        users_table = """
        CREATE TABLE IF NOT EXISTS public.users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            name VARCHAR(255),
            role VARCHAR(50) DEFAULT 'user',
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        """

        # TIMESHEET TABLE
        timesheet_table = """
        CREATE TABLE IF NOT EXISTS public.timesheet_entries (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            client VARCHAR(255) NOT NULL,
            matter TEXT NOT NULL,
            timekeeper VARCHAR(255) NOT NULL,
            entry_date DATE NOT NULL,
            entry_type VARCHAR(20) NOT NULL,
            hours_worked NUMERIC(10,2),
            hours_billed NUMERIC(10,2),
            quantity NUMERIC(10,2),
            rate NUMERIC(10,2) DEFAULT 0,
            currency VARCHAR(10) DEFAULT 'USD',
            total NUMERIC(10,2) DEFAULT 0,
            phase_task VARCHAR(255),
            activity VARCHAR(255),
            expense VARCHAR(255),
            bill_code VARCHAR(50) NOT NULL,
            entry_status VARCHAR(50) NOT NULL,
            narrative TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        """

        cursor.execute(users_table)
        cursor.execute(timesheet_table)

        conn.commit()
        return True

    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return False

    finally:
        cursor.close()
        conn.close()


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def insert_default_users():
    """
    Insert admin/test user once with hashed passwords
    """
    conn = get_connection()
    if not conn:
        return False

    try:
        cursor = conn.cursor()

        # Hash passwords for default users
        admin_password_hash = hash_password('1234')
        test_password_hash = hash_password('test')

        # Insert admin user
        cursor.execute("""
            INSERT INTO public.users (username, email, password, name)
            SELECT 'admin', 'admin@gmail.com', %s, 'Admin User'
            WHERE NOT EXISTS (
                SELECT 1 FROM public.users WHERE x'admin'
            );
        """, (admin_password_hash,))

        # Insert test user
        cursor.execute("""
            INSERT INTO public.users (username, email, password, name)
            SELECT 'test', 'test@test.com', %s, 'Test User'
            WHERE NOT EXISTS (
                SELECT 1 FROM public.users WHERE username='test'
            );
        """, (test_password_hash,))

        conn.commit()
        return True

    except Exception as e:
        print(f"❌ Error inserting default users: {e}")
        return False

    finally:
        cursor.close()
        conn.close()


def initialize_database():
    """
    Initialize PostgreSQL DB
    """
    if create_tables_if_not_exist():
        insert_default_users()
        print("✅ PostgreSQL connected & tables created")
        return True

    print("❌ PostgreSQL initialization failed")
    return False


if __name__ == "__main__":
    initialize_database()
