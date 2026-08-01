const NOTION_TOKEN = process.env.NOTION_TOKEN;
const EVENTS_DATA_SOURCE_ID = process.env.EVENTS_DATA_SOURCE_ID;
const RSVPS_DATA_SOURCE_ID = process.env.RSVPS_DATA_SOURCE_ID;
const NOTION_VERSION = '2025-09-03';

// Поменяй, если клуб не в Москве — иначе даты/время в приложении
// могут съехать из-за того, что сервер Vercel считает время по UTC.
const TIMEZONE = 'Europe/Moscow';

async function notionFetch(path, options) {
  options = options || {};
  const res = await fetch('https://api.notion.com/v1' + path, {
    method: options.method || 'GET',
    headers: {
      'Authorization': 'Bearer ' + NOTION_TOKEN,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json'
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error('Notion API error ' + res.status + ': ' + JSON.stringify(data));
  }
  return data;
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function todayInTz() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const map = {};
  parts.forEach(function (p) { map[p.type] = p.value; });
  return map.year + '-' + map.month + '-' + map.day;
}

function formatDateProp(dateProp) {
  if (!dateProp || !dateProp.start) return { date: '', time: '' };
  var start = dateProp.start;
  var hasTime = start.indexOf('T') !== -1;
  var d = new Date(start);
  var date = d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: TIMEZONE });
  var time = hasTime ? d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: TIMEZONE }) : '';
  return { date: date, time: time };
}

function plainText(richTextArray) {
  return (richTextArray && richTextArray[0] && richTextArray[0].plain_text) || '';
}

// Активные заезды, у которых дата не в прошлом.
async function getEvents() {
  const data = await notionFetch('/data_sources/' + EVENTS_DATA_SOURCE_ID + '/query', {
    method: 'POST',
    body: {
      filter: {
        and: [
          { property: 'Статус', select: { equals: 'активно' } },
          { property: 'Дата', date: { on_or_after: todayInTz() } }
        ]
      },
      sorts: [{ property: 'Дата', direction: 'ascending' }]
    }
  });

  return data.results.map(function (page) {
    const props = page.properties;
    const dt = formatDateProp(props['Дата'].date);
    return {
      id: page.id, // сам ID страницы Notion используется как id заезда
      title: plainText(props['Название'].title),
      date: dt.date,
      time: dt.time,
      place: plainText(props['Место'].rich_text),
      desc: plainText(props['Описание'].rich_text),
      postUrl: (props['Ссылка на пост'] && props['Ссылка на пост'].url) || '',
      difficulty: plainText(props['Сложность'].rich_text)
    };
  });
}

// Активные записи, сгруппированные по id заезда.
async function getRsvpsByEvent() {
  const data = await notionFetch('/data_sources/' + RSVPS_DATA_SOURCE_ID + '/query', {
    method: 'POST',
    body: { filter: { property: 'Статус', select: { equals: 'активно' } } }
  });

  const map = {};
  data.results.forEach(function (page) {
    const props = page.properties;
    const eventId = plainText(props['Event ID'].rich_text);
    if (!eventId) return;
    if (!map[eventId]) map[eventId] = [];
    map[eventId].push({
      telegram_id: plainText(props['Telegram ID'].rich_text),
      username: plainText(props['Username'].rich_text),
      first_name: plainText(props['First name'].rich_text),
      last_name: plainText(props['Last name'].rich_text)
    });
  });
  return map;
}

async function findRsvpPage(eventId, telegramId) {
  const data = await notionFetch('/data_sources/' + RSVPS_DATA_SOURCE_ID + '/query', {
    method: 'POST',
    body: {
      filter: {
        and: [
          { property: 'Event ID', rich_text: { equals: String(eventId) } },
          { property: 'Telegram ID', rich_text: { equals: String(telegramId) } }
        ]
      }
    }
  });
  return data.results[0] || null;
}

// Нашли строку — просто меняем статус (покрывает и отмену, и повторную запись).
// Не нашли — создаём новую, но только если это "активно".
async function setRsvpStatus(eventId, user, status) {
  const existing = await findRsvpPage(eventId, user.id);

  if (existing) {
    await notionFetch('/pages/' + existing.id, {
      method: 'PATCH',
      body: { properties: { 'Статус': { select: { name: status } } } }
    });
    return;
  }

  if (status !== 'активно') return;

  const displayName = ((user.first_name || '') + ' ' + (user.last_name || '')).trim() || 'Без имени';

  await notionFetch('/pages', {
    method: 'POST',
    body: {
      parent: { type: 'data_source_id', data_source_id: RSVPS_DATA_SOURCE_ID },
      properties: {
        'Name': { title: [{ text: { content: displayName } }] },
        'Event ID': { rich_text: [{ text: { content: String(eventId) } }] },
        'Telegram ID': { rich_text: [{ text: { content: String(user.id) } }] },
        'Username': { rich_text: [{ text: { content: user.username || '' } }] },
        'First name': { rich_text: [{ text: { content: user.first_name || '' } }] },
        'Last name': { rich_text: [{ text: { content: user.last_name || '' } }] },
        'Статус': { select: { name: 'активно' } }
      }
    }
  });
}

module.exports = {
  setCors: setCors,
  getEvents: getEvents,
  getRsvpsByEvent: getRsvpsByEvent,
  setRsvpStatus: setRsvpStatus
};
