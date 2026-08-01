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
      const eventTitle = await getEventTitle(eventId);
      await notifyRsvp(action, user, eventTitle);
    }

    const [events, rsvps] = await Promise.all([getEvents(), getRsvpsByEvent()]);
    res.status(200).json({ events: events, rsvps: rsvps });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
};
