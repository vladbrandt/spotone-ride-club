const { setCors, getEvents, getRsvpsByEvent } = require('../lib/notion');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    const events = await getEvents();
    const rsvps = await getRsvpsByEvent(events.map(function (e) { return e.id; }));
    res.status(200).json({ events: events, rsvps: rsvps });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
};
