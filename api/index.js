require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;
const AUTH_TOKEN = 'lazizaka-secret-token'; // Hardcoded for debugging

const logFile = path.join(__dirname, '..', 'debug.log');
const log = (msg) => {
    const entry = `[${new Date().toISOString()}] ${msg}\n`;
    fs.appendFileSync(logFile, entry);
    console.log(msg);
};

app.use(cors());
app.use((req, res, next) => {
    log(`Incoming: ${req.method} ${req.url}`);
    next();
});
app.use(bodyParser.json());
app.use((req, res, next) => {
    if (req.body && Object.keys(req.body).length > 0) {
        console.log(`[TRACE] Body:`, JSON.stringify(req.body));
    }
    next();
});

// Database Client (SQLite)
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'database.sqlite');
console.log('Connecting to SQLite at:', dbPath);
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection failed:', err.message);
    } else {
        console.log('Connected to the local SQLite database successfully.');
        initDb();
    }
});

// Database Initialization
async function initDb() {
    const query = `
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            amount DECIMAL(12, 2) NOT NULL,
            description TEXT NOT NULL,
            type VARCHAR(20) NOT NULL,
            date TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `;
    console.log('Running initDb query...');
    db.run(query, [], (err) => {
        if (err) {
            console.error('Database initialization failed:', err);
        } else {
            console.log('Database schema verified successfully.');
        }
    });
}

const authenticate = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    log(`Comparing: [${authHeader}] vs [${AUTH_TOKEN}]`);
    
    if (authHeader && authHeader.trim() === AUTH_TOKEN) {
        log('Auth successful');
        next();
    } else {
        log(`Auth failed. Recv: [${authHeader}]`);
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// Login Route
// Health Check Route
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// Diagnostic Route (Temporary)
app.get('/api/diag', (req, res) => {
    res.json({ 
        expectedToken: AUTH_TOKEN,
        receivedHeader: req.headers['authorization'],
        headers: req.headers
    });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'azizmurodjon') {
        res.json({ token: AUTH_TOKEN });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// CRUD Routes
app.get('/api/transactions', authenticate, (req, res) => {
    db.all('SELECT * FROM transactions ORDER BY date DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/transactions', authenticate, (req, res) => {
    const { amount, description, type, date } = req.body;
    console.log('POST /api/transactions', { amount, description, type, date });
    
    const query = `INSERT INTO transactions (amount, description, type, date) VALUES (?, ?, ?, ?)`;
    const params = [amount, description, type, date || new Date().toISOString()];
    
    console.log(`[DB] Executing INSERT for amount: ${amount}`);
    db.run(query, params, function(err) {
        console.log('[DB] INSERT callback fired');
        if (err) {
            console.error('[DB] INSERT Error:', err);
            return res.status(500).json({ error: err.message });
        }
        
        const lastID = this.lastID;
        console.log(`[DB] Created ID: ${lastID}, fetching row...`);
        db.get(`SELECT * FROM transactions WHERE id = ?`, [lastID], (err, row) => {
            console.log('[DB] GET callback fired');
            if (err) {
                console.error('[DB] GET Error:', err);
                return res.status(500).json({ error: err.message });
            }
            console.log('[DB] Success, returning data');
            res.status(201).json(row);
        });
    });
});

app.put('/api/transactions/:id', authenticate, (req, res) => {
    const id = req.params.id;
    const { amount, description, type, date } = req.body;
    
    const query = `UPDATE transactions SET amount = ?, description = ?, type = ?, date = ? WHERE id = ?`;
    const params = [amount, description, type, date, id];
    
    db.run(query, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes > 0) {
            db.get(`SELECT * FROM transactions WHERE id = ?`, [id], (err, row) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json(row);
            });
        } else {
            res.status(404).json({ error: 'Not found' });
        }
    });
});

app.delete('/api/transactions/:id', authenticate, (req, res) => {
    const id = req.params.id;
    db.run('DELETE FROM transactions WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes > 0) {
            res.status(204).send();
        } else {
            res.status(404).json({ error: 'Not found' });
        }
    });
});

// Routes already use direct sqlite3 calls
module.exports = app;
