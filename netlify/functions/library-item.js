// GET /api/library/:slug
// Routed here via netlify.toml as: /api/library/:slug → /.netlify/functions/library-item?slug=:slug
// Returns the single Content Library record matching the given slug.

const BASE_ID  = process.env.AIRTABLE_BASE_ID  || 'apptNizhEwl2vpQUB';
const TABLE    = 'Content Library';
const API_KEY  = process.env.AIRTABLE_API_KEY;

const FIELDS = {
  title:    'flddx9HKpB8xsL0VJ',
  slug:     'fld17y0nx9DGSkPB9',
  category: 'fldv2P8QNI0KPsLQt',
  type:     'fldG6LQ81nc6XJPOR',
  status:   'fldnjLX7sIcS3Fsub',
  length:   'fldEhbydRztVOm8pT',
  hook:     'fldzDYBkww0tms0zb',
  summary:  'fldXnSJywa4PgkBuJ',
  pull:     'fldtihqaF5TTVwbrY',
  date:     'fld17XF3lzeesndSx',
  featured: 'fldQ8uWahxuc7Tykx',
};

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type':                 'application/json',
};

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
    title:    f[FIELDS.title]    || '',
    slug:     f[FIELDS.slug]     || '',
    cat:      selectName(f[FIELDS.category]),
    type:     selectName(f[FIELDS.type]),
    status:   selectName(f[FIELDS.status]),
    len:      selectName(f[FIELDS.length]),
    hook:     f[FIELDS.hook]     || '',
    desc:     f[FIELDS.summary]  || '',
    pull:     f[FIELDS.pull]     || '',
    date:     formatDate(f[FIELDS.date]),
    featured: f[FIELDS.featured] || false,
  };
}

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
    // Fetch all records then match client-side — avoids filterByFormula
    // encoding issues and matches Airtable reliability rules.
    const fieldParams = Object.values(FIELDS).map(id => `fields[]=${id}`).join('&');
    const url         = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE)}?${fieldParams}`;

    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });

    if (!resp.ok) {
      const text = await resp.text();
      return {
        statusCode: resp.status,
        headers: CORS,
        body: JSON.stringify({ error: `Airtable error ${resp.status}`, detail: text }),
      };
    }

    const data   = await resp.json();
    const record = (data.records || []).find(
      r => (r.fields[FIELDS.slug] || '') === slug
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
