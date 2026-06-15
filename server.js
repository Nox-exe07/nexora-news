import express from 'express';
import Parser from 'rss-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const app = express();
const port = process.env.PORT || 3000;
const parser = new Parser();

app.use(express.json({ limit: '2mb' }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

// Submissions storage file
const SUBMISSIONS_FILE = path.join(__dirname, 'submissions.json');
if (!fs.existsSync(SUBMISSIONS_FILE)) {
  fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify([], null, 2));
}

// ─────────────────────────────────────────────
// Build Google News RSS URL
// ─────────────────────────────────────────────
function buildNewsUrl({ search, topic, country = 'US', language = 'en' }) {
  const gl = country.toUpperCase();
  const hl = language.toLowerCase();
  const ceid = `${gl}:${hl}`;
  if (search) {
    return `https://news.google.com/rss/search?q=${encodeURIComponent(search)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
  }
  if (topic) {
    return `https://news.google.com/rss/headlines/section/topic/${topic.toUpperCase()}?hl=${hl}&gl=${gl}&ceid=${ceid}`;
  }
  return `https://news.google.com/rss?hl=${hl}&gl=${gl}&ceid=${ceid}`;
}

// ─────────────────────────────────────────────
// GET /api/news — Fetch news feed
// ─────────────────────────────────────────────
app.get('/api/news', async (req, res) => {
  const { search, topic, country, language } = req.query;
  const url = buildNewsUrl({ search, topic, country, language });

  try {
    const feed = await parser.parseURL(url);
    const items = (feed.items || []).map(item => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
      source: item.source?.name || item.creator || 'Nexora News',
      contentSnippet: item.contentSnippet || '',
      guid: item.guid
    }));
    res.json({ title: feed.title || 'Nexora News', items });
  } catch (error) {
    console.error('News fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch news feed', details: error.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/weather — Proxy to Open-Meteo
// ─────────────────────────────────────────────
app.get('/api/weather', async (req, res) => {
  const { lat, lon, city } = req.query;

  try {
    let latitude = lat;
    let longitude = lon;
    let cityName = city || 'Your Location';

    // If no coords but city provided, geocode it
    if ((!lat || !lon) && city) {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
      const geoResp = await fetch(geoUrl);
      const geoData = await geoResp.json();
      if (geoData.results && geoData.results.length > 0) {
        latitude = geoData.results[0].latitude;
        longitude = geoData.results[0].longitude;
        cityName = geoData.results[0].name;
      } else {
        return res.status(404).json({ error: 'City not found' });
      }
    }

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Provide lat/lon or city parameter' });
    }

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&temperature_unit=celsius&wind_speed_unit=kmh&timezone=auto`;
    const weatherResp = await fetch(weatherUrl);
    const weatherData = await weatherResp.json();

    const current = weatherData.current;

    // WMO Weather Code to description + emoji
    const weatherInfo = decodeWeatherCode(current.weather_code);

    res.json({
      city: cityName,
      temperature: Math.round(current.temperature_2m),
      feelsLike: Math.round(current.apparent_temperature),
      humidity: current.relative_humidity_2m,
      windSpeed: Math.round(current.wind_speed_10m),
      description: weatherInfo.description,
      emoji: weatherInfo.emoji,
      unit: '°C'
    });
  } catch (error) {
    console.error('Weather error:', error.message);
    res.status(500).json({ error: 'Failed to fetch weather', details: error.message });
  }
});

function decodeWeatherCode(code) {
  if (code === 0) return { description: 'Clear Sky', emoji: '☀️' };
  if ([1, 2, 3].includes(code)) return { description: 'Partly Cloudy', emoji: '⛅' };
  if ([45, 48].includes(code)) return { description: 'Foggy', emoji: '🌫️' };
  if ([51, 53, 55].includes(code)) return { description: 'Drizzle', emoji: '🌦️' };
  if ([61, 63, 65].includes(code)) return { description: 'Rainy', emoji: '🌧️' };
  if ([71, 73, 75, 77].includes(code)) return { description: 'Snowy', emoji: '❄️' };
  if ([80, 81, 82].includes(code)) return { description: 'Rain Showers', emoji: '🌨️' };
  if ([95, 96, 99].includes(code)) return { description: 'Thunderstorm', emoji: '⛈️' };
  return { description: 'Unknown', emoji: '🌡️' };
}

// ─────────────────────────────────────────────
// GET /api/geocode — Reverse geocode lat/lon to country code
// ─────────────────────────────────────────────
app.get('/api/geocode', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: 'lat and lon required' });

  try {
    // Use Open-Meteo timezone API to get rough location info
    const tzUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&timezone=auto&current=temperature_2m`;
    const tzResp = await fetch(tzUrl);
    const tzData = await tzResp.json();
    const timezone = tzData.timezone || 'UTC';

    // Map timezone to country code (simplified)
    const countryCode = timezoneToCountry(timezone);

    res.json({ timezone, countryCode, city: timezone.split('/').pop().replace(/_/g, ' ') });
  } catch (error) {
    console.error('Geocode error:', error.message);
    res.status(500).json({ error: 'Geocode failed', details: error.message });
  }
});

function timezoneToCountry(tz) {
  const map = {
    'America': 'US', 'Europe/London': 'GB', 'Europe/Paris': 'FR',
    'Europe/Berlin': 'DE', 'Asia/Kolkata': 'IN', 'Asia/Tokyo': 'JP',
    'Asia/Shanghai': 'CN', 'Australia': 'AU', 'America/Toronto': 'CA',
    'America/Sao_Paulo': 'BR', 'Africa/Johannesburg': 'ZA',
    'Europe/Madrid': 'ES', 'Europe/Rome': 'IT', 'Asia/Dubai': 'AE',
    'Asia/Seoul': 'KR', 'Asia/Singapore': 'SG'
  };
  for (const [key, val] of Object.entries(map)) {
    if (tz.startsWith(key) || tz === key) return val;
  }
  // Guess from continent
  if (tz.startsWith('Asia')) return 'IN';
  if (tz.startsWith('Europe')) return 'GB';
  if (tz.startsWith('Africa')) return 'ZA';
  if (tz.startsWith('Pacific')) return 'AU';
  return 'US';
}

// ─────────────────────────────────────────────
// POST /api/verify — AI content moderation
// ─────────────────────────────────────────────
app.post('/api/verify', (req, res) => {
  const { title, content, sourceUrl, category } = req.body;

  const issues = [];
  const warnings = [];
  let score = 100;

  // --- Rule 1: Title validation ---
  if (!title || title.trim().length < 10) {
    issues.push('Title is too short (minimum 10 characters).');
    score -= 30;
  }
  if (title && title.length > 200) {
    warnings.push('Title is very long (over 200 characters).');
    score -= 10;
  }

  // --- Rule 2: Excessive capitalization (clickbait/sensational) ---
  const upperRatio = (title || '').replace(/[^A-Za-z]/g, '').split('').filter(c => c === c.toUpperCase()).length /
    Math.max(1, (title || '').replace(/[^A-Za-z]/g, '').length);
  if (upperRatio > 0.6) {
    warnings.push('Title uses excessive capitalization. This may appear sensational or like clickbait.');
    score -= 15;
  }

  // --- Rule 3: Adult/explicit content keywords ---
  const adultKeywords = ['porn', 'sex', 'nude', 'naked', 'xxx', 'adult', 'explicit', 'erotic',
    'hentai', 'escort', 'prostitut', 'onlyfans', 'strip', 'fetish', 'nsfw'];
  const fullText = `${title || ''} ${content || ''}`.toLowerCase();
  const foundAdult = adultKeywords.filter(kw => fullText.includes(kw));
  if (foundAdult.length > 0) {
    issues.push(`Adult/explicit content detected: [${foundAdult.join(', ')}]. This violates Nexora News content policy.`);
    score -= 60;
  }

  // --- Rule 4: Hate speech / extremism keywords ---
  const hateKeywords = ['kill all', 'genocide', 'slaughter', 'exterminate', 'ethnic cleansing', 'terrorism'];
  const foundHate = hateKeywords.filter(kw => fullText.includes(kw));
  if (foundHate.length > 0) {
    issues.push(`Potentially hateful or extremist language detected. Please review your content.`);
    score -= 50;
  }

  // --- Rule 5: Source URL check ---
  if (sourceUrl) {
    try {
      new URL(sourceUrl); // Will throw if invalid
    } catch {
      issues.push('Source URL is not a valid URL (e.g., https://example.com/news-article).');
      score -= 20;
    }
  }

  // --- Rule 6: Content length check ---
  if (!content || content.trim().length < 50) {
    issues.push('News content is too short (minimum 50 characters). Please provide more details.');
    score -= 20;
  }

  // --- Rule 7: Spam/repetition detection ---
  if (content) {
    const words = content.toLowerCase().split(/\s+/);
    const wordCount = {};
    for (const w of words) wordCount[w] = (wordCount[w] || 0) + 1;
    const maxRepeat = Math.max(...Object.values(wordCount));
    if (maxRepeat > 15 && words.length < 100) {
      warnings.push('Content appears to contain repetitive text, which may indicate spam.');
      score -= 15;
    }
  }

  // --- Rule 8: Clickbait title pattern check ---
  const clickbaitPatterns = [/you won't believe/i, /shocking/i, /secret they don't/i,
    /this one trick/i, /doctors hate/i, /\?\?\?/, /!!!/];
  const foundClickbait = clickbaitPatterns.filter(p => p.test(title || ''));
  if (foundClickbait.length > 0) {
    warnings.push('Title contains clickbait patterns. Consider rewriting for journalistic integrity.');
    score -= 10;
  }

  score = Math.max(0, Math.min(100, score));

  const verdict = issues.length > 0 ? 'REJECTED' : (warnings.length > 0 ? 'WARNING' : 'APPROVED');

  res.json({
    verdict,
    score,
    issues,
    warnings,
    message: verdict === 'APPROVED'
      ? '✅ Your article passed all Nexora News content guidelines!'
      : verdict === 'WARNING'
      ? '⚠️ Your article passed but has some quality concerns. Please review.'
      : '❌ Your article was rejected due to guideline violations.',
    checkedAt: new Date().toISOString()
  });
});

// ─────────────────────────────────────────────
// POST /api/submit — Save submitted article
// ─────────────────────────────────────────────
app.post('/api/submit', (req, res) => {
  const { title, author, sourceUrl, category, content, imageUrl } = req.body;

  if (!title || !content || !author) {
    return res.status(400).json({ error: 'Title, author, and content are required.' });
  }

  try {
    const submissions = JSON.parse(fs.readFileSync(SUBMISSIONS_FILE, 'utf-8'));
    const newArticle = {
      id: `sub_${Date.now()}`,
      title,
      author,
      sourceUrl,
      category: category || 'General',
      content,
      imageUrl,
      status: 'pending',
      submittedAt: new Date().toISOString()
    };
    submissions.push(newArticle);
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));
    res.json({ success: true, message: 'Article submitted successfully!', id: newArticle.id });
  } catch (err) {
    console.error('Submit error:', err.message);
    res.status(500).json({ error: 'Failed to save article' });
  }
});

// ─────────────────────────────────────────────
// GET /api/submissions — Retrieve submitted articles
// ─────────────────────────────────────────────
app.get('/api/submissions', (req, res) => {
  try {
    const submissions = JSON.parse(fs.readFileSync(SUBMISSIONS_FILE, 'utf-8'));
    res.json(submissions.filter(s => s.status === 'pending'));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load submissions' });
  }
});

app.listen(port, () => {
  console.log(`\n🚀 Nexora News server running at http://localhost:${port}\n`);
});
