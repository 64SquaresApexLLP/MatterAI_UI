import snowflake.connector
from database_setup import get_snowflake_connection

def run_snowflake_query(query, params=None, fetchone=False, fetchall=False):
    try:
        conn = get_snowflake_connection()
        if not conn:
            return {"success": False, "message": "Failed to connect to database", "data": None}

        cursor = conn.cursor(snowflake.connector.DictCursor)  # return dict-like rows
        cursor.execute(query, params or ())

        result = None
        if fetchone:
            result = cursor.fetchone()
        elif fetchall:
            result = cursor.fetchall()
        else:
            # For SELECT queries, fetch all results by default
            if query.strip().upper().startswith('SELECT'):
                result = cursor.fetchall()
            else:
                conn.commit()
                result = []

        cursor.close()
        conn.close()

        return {"success": True, "data": result, "message": "Query executed successfully"}

    except Exception as e:
        print(f"Database error: {e}")
        return {"success": False, "message": f"Database error: {e}", "data": None}

def create_timesheet_entry(user_id: int, entry_data: dict):
    try:
        query = """
            INSERT INTO MATTERAI_DB.PUBLIC.TIMESHEET_ENTRIES (
                USER_ID, CLIENT, MATTER, TIMEKEEPER, ENTRY_DATE,
                ENTRY_TYPE, HOURS_WORKED, HOURS_BILLED, QUANTITY,
                RATE, CURRENCY, TOTAL, PHASE_TASK, ACTIVITY,
                EXPENSE, BILL_CODE, ENTRY_STATUS, NARRATIVE
            ) VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s
            )
        """
        params = (
            user_id, entry_data.get("client"), entry_data.get("matter"),
            entry_data.get("timekeeper"), entry_data.get("entry_date"),
            entry_data.get("entry_type"), entry_data.get("hours_worked"),
            entry_data.get("hours_billed"), entry_data.get("quantity"),
            entry_data.get("rate"), entry_data.get("currency"),
            entry_data.get("total"), entry_data.get("phase_task"),
            entry_data.get("activity"), entry_data.get("expense"),
            entry_data.get("bill_code"), entry_data.get("entry_status"),
            entry_data.get("narrative")
        )
        result = run_snowflake_query(query, params)
        if result and result.get("success"):
            return {"success": True, "message": "Timesheet entry inserted"}
        else:
            return {"success": False, "message": result.get("message", "Unknown error") if result else "Database connection failed"}
    except Exception as e:
        return {"success": False, "message": str(e)}

def get_timesheet_entries(user_id: int, filters: dict):
    try:
        query = """
            SELECT *
            FROM MATTERAI_DB.PUBLIC.TIMESHEET_ENTRIES
            WHERE USER_ID = %s
        """
        params = [user_id]

        if filters.get("client"):
            query += " AND CLIENT ILIKE %s"
            params.append(f"%{filters['client']}%")
        if filters.get("matter"):
            query += " AND MATTER ILIKE %s"
            params.append(f"%{filters['matter']}%")
        if filters.get("date_from"):
            query += " AND ENTRY_DATE >= %s"
            params.append(filters["date_from"])
        if filters.get("date_to"):
            query += " AND ENTRY_DATE <= %s"
            params.append(filters["date_to"])
        if filters.get("entry_type"):
            query += " AND ENTRY_TYPE = %s"
            params.append(filters["entry_type"])

        query += " ORDER BY ENTRY_DATE DESC LIMIT %s OFFSET %s"
        params.extend([filters.get("limit", 10), filters.get("offset", 0)])

        result = run_snowflake_query(query, tuple(params))
        if result and result.get("success"):
            return {"success": True, "data": result.get("data", [])}
        else:
            return {"success": False, "message": result.get("message", "Unknown error") if result else "Database connection failed", "data": []}
    except Exception as e:
        return {"success": False, "message": str(e), "data": []}

def update_timesheet_entry(entry_id: int, entry_data: dict):
    try:
        query = """
            UPDATE timesheets
            SET client=%(client)s, matter=%(matter)s, timekeeper=%(timekeeper)s,
                entry_date=%(entry_date)s, entry_type=%(entry_type)s,
                hours_worked=%(hours_worked)s, hours_billed=%(hours_billed)s,
                quantity=%(quantity)s, rate=%(rate)s, currency=%(currency)s,
                total=%(total)s, phase_task=%(phase_task)s, activity=%(activity)s,
                expense=%(expense)s, bill_code=%(bill_code)s,
                entry_status=%(entry_status)s, narrative=%(narrative)s,
                updated_at=CURRENT_TIMESTAMP
            WHERE id=%(entry_id)s
        """
        params = {**entry_data, "entry_id": entry_id}
        run_snowflake_query(query, params)
        return {"success": True, "message": "Timesheet entry updated"}
    except Exception as e:
        return {"success": False, "message": str(e)}

def delete_timesheet_entry(entry_id: int):
    try:
        query = "DELETE FROM MATTERAI_DB.PUBLIC.TIMESHEET_ENTRIES WHERE ID = %s"
        result = run_snowflake_query(query, (entry_id,))
        if result and result.get("success"):
            return {"success": True, "message": "Timesheet entry deleted"}
        else:
            return {"success": False, "message": result.get("message", "Delete failed") if result else "Database error"}
    except Exception as e:
        return {"success": False, "message": str(e)}
