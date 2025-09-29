# Database Setup and Table Creation
import snowflake.connector
from typing import Dict, Any
import os
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Database configuration
DB_CONFIG = {
    'user': os.getenv('SNOWFLAKE_USER', 'your_username'),
    'password': os.getenv('SNOWFLAKE_PASSWORD', 'your_password'),
    'account': os.getenv('SNOWFLAKE_ACCOUNT', 'your_account'),
    'warehouse': os.getenv('SNOWFLAKE_WAREHOUSE', 'your_warehouse'),
    'database': os.getenv('SNOWFLAKE_DATABASE', 'your_database'),
    'schema': os.getenv('SNOWFLAKE_SCHEMA', 'your_schema')
}

def get_snowflake_connection():
    """
    Create and return a Snowflake database connection
    """
    try:
        conn = snowflake.connector.connect(**DB_CONFIG)

        # Set warehouse, database, and schema context
        cursor = conn.cursor()
        try:
            if DB_CONFIG.get('warehouse'):
                cursor.execute(f"USE WAREHOUSE {DB_CONFIG['warehouse']}")

            if DB_CONFIG.get('database'):
                cursor.execute(f"USE DATABASE {DB_CONFIG['database']}")

            if DB_CONFIG.get('schema'):
                cursor.execute(f"USE SCHEMA {DB_CONFIG['schema']}")

        except Exception as context_error:
            print(f"⚠️ Warning: Could not set context: {context_error}")

        return conn

    except Exception as e:
        print(f"Failed to connect to Snowflake: {e}")
        return None

def create_tables_if_not_exist():
    """
    Create all required tables if they don't exist
    """
    conn = get_snowflake_connection()
    if not conn:
        print("Failed to connect to database for table creation")
        return False

    try:
        cursor = conn.cursor()

        # Create users table to match your existing structure
        users_table = """
        CREATE TABLE IF NOT EXISTS MATTERAI_DB.PUBLIC.USERS (
            ID NUMBER(38,0) NOT NULL AUTOINCREMENT START 1 INCREMENT 1 NOORDER,
            USERNAME VARCHAR(255) NOT NULL,
            EMAIL VARCHAR(255) NOT NULL,
            PASSWORD VARCHAR(255) NOT NULL,
            NAME VARCHAR(255),
            IS_ACTIVE BOOLEAN DEFAULT TRUE,
            CREATED_AT TIMESTAMP_NTZ(9) DEFAULT CURRENT_TIMESTAMP(),
            UPDATED_AT TIMESTAMP_NTZ(9) DEFAULT CURRENT_TIMESTAMP(),
            UNIQUE (USERNAME),
            UNIQUE (EMAIL),
            PRIMARY KEY (ID)
        )
        """
        cursor.execute(users_table)

        # Create timesheet entries table
        timesheet_table = """
        CREATE TABLE IF NOT EXISTS MATTERAI_DB.PUBLIC.TIMESHEET_ENTRIES (
            ID NUMBER(38,0) NOT NULL AUTOINCREMENT START 1 INCREMENT 1 NOORDER,
            USER_ID NUMBER(38,0) NOT NULL,
            CLIENT VARCHAR(255) NOT NULL,
            MATTER VARCHAR(16777216) NOT NULL,
            TIMEKEEPER VARCHAR(255) NOT NULL,
            ENTRY_DATE DATE NOT NULL,
            ENTRY_TYPE VARCHAR(10) NOT NULL,
            HOURS_WORKED NUMBER(10,2),
            HOURS_BILLED NUMBER(10,2),
            QUANTITY NUMBER(10,2),
            RATE NUMBER(10,2) DEFAULT 0,
            CURRENCY VARCHAR(3) DEFAULT 'USD',
            TOTAL NUMBER(10,2) DEFAULT 0,
            PHASE_TASK VARCHAR(255),
            ACTIVITY VARCHAR(255),
            EXPENSE VARCHAR(255),
            BILL_CODE VARCHAR(50) NOT NULL,
            ENTRY_STATUS VARCHAR(20) NOT NULL,
            NARRATIVE VARCHAR(16777216) NOT NULL,
            CREATED_AT TIMESTAMP_NTZ(9) DEFAULT CURRENT_TIMESTAMP(),
            UPDATED_AT TIMESTAMP_NTZ(9) DEFAULT CURRENT_TIMESTAMP(),
            PRIMARY KEY (ID),
            FOREIGN KEY (USER_ID) REFERENCES MATTERAI_DB.PUBLIC.USERS(ID)
        )
        """
        cursor.execute(timesheet_table)

        conn.commit()
        return True

    except Exception as e:
        print(f"Error creating tables: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

def insert_default_users():
    """Insert default users if they don't exist"""
    conn = get_snowflake_connection()
    if not conn:
        return False

    try:
        cursor = conn.cursor()

        # Insert admin user
        admin_query = """
        INSERT INTO MATTERAI_DB.PUBLIC.USERS (USERNAME, EMAIL, PASSWORD, NAME)
        SELECT 'admin', 'admin@gmail.com', '1234', 'Admin User'
        WHERE NOT EXISTS (
            SELECT 1 FROM MATTERAI_DB.PUBLIC.USERS WHERE USERNAME = 'admin'
        )
        """
        cursor.execute(admin_query)

        # Insert test user
        test_query = """
        INSERT INTO MATTERAI_DB.PUBLIC.USERS (USERNAME, EMAIL, PASSWORD, NAME)
        SELECT 'test', 'test@test.com', 'test', 'Test User'
        WHERE NOT EXISTS (
            SELECT 1 FROM MATTERAI_DB.PUBLIC.USERS WHERE USERNAME = 'test'
        )
        """
        cursor.execute(test_query)

        conn.commit()
        return True

    except Exception as e:
        print(f"Error inserting default users: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

def initialize_database():
    """Initialize database with tables and default data"""
    try:
        # Create tables and insert default users
        if create_tables_if_not_exist():
            insert_default_users()
            print("✅ Snowflake connected")
            return True
        else:
            print("❌ Snowflake connection failed")
            return False
    except Exception as e:
        print(f"❌ Snowflake connection failed: {str(e)[:50]}...")
        return False

if __name__ == "__main__":
    initialize_database()