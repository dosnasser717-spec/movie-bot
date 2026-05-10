require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const BOT_TOKEN = process.env.BOT_TOKEN;
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const ADMIN_IDS = process.env.ADMIN_IDS.split(',').map(Number);

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// قاعدة بيانات بسيطة في الذاكرة
let content = [];
let nextId = 1;

// ===== START =====
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `🎬 *أهلاً ${msg.from.first_name}!*\n\n` +
    `🔍 /search اسم — بحث\n` +
    `🎬 /movies — الأفلام\n` +
    `📺 /series — المسلسلات\n` +
    `🔥 /trending — الأكثر رواجاً`,
    { parse_mode: 'Markdown' }
  );
});

// ===== SEARCH =====
bot.onText(/\/search (.+)/, async (msg, match) => {
  const query = match[1];
  const chatId = msg.chat.id;

  // البحث المحلي
  const local = content.filter(i =>
    i.name.toLowerCase().includes(query.toLowerCase())
  );

  // البحث في TMDB
  try {
    const res = await axios.get(`https://api.themoviedb.org/3/search/multi`, {
      params: { api_key: TMDB_API_KEY, query, language: 'ar-SA' }
    });

    const tmdb = res.data.results.slice(0, 5);

    if (local.length === 0 && tmdb.length === 0) {
      return bot.sendMessage(chatId, '❌ لم يتم العثور على نتائج');
    }

    if (local.length > 0) {
      for (const item of local) {
        bot.sendMessage(chatId,
          `✅ *${item.name}*\n` +
          `📅 ${item.year} | ⭐ ${item.rating}\n` +
          `📖 ${item.description}\n\n` +
          `🔗 ${item.link}`,
          { parse_mode: 'Markdown' }
        );
      }
    }

    if (tmdb.length > 0) {
      bot.sendMessage(chatId, '🌐 *نتائج من TMDB:*', { parse_mode: 'Markdown' });
      for (const item of tmdb) {
        const name = item.title || item.name;
        const year = (item.release_date || item.first_air_date || '').substring(0, 4);
        const rating = item.vote_average?.toFixed(1);
        const desc = item.overview?.substring(0, 100) || 'لا يوجد وصف';
        bot.sendMessage(chatId,
          `🎬 *${name}*\n📅 ${year} | ⭐ ${rating}\n📖 ${desc}`,
          { parse_mode: 'Markdown' }
        );
      }
    }
  } catch (e) {
    bot.sendMessage(chatId, '❌ خطأ في البحث');
  }
});

// ===== MOVIES =====
bot.onText(/\/movies/, (msg) => {
  const movies = content.filter(i => i.type === 'movie');
  if (movies.length === 0) return bot.sendMessage(msg.chat.id, '📭 لا توجد أفلام بعد');
  for (const m of movies) {
    bot.sendMessage(msg.chat.id,
      `🎬 *${m.name}* (${m.year})\n⭐ ${m.rating}\n📖 ${m.description}\n🔗 ${m.link}`,
      { parse_mode: 'Markdown' }
    );
  }
});

// ===== SERIES =====
bot.onText(/\/series/, (msg) => {
  const series = content.filter(i => i.type === 'series');
  if (series.length === 0) return bot.sendMessage(msg.chat.id, '📭 لا توجد مسلسلات بعد');
  for (const s of series) {
    bot.sendMessage(msg.chat.id,
      `📺 *${s.name}* (${s.year})\n⭐ ${s.rating}\n📖 ${s.description}\n🔗 ${s.link}`,
      { parse_mode: 'Markdown' }
    );
  }
});

// ===== TRENDING =====
bot.onText(/\/trending/, async (msg) => {
  try {
    const res = await axios.get('https://api.themoviedb.org/3/trending/all/week', {
      params: { api_key: TMDB_API_KEY, language: 'ar-SA' }
    });
    bot.sendMessage(msg.chat.id, '🔥 *الأكثر رواجاً:*', { parse_mode: 'Markdown' });
    for (const item of res.data.results.slice(0, 6)) {
      const name = item.title || item.name;
      const year = (item.release_date || item.first_air_date || '').substring(0, 4);
      bot.sendMessage(msg.chat.id,
        `${item.media_type === 'movie' ? '🎬' : '📺'} *${name}* (${year})\n⭐ ${item.vote_average?.toFixed(1)}`,
        { parse_mode: 'Markdown' }
      );
    }
  } catch (e) {
    bot.sendMessage(msg.chat.id, '❌ خطأ في التحميل');
  }
});

// ===== ADD MOVIE (مشرف) =====
bot.onText(/\/addmovie/, (msg) => {
  if (!ADMIN_IDS.includes(msg.from.id)) return bot.sendMessage(msg.chat.id, '⛔ للمشرفين فقط');
  bot.sendMessage(msg.chat.id,
    `أرسل بهذا الشكل:\n\n` +
    `الاسم: اسم الفيلم\nالسنة: 2024\nالتقييم: 8.5\nالوصف: وصف\nالرابط: https://...`
  );
  bot.once('message', (reply) => {
    if (!ADMIN_IDS.includes(reply.from.id)) return;
    const data = parseData(reply.text);
    data.type = 'movie';
    data.id = nextId++;
    content.push(data);
    bot.sendMessage(msg.chat.id, `✅ تم إضافة الفيلم: ${data.name}`);
  });
});

// ===== ADD SERIES (مشرف) =====
bot.onText(/\/addseries/, (msg) => {
  if (!ADMIN_IDS.includes(msg.from.id)) return bot.sendMessage(msg.chat.id, '⛔ للمشرفين فقط');
  bot.sendMessage(msg.chat.id,
    `أرسل بهذا الشكل:\n\n` +
    `الاسم: اسم المسلسل\nالسنة: 2024\nالتقييم: 8.5\nالوصف: وصف\nالرابط: https://...`
  );
  bot.once('message', (reply) => {
    if (!ADMIN_IDS.includes(reply.from.id)) return;
    const data = parseData(reply.text);
    data.type = 'series';
    data.id = nextId++;
    content.push(data);
    bot.sendMessage(msg.chat.id, `✅ تم إضافة المسلسل: ${data.name}`);
  });
});

// ===== DELETE (مشرف) =====
bot.onText(/\/delete (\d+)/, (msg, match) => {
  if (!ADMIN_IDS.includes(msg.from.id)) return bot.sendMessage(msg.chat.id, '⛔ للمشرفين فقط');
  const id = parseInt(match[1]);
  const before = content.length;
  content = content.filter(i => i.id !== id);
  bot.sendMessage(msg.chat.id, content.length < before ? `✅ تم الحذف` : `❌ لم يتم العثور على ID: ${id}`);
});

// ===== STATS (مشرف) =====
bot.onText(/\/stats/, (msg) => {
  if (!ADMIN_IDS.includes(msg.from.id)) return bot.sendMessage(msg.chat.id, '⛔ للمشرفين فقط');
  bot.sendMessage(msg.chat.id,
    `📊 *إحصائيات البوت*\n\n` +
    `🎬 أفلام: ${content.filter(i => i.type === 'movie').length}\n` +
    `📺 مسلسلات: ${content.filter(i => i.type === 'series').length}\n` +
    `📦 الإجمالي: ${content.length}`,
    { parse_mode: 'Markdown' }
  );
});

function parseData(text) {
  const map = { 'الاسم': 'name', 'السنة': 'year', 'التقييم': 'rating', 'الوصف': 'description', 'الرابط': 'link' };
  const data = {};
  for (const line of text.split('\n')) {
    const [k, ...v] = line.split(':');
    if (map[k?.trim()]) data[map[k.trim()]] = v.join(':').trim();
  }
  return data;
}

console.log('🤖 البوت يعمل...');
