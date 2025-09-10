#!/usr/bin/env python3
"""
Simple entry point for Render deployment
"""

import sys
import os
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent / 'backend'
sys.path.insert(0, str(backend_path))

# Import app
from backend import app

# Export app for uvicorn
__all__ = ['app']
