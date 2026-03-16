import os
import sqlite3
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from functools import wraps
from datetime import datetime
import sys

# Ensure logs are visible immediately
def log(msg):
    print(msg, flush=True)

load_dotenv()

app = Flask(__name__, static_folder='public', static_url_path='')
CORS(app)

AUTH_TOKEN = os.getenv('AUTH_TOKEN', 'lazizaka-secret-token')
DATABASE_PATH = os.getenv('DATABASE_PATH', 'database.sqlite')

log(f"Starting Flask... Auth Token: {AUTH_TOKEN}, DB: {DATABASE_PATH}")

def get_db_connection():
    # Adding timeout to prevent infinite hangs if locked
    conn = sqlite3.connect(DATABASE_PATH, timeout=20)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    try:
        conn = get_db_connection()
        conn.execute('''
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                amount DECIMAL(12, 2) NOT NULL,
                description TEXT NOT NULL,
                type VARCHAR(20) NOT NULL,
                date TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()
        conn.close()
        log("Database initialized")
    except Exception as e:
        log(f"Init DB Error: {e}")

init_db()

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        log(f"Auth check: Received [{token}]")
        if token == AUTH_TOKEN:
            return f(*args, **kwargs)
        log(f"Auth failed. Got [{token}], Expected [{AUTH_TOKEN}]")
        return jsonify({"error": "Unauthorized"}), 401
    return decorated

# API Routes FIRST
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "time": datetime.now().isoformat()})

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    if username == 'admin' and password == 'azizmurodjon':
        return jsonify({"token": AUTH_TOKEN})
    return jsonify({"error": "Invalid credentials"}), 401

@app.route('/api/transactions', methods=['GET'])
@require_auth
def get_transactions():
    log("GET /api/transactions")
    try:
        conn = get_db_connection()
        rows = conn.execute('SELECT * FROM transactions ORDER BY date DESC').fetchall()
        conn.close()
        return jsonify([dict(row) for row in rows])
    except Exception as e:
        log(f"GET Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/transactions', methods=['POST'])
@require_auth
def add_transaction():
    log("POST /api/transactions")
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data received"}), 400
        
    amount = data.get('amount')
    description = data.get('description')
    trans_type = data.get('type')
    date = data.get('date', datetime.now().isoformat())
    
    log(f"Inserting: {amount}, {description}, {trans_type}")
    
    try:
        conn = get_db_connection()
        cursor = conn.execute(
            'INSERT INTO transactions (amount, description, type, date) VALUES (?, ?, ?, ?)',
            (amount, description, trans_type, date)
        )
        new_id = cursor.lastrowid
        conn.commit()
        row = conn.execute('SELECT * FROM transactions WHERE id = ?', (new_id,)).fetchone()
        conn.close()
        log(f"Success. New ID: {new_id}")
        return jsonify(dict(row)), 201
    except Exception as e:
        log(f"POST Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/transactions/<int:trans_id>', methods=['PUT'])
@require_auth
def update_transaction(trans_id):
    log(f"PUT /api/transactions/{trans_id}")
    data = request.get_json()
    amount = data.get('amount')
    description = data.get('description')
    trans_type = data.get('type')
    date = data.get('date')
    
    try:
        conn = get_db_connection()
        cursor = conn.execute(
            'UPDATE transactions SET amount = ?, description = ?, type = ?, date = ? WHERE id = ?',
            (amount, description, trans_type, date, trans_id)
        )
        conn.commit()
        if cursor.rowcount == 0:
            conn.close()
            return jsonify({"error": "Not found"}), 404
            
        row = conn.execute('SELECT * FROM transactions WHERE id = ?', (trans_id,)).fetchone()
        conn.close()
        return jsonify(dict(row))
    except Exception as e:
        log(f"PUT Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/transactions/<int:trans_id>', methods=['DELETE'])
@require_auth
def delete_transaction(trans_id):
    log(f"DELETE /api/transactions/{trans_id}")
    try:
        conn = get_db_connection()
        cursor = conn.execute('DELETE FROM transactions WHERE id = ?', (trans_id,))
        conn.commit()
        conn.close()
        if cursor.rowcount == 0:
            return jsonify({"error": "Not found"}), 404
        return '', 204
    except Exception as e:
        log(f"DELETE Error: {e}")
        return jsonify({"error": str(e)}), 500

# Static Routes LAST
@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    # Prevent shadowing API
    if path.startswith('api/'):
        return jsonify({"error": "Not found"}), 404
    return send_from_directory(app.static_folder, path)

if __name__ == '__main__':
    log("Server running on port 3000")
    app.run(host='0.0.0.0', port=3000, debug=False, threaded=True)
