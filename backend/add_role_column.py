#!/usr/bin/env python3
"""
Migration script to add role column to users table
"""

from database_setup import get_connection

def add_role_column():
    """Add role column to users table with default roles"""
    conn = get_connection()
    if not conn:
        print("❌ Could not connect to PostgreSQL")
        return False

    try:
        cursor = conn.cursor()
        
        print("🔄 Adding role column to users table...")
        
        # Add role column if it doesn't exist
        cursor.execute("""
            ALTER TABLE public.users 
            ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';
        """)
        
        print("✅ Role column added successfully")
        
        # Update existing users with default roles
        print("🔄 Setting default roles for existing users...")
        
        # Set admin role for admin user
        cursor.execute("""
            UPDATE public.users 
            SET role = 'admin' 
            WHERE username = 'admin' OR email = 'admin@gmail.com';
        """)
        
        # Set user role for all others
        cursor.execute("""
            UPDATE public.users 
            SET role = 'user' 
            WHERE role IS NULL OR role = '';
        """)
        
        conn.commit()
        
        print("✅ Default roles set successfully")
        
        # Display current users and their roles
        cursor.execute("""
            SELECT id, username, email, name, role 
            FROM public.users 
            ORDER BY id;
        """)
        
        users = cursor.fetchall()
        
        print("\n" + "=" * 70)
        print("Current Users and Roles:")
        print("=" * 70)
        print(f"{'ID':<5} {'Username':<20} {'Email':<30} {'Role':<10}")
        print("-" * 70)
        
        for user in users:
            print(f"{user[0]:<5} {user[1]:<20} {user[2]:<30} {user[4]:<10}")
        
        print("=" * 70)
        
        return True
        
    except Exception as e:
        print(f"❌ Error adding role column: {e}")
        conn.rollback()
        return False
        
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print("=" * 70)
    print("Role Column Migration")
    print("=" * 70)
    add_role_column()

