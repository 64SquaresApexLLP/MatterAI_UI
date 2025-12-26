#!/usr/bin/env python3
"""
Script to add a new user to the PostgreSQL database with a hashed password.
Usage: python add_user.py
"""

import bcrypt
from database_setup import get_connection

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def add_user(username: str, email: str, password: str, name: str, role: str = "user"):
    """Add a new user to the database with a hashed password"""
    conn = get_connection()
    if not conn:
        print("❌ Could not connect to PostgreSQL")
        return False

    try:
        cursor = conn.cursor()

        # Check if user already exists
        cursor.execute(
            "SELECT username FROM public.users WHERE username = %s OR email = %s",
            (username, email)
        )
        existing_user = cursor.fetchone()

        if existing_user:
            print(f"❌ User with username '{username}' or email '{email}' already exists")
            return False

        # Hash the password
        hashed_password = hash_password(password)

        # Insert the new user
        cursor.execute("""
            INSERT INTO public.users (username, email, password, name, role, is_active)
            VALUES (%s, %s, %s, %s, %s, TRUE)
            RETURNING id, username, email, name, role
        """, (username, email, hashed_password, name, role))

        new_user = cursor.fetchone()
        conn.commit()

        print(f"✅ User created successfully!")
        print(f"   ID: {new_user[0]}")
        print(f"   Username: {new_user[1]}")
        print(f"   Email: {new_user[2]}")
        print(f"   Name: {new_user[3]}")
        print(f"   Role: {new_user[4]}")

        return True

    except Exception as e:
        print(f"❌ Error adding user: {e}")
        conn.rollback()
        return False

    finally:
        cursor.close()
        conn.close()

def main():
    """Interactive user creation"""
    print("=" * 50)
    print("Add New User to MatterAI Database")
    print("=" * 50)

    username = input("Enter username: ").strip()
    email = input("Enter email: ").strip()
    password = input("Enter password: ").strip()
    name = input("Enter full name: ").strip()
    role = input("Enter role (admin/user) [default: user]: ").strip().lower() or "user"

    if role not in ['admin', 'user']:
        print("⚠️  Invalid role. Using 'user' as default.")
        role = 'user'

    if not all([username, email, password, name]):
        print("❌ All fields are required!")
        return

    print("\n" + "=" * 50)
    print("Creating user with the following details:")
    print(f"  Username: {username}")
    print(f"  Email: {email}")
    print(f"  Name: {name}")
    print(f"  Role: {role}")
    print(f"  Password: {'*' * len(password)}")
    print("=" * 50)

    confirm = input("\nProceed? (yes/no): ").strip().lower()

    if confirm in ['yes', 'y']:
        add_user(username, email, password, name, role)
    else:
        print("❌ User creation cancelled")

if __name__ == "__main__":
    main()

