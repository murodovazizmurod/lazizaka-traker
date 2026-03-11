require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { createClient } = require('@vercel/postgres');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'lazizaka-secret-token';

app.use(cors());
app.use(bodyParser.json());

// Database Client
const client = createClient({
  connectionString: process.env.POSTGRES_URL
});

async function connectDb() {
    try {
        await client.connect();
        console.log('Connected to Database');
    } catch (err) {
        console.error('Database connection failed:', err);
    }
}

// Database Initialization
async function initDb() {
    try {
        await client.sql`
            CREATE TABLE IF NOT EXISTS transactions (
                id SERIAL PRIMARY KEY,
                amount DECIMAL(12, 2) NOT NULL,
                description TEXT NOT NULL,
                type VARCHAR(20) NOT NULL,
                date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        `;
        console.log('Database schema verified');
    } catch (err) {
        console.error('Database initialization failed:', err);
    }
}

// Auth Middleware
const authenticate = (req, res, next) => {
    const token = req.headers['authorization'];
    if (token === AUTH_TOKEN) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// Login Route
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'azizmurodjon') {
        res.json({ token: AUTH_TOKEN });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// CRUD Routes
app.get('/api/transactions', authenticate, async (req, res) => {
    try {
        const { rows } = await client.sql`SELECT * FROM transactions ORDER BY date DESC`;
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/transactions', authenticate, async (req, res) => {
    const { amount, description, type, date } = req.body;
    try {
        const { rows } = await client.sql`
            INSERT INTO transactions (amount, description, type, date)
            VALUES (${amount}, ${description}, ${type}, ${date || new Date().toISOString()})
            RETURNING *
        `;
        res.status(201).json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/transactions/:id', authenticate, async (req, res) => {
    const id = req.params.id;
    const { amount, description, type, date } = req.body;
    try {
        const { rows } = await client.sql`
            UPDATE transactions 
            SET amount = ${amount}, description = ${description}, type = ${type}, date = ${date}
            WHERE id = ${id}
            RETURNING *
        `;
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ error: 'Not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/transactions/:id', authenticate, async (req, res) => {
    const id = req.params.id;
    try {
        const { rowCount } = await client.sql`DELETE FROM transactions WHERE id = ${id}`;
        if (rowCount > 0) {
            res.status(204).send();
        } else {
            res.status(404).json({ error: 'Not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Routes already use client.sql which handles pooling/connections properly with createClient

module.exports = app;
