const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const AUTH_TOKEN = 'lazizaka-secret-token';

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// Ensure data.json exists
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
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
    // Static credentials
    if (username === 'admin' && password === 'azizmurodjon') {
        res.json({ token: AUTH_TOKEN });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// CRUD Routes
app.get('/api/transactions', authenticate, (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    res.json(data);
});

app.post('/api/transactions', authenticate, (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    const newTransaction = { ...req.body, id: Date.now() };
    data.push(newTransaction);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.status(201).json(newTransaction);
});

app.put('/api/transactions/:id', authenticate, (req, res) => {
    const id = parseInt(req.params.id);
    let data = JSON.parse(fs.readFileSync(DATA_FILE));
    const index = data.findIndex(t => t.id === id);
    if (index !== -1) {
        data[index] = { ...data[index], ...req.body };
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        res.json(data[index]);
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

app.delete('/api/transactions/:id', authenticate, (req, res) => {
    const id = parseInt(req.params.id);
    let data = JSON.parse(fs.readFileSync(DATA_FILE));
    const initialLength = data.length;
    data = data.filter(t => t.id !== id);
    if (data.length < initialLength) {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        res.status(204).send();
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
