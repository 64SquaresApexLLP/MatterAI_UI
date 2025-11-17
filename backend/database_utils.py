from database_setup import get_connection
from psycopg2.extras import RealDictCursor

# ============================================================
#  RUN POSTGRES QUERY (MAIN DB UTILITY)
# ============================================================
def run_postgres_query(query, params=None, fetchone=False, fetchall=False):
    """
    Execute a PostgreSQL query with clean fetch/commit behavior.
    """
    try:
        conn = get_connection()
        if not conn:
            return {"success": False, "message": "Failed to connect to database", "data": None}

        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute(query, params or ())

        # Fetch rules
        if fetchone:
            result = cursor.fetchone()
        elif fetchall or query.strip().upper().startswith("SELECT"):
            result = cursor.fetchall()
        else:
            conn.commit()
            result = []

        cursor.close()
        conn.close()

        return {"success": True, "data": result}

    except Exception as e:
        return {"success": False, "message": str(e), "data": None}


# ============================================================
#  CREATE TIMESHEET ENTRY
# ============================================================
def create_timesheet_entry(user_id: int, entry_data: dict):
    try:
        query = """
            INSERT INTO public.timesheet_entries (
                user_id, client, matter, timekeeper, entry_date,
                entry_type, hours_worked, hours_billed, quantity,
                rate, currency, total, phase_task, activity,
                expense, bill_code, entry_status, narrative
            ) VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s
            )
        """

        params = (
            user_id,
            entry_data.get("client"),
            entry_data.get("matter"),
            entry_data.get("timekeeper"),
            entry_data.get("entry_date"),
            entry_data.get("entry_type"),
            entry_data.get("hours_worked"),
            entry_data.get("hours_billed"),
            entry_data.get("quantity"),
            entry_data.get("rate"),
            entry_data.get("currency"),
            entry_data.get("total"),
            entry_data.get("phase_task"),
            entry_data.get("activity"),
            entry_data.get("expense"),
            entry_data.get("bill_code"),
            entry_data.get("entry_status"),
            entry_data.get("narrative")
        )

        return run_postgres_query(query, params)

    except Exception as e:
        return {"success": False, "message": str(e)}


# ============================================================
#  GET TIMESHEET ENTRIES WITH FILTERS
# ============================================================
def get_timesheet_entries(user_id: int, filters: dict):
    try:
        query = """
            SELECT *
            FROM public.timesheet_entries
            WHERE user_id = %s
        """

        params = [user_id]

        # Optional filters
        if filters.get("client"):
            query += " AND client ILIKE %s"
            params.append(f"%{filters['client']}%")

        if filters.get("matter"):
            query += " AND matter ILIKE %s"
            params.append(f"%{filters['matter']}%")

        if filters.get("date_from"):
            query += " AND entry_date >= %s"
            params.append(filters["date_from"])

        if filters.get("date_to"):
            query += " AND entry_date <= %s"
            params.append(filters["date_to"])

        if filters.get("entry_type"):
            query += " AND entry_type = %s"
            params.append(filters["entry_type"])

        query += " ORDER BY entry_date DESC LIMIT %s OFFSET %s"
        params.extend([filters.get("limit", 10), filters.get("offset", 0)])

        return run_postgres_query(query, tuple(params))

    except Exception as e:
        return {"success": False, "message": str(e), "data": []}


# ============================================================
#  UPDATE TIMESHEET ENTRY
# ============================================================
def update_timesheet_entry(entry_id: int, entry_data: dict):
    try:
        query = """
            UPDATE public.timesheet_entries
            SET client=%(client)s,
                matter=%(matter)s,
                timekeeper=%(timekeeper)s,
                entry_date=%(entry_date)s,
                entry_type=%(entry_type)s,
                hours_worked=%(hours_worked)s,
                hours_billed=%(hours_billed)s,
                quantity=%(quantity)s,
                rate=%(rate)s,
                currency=%(currency)s,
                total=%(total)s,
                phase_task=%(phase_task)s,
                activity=%(activity)s,
                expense=%(expense)s,
                bill_code=%(bill_code)s,
                entry_status=%(entry_status)s,
                narrative=%(narrative)s,
                updated_at = NOW()
            WHERE id=%(entry_id)s
        """

        params = {**entry_data, "entry_id": entry_id}

        return run_postgres_query(query, params)

    except Exception as e:
        return {"success": False, "message": str(e)}


# ============================================================
#  DELETE TIMESHEET ENTRY
# ============================================================
def delete_timesheet_entry(entry_id: int):
    try:
        query = "DELETE FROM public.timesheet_entries WHERE id = %s"
        return run_postgres_query(query, (entry_id,))
    except Exception as e:
        return {"success": False, "message": str(e)}