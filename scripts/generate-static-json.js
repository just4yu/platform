import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.join(__dirname, '..');
const TXT = path.join(ROOT, 'candidates_database_extended.txt');
const OUT = path.join(ROOT, 'public', 'developers.json');

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

function main(){
  const text = fs.readFileSync(TXT, 'utf-8');
  const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  const devs = [];
  lines.forEach((line, idx) => {
    const f = parseCsvLine(line);
    if (f.length < 12) return;
    const [developerId, position, category, technologiesStr, experienceYearsStr, projectsCountStr, englishLevel, salaryUSDStr, projectSectorsStr, techScoreStr, ratingStr, video, availability = 'As needed', achievementsStr = ''] = f;
    const experienceYears = parseInt(experienceYearsStr, 10) || 0;
    const projectsCount = parseInt(projectsCountStr, 10) || 0;
    const salaryUSD = parseInt(salaryUSDStr, 10) || 0;
    const technologies = (technologiesStr || '').split(';').map(s => s.trim()).filter(Boolean);
    const projectSectors = (projectSectorsStr || '').split(';').map(s => s.trim()).filter(Boolean);
    let techScore = 0;
    if ((techScoreStr || '').includes('=')) techScore = parseInt(techScoreStr.split('=').pop().trim(), 10) || 0;
    else techScore = parseInt(techScoreStr, 10);
    if (!techScore || isNaN(techScore)) techScore = (experienceYears * 10 + projectsCount * 3 + technologies.length);
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
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(devs, null, 2));
  console.log(`Wrote ${devs.length} developers to ${OUT}`);
}

main();