#!/usr/bin/env python3
"""
Script to check organizations table schema
"""

from database_utils import run_postgres_query

def check_org_schema():
    """Check organizations table structure"""
    
    # Get table info from information_schema
    query = """
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'organizations'
        ORDER BY ordinal_position
    """
    
    result = run_postgres_query(query)
    
    if result.get('success') and result.get('data'):
        print("📋 Organizations table schema:")
        print("=" * 60)
        for col in result['data']:
            nullable = "NULL" if col['is_nullable'] == 'YES' else "NOT NULL"
            print(f"  {col['column_name']:20} {col['data_type']:15} {nullable}")
    else:
        print(f"❌ Error: {result}")

if __name__ == "__main__":
    check_org_schema()
