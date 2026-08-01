const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatUserLink(user) {
  const name = ((user.first_name || '') + ' ' + (user.last_name || '')).trim() || 'Без имени';
  if (user.username) {
    return '<a href="https://t.me/' + user.username + '">' + escapeHtml(name) + '</a>';
  }
  return escapeHtml(name);
}

async function sendAdminMessage(text) {
  if (!BOT_TOKEN || !ADMIN_CHAT_ID) return;
  try {
    await fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
  } catch (err) {
    // Не роняем основной запрос из-за сбоя отправки уведомления.
  }
}

// action: 'join' | 'cancel'
async function notifyRsvp(action, user, eventTitle) {
  const userLink = formatUserLink(user);
  const title = escapeHtml(eventTitle || 'заезд');
  var text;
  if (action === 'join') {
    text = '🚲 <b>Новая запись</b>\n' + userLink + '\nЗаезд: ' + title;
  } else {
    text = '❌ <b>Отмена записи</b>\n' + userLink + '\nЗаезд: ' + title;
  }
  await sendAdminMessage(text);
}

module.exports = { notifyRsvp: notifyRsvp };
