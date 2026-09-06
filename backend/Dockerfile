# Use an official Python runtime as a parent image
FROM python:3.10

# Set environment variables to prevent interactive prompts and ensure logs flush
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV TESTING=0

# Set the working directory
WORKDIR /app

# Copy only requirements first to leverage Docker cache
COPY ./requirements.txt /app/requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy test files and application code
COPY ./tests /app/tests
COPY ./app /app/app
COPY ./alembic /app/alembic
COPY ./alembic.ini /app/alembic.ini
COPY ./main.py /app/main.py
COPY ./backend_pre_start.py /app/backend_pre_start.py
COPY ./initial_data.py /app/initial_data.py
COPY ./prestart.py /app/prestart.py

# Expose the application port
EXPOSE 8081

# Start the application
ENTRYPOINT ["python", "/app/prestart.py"]