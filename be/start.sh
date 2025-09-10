#!/bin/bash
cd /opt/render/project/src/be
export PYTHONPATH="/opt/render/project/src/be:/opt/render/project/src/be/backend:$PYTHONPATH"
uvicorn main:app --host 0.0.0.0 --port $PORT
