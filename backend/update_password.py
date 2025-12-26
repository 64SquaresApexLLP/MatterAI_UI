#!/usr/bin/env python3
"""
Script to update admin password in the database
"""

from database_utils import run_postgres_query

def update_password():
    """Update password for admin@gmail.com"""
    
    # New hashed password (bcrypt hash)
    new_password = '$2b$12$Uw4fN4Mxq6RQPSbHTXbu2eWHwH6Z0TjgpWMCWAgTOMlt0IsBl0s9C'
    
    print(f"Updating password for admin@gmail.com...")
    
    # SQL query with parameterized placeholder
    query = """
        UPDATE users
        SET password = %s
        WHERE email = %s
    """
    
    try:
        # Execute the update
        result = run_postgres_query(query, (new_password, 'admin@gmail.com'))
        print(f"Update query result: {result}")
        
        if result and result.get('success'):
            print('✅ Password update executed successfully!')
            
            # Verify the update by fetching the user
            verify_query = "SELECT id, username, email FROM users WHERE email = %s"
            verify_result = run_postgres_query(verify_query, ('admin@gmail.com',))
            
            if verify_result and verify_result.get('data'):
                user = verify_result['data'][0]
                print(f'✅ User confirmed:')
                print(f'   User ID: {user["id"]}')
                print(f'   Username: {user["username"]}')
                print(f'   Email: {user["email"]}')
                print(f'\n✅ Password for admin@gmail.com has been updated to the new hash.')
            else:
                print('⚠️  Could not verify user after update')
        else:
            print(f'❌ Error: {result}')
            return False
    except Exception as e:
        print(f'❌ Exception: {str(e)}')
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    update_password()
