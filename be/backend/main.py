#!/usr/bin/env python3
"""
Main entry point for the FastAPI application.
This file is used for deployment on platforms like Render.
"""

import os
import sys

# Add the backend directory to Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

# Import the app from __init__.py using absolute import
import __init__ as backend_module
app = backend_module.app

# For Render deployment
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 5001))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)