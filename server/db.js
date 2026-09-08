const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const DEFAULT_USERS = [
  {
    id: 'U001',
    username: 'admin',
    password: 'Admin@2026',
    name: 'System Admin',
    role: 'admin',
    siteId: 'all',
    sectionId: 'all',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_DB = {
  users: DEFAULT_USERS,
  sites: [],
  sections: [],
  workers: [],
  assignments: [],
  employment_history: [],
  attendance: [],
  advances: [],
  recoveries: [],
  referrers: [],
  payments: [],
  settlements: [],
  food_orders: [],
  commission_requests: [],
  site_migrations: [],
  settings: {},
};

function ensureDbExists() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf8');
  } else {
    try {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      // Ensure admin exists
      if (!data.users || data.users.length === 0) {
        data.users = DEFAULT_USERS;
        saveDb(data);
      }
    } catch (err) {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf8');
    }
  }
}

function loadDb() {
  ensureDbExists();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return { ...DEFAULT_DB };
  }
}

function saveDb(data) {
  ensureDbExists();
  const tempPath = DB_FILE + '.tmp';
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tempPath, DB_FILE);
}

module.exports = {
  getCollection: (name) => {
    const db = loadDb();
    return db[name] || [];
  },
  setCollection: (name, items) => {
    const db = loadDb();
    db[name] = items;
    saveDb(db);
    return db[name];
  },
  getSettings: () => {
    const db = loadDb();
    return db.settings || {};
  },
  setSettings: (settingsObj) => {
    const db = loadDb();
    db.settings = settingsObj;
    saveDb(db);
    return db.settings;
  },
  loadFullDb: () => loadDb(),
  saveFullDb: (fullData) => saveDb(fullData),
};
