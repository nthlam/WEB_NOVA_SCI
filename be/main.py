#!/usr/bin/env python3
"""
Main entry point for the FastAPI application on Render.
"""

import sys
import os
from pathlib import Path

# Add the current directory and backend directory to Python path
current_dir = Path(__file__).parent
backend_dir = current_dir / 'backend'

sys.path.insert(0, str(current_dir))
sys.path.insert(0, str(backend_dir))

# Import the FastAPI app instance
try:
    # Try importing from backend package first
    from backend import app
except ImportError:
    # Fallback: import directly from __init__.py
    import importlib.util
    spec = importlib.util.spec_from_file_location("backend", backend_dir / "__init__.py")
    backend_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(backend_module)
    app = backend_module.app

# For direct execution
if __name__ == '__main__':
    import uvicorn
    port = int(os.environ.get("PORT", 5001))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)