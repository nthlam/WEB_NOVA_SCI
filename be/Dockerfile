# syntax=docker/dockerfile:1
# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set environment variables to prevent generating .pyc files and to run in unbuffered mode
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY backend/requirements.txt .

# Install any needed packages specified in requirements.txt
RUN --mount=type=cache,target=/root/.cache/pip pip install -r requirements.txt

# Copy the backend application code into the container
COPY ./backend /app/backend

# Copy the app.py entry point
COPY app.py /app/

# Expose port 5000
EXPOSE 5000

# Set environment variable for the port
ENV PORT=5000

# Run the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5000"]