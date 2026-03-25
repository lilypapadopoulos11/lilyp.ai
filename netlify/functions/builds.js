// GET /api/builds
// Returns all Builds records where Show_on_Site = true,
// sorted by Sort_Order ascending.
// Filtering is done client-side after fetching all records.

const https = require('https');

const BASE_ID = process.env.AIRTABLE_BASE_ID || 'apptNizhEwl2vpQUB';
const TABLE   = 'Builds';
const API_KEY = process.env.AIRTABLE_API_KEY;

const FIELD_NAMES = [
  'Build Name',
  'Status',
  'Description',
  'Slug',
  'Tech_Stack',
  'Tags',
  'Stat_1_Value',
  'Stat_1_Label',
  'Stat_2_Value',
  'Stat_2_Label',
  'Stat_3_Value',
  'Stat_3_Label',
  'Stat_4_Value',
  'Stat_4_Label',
  'Library_Link',
  'Link_Label',
  'Sort_Order',
  'Show_on_Site',
];

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type':                 'application/json',
};

// ── Airtable fetch via built-in https (no fetch/node-fetch needed) ────────────
function airtableGet(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.airtable.com',
      path,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { reject(new Error(`JSON parse failed: ${data.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function selectName(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val.name) return val.name;
  return '';
}

function selectNames(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(v => (typeof v === 'string' ? v : v.name || '')).filter(Boolean);
  return [];
}

function normalise(record) {
  const f = record.fields;
  return {
    id:         record.id,
    name:       f['Build Name']    || '',
    status:     selectName(f['Status']),
    desc:       f['Description']   || '',
    slug:       f['Slug']          || '',
    tech:       f['Tech_Stack']    || '',
    tags:       selectNames(f['Tags']),
    stat1Val:   f['Stat_1_Value']  || '',
    stat1Label: f['Stat_1_Label']  || '',
    stat2Val:   f['Stat_2_Value']  || '',
    stat2Label: f['Stat_2_Label']  || '',
    stat3Val:   f['Stat_3_Value']  || '',
    stat3Label: f['Stat_3_Label']  || '',
    stat4Val:   f['Stat_4_Value']  || '',
    stat4Label: f['Stat_4_Label']  || '',
    link:       f['Library_Link']  || '',
    linkLabel:  f['Link_Label']    || '',
    sort:       f['Sort_Order']    || 999,
    show:       f['Show_on_Site']  || false,
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────
exports.handler = async () => {
  if (!API_KEY) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: 'AIRTABLE_API_KEY environment variable is not set.' }),
    };
  }

  try {
    const fieldParams = FIELD_NAMES
      .map(name => `fields[]=${encodeURIComponent(name)}`)
      .join('&');
    const sortParam = `sort[0][field]=${encodeURIComponent('Sort_Order')}&sort[0][direction]=asc`;
    const path = `/v0/${BASE_ID}/${encodeURIComponent(TABLE)}?${fieldParams}&${sortParam}`;

    const { status, body } = await airtableGet(path);

    if (status !== 200) {
      return {
        statusCode: status,
        headers: CORS,
        body: JSON.stringify({ error: `Airtable returned ${status}`, detail: body }),
      };
    }

    const records = (body.records || [])
      .map(normalise)
      .filter(r => r.show);

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify(records),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
