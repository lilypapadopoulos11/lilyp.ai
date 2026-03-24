// GET /api/library/:slug
// Routed here from netlify.toml as:
//   /api/library/:slug → /.netlify/functions/library-item?slug=:slug
// Returns the single Content Library record whose Slug field matches.

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

// ── Airtable fetch via built-in https ─────────────────────────────────────────
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
exports.handler = async (event) => {
  const slug = (event.queryStringParameters || {}).slug;

  if (!slug) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ error: 'Missing slug parameter.' }),
    };
  }

  if (!API_KEY) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: 'AIRTABLE_API_KEY environment variable is not set.' }),
    };
  }

  try {
    // Fetch all records then match by slug client-side — avoids filterByFormula
    // encoding issues and follows Airtable reliability rules.
    const fieldParams = FIELD_NAMES
      .map(name => `fields[]=${encodeURIComponent(name)}`)
      .join('&');
    const path = `/v0/${BASE_ID}/${encodeURIComponent(TABLE)}?${fieldParams}`;

    const { status, body } = await airtableGet(path);

    if (status !== 200) {
      return {
        statusCode: status,
        headers: CORS,
        body: JSON.stringify({ error: `Airtable returned ${status}`, detail: body }),
      };
    }

    const record = (body.records || []).find(
      r => (r.fields['Slug'] || '') === slug
    );

    if (!record) {
      return {
        statusCode: 404,
        headers: CORS,
        body: JSON.stringify({ error: 'Entry not found.' }),
      };
    }

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify(normalise(record)),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
