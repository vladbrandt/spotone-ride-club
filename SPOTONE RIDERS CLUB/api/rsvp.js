const { setCors, getEvents, getRsvpsByEvent, setRsvpStatus } = require('../lib/notion');

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

    if (action === 'join') await setRsvpStatus(eventId, user, 'активно');
    if (action === 'cancel') await setRsvpStatus(eventId, user, 'отменено');

    const [events, rsvps] = await Promise.all([getEvents(), getRsvpsByEvent()]);
    res.status(200).json({ events: events, rsvps: rsvps });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
};
