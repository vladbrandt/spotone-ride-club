const { setCors } = require('../lib/notion');
const { hasProfilePhoto } = require('../lib/telegram');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    const userId = req.query.user_id;
    const result = await hasProfilePhoto(userId);
    res.status(200).json({ hasPhoto: result });
  } catch (err) {
    // Технический сбой проверки — не блокируем всех подряд из-за него,
    // просто пропускаем, чтобы сбой сервиса не положил всё приложение.
    res.status(200).json({ hasPhoto: true, error: String(err) });
  }
};
