# Nexora News 📰

> **Your World, Your News** — A full-featured, premium news dashboard with live weather, location-based headlines, bookmarks, community submissions, and AI content moderation.

Built with **Node.js + Express** on the backend and **vanilla HTML/CSS/JS** on the frontend — no heavy frameworks, blazing fast.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🌐 **Global News Feeds** | Fetches live headlines across 8 topic categories from a public RSS feed |
| ☁️ **Live Weather Widget** | Real-time weather in the sidebar using your browser location (Open-Meteo API, no key needed) |
| 📍 **Near Me News** | Auto-detects your country via geolocation and loads region-specific headlines |
| 🔖 **Bookmarks & Favourites** | Save articles with one click; persisted in localStorage |
| 👥 **Community Submissions** | Anyone can submit a news article via the built-in submission portal |
| 🤖 **AI Content Moderation** | Rule-based AI verification engine checks for adult content, hate speech, clickbait, spam, and news quality before submission |
| 🌍 **16 Languages & 16 Regions** | Native-language news in Hindi, Spanish, French, Arabic, Japanese, Korean, and more |
| 🌙 **Dark / Light Mode** | Smooth theme toggle; preference persisted |
| 🔍 **Search** | Full-text news search across all global headlines |
| 📱 **Responsive Design** | Works on mobile, tablet, and desktop |

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 18

### Installation
```bash
git clone https://github.com/YOUR_USERNAME/nexora-news.git
cd nexora-news
npm install
```

### Run the Web Dashboard
```bash
npm start
# or
npm run web
```
Then open **http://localhost:3000** in your browser.

### Run the CLI Tool (Terminal Mode)
```bash
npm run cli
# or
node bin/index.js --topic TECHNOLOGY --limit 5
```

#### CLI Options
| Flag | Description | Default |
|---|---|---|
| `-s, --search <query>` | Search news | — |
| `-t, --topic <topic>` | Topic (WORLD, TECHNOLOGY, SPORTS…) | — |
| `-l, --limit <n>` | Number of results | 10 |
| `-c, --country <code>` | Country code (US, IN, GB…) | US |
| `-g, --language <code>` | Language code (en, hi, es…) | en |

---

## 🏗️ Project Structure

```
nexora-news/
├── public/              # Web dashboard frontend
│   ├── index.html       # App shell
│   ├── index.css        # Design system & styles
│   └── app.js           # Frontend logic
├── bin/
│   └── index.js         # CLI tool entry point
├── server.js            # Express backend & API proxy
├── submissions.json     # Community article store
├── package.json
└── README.md
```

---

## 🔌 API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/news` | GET | Fetch news feed (`topic`, `search`, `country`, `language` params) |
| `/api/weather` | GET | Current weather (`lat`, `lon` or `city` params) |
| `/api/geocode` | GET | Reverse-geocode to country code (`lat`, `lon`) |
| `/api/verify` | POST | AI content moderation check |
| `/api/submit` | POST | Submit a community news article |
| `/api/submissions` | GET | List pending community articles |

---

## 🤖 AI Content Moderation

When submitting news, the article is verified against these rules:

- ❌ **Adult / explicit content** — detected via keyword patterns
- ❌ **Hate speech or extremism** — flags dangerous language
- ⚠️ **Clickbait titles** — warns about ALL-CAPS or sensational patterns
- ⚠️ **Repetitive / spam content** — detected via word frequency
- ❌ **Too-short articles** — minimum 50 chars of content required
- ❌ **Invalid source URL** — must be a properly formatted URL

A score out of 100 is returned. Only articles scoring above the rejection threshold can be submitted.

---

## 📦 Dependencies

- [express](https://expressjs.com/) — Web server
- [rss-parser](https://github.com/rbren/rss-parser) — RSS feed parser
- [commander](https://github.com/tj/commander.js/) — CLI argument parser
- [@inquirer/prompts](https://github.com/SBoudrias/Inquirer.js) — Interactive CLI prompts
- [picocolors](https://github.com/alexeyraspopov/picocolors) — CLI coloring
- [open](https://github.com/sindresorhus/open) — Open URLs in browser from CLI
- [Open-Meteo](https://open-meteo.com/) — Free weather API (no key required)

---

## 📄 License

MIT — free to use, modify and distribute.
