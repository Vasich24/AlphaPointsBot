require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

const BOT_TOKEN = process.env.BOT_TOKEN;
const API_URL = process.env.API_URL;
const CHANNEL_ID = '-1001751887491';
// const CHANNEL_ID = '-1002500459840';
const CHANNEL_LINK = 'https://t.me/CryptoWayX';

const bot = new Telegraf(BOT_TOKEN);

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

// 🟡 Перевірка підписки по кнопці
bot.action('check_sub', async (ctx) => {
  const subscribed = await isUserSubscribed(ctx);

  if (subscribed) {
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

    await ctx.reply(
      `📊 *Alpha Wallet Stats:*\n\n` +
      `💵 Обсяг:  *${data.volume}*\n` +
      `🎯 Поінти: *${data.points}*\n` +
      `📉 PnL:    *${data.profit}*`,
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    console.error('❌ API error:', err);
    await ctx.reply('❌ Сталася помилка при запиті до сервера. Спробуй пізніше.');
  }
});

// 🚀 Запуск
bot.launch();
console.log('🤖 Бот працює');
