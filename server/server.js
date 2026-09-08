const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'Universal Attendance & Worker Management System Backend',
    timestamp: new Date().toISOString(),
  });
});

// Auth Route
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const users = db.getCollection('users');
  const user = users.find(
    (u) => u.username === username && u.password === password && u.isActive !== false
  );

  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // Update last login
  const updatedUsers = users.map((u) =>
    u.id === user.id ? { ...u, lastLogin: new Date().toISOString() } : u
  );
  db.setCollection('users', updatedUsers);

  const { password: _, ...userWithoutPassword } = user;
  res.json({
    user: userWithoutPassword,
    token: `token_${user.id}_${Date.now()}`,
  });
});

// Helper for generic CRUD routes
function createCrudRoutes(entityName, collectionKey) {
  // GET ALL
  app.get(`/api/${entityName}`, (req, res) => {
    const items = db.getCollection(collectionKey);
    res.json(items);
  });

  // GET ONE
  app.get(`/api/${entityName}/:id`, (req, res) => {
    const items = db.getCollection(collectionKey);
    const item = items.find((i) => i.id === req.params.id);
    if (!item) return res.status(404).json({ error: `${entityName} not found` });
    res.json(item);
  });

  // CREATE ONE
  app.post(`/api/${entityName}`, (req, res) => {
    const items = db.getCollection(collectionKey);
    const newItem = req.body;
    if (!newItem.id) {
      newItem.id = `${collectionKey.substring(0, 3).toUpperCase()}_${Date.now()}`;
    }
    newItem.createdAt = newItem.createdAt || new Date().toISOString();
    items.push(newItem);
    db.setCollection(collectionKey, items);
    res.status(201).json(newItem);
  });

  // UPDATE ONE
  app.put(`/api/${entityName}/:id`, (req, res) => {
    const items = db.getCollection(collectionKey);
    const index = items.findIndex((i) => i.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: `${entityName} not found` });

    items[index] = { ...items[index], ...req.body, updatedAt: new Date().toISOString() };
    db.setCollection(collectionKey, items);
    res.json(items[index]);
  });

  // DELETE ONE
  app.delete(`/api/${entityName}/:id`, (req, res) => {
    const items = db.getCollection(collectionKey);
    const filtered = items.filter((i) => i.id !== req.params.id);
    db.setCollection(collectionKey, filtered);
    res.json({ success: true, id: req.params.id });
  });
}

// Register CRUD endpoints for all models
createCrudRoutes('users', 'users');
createCrudRoutes('sites', 'sites');
createCrudRoutes('sections', 'sections');
createCrudRoutes('workers', 'workers');
createCrudRoutes('assignments', 'assignments');
createCrudRoutes('employment-history', 'employment_history');
createCrudRoutes('attendance', 'attendance');
createCrudRoutes('advances', 'advances');
createCrudRoutes('recoveries', 'recoveries');
createCrudRoutes('referrers', 'referrers');
createCrudRoutes('payments', 'payments');
createCrudRoutes('settlements', 'settlements');
createCrudRoutes('food-orders', 'food_orders');
createCrudRoutes('commission-requests', 'commission_requests');
createCrudRoutes('site-migrations', 'site_migrations');

// Special Bulk Attendance endpoint
app.post('/api/attendance/bulk', (req, res) => {
  const { date, records } = req.body;
  if (!Array.isArray(records)) {
    return res.status(400).json({ error: 'records must be an array' });
  }

  let currentAttendance = db.getCollection('attendance');
  // Remove existing records for this date and update with new ones
  if (date) {
    currentAttendance = currentAttendance.filter((a) => a.date !== date);
  }

  const updatedAttendance = [...currentAttendance, ...records];
  db.setCollection('attendance', updatedAttendance);
  res.json({ success: true, count: records.length });
});

// App Settings
app.get('/api/settings', (req, res) => {
  res.json(db.getSettings());
});

app.put('/api/settings', (req, res) => {
  const updated = db.setSettings(req.body);
  res.json(updated);
});

// Full DB Sync Endpoint (Bulk Get & Bulk Import/Export)
app.get('/api/sync/export', (req, res) => {
  res.json(db.loadFullDb());
});

app.post('/api/sync/import', (req, res) => {
  const fullData = req.body;
  if (typeof fullData !== 'object') {
    return res.status(400).json({ error: 'Invalid data format' });
  }
  db.saveFullDb(fullData);
  res.json({ success: true, message: 'Database state updated' });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`Universal Attendance & Worker Management Backend Server`);
  console.log(`Running on: http://localhost:${PORT}`);
  console.log(`Health Check: http://localhost:${PORT}/api/health`);
  console.log(`=======================================================`);
});
