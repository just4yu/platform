import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_PORT = process.env.PORT || 3000;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin2025';
const JWT_SECRET = process.env.JWT_SECRET || 'just4u-secret';
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'stant1605@gmail.com';
const SMTP_URL = process.env.SMTP_URL || ''; // optional; if empty, we log instead of sending

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Serve original styled UI as index
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'just4u-complete-platform.html'));
});

const DATA_DIR = path.join(__dirname, 'data');
const DB_JSON = path.join(DATA_DIR, 'developers.json');
const DB_TXT = path.join(__dirname, 'candidates_database_extended.txt');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function parseTxtToJson() {
  const text = fs.readFileSync(DB_TXT, 'utf-8');
  const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  const devs = [];
  lines.forEach((line, idx) => {
    const fields = parseCsvLine(line);
    if (fields.length < 12) return;
    const [developerId, position, category, technologiesStr, experienceYearsStr, projectsCountStr, englishLevel, salaryUSDStr, projectSectorsStr, techScoreStr, ratingStr, video, availability = 'As needed', achievementsStr = ''] = fields;
    const experienceYears = parseInt(experienceYearsStr, 10) || 0;
    const projectsCount = parseInt(projectsCountStr, 10) || 0;
    const salaryUSD = parseInt(salaryUSDStr, 10) || 0;
    const technologies = (technologiesStr || '').split(';').map(s => s.trim()).filter(Boolean);
    const projectSectors = (projectSectorsStr || '').split(';').map(s => s.trim()).filter(Boolean);
    let techScore = 0;
    if ((techScoreStr || '').includes('=')) {
      const right = techScoreStr.split('=').pop();
      techScore = parseInt(right.trim(), 10) || 0;
    } else {
      const maybe = parseInt(techScoreStr, 10);
      techScore = isNaN(maybe) ? (experienceYears * 10 + projectsCount * 3 + technologies.length) : maybe;
    }
    const rating = parseFloat(ratingStr) || 4.5;
    const achievements = (achievementsStr && achievementsStr !== '-') ? achievementsStr.split(';').map(s => s.trim()).filter(Boolean) : [];
    devs.push({
      id: idx + 1,
      developerId: (developerId || '').trim(),
      position: (position || '').trim(),
      category: (category || '').trim(),
      technologies,
      experienceYears,
      projectsCount,
      englishLevel: (englishLevel || '').trim(),
      salaryUSD,
      projectSectors,
      techScore,
      rating,
      video: (video || 'Soon').trim() || 'Soon',
      availability: (availability || 'As needed').trim(),
      achievements,
    });
  });
  return devs;
}

function loadDb() {
  ensureDataDir();
  if (fs.existsSync(DB_JSON)) {
    try {
      const raw = fs.readFileSync(DB_JSON, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length) return data;
    } catch {}
  }
  const devs = parseTxtToJson();
  fs.writeFileSync(DB_JSON, JSON.stringify(devs, null, 2));
  return devs;
}

let developers = loadDb();

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ')? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try { jwt.verify(token, JWT_SECRET); next(); } catch { return res.status(401).json({ error: 'Invalid token' }); }
}

app.get('/api/developers', (req, res) => {
  // basic filters via query
  const { category, tech, minSalary, maxSalary, minExp, maxExp, minTechScore } = req.query;
  let list = [...developers];
  if (category) {
    const cats = Array.isArray(category) ? category : String(category).split(',');
    list = list.filter(d => cats.includes(d.category));
  }
  if (tech) {
    const techs = Array.isArray(tech) ? tech : String(tech).split(',').map(s => s.toLowerCase());
    list = list.filter(d => techs.some(t => d.technologies.map(x => x.toLowerCase()).includes(t)));
  }
  if (minSalary) list = list.filter(d => d.salaryUSD >= Number(minSalary));
  if (maxSalary) list = list.filter(d => d.salaryUSD <= Number(maxSalary));
  if (minExp) list = list.filter(d => d.experienceYears >= Number(minExp));
  if (maxExp) list = list.filter(d => d.experienceYears <= Number(maxExp));
  if (minTechScore) list = list.filter(d => d.techScore >= Number(minTechScore));
  res.json({ total: list.length, developers: list });
});

app.get('/api/developers/:id', (req, res) => {
  const dev = developers.find(d => d.developerId === req.params.id || String(d.id) === req.params.id);
  if (!dev) return res.status(404).json({ error: 'Not found' });
  res.json(dev);
});

app.post('/api/contact', async (req, res) => {
  const { name, email, developerId, projectDescription } = req.body || {};
  if (!name || !email || !developerId) return res.status(400).json({ error: 'name, email, developerId are required' });
  const dev = developers.find(d => d.developerId === developerId);
  if (!dev) return res.status(404).json({ error: 'Developer not found' });
  const subject = `just4u: ${dev.developerId} ${dev.position}`;
  const body = `Name: ${name}\nEmail: ${email}\nDeveloper: ${dev.developerId} ${dev.position}\nCategory: ${dev.category}\nEnglish: ${dev.englishLevel}\nTech Score: ${dev.techScore}\nRating: ${dev.rating}\nSalary: $${dev.salaryUSD}/mo\nAvailability: ${dev.availability}\n\nProject: ${projectDescription || ''}`;
  if (SMTP_URL) {
    try {
      const transporter = nodemailer.createTransport(SMTP_URL);
      await transporter.sendMail({ from: email, to: CONTACT_EMAIL, subject, text: body });
      return res.json({ ok: true });
    } catch (e) {
      console.error('SMTP send failed', e);
      return res.status(500).json({ error: 'email_send_failed' });
    }
  } else {
    console.log('CONTACT REQUEST (no SMTP configured):\n', { subject, body });
    return res.json({ ok: true, info: 'logged_only' });
  }
});

// New: Ideal Developer Constructor submission
app.post('/api/constructor', async (req, res) => {
  const { projectType, technologies, budget, email, description } = req.body || {};
  if (!projectType || !technologies || !budget || !email) {
    return res.status(400).json({ error: 'projectType, technologies, budget, email are required' });
  }
  const subject = `just4u: Constructor Request (${projectType}, ${budget})`;
  const body = `Email: ${email}\nProject Type: ${projectType}\nTechnologies: ${technologies}\nBudget: ${budget}\n\nDescription: ${description || ''}`;
  if (SMTP_URL) {
    try {
      const transporter = nodemailer.createTransport(SMTP_URL);
      await transporter.sendMail({ from: email, to: CONTACT_EMAIL, subject, text: body });
      return res.json({ ok: true });
    } catch (e) {
      console.error('SMTP send failed', e);
      return res.status(500).json({ error: 'email_send_failed' });
    }
  } else {
    console.log('CONSTRUCTOR REQUEST (no SMTP configured):\n', { subject, body });
    return res.json({ ok: true, info: 'logged_only' });
  }
});

// Admin
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (password !== ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

app.post('/api/admin/developers', authMiddleware, (req, res) => {
  const dev = req.body || {};
  if (!dev.developerId || !dev.position) return res.status(400).json({ error: 'developerId and position required' });
  developers.push(dev);
  ensureDataDir();
  fs.writeFileSync(DB_JSON, JSON.stringify(developers, null, 2));
  res.json({ ok: true });
});

app.put('/api/admin/developers/:id', authMiddleware, (req, res) => {
  const id = req.params.id;
  const idx = developers.findIndex(d => d.developerId === id || String(d.id) === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  developers[idx] = { ...developers[idx], ...req.body };
  ensureDataDir();
  fs.writeFileSync(DB_JSON, JSON.stringify(developers, null, 2));
  res.json({ ok: true });
});

app.delete('/api/admin/developers/:id', authMiddleware, (req, res) => {
  const id = req.params.id;
  const before = developers.length;
  developers = developers.filter(d => !(d.developerId === id || String(d.id) === id));
  if (developers.length === before) return res.status(404).json({ error: 'Not found' });
  ensureDataDir();
  fs.writeFileSync(DB_JSON, JSON.stringify(developers, null, 2));
  res.json({ ok: true });
});

app.get('/api/admin/export', authMiddleware, (req, res) => {
  res.json(developers);
});

app.listen(APP_PORT, () => {
  console.log(`just4u platform running on http://localhost:${APP_PORT}`);
});