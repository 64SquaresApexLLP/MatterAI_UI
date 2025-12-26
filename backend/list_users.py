#!/usr/bin/env python3
"""
Script to list all users in the database
"""

from database_utils import run_postgres_query

def list_users():
    """List all users"""
    
    query = "SELECT id, username, email, name, role_id, org_id, is_active FROM users ORDER BY id"
    
    result = run_postgres_query(query)
    
    if result.get('success'):
        if result.get('data'):
            print('📋 Users in database:')
            print('=' * 80)
            for user in result['data']:
                print(f"ID: {user['id']:3} | Username: {user['username']:20} | Email: {user['email']:30} | Role: {user['role_id']} | Org: {user['org_id']} | Active: {user['is_active']}")
        else:
            print('No users found')
    else:
        print(f'❌ Error: {result}')

if __name__ == "__main__":
    list_users()
