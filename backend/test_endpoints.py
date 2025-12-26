#!/usr/bin/env python3
"""
Test the organizations and roles endpoints
"""

import requests
import json

BASE_URL = "http://localhost:8002"

def test_organizations():
    print("=" * 60)
    print("Testing /auth/organizations endpoint")
    print("=" * 60)
    
    try:
        response = requests.get(f"{BASE_URL}/auth/organizations")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"Error: {e}")

def test_roles():
    print("\n" + "=" * 60)
    print("Testing /auth/roles endpoint")
    print("=" * 60)
    
    try:
        response = requests.get(f"{BASE_URL}/auth/roles")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_organizations()
    test_roles()

