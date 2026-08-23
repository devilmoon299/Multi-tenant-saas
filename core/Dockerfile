# 1. Pull an official, lightweight Python image
FROM python:3.12-slim

# 2. Set environment variables to optimize Python for Docker
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 3. Set the working directory inside the container
WORKDIR /app

# 4. Install system-level dependencies for PostgreSQL
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 5. Copy the requirements file and install Python packages
COPY requirements.txt /app/
RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# 6. Copy the rest of the Django project into the container
COPY . /app/

# 7. Expose default port
EXPOSE 8000

# 8. Start the server using Gunicorn binding to $PORT (or 8000)
CMD ["sh", "-c", "python manage.py migrate --noinput && python manage.py collectstatic --noinput && gunicorn core.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2 --timeout 120"]