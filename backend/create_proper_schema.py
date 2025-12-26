#!/usr/bin/env python3
"""
Create proper multi-tenant database schema with organizations and roles
"""

from database_setup import get_connection
import bcrypt

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def create_proper_schema():
    """Create organizations, roles, and update users table"""
    conn = get_connection()
    if not conn:
        print("❌ Could not connect to PostgreSQL")
        return False

    try:
        cursor = conn.cursor()
        
        print("🔄 Creating proper database schema...")
        
        # 1. Create organizations table
        print("📋 Creating organizations table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS public.organizations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        """)
        
        # 2. Create roles table
        print("📋 Creating roles table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS public.roles (
                id SERIAL PRIMARY KEY,
                role_name VARCHAR(50) UNIQUE NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        
        # 3. Drop the old role column if it exists and add role_id and org_id
        print("📋 Updating users table structure...")
        
        # Add org_id column if not exists
        cursor.execute("""
            ALTER TABLE public.users 
            ADD COLUMN IF NOT EXISTS org_id INTEGER REFERENCES public.organizations(id) ON DELETE SET NULL;
        """)
        
        # Add role_id column if not exists
        cursor.execute("""
            ALTER TABLE public.users 
            ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES public.roles(id) ON DELETE SET NULL;
        """)
        
        # 4. Create timesheet_entries table if not exists
        print("📋 Creating timesheet_entries table...")
        cursor.execute("""
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
        """)
        
        conn.commit()
        print("✅ Schema created successfully!")
        
        # 5. Insert default roles
        print("\n🔄 Inserting default roles...")
        roles = [
            ('SuperAdmin', 'Super administrator with full system access'),
            ('OrgAdmin', 'Organization administrator with org-level access'),
            ('User', 'Regular user with basic access')
        ]
        
        for role_name, description in roles:
            cursor.execute("""
                INSERT INTO public.roles (role_name, description)
                VALUES (%s, %s)
                ON CONFLICT (role_name) DO NOTHING;
            """, (role_name, description))
        
        conn.commit()
        print("✅ Default roles created!")
        
        # 6. Insert default organization
        print("\n🔄 Creating default organization...")
        cursor.execute("""
            INSERT INTO public.organizations (name)
            VALUES ('Default Organization')
            ON CONFLICT (name) DO NOTHING
            RETURNING id;
        """)
        
        result = cursor.fetchone()
        if result:
            default_org_id = result[0]
        else:
            cursor.execute("SELECT id FROM public.organizations WHERE name = 'Default Organization'")
            default_org_id = cursor.fetchone()[0]
        
        conn.commit()
        print(f"✅ Default organization created (ID: {default_org_id})")
        
        # 7. Get role IDs
        cursor.execute("SELECT id, role_name FROM public.roles")
        roles_map = {row[1]: row[0] for row in cursor.fetchall()}
        
        # 8. Migrate existing users
        print("\n🔄 Migrating existing users...")
        cursor.execute("SELECT id, username, email, role FROM public.users WHERE role_id IS NULL")
        existing_users = cursor.fetchall()
        
        for user_id, username, email, old_role in existing_users:
            # Map old role to new role_id
            if old_role == 'admin':
                new_role_id = roles_map.get('SuperAdmin')
            else:
                new_role_id = roles_map.get('User')
            
            cursor.execute("""
                UPDATE public.users 
                SET role_id = %s, org_id = %s
                WHERE id = %s
            """, (new_role_id, default_org_id, user_id))
            
            print(f"   ✓ Migrated user: {username} ({email}) → role_id: {new_role_id}")
        
        conn.commit()
        
        # 9. Drop old role column
        print("\n🔄 Cleaning up old role column...")
        cursor.execute("""
            ALTER TABLE public.users 
            DROP COLUMN IF EXISTS role CASCADE;
        """)
        conn.commit()
        print("✅ Old role column removed!")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating schema: {e}")
        conn.rollback()
        return False
        
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print("=" * 70)
    print("Multi-Tenant Database Schema Setup")
    print("=" * 70)
    create_proper_schema()
    print("\n" + "=" * 70)
    print("✅ Schema setup complete!")
    print("=" * 70)

