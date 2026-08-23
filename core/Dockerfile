# 1. Pull an official, lightweight Python image
FROM python:3.12-slim

# 2. Set environment variables to optimize Python for Docker
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 3. Set the working directory inside the container
WORKDIR /app

# 4. Install system-level dependencies for PostgreSQL
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 5. Copy the requirements file and install Python packages
COPY requirements.txt /app/
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# 6. Install Gunicorn (the production web server)
RUN pip install gunicorn

# 7. Copy the rest of the Django project into the container
COPY . /app/

# 8. Expose port 8000 so the outside world can communicate with Django
EXPOSE 8000

# 9. Start the server using Gunicorn instead of the development server
# NOTE: Replace 'tracker_project' with the actual name of the folder containing your wsgi.py file
CMD ["gunicorn", "tracker_project.wsgi:application", "--bind", "0.0.0.0:8000"]