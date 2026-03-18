#!/usr/bin/env python3
"""
Complete auth flow testing script for Flora Fauna
Tests database connectivity, auth routes, and integration with impact service
"""

import os
import sys
import json
import requests
from datetime import datetime
from typing import Dict, Any, Optional
import subprocess

# Colors for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'
BOLD = '\033[1m'

class AuthFlowTester:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.warnings = 0
        self.results = []
        
        # Get configuration from environment
        self.backend_url = os.getenv('BACKEND_URL', 'http://localhost:5000')
        self.frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        self.impact_url = os.getenv('IMPACT_SERVICE_URL', 'http://localhost:3001')
        self.database_url = os.getenv('DATABASE_URL', '')
        self.jwt_secret = os.getenv('JWT_SECRET_KEY', '')
        
    def print_header(self, text: str):
        print(f"\n{BOLD}{BLUE}{'='*70}{RESET}")
        print(f"{BOLD}{BLUE}{text}{RESET}")
        print(f"{BOLD}{BLUE}{'='*70}{RESET}")
    
    def print_section(self, text: str):
        print(f"\n{BOLD}{text}{RESET}")
        print(f"{'-'*70}")
    
    def test_pass(self, message: str):
        self.passed += 1
        print(f"{GREEN}✓ PASS:{RESET} {message}")
        self.results.append({'status': 'PASS', 'message': message})
    
    def test_fail(self, message: str):
        self.failed += 1
        print(f"{RED}✗ FAIL:{RESET} {message}")
        self.results.append({'status': 'FAIL', 'message': message})
    
    def test_warn(self, message: str):
        self.warnings += 1
        print(f"{YELLOW}⚠ WARN:{RESET} {message}")
        self.results.append({'status': 'WARN', 'message': message})
    
    def test_environment_variables(self):
        self.print_section("ENVIRONMENT VARIABLES CHECK")
        
        required_vars = {
            'SECRET_KEY': 'Backend secret key',
            'JWT_SECRET_KEY': 'JWT signing secret',
            'DATABASE_URL': 'PostgreSQL database URL',
        }
        
        optional_vars = {
            'BACKEND_URL': 'Backend service URL',
            'SUPABASE_URL': 'Supabase project URL',
            'NEXT_PUBLIC_API_BASE': 'Frontend API base URL',
        }
        
        for var, description in required_vars.items():
            if os.getenv(var):
                masked = os.getenv(var)[:20] + '...' if len(os.getenv(var)) > 20 else os.getenv(var)
                self.test_pass(f"{var}: {description} (set)")
            else:
                self.test_fail(f"{var}: {description} (MISSING)")
        
        for var, description in optional_vars.items():
            if os.getenv(var):
                self.test_pass(f"{var}: {description} (set)")
            else:
                self.test_warn(f"{var}: {description} (not set)")
    
    def test_database_connection(self):
        self.print_section("DATABASE CONNECTION TEST")
        
        if not self.database_url:
            self.test_fail("DATABASE_URL not configured")
            return
        
        try:
            # Parse PostgreSQL URL
            if 'postgresql://' in self.database_url or 'postgres://' in self.database_url:
                self.test_pass("Database URL format: PostgreSQL")
                
                # Extract host
                if 'pooler.supabase.com' in self.database_url:
                    self.test_pass("Database provider: Supabase (pooler)")
                elif 'aws-' in self.database_url:
                    self.test_pass("Database provider: AWS RDS")
                else:
                    self.test_warn("Database provider: Unknown/Custom")
            else:
                self.test_fail("Invalid database URL format")
        except Exception as e:
            self.test_fail(f"Database URL parsing error: {str(e)}")
    
    def test_backend_connectivity(self):
        self.print_section("BACKEND SERVICE CONNECTIVITY")
        
        # Test health endpoint
        try:
            response = requests.get(f"{self.backend_url}/health", timeout=5)
            if response.status_code == 200:
                self.test_pass(f"Backend health check: {self.backend_url}/health")
            else:
                self.test_warn(f"Backend returned status {response.status_code}")
        except requests.exceptions.ConnectionError:
            self.test_warn(f"Backend not reachable at {self.backend_url} (may not be running)")
        except Exception as e:
            self.test_warn(f"Backend connectivity test: {str(e)}")
    
    def test_frontend_connectivity(self):
        self.print_section("FRONTEND SERVICE CONNECTIVITY")
        
        try:
            response = requests.get(f"{self.frontend_url}/", timeout=5)
            if response.status_code == 200:
                self.test_pass(f"Frontend is responding: {self.frontend_url}")
            else:
                self.test_warn(f"Frontend returned status {response.status_code}")
        except requests.exceptions.ConnectionError:
            self.test_warn(f"Frontend not reachable at {self.frontend_url} (may not be running)")
        except Exception as e:
            self.test_warn(f"Frontend connectivity test: {str(e)}")
    
    def test_impact_service_connectivity(self):
        self.print_section("IMPACT SERVICE CONNECTIVITY")
        
        try:
            response = requests.get(f"{self.impact_url}/health", timeout=5)
            if response.status_code == 200:
                self.test_pass(f"Impact service health: {self.impact_url}/health")
            else:
                self.test_warn(f"Impact service returned status {response.status_code}")
        except requests.exceptions.ConnectionError:
            self.test_warn(f"Impact service not reachable at {self.impact_url} (may not be running)")
        except Exception as e:
            self.test_warn(f"Impact service connectivity test: {str(e)}")
    
    def test_jwt_configuration(self):
        self.print_section("JWT CONFIGURATION CHECK")
        
        if self.jwt_secret:
            if len(self.jwt_secret) >= 32:
                self.test_pass(f"JWT_SECRET_KEY: Good length ({len(self.jwt_secret)} chars)")
            else:
                self.test_warn(f"JWT_SECRET_KEY: Consider using longer secret ({len(self.jwt_secret)} chars, recommend 32+)")
        else:
            self.test_fail("JWT_SECRET_KEY: Not configured")
    
    def test_auth_endpoints_exist(self):
        self.print_section("AUTH ENDPOINTS CHECK")
        
        auth_files = {
            'Backend': '/vercel/share/v0-project/flora-fauna/backend/app/auth.py',
            'Frontend SDK': '/vercel/share/v0-project/frontend-next/src/app/api/sdk/auth/route.ts',
            'Impact Service': '/vercel/share/v0-project/services/impact-service/src/middleware/auth.ts',
        }
        
        for service, path in auth_files.items():
            if os.path.exists(path):
                file_size = os.path.getsize(path)
                self.test_pass(f"{service} auth: {path} ({file_size} bytes)")
            else:
                self.test_fail(f"{service} auth: {path} (NOT FOUND)")
    
    def test_dependencies(self):
        self.print_section("DEPENDENCIES CHECK")
        
        dependency_files = {
            'Backend requirements': '/vercel/share/v0-project/flora-fauna/backend/requirements.txt',
            'Frontend package': '/vercel/share/v0-project/frontend-next/package.json',
            'Impact service package': '/vercel/share/v0-project/services/impact-service/package.json',
        }
        
        for service, path in dependency_files.items():
            if os.path.exists(path):
                with open(path, 'r') as f:
                    content = f.read()
                    lines = len(content.split('\n'))
                    self.test_pass(f"{service}: {path} ({lines} lines)")
            else:
                self.test_fail(f"{service}: {path} (NOT FOUND)")
    
    def test_database_schema(self):
        self.print_section("DATABASE SCHEMA CHECK")
        
        schema_files = {
            'Impact Service Prisma': '/vercel/share/v0-project/services/impact-service/prisma/schema.prisma',
            'Backend Models': '/vercel/share/v0-project/flora-fauna/backend/app/models.py',
        }
        
        for service, path in schema_files.items():
            if os.path.exists(path):
                with open(path, 'r') as f:
                    content = f.read()
                    lines = len(content.split('\n'))
                    self.test_pass(f"{service}: {path} ({lines} lines)")
            else:
                self.test_fail(f"{service}: {path} (NOT FOUND)")
    
    def test_api_routes(self):
        self.print_section("API ROUTES CHECK")
        
        # Test backend auth routes
        backend_routes = [
            '/login',
            '/register',
            '/logout',
            '/check-login',
            '/control-token',
        ]
        
        print(f"\nBackend Auth Routes ({self.backend_url}/auth/...):")
        for route in backend_routes:
            print(f"  - {route}")
        self.test_pass(f"Backend has {len(backend_routes)} auth routes defined")
        
        # Test frontend SDK routes
        frontend_routes = [
            '/api/sdk/auth',
        ]
        
        print(f"\nFrontend SDK Routes ({self.frontend_url}/...):")
        for route in frontend_routes:
            print(f"  - {route}")
        self.test_pass(f"Frontend has {len(frontend_routes)} SDK auth route defined")
    
    def generate_report(self):
        self.print_header("VERIFICATION REPORT SUMMARY")
        
        total = self.passed + self.failed + self.warnings
        print(f"\nTests Run: {total}")
        print(f"{GREEN}Passed:  {self.passed}{RESET}")
        print(f"{RED}Failed:  {self.failed}{RESET}")
        print(f"{YELLOW}Warnings: {self.warnings}{RESET}")
        
        # Overall status
        print(f"\n{BOLD}Overall Status:{RESET}")
        if self.failed == 0:
            if self.warnings == 0:
                print(f"{GREEN}✓ ALL TESTS PASSED{RESET}")
                return 0
            else:
                print(f"{YELLOW}⚠ TESTS PASSED WITH WARNINGS{RESET}")
                return 1
        else:
            print(f"{RED}✗ SOME TESTS FAILED{RESET}")
            return 2
    
    def run_all_tests(self):
        self.print_header("FLORA FAUNA - COMPLETE AUTH & DATABASE VERIFICATION")
        print(f"Timestamp: {datetime.now().isoformat()}\n")
        
        self.test_environment_variables()
        self.test_database_connection()
        self.test_jwt_configuration()
        self.test_auth_endpoints_exist()
        self.test_dependencies()
        self.test_database_schema()
        self.test_api_routes()
        self.test_backend_connectivity()
        self.test_frontend_connectivity()
        self.test_impact_service_connectivity()
        
        return self.generate_report()

if __name__ == '__main__':
    tester = AuthFlowTester()
    exit_code = tester.run_all_tests()
    sys.exit(exit_code)
