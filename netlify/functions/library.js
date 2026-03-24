// GET /api/library
// Returns all Content Library records where Featured on Website = true
// and Status != draft, sorted by Date_Added descending.
// Filtering is done client-side after fetching all records.

const https = require('https');

const BASE_ID = process.env.AIRTABLE_BASE_ID || 'apptNizhEwl2vpQUB';
const TABLE   = 'Content Library';
const API_KEY = process.env.AIRTABLE_API_KEY;

const FIELD_NAMES = [
  'Content Title',
  'Slug',
  'Category',
  'Type',
  'Status',
  'Length',
  'Hook',
  'Summary',
  'Pull_Quote',
  'Date_Added',
  'Featured on Website',
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

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function normalise(record) {
  const f = record.fields;
  return {
    id:       record.id,
    title:    f['Content Title']       || '',
    slug:     f['Slug']                || '',
    cat:      selectName(f['Category']),
    type:     selectName(f['Type']),
    status:   selectName(f['Status']),
    len:      selectName(f['Length']),
    hook:     f['Hook']                || '',
    desc:     f['Summary']             || '',
    pull:     f['Pull_Quote']          || '',
    date:     formatDate(f['Date_Added']),
    featured: f['Featured on Website'] || false,
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
    // Build query string — use encodeURIComponent on each field name so
    // spaces and special characters are safe in the URL.
    const fieldParams = FIELD_NAMES
      .map(name => `fields[]=${encodeURIComponent(name)}`)
      .join('&');
    const sortParam = `sort[0][field]=${encodeURIComponent('Date_Added')}&sort[0][direction]=desc`;
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
      .filter(r => r.featured && r.status !== 'draft');

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
