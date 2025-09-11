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
    'database': os.getenv('SNOWFLAKE_DATABASE', 'MATTERAI_DB'),
    'schema': os.getenv('SNOWFLAKE_SCHEMA', 'PUBLIC')
}

def get_snowflake_connection():
    """Create and return Snowflake connection"""
    try:
        conn = snowflake.connector.connect(**DB_CONFIG)

        # Set the warehouse, database, and schema context
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
        finally:
            cursor.close()

        return conn
    except Exception as e:
        print(f"Failed to connect to Snowflake: {e}")
        return None

def create_tables_if_not_exist():
    """Create all required tables if they don't exist"""
    
    # SQL statements for table creation
    table_creation_queries = {
        'users': """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER AUTOINCREMENT PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            name VARCHAR(255),
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
        )
        """,
        
        'timesheet_entries': """
        CREATE TABLE IF NOT EXISTS timesheet_entries (
            id INTEGER AUTOINCREMENT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            client VARCHAR(255) NOT NULL,
            matter TEXT NOT NULL,
            timekeeper VARCHAR(255) NOT NULL,
            entry_date DATE NOT NULL,
            entry_type VARCHAR(10) NOT NULL,
            hours_worked DECIMAL(10,2),
            hours_billed DECIMAL(10,2),
            quantity DECIMAL(10,2),
            rate DECIMAL(10,2) DEFAULT 0,
            currency VARCHAR(3) DEFAULT 'USD',
            total DECIMAL(10,2) DEFAULT 0,
            phase_task VARCHAR(255) NOT NULL,
            activity VARCHAR(255),
            expense VARCHAR(255),
            bill_code VARCHAR(50) NOT NULL,
            entry_status VARCHAR(20) NOT NULL,
            narrative TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """,
        
        'uploaded_files': """
        CREATE TABLE IF NOT EXISTS uploaded_files (
            id INTEGER AUTOINCREMENT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            filename VARCHAR(255) NOT NULL,
            original_filename VARCHAR(255) NOT NULL,
            file_path VARCHAR(500) NOT NULL,
            file_size INTEGER NOT NULL,
            file_type VARCHAR(100) NOT NULL,
            upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
            is_active BOOLEAN DEFAULT TRUE,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """,
        
        'query_logs': """
        CREATE TABLE IF NOT EXISTS query_logs (
            id INTEGER AUTOINCREMENT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            query_text TEXT NOT NULL,
            selected_button VARCHAR(100),
            selected_language VARCHAR(50),
            file_ids TEXT, -- JSON array of file IDs
            response_data TEXT, -- JSON response
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """,
        
        'user_sessions': """
        CREATE TABLE IF NOT EXISTS user_sessions (
            id INTEGER AUTOINCREMENT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            token_hash VARCHAR(255) NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
            is_active BOOLEAN DEFAULT TRUE,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
    }
    
    conn = get_snowflake_connection()
    if not conn:
        print("Failed to connect to database for table creation")
        return False
    
    try:
        cursor = conn.cursor()
        
        # Create tables in order (respecting foreign key dependencies)
        table_order = ['users', 'timesheet_entries', 'uploaded_files', 'query_logs', 'user_sessions']
        
        for table_name in table_order:
            if table_name in table_creation_queries:
                cursor.execute(table_creation_queries[table_name])

        conn.commit()
        return True
        
    except Exception as e:
        print(f"Error creating tables: {e}")
        conn.rollback()
        return False
    finally:
        cursor.close()
        conn.close()

def insert_default_users():
    """Insert default users if they don't exist"""
    from passlib.context import CryptContext
    
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    default_users = [
        {
            'username': 'a@a.com',
            'email': 'a@a.com',
            'password': 'a',
            'name': 'Admin User'
        },
        {
            'username': 'user@example.com',
            'email': 'user@example.com', 
            'password': 'password',
            'name': 'Test User'
        }
    ]
    
    conn = get_snowflake_connection()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        for user_data in default_users:
            # Check if user exists
            cursor.execute(
                "SELECT id FROM users WHERE username = %s OR email = %s",
                (user_data['username'], user_data['email'])
            )
            
            if cursor.fetchone() is None:
                # User doesn't exist, create it
                password_hash = pwd_context.hash(user_data['password'])
                cursor.execute("""
                    INSERT INTO users (username, email, password_hash, name)
                    VALUES (%s, %s, %s, %s)
                """, (
                    user_data['username'],
                    user_data['email'],
                    password_hash,
                    user_data['name']
                ))
                pass  # User created
            else:
                pass  # User already exists
        
        conn.commit()
        return True
        
    except Exception as e:
        print(f"Error inserting default users: {e}")
        conn.rollback()
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
    # Run database initialization
    initialize_database()
