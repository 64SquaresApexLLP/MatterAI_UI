#!/usr/bin/env python3
"""
Quick script to add test@gmail.com user
"""

from add_user import add_user

# Add the test user
result = add_user(
    username="testuser",
    email="test@gmail.com",
    password="test@123",
    name="Test User"
)

if result:
    print("\n✅ User test@gmail.com added successfully!")
    print("   Username: testuser")
    print("   Password: test@123")
else:
    print("\n❌ Failed to add user")

