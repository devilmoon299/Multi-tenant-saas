# 1. Official lightweight Python base image
FROM python:3.12-slim

# 2. Environment variables for optimized Python execution in Docker
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 3. Working directory inside container
WORKDIR /app

# 4. Install system dependencies required for PostgreSQL client & build tools
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev curl netcat-openbsd \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 5. Copy requirements and install Python packages
COPY requirements.txt /app/
RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# 6. Copy the rest of the project files
COPY . /app/

# 7. Expose port 8000 for Django
EXPOSE 8000

# 8. Start Django development server by default (with hot-reloading)
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

