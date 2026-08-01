const BOT_TOKEN = process.env.BOT_TOKEN;

// Спрашиваем у самого Telegram (не у клиента), есть ли у пользователя
// реально загруженные фото профиля — это единственный надёжный способ,
// т.к. photo_url в initData есть даже у тех, у кого нет настоящего фото
// (Telegram отдаёт сгенерированный кружок с буквой как .svg).
async function hasProfilePhoto(userId) {
  if (!BOT_TOKEN) return { hasPhoto: false, debug: 'BOT_TOKEN не задан на сервере' };
  if (!userId) return { hasPhoto: false, debug: 'не пришёл user_id' };

  const url = 'https://api.telegram.org/bot' + BOT_TOKEN +
    '/getUserProfilePhotos?user_id=' + encodeURIComponent(userId) + '&limit=1';

  const res = await fetch(url);
  const data = await res.json();

  if (!data.ok) {
    return { hasPhoto: false, debug: 'Telegram API error: ' + (data.description || JSON.stringify(data)) };
  }

  const total = data.result && data.result.total_count;
  return { hasPhoto: total > 0, debug: 'total_count=' + total };
}

module.exports = { hasProfilePhoto: hasProfilePhoto };
