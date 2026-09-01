const { waitUntil } = require('@vercel/functions');
const { setCors, getEvents, getRsvpsByEvent, setRsvpStatus, getEventTitle } = require('../lib/notion');
const { notifyRsvp } = require('../lib/telegram');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const action = body.action;
    const eventId = body.event_id;
    const user = body.user || {};

    if (action === 'join' || action === 'cancel') {
      await setRsvpStatus(eventId, user, action === 'join' ? 'активно' : 'отменено');

      // Уведомления не нужны человеку, который записывается — отправляем их в фоне,
      // не задерживая ответ приложению. waitUntil держит функцию живой ровно
      // до завершения этой задачи, даже после того как ответ уже ушёл.
      waitUntil(
        getEventTitle(eventId).then(function (title) {
          return notifyRsvp(action, user, title);
        })
      );
    }

    const [events, rsvps] = await Promise.all([getEvents(), getRsvpsByEvent()]);
    res.status(200).json({ events: events, rsvps: rsvps });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
};
