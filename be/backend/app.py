#!/usr/bin/env python3
"""
Alternative entry point for the FastAPI application.
Imports the main app instance from __init__.py
"""

# Import the FastAPI app instance
from backend import app

# For direct execution
if __name__ == '__main__':
    import uvicorn
    import os
    
    port = int(os.environ.get("PORT", 5001))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)