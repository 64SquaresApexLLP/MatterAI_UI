# Database Utilities with Auto Table Creation
import snowflake.connector
from typing import Dict, Any, List, Optional
import os
import json
from datetime import datetime
from dotenv import load_dotenv
from database_setup import get_snowflake_connection

# Load environment variables
load_dotenv()

def run_snowflake_query(query: str, params: tuple = None, fetch_results: bool = True) -> Dict[str, Any]:
    """
    Execute Snowflake query

    Args:
        query: SQL query to execute
        params: Query parameters (optional)
        fetch_results: Whether to fetch and return results

    Returns:
        Dict with success status, data, and message
    """

    conn = get_snowflake_connection()
    if not conn:
        return {
            "success": False,
            "data": None,
            "message": "Failed to connect to database"
        }
    
    try:
        cursor = conn.cursor()

        # Ensure warehouse is set for this session
        from database_setup import DB_CONFIG
        if DB_CONFIG.get('warehouse'):
            try:
                cursor.execute(f"USE WAREHOUSE {DB_CONFIG['warehouse']}")
            except Exception as warehouse_error:
                print(f"⚠️ Warning: Could not set warehouse: {warehouse_error}")

        # Execute query
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        
        result = {
            "success": True,
            "data": None,
            "message": "Query executed successfully"
        }
        
        if fetch_results:
            # Fetch results for SELECT queries
            if query.strip().upper().startswith('SELECT'):
                columns = [desc[0] for desc in cursor.description]
                rows = cursor.fetchall()
                result["data"] = [dict(zip(columns, row)) for row in rows]
                result["message"] = f"Retrieved {len(rows)} records"
            else:
                # For INSERT/UPDATE/DELETE, return affected rows
                result["data"] = {"affected_rows": cursor.rowcount}
                result["message"] = f"Query executed, {cursor.rowcount} rows affected"
        
        conn.commit()
        return result
        
    except Exception as e:
        conn.rollback()
        return {
            "success": False,
            "data": None,
            "message": f"Database error: {str(e)}"
        }
    finally:
        cursor.close()
        conn.close()

def get_user_by_credentials(username: str, password_hash: str) -> Optional[Dict[str, Any]]:
    """Get user by username and verify password"""
    query = """
    SELECT id, username, email, name, is_active, created_at
    FROM users 
    WHERE username = %s AND password_hash = %s AND is_active = TRUE
    """
    
    result = run_snowflake_query(query, (username, password_hash))
    
    if result["success"] and result["data"]:
        return result["data"][0] if result["data"] else None
    return None

def create_timesheet_entry(user_id: int, entry_data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new timesheet entry"""
    query = """
    INSERT INTO MATTERAI_DB.PUBLIC.TIMESHEET_ENTRIES (
        USER_ID, CLIENT, MATTER, TIMEKEEPER, ENTRY_DATE, ENTRY_TYPE,
        HOURS_WORKED, HOURS_BILLED, QUANTITY, RATE, CURRENCY, TOTAL,
        PHASE_TASK, ACTIVITY, EXPENSE, BILL_CODE, ENTRY_STATUS, NARRATIVE
    ) VALUES (
        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
    )
    """
    
    params = (
        user_id,
        entry_data.get('client'),
        entry_data.get('matter'),
        entry_data.get('timekeeper'),
        entry_data.get('entry_date'),
        entry_data.get('entry_type'),
        entry_data.get('hours_worked'),
        entry_data.get('hours_billed'),
        entry_data.get('quantity'),
        entry_data.get('rate', 0),
        entry_data.get('currency', 'USD'),
        entry_data.get('total', 0),
        entry_data.get('phase_task'),
        entry_data.get('activity'),
        entry_data.get('expense'),
        entry_data.get('bill_code'),
        entry_data.get('entry_status'),
        entry_data.get('narrative')
    )
    
    return run_snowflake_query(query, params, fetch_results=False)

def get_timesheet_entries(user_id: int, filters: Dict[str, Any] = None) -> Dict[str, Any]:
    """Get timesheet entries with optional filters"""
    base_query = """
    SELECT ID, CLIENT, MATTER, TIMEKEEPER, ENTRY_DATE, ENTRY_TYPE,
           HOURS_WORKED, HOURS_BILLED, QUANTITY, RATE, CURRENCY, TOTAL,
           PHASE_TASK, ACTIVITY, EXPENSE, BILL_CODE, ENTRY_STATUS, NARRATIVE,
           CREATED_AT, UPDATED_AT
    FROM MATTERAI_DB.PUBLIC.TIMESHEET_ENTRIES
    WHERE USER_ID = %s
    """
    
    params = [user_id]
    
    if filters:
        if filters.get('client'):
            base_query += " AND CLIENT ILIKE %s"
            params.append(f"%{filters['client']}%")

        if filters.get('matter'):
            base_query += " AND MATTER ILIKE %s"
            params.append(f"%{filters['matter']}%")

        if filters.get('timekeeper'):
            base_query += " AND TIMEKEEPER ILIKE %s"
            params.append(f"%{filters['timekeeper']}%")

        if filters.get('entry_type'):
            base_query += " AND ENTRY_TYPE = %s"
            params.append(filters['entry_type'])

        if filters.get('date_from'):
            base_query += " AND ENTRY_DATE >= %s"
            params.append(filters['date_from'])

        if filters.get('date_to'):
            base_query += " AND ENTRY_DATE <= %s"
            params.append(filters['date_to'])
    
    base_query += " ORDER BY ENTRY_DATE DESC, CREATED_AT DESC"
    
    # Add pagination
    limit = filters.get('limit', 50) if filters else 50
    offset = filters.get('offset', 0) if filters else 0
    
    base_query += f" LIMIT {limit} OFFSET {offset}"
    
    return run_snowflake_query(base_query, tuple(params))

def save_uploaded_file(user_id: int, file_data: Dict[str, Any]) -> Dict[str, Any]:
    """Save uploaded file metadata to database"""
    query = """
    INSERT INTO uploaded_files (
        user_id, filename, original_filename, file_path, 
        file_size, file_type
    ) VALUES (%s, %s, %s, %s, %s, %s)
    """
    
    params = (
        user_id,
        file_data.get('filename'),
        file_data.get('original_filename'),
        file_data.get('file_path'),
        file_data.get('file_size'),
        file_data.get('file_type')
    )
    
    return run_snowflake_query(query, params, fetch_results=False)

def log_query_request(user_id: int, query_data: Dict[str, Any]) -> Dict[str, Any]:
    """Log query request to database"""
    query = """
    INSERT INTO query_logs (
        user_id, query_text, selected_button, selected_language, 
        file_ids, response_data
    ) VALUES (%s, %s, %s, %s, %s, %s)
    """
    
    params = (
        user_id,
        query_data.get('query'),
        query_data.get('selected_button'),
        query_data.get('selected_language'),
        json.dumps(query_data.get('file_ids', [])),
        json.dumps(query_data.get('response_data', {}))
    )
    
    return run_snowflake_query(query, params, fetch_results=False)

def get_user_files(user_id: int) -> Dict[str, Any]:
    """Get all files uploaded by user"""
    query = """
    SELECT id, filename, original_filename, file_size, file_type, upload_date
    FROM uploaded_files 
    WHERE user_id = %s AND is_active = TRUE
    ORDER BY upload_date DESC
    """
    
    return run_snowflake_query(query, (user_id,))

def delete_user_file(user_id: int, file_id: int) -> Dict[str, Any]:
    """Soft delete a user's file"""
    query = """
    UPDATE uploaded_files 
    SET is_active = FALSE 
    WHERE id = %s AND user_id = %s
    """
    
    return run_snowflake_query(query, (file_id, user_id), fetch_results=False)

def update_timesheet_entry(user_id: int, entry_id: int, entry_data: Dict[str, Any]) -> Dict[str, Any]:
    """Update an existing timesheet entry"""
    query = """
    UPDATE MATTERAI_DB.PUBLIC.TIMESHEET_ENTRIES SET
        CLIENT = %s, MATTER = %s, TIMEKEEPER = %s, ENTRY_DATE = %s, ENTRY_TYPE = %s,
        HOURS_WORKED = %s, HOURS_BILLED = %s, QUANTITY = %s, RATE = %s, CURRENCY = %s,
        TOTAL = %s, PHASE_TASK = %s, ACTIVITY = %s, EXPENSE = %s, BILL_CODE = %s,
        ENTRY_STATUS = %s, NARRATIVE = %s, UPDATED_AT = CURRENT_TIMESTAMP()
    WHERE ID = %s AND USER_ID = %s
    """
    
    params = (
        entry_data.get('client'),
        entry_data.get('matter'),
        entry_data.get('timekeeper'),
        entry_data.get('entry_date'),
        entry_data.get('entry_type'),
        entry_data.get('hours_worked'),
        entry_data.get('hours_billed'),
        entry_data.get('quantity'),
        entry_data.get('rate', 0),
        entry_data.get('currency', 'USD'),
        entry_data.get('total', 0),
        entry_data.get('phase_task'),
        entry_data.get('activity'),
        entry_data.get('expense'),
        entry_data.get('bill_code'),
        entry_data.get('entry_status'),
        entry_data.get('narrative'),
        entry_id,
        user_id
    )
    
    return run_snowflake_query(query, params, fetch_results=False)

def delete_timesheet_entry(user_id: int, entry_id: int) -> Dict[str, Any]:
    """Delete a timesheet entry"""
    query = "DELETE FROM MATTERAI_DB.PUBLIC.TIMESHEET_ENTRIES WHERE ID = %s AND USER_ID = %s"
    return run_snowflake_query(query, (entry_id, user_id), fetch_results=False)
