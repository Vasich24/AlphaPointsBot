require('dotenv').config();
const { Telegraf, Markup, session } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const path = require('path');


const BOT_TOKEN = process.env.BOT_TOKEN;
const API_URL = process.env.API_URL;
const CHANNEL_ID = '-1001751887491';
// const CHANNEL_ID = '-1002500459840';
const CHANNEL_LINK = 'https://t.me/CryptoWayX';
const SUBS_FILE = path.join(__dirname, 'subscribed_users.json');

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

function saveNewSubscriber(user) {
  let list = [];

  if (fs.existsSync(SUBS_FILE)) {
    list = JSON.parse(fs.readFileSync(SUBS_FILE));
  }

  const alreadyExists = list.find(u => u.id === user.id);
  if (!alreadyExists) {
    list.push({
      id: user.id,
      username: user.username,
      first_name: user.first_name,
      joined_at: new Date().toISOString()
    });

    fs.writeFileSync(SUBS_FILE, JSON.stringify(list, null, 2));
    console.log(`📥 Новий підписник: ${user.username || user.first_name}`);
  }
}

// 🔍 Функція перевірки підписки
async function isUserSubscribed(ctx) {
  try {
    const member = await ctx.telegram.getChatMember(CHANNEL_ID, ctx.from.id);
    return ['creator', 'administrator', 'member'].includes(member.status);
  } catch (err) {
    console.error('❌ Помилка перевірки підписки:', err.message);
    return false;
  }
}

// 🟢 Стартова команда
bot.start(async (ctx) => {
  if (ctx.chat.type !== 'private') return;
  ctx.session ??= {};

  ctx.session.wasSubscribed = await isUserSubscribed(ctx);
  try {
    // await ctx.replyWithPhoto(
      //   { url: 'https://te.legra.ph/file/YOUR_IMAGE_ID.jpg' }, // ⚠️ заміни на свою картинку
      //   { caption: `👋 Привіт, ${ctx.from.first_name || 'друже'}!` }
      // );
      
      await ctx.reply(
        `Вітаю в *Binance Alpha Points Checker Bot*! 🚀\n\n` +
        `🔹 Отримуй інформацію по своєму гаманцю і не рахуй на пальцях 🤖:\n\n` +
        `• 📊 *Обсяг торгів*\n` +
        `• 🎯 *Alpha Points*\n` +
        `• 📉 *PnL (прибуток/збиток)*\n\n` +
        `⚠️ Примітка: Дані оновлюються щодня. Бот показує лише статистику за поточну добу.\n\n` +
        `Щоб скористатися ботом — підпишись на наш канал 👇`,
        {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('📢 Підписатись на CryptoWay', CHANNEL_LINK)],
          [Markup.button.callback('✅ Я підписався', 'check_sub')]
        ])
      }
    );
  } catch (error) {
    console.error('❌ Error in start:', error);
  }
});

bot.command('stats', async (ctx) => {
  const adminId = 470863234; // заміни на свій Telegram user ID
  if (ctx.from.id !== adminId) {
    return ctx.reply('🚫 Ця команда лише для адміністратора.');
  }

  try {
    const filePath = path.resolve(__dirname, 'subscribed_users.json');
    if (!fs.existsSync(filePath)) {
      return ctx.reply('⚠️ Файл статистики ще не створено.');
    }

    const data = JSON.parse(fs.readFileSync(filePath));
    const count = Object.keys(data).length;

    await ctx.reply(`📊 Загальна кількість нових підписників через бота: *${count}*`, {
      parse_mode: 'Markdown'
    });

    await ctx.replyWithDocument({ source: filePath, filename: 'subscribers.json' });
  } catch (err) {
    console.error('❌ Error reading stats:', err);
    await ctx.reply('❌ Помилка при завантаженні статистики.');
  }
});
// 🟡 Перевірка підписки по кнопці
bot.action('check_sub', async (ctx) => {
  ctx.session ??= {};
  const nowSubscribed = await isUserSubscribed(ctx);
  const wasSubscribed = ctx.session.wasSubscribed || false;

  if (nowSubscribed) {
    if (!wasSubscribed) {
      // ✅ Користувач підписався саме після старту → додаємо до статистики
      saveNewSubscriber(ctx.from);
    } // <-- додали
    await ctx.reply('✅ Дякую за підписку! Надішли адресу свого гаманця (0x...).');
  } else {
    await ctx.reply('❌ Ви ще не підписалися. Підпишіться на канал та натисніть кнопку ще раз.');
  }
});

// 🔎 Обробка адреси
bot.on('text', async (ctx) => {
  if (ctx.chat.type !== 'private') return;
  
  const address = ctx.message.text.trim();
  
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return ctx.reply('❌ Невірна адреса. Перевір, що це EVM-адреса (0x...)');
  }
  
  const subscribed = await isUserSubscribed(ctx);
  if (!subscribed) {
    return ctx.reply('❗️ Для використання бота потрібно підписатися на канал.',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('📢 Підписатись на CryptoWay', CHANNEL_LINK)],
          [Markup.button.callback('✅ Я підписався', 'check_sub')]
        ])
      });
    }
    
    await ctx.reply('⏳ Збираю дані, зачекай...');
    
    try {
      const { data } = await axios.get(`${API_URL}?address=${address}`);
      
      if (!data || !data.volume) {
        return ctx.reply('⚠️ Не вдалося знайти дані. Спробуй пізніше або перевір адресу.');
      }
      ctx.session ??= {};
      ctx.session.lastAddress = address;
      await ctx.reply(
        `📊 *Alpha Wallet Stats:*\n\n` +
        `💵 Обсяг:  *${data.volume}*\n` +
        `🎯 Поінти: *${data.points}*\n` +
      `📉 PnL:    *${data.profit}*`,
      { parse_mode: 'Markdown' ,
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔁 Перерахувати', 'recalculate')]
        ])}
      );
    } catch (err) {
      console.error('❌ API error:', err);
      await ctx.reply('❌ Сталася помилка при запиті до сервера. Спробуй пізніше.');
    }
  });

  bot.action('recalculate', async (ctx) => {
  ctx.session ??= {};
  const address = ctx.session?.lastAddress;
  if (!address) {
    return ctx.reply('⚠️ Немає збереженої адреси. Надішли її спочатку.');
  }

  const subscribed = await isUserSubscribed(ctx);
  if (!subscribed) {
    return ctx.reply('❗️ Для використання бота потрібно підписатися на канал.',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('📢 Підписатись на CryptoWay', CHANNEL_LINK)],
          [Markup.button.callback('✅ Я підписався', 'check_sub')]
        ])
      });
    }

  await ctx.reply('⏳ Перераховую дані...');

  try {
    const { data } = await axios.get(`${API_URL}?address=${address}`);
    if (!data || !data.volume) {
        return ctx.reply('⚠️ Не вдалося знайти дані. Спробуй пізніше або перевір адресу.');
      }
    await ctx.reply(
      `📊 *Alpha Wallet Stats:*\n\n` +
      `💵 Обсяг:  *${data.volume}*\n` +
      `🎯 Поінти: *${data.points}*\n` +
      `📉 PnL:    *${data.profit}*`,
      { parse_mode: 'Markdown' ,
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔁 Перерахувати', 'recalculate')]
        ])}
    );
  } catch (err) {
    console.error('❌ Error on recalc:', err);
    await ctx.reply('❌ Не вдалося оновити дані. Спробуй пізніше.');
  }
});


// 🚀 Запуск
bot.launch();
console.log('🤖 Бот працює');
