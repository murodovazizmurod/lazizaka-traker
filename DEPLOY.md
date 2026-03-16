# Deploying Lazizaka Calculator

This guide covers how to deploy the Flask-based Lazizaka Calculator to a production server.

## Prerequisites
- Python 3.9+
- Pip

## Setup Instructions

1. **Clone or Upload the project** to your server.
2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
3. **Configure Environment**:
   Create a `.env` file in the root directory:
   ```env
   AUTH_TOKEN=your-secret-token
   DATABASE_PATH=database.sqlite
   ```
4. **Run the Application**:
   For production, it is recommended to use a WSGI server like Gunicorn:
   ```bash
   gunicorn --bind 0.0.0.0:8000 wsgi:app
   ```

## Database
The application uses SQLite. Ensure the server has write permissions to the `database.sqlite` file and its parent directory.

## Static Files
Flask is configured to serve static files from the `public/` directory. For high-traffic sites, consider using Nginx to serve the `public/` folder directly.
