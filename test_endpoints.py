#!/usr/bin/env python3
"""
API Endpoint Verification Script
Tests all critical endpoints that the frontend uses
"""

import requests
import json
from pathlib import Path

BASE_URL = "http://localhost:8000"

# Color codes for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_test(endpoint, method, status):
    """Print formatted test result"""
    symbol = f"{GREEN}✓{RESET}" if status else f"{RED}✗{RESET}"
    print(f"{symbol} {method.ljust(6)} {endpoint}")

def test_health():
    """Test health check endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print_test("/health", "GET", True)
            print(f"  Response: {response.json()}\n")
            return True
        else:
            print_test("/health", "GET", False)
            return False
    except Exception as e:
        print_test("/health", "GET", False)
        print(f"  Error: {e}\n")
        return False

def test_start_exercise():
    """Test starting an exercise"""
    try:
        payload = {
            "exercise_text": "Sally sells seashells by the seashore",
            "duration": 5
        }
        response = requests.post(
            f"{BASE_URL}/api/exercise/start",
            json=payload,
            timeout=5
        )
        if response.status_code == 200:
            data = response.json()
            print_test("/api/exercise/start", "POST", True)
            print(f"  Response: {json.dumps(data, indent=2)}\n")
            return True
        else:
            print_test("/api/exercise/start", "POST", False)
            print(f"  Status: {response.status_code}\n")
            return False
    except Exception as e:
        print_test("/api/exercise/start", "POST", False)
        print(f"  Error: {e}\n")
        return False

def test_generate_exercises():
    """Test generating custom exercises"""
    try:
        response = requests.get(
            f"{BASE_URL}/api/exercises/generate?type=lisp",
            timeout=5
        )
        if response.status_code == 200:
            data = response.json()
            print_test("/api/exercises/generate", "GET", True)
            print(f"  Type: {data.get('type')}")
            print(f"  Exercises count: {len(data.get('exercises', []))}\n")
            return True
        else:
            print_test("/api/exercises/generate", "GET", False)
            print(f"  Status: {response.status_code}\n")
            return False
    except Exception as e:
        print_test("/api/exercises/generate", "GET", False)
        print(f"  Error: {e}\n")
        return False

def test_get_templates():
    """Test getting exercise templates"""
    try:
        response = requests.get(
            f"{BASE_URL}/api/exercises/templates/lisp",
            timeout=5
        )
        if response.status_code == 200:
            data = response.json()
            print_test("/api/exercises/templates/{type}", "GET", True)
            print(f"  Templates count: {len(data.get('exercises', []))}\n")
            return True
        else:
            print_test("/api/exercises/templates/{type}", "GET", False)
            print(f"  Status: {response.status_code}\n")
            return False
    except Exception as e:
        print_test("/api/exercises/templates/{type}", "GET", False)
        print(f"  Error: {e}\n")
        return False

def test_get_history():
    """Test getting session history"""
    try:
        response = requests.get(
            f"{BASE_URL}/api/sessions/history",
            timeout=5
        )
        if response.status_code == 200:
            data = response.json()
            print_test("/api/sessions/history", "GET", True)
            print(f"  Sessions count: {len(data)}\n")
            return True
        else:
            print_test("/api/sessions/history", "GET", False)
            print(f"  Status: {response.status_code}\n")
            return False
    except Exception as e:
        print_test("/api/sessions/history", "GET", False)
        print(f"  Error: {e}\n")
        return False

def test_save_progress():
    """Test saving progress"""
    try:
        response = requests.post(
            f"{BASE_URL}/api/sessions/save",
            timeout=5
        )
        if response.status_code == 200:
            data = response.json()
            print_test("/api/sessions/save", "POST", True)
            print(f"  Response: {data}\n")
            return True
        else:
            print_test("/api/sessions/save", "POST", False)
            print(f"  Status: {response.status_code}\n")
            return False
    except Exception as e:
        print_test("/api/sessions/save", "POST", False)
        print(f"  Error: {e}\n")
        return False

def main():
    """Run all tests"""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}Speech Therapy Assistant - API Endpoint Verification{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")
    
    print(f"{YELLOW}Testing Backend Connection...{RESET}\n")
    
    results = {
        "health": test_health(),
        "start_exercise": test_start_exercise(),
        "generate_exercises": test_generate_exercises(),
        "get_templates": test_get_templates(),
        "get_history": test_get_history(),
        "save_progress": test_save_progress(),
    }
    
    # Summary
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    print(f"{BLUE}{'='*60}{RESET}")
    print(f"Results: {GREEN}{passed}/{total} endpoints working{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")
    
    if passed == total:
        print(f"{GREEN}✓ All critical endpoints are working!{RESET}")
        print(f"✓ Frontend can connect to Backend successfully\n")
    else:
        print(f"{RED}✗ Some endpoints are not responding{RESET}")
        print(f"✗ Please check:\n")
        print(f"  1. Backend is running: python backend/main.py")
        print(f"  2. Port 8000 is accessible")
        print(f"  3. GROQ_API_KEY is set in backend/.env\n")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n{YELLOW}Test interrupted{RESET}\n")
    except Exception as e:
        print(f"{RED}Error: {e}{RESET}\n")
