#!/usr/bin/env node

process.noDeprecation = true;

import Parser from 'rss-parser';
import { Command } from 'commander';
import pc from 'picocolors';
import open from 'open';
import { select, input } from '@inquirer/prompts';

// Initialize RSS Parser
const parser = new Parser();

// Default Settings
let currentCountry = 'US';
let currentLanguage = 'en';

// Available Topics
const TOPICS = {
  WORLD: { name: 'World', code: 'WORLD' },
  NATION: { name: 'Nation/Local', code: 'NATION' },
  BUSINESS: { name: 'Business', code: 'BUSINESS' },
  TECHNOLOGY: { name: 'Technology', code: 'TECHNOLOGY' },
  ENTERTAINMENT: { name: 'Entertainment', code: 'ENTERTAINMENT' },
  SPORTS: { name: 'Sports', code: 'SPORTS' },
  SCIENCE: { name: 'Science', code: 'SCIENCE' },
  HEALTH: { name: 'Health', code: 'HEALTH' }
};

/**
 * Builds RSS Feed URL based on options
 */
function buildUrl({ search, topic, country, language }) {
  const gl = (country || currentCountry).toUpperCase();
  const hl = (language || currentLanguage).toLowerCase();
  const ceid = `${gl}:${hl}`;

  if (search) {
    return `https://news.google.com/rss/search?q=${encodeURIComponent(search)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
  }
  if (topic) {
    return `https://news.google.com/rss/headlines/section/topic/${topic.toUpperCase()}?hl=${hl}&gl=${gl}&ceid=${ceid}`;
  }
  return `https://news.google.com/rss?hl=${hl}&gl=${gl}&ceid=${ceid}`;
}

/**
 * Fetches news items from Google News RSS
 */
async function fetchNews(url) {
  try {
    const feed = await parser.parseURL(url);
    return feed.items || [];
  } catch (error) {
    console.error(pc.red(`\nError fetching news: ${error.message}`));
    return [];
  }
}

/**
 * Displays direct CLI list (non-interactive)
 */
function displayDirectList(items, limit) {
  const count = Math.min(items.length, limit);
  if (count === 0) {
    console.log(pc.yellow('\nNo news items found.'));
    return;
  }

  console.log(pc.cyan(`\n📰 Google News - Showing ${count} items:\n`));
  for (let i = 0; i < count; i++) {
    const item = items[i];
    const pubDate = item.pubDate ? new Date(item.pubDate).toLocaleString() : 'Unknown date';
    const source = item.source?.name || item.creator || 'Google News';
    
    console.log(`${pc.green(pc.bold(i + 1 + '.'))} ${pc.bold(item.title)}`);
    console.log(`   ${pc.dim(`Source: ${source} | Published: ${pubDate}`)}`);
    console.log(`   ${pc.blue(item.link)}\n`);
  }
}

/**
 * Prints Google News TUI banner
 */
function printBanner() {
  console.clear();
  console.log(pc.bold(
    `\n` +
    `  ${pc.blue('G')}${pc.red('o')}${pc.yellow('o')}${pc.blue('g')}${pc.green('l')}${pc.red('e')} ${pc.white('News CLI')}\n` +
    `  ${pc.dim('────────────────────────────────────────')}\n` +
    `  ${pc.cyan('Region:')} ${pc.bold(currentCountry)}  ${pc.cyan('Language:')} ${pc.bold(currentLanguage)}\n`
  ));
}

/**
 * Prompts user to view details of a selected article
 */
async function handleArticleSelection(items, limit = 15) {
  const choices = items.slice(0, limit).map((item, idx) => ({
    name: `${pc.green(`${idx + 1}.`)} ${item.title.substring(0, 75)}${item.title.length > 75 ? '...' : ''}`,
    value: item
  }));

  choices.push({ name: pc.yellow('↩ Back to Main Menu'), value: 'back' });

  try {
    const selected = await select({
      message: 'Select an article to view details:',
      choices: choices,
      pageSize: 18
    });

    if (selected === 'back') return;

    await showArticleDetails(selected, items, limit);
  } catch (err) {
    if (err.name === 'ExitPromptError') {
      console.log(pc.yellow('\nGoodbye!'));
      process.exit(0);
    }
    throw err;
  }
}

/**
 * Shows detailed view of a single article
 */
async function showArticleDetails(article, previousItems, limit) {
  printBanner();
  
  const pubDate = article.pubDate ? new Date(article.pubDate).toLocaleString() : 'Unknown date';
  const source = article.source?.name || article.creator || 'Google News';

  console.log(pc.cyan(pc.bold('Title:')));
  console.log(pc.bold(article.title));
  console.log();
  console.log(`${pc.cyan('Source:')} ${pc.yellow(source)}`);
  console.log(`${pc.cyan('Published:')} ${pc.dim(pubDate)}`);
  console.log(`${pc.cyan('Link:')} ${pc.blue(article.link)}`);
  console.log();

  try {
    const action = await select({
      message: 'Choose an action:',
      choices: [
        { name: '🔗 Open in Browser', value: 'open' },
        { name: '↩ Back to Article List', value: 'list' },
        { name: '🚪 Back to Main Menu', value: 'menu' }
      ]
    });

    if (action === 'open') {
      console.log(pc.green(`\nOpening in browser: ${article.link}`));
      await open(article.link);
      // Let user read before refreshing or going back
      await input({ message: pc.dim('Press Enter to return...') });
      await showArticleDetails(article, previousItems, limit);
    } else if (action === 'list') {
      printBanner();
      await handleArticleSelection(previousItems, limit);
    }
  } catch (err) {
    if (err.name === 'ExitPromptError') {
      console.log(pc.yellow('\nGoodbye!'));
      process.exit(0);
    }
    throw err;
  }
}

/**
 * Settings menu to change country and language
 */
async function handleSettings() {
  printBanner();
  try {
    const country = await input({
      message: 'Enter Country Code (2 letters, e.g., US, IN, GB, CA):',
      default: currentCountry,
      validate: (input) => input.trim().length === 2 || 'Must be exactly 2 letters'
    });
    
    const language = await input({
      message: 'Enter Language Code (2 letters, e.g., en, hi, es, fr):',
      default: currentLanguage,
      validate: (input) => input.trim().length === 2 || 'Must be exactly 2 letters'
    });

    currentCountry = country.toUpperCase().trim();
    currentLanguage = language.toLowerCase().trim();
    
    console.log(pc.green('\nSettings updated successfully!'));
    await input({ message: pc.dim('Press Enter to return to menu...') });
  } catch (err) {
    if (err.name === 'ExitPromptError') {
      console.log(pc.yellow('\nGoodbye!'));
      process.exit(0);
    }
    throw err;
  }
}

/**
 * Main Interactive TUI Loop
 */
async function startInteractiveTUI() {
  while (true) {
    printBanner();
    try {
      const choice = await select({
        message: 'Main Menu:',
        choices: [
          { name: '📰 Browse Top Headlines', value: 'headlines' },
          { name: '📁 Browse by Category', value: 'category' },
          { name: '🔍 Search Articles', value: 'search' },
          { name: '⚙️ Settings (Country & Language)', value: 'settings' },
          { name: '❌ Exit', value: 'exit' }
        ]
      });

      if (choice === 'exit') {
        console.log(pc.yellow('\nGoodbye!'));
        process.exit(0);
      }

      if (choice === 'settings') {
        await handleSettings();
        continue;
      }

      let url;
      let loadingMessage = '';

      if (choice === 'headlines') {
        url = buildUrl({});
        loadingMessage = 'Fetching top headlines...';
      } else if (choice === 'category') {
        printBanner();
        const topicChoice = await select({
          message: 'Select a Topic:',
          choices: Object.values(TOPICS).map(t => ({ name: t.name, value: t.code }))
        });
        url = buildUrl({ topic: topicChoice });
        loadingMessage = `Fetching news for ${TOPICS[topicChoice].name}...`;
      } else if (choice === 'search') {
        printBanner();
        const query = await input({
          message: 'Enter search query:',
          validate: (input) => input.trim().length > 0 || 'Query cannot be empty'
        });
        url = buildUrl({ search: query });
        loadingMessage = `Searching for "${query}"...`;
      }

      console.log(pc.cyan(`\n${loadingMessage}`));
      const items = await fetchNews(url);
      
      if (items.length === 0) {
        console.log(pc.red('Failed to load articles.'));
        await input({ message: pc.dim('Press Enter to continue...') });
        continue;
      }

      printBanner();
      await handleArticleSelection(items);
    } catch (err) {
      if (err.name === 'ExitPromptError') {
        console.log(pc.yellow('\nGoodbye!'));
        process.exit(0);
      }
      console.error(pc.red(`\nAn error occurred: ${err.message}`));
      try {
        await input({ message: pc.dim('Press Enter to continue...') });
      } catch (_) {
        process.exit(0);
      }
    }
  }
}

/**
 * Main Executable function
 */
async function main() {
  const program = new Command();
  
  program
    .name('gnews')
    .description('CLI tool to get the latest news from Google News')
    .version('1.0.0')
    .option('-s, --search <query>', 'Search for specific news topics')
    .option('-t, --topic <topic>', 'Fetch news for a specific topic (WORLD, NATION, BUSINESS, TECHNOLOGY, ENTERTAINMENT, SPORTS, SCIENCE, HEALTH)')
    .option('-l, --limit <number>', 'Number of news items to return', '10')
    .option('-c, --country <country>', 'Country code (e.g., US, IN, GB)', 'US')
    .option('-g, --language <language>', 'Language code (e.g., en, hi, es)', 'en')
    .parse(process.argv);

  const opts = program.opts();

  // Validate topic if provided
  if (opts.topic && !TOPICS[opts.topic.toUpperCase()]) {
    console.error(pc.red(`Invalid topic "${opts.topic}". Available topics: ${Object.keys(TOPICS).join(', ')}`));
    process.exit(1);
  }

  // If any CLI argument is provided, run direct display mode
  if (opts.search || opts.topic || program.args.length > 0) {
    const limit = parseInt(opts.limit, 10) || 10;
    const url = buildUrl({
      search: opts.search,
      topic: opts.topic,
      country: opts.country,
      language: opts.language
    });
    
    console.log(pc.cyan('Fetching news...'));
    const items = await fetchNews(url);
    displayDirectList(items, limit);
    process.exit(0);
  }

  // Otherwise, start the TUI mode
  // Apply initial country/lang defaults from flags if provided, else use global defaults
  if (opts.country) currentCountry = opts.country.toUpperCase();
  if (opts.language) currentLanguage = opts.language.toLowerCase();
  
  await startInteractiveTUI();
}

main().catch(err => {
  console.error(pc.red(`Fatal Error: ${err.message}`));
  process.exit(1);
});
