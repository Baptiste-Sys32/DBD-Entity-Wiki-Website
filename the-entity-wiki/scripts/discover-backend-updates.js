#!/usr/bin/env node
// Read-only official announcement discovery. Backend tunables are absent from
// the catalog/perk API and require source-backed review before promotion.
const { fetchJsonWithRetry } = require('./network-resilience');
const ENDPOINT = 'https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=381210&count=100&maxlength=0';
function candidates(payload) {
  if (!Array.isArray(payload?.appnews?.newsitems)) throw new Error('Unexpected official news response');
  return payload.appnews.newsitems.filter(item => item.feedname === 'steam_community_announcements'
    && /backend|tunables/i.test(`${item.title} ${item.contents}`))
    .map(item => ({ title: item.title, date: new Date(item.date * 1000).toISOString().slice(0, 10), url: item.url, contents: item.contents }));
}
async function main() {
  const payload = await fetchJsonWithRetry(ENDPOINT, { timeoutMs: 20000, retries: 2 });
  const entries = candidates(payload);
  console.log(JSON.stringify({ mode: 'discovery-only', limitation: 'Latest 100 announcements only; review basekit changes separately from catalog/perk API. No canonical files written.', entries }, null, 2));
}
module.exports = { candidates };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
