const { setCors, getEvents, getRsvpsByEvent } = require('../lib/notion');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    const [events, rsvps] = await Promise.all([getEvents(), getRsvpsByEvent()]);
    res.status(200).json({ events: events, rsvps: rsvps });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
};
