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

# 7. Expose default port
EXPOSE 8000

# 8. Start production server binding to $PORT (set by Render/Cloud) or default to 8000
CMD ["sh", "-c", "python manage.py migrate --noinput && python manage.py collectstatic --noinput && gunicorn core.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2 --timeout 120"]
