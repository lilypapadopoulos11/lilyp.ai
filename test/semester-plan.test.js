// Tests the real deadline normalization shipped in public/tools/semester/plan.html.
//
// The page is a single static file with no build step, so the suite pulls its
// <script> out of the HTML and runs it against a minimal DOM stub. No
// dependencies, no framework: node test/semester-plan.test.js
//
// Fixtures are deliberately generic. Course codes, names and shapes here stand
// for "any outline from any school", and every date is relative to the day the
// suite runs, so nothing depends on a particular semester.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ── DOM stub ───────────────────────────────────────────────────────────────
function makeEl(id) {
  const el = {
    id, _classes: new Set(), style: {}, dataset: {}, value: '',
    innerHTML: '', textContent: '', children: [],
    appendChild(c) { this.children.push(c); this.innerHTML += (c.innerHTML || ''); return c; },
    removeChild(c) { return c; },
    click() {},
    querySelectorAll() { return []; }
  };
  el.classList = {
    add: (...c) => c.forEach(x => el._classes.add(x)),
    remove: (...c) => c.forEach(x => el._classes.delete(x)),
    contains: c => el._classes.has(c)
  };
  return el;
}

function loadPage() {
  const file = path.join(__dirname, '..', 'public', 'tools', 'semester', 'plan.html');
  const html = fs.readFileSync(file, 'utf8');
  const code = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
  const els = {};
  const store = {};
  const sandbox = {
    console, Set, Map, Date, Math, JSON, Array, Object, String, Number, isNaN, parseInt,
    localStorage: {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; }
    },
    document: {
      getElementById: id => (els[id] = els[id] || makeEl(id)),
      createElement: () => makeEl('new'),
      querySelectorAll: () => [],
      body: makeEl('body')
    },
    Blob: function () {}, URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return { app: sandbox, el: new Proxy({}, { get: (_, id) => sandbox.document.getElementById(id) }) };
}

// ── assertions ─────────────────────────────────────────────────────────────
let failures = 0, passes = 0, group = '';
function describe(name) { group = name; console.log('\n' + name); }
function check(label, cond, detail) {
  if (cond) { passes++; console.log('  ok    ' + label); }
  else { failures++; console.log('  FAIL  ' + label + (detail !== undefined ? '  -> ' + JSON.stringify(detail) : '')); }
}

// ── fixture helpers ────────────────────────────────────────────────────────
const DAY = 86400000;
function plusDays(n) {
  const d = new Date(Date.now() + n * DAY);
  return d.toISOString().slice(0, 10);
}

// Every shape the schema allows, with nothing school- or course-specific in it.
function genericImport() {
  return {
    schema_version: '1.1',
    courses: [{ code: 'CRS101', name: 'Course One', instructor: null, term: null },
              { code: 'CRS202', name: 'Course Two', instructor: null, term: null }],
    deadlines: [
      // 4. standalone confirmed
      { id: 'd1', course_code: 'CRS101', name: 'Standalone confirmed item', weight_percent: 30,
        date: plusDays(40), date_status: 'confirmed', date_window: null, recurrence: null,
        time: '5:00 PM', group_work: false, notes: 'Standalone note.', occurrences: [] },

      // 1. recurring parent, every occurrence dated
      { id: 'd2', course_code: 'CRS101', name: 'Recurring category, all dated', weight_percent: 20,
        date: null, date_status: 'recurring', date_window: null,
        recurrence: 'Repeats through the term.', time: null, group_work: true,
        notes: 'Parent note.',
        occurrences: [
          { id: 'd2_o1', name: 'Instance one', date: plusDays(10), date_status: 'confirmed',
            date_window: null, time: '11:59 PM', weight_percent: null, notes: 'Instance note.' },
          { id: 'd2_o2', name: 'Instance two', date: plusDays(24), date_status: 'confirmed',
            date_window: null, time: null, weight_percent: null, notes: null },
          // backward compatible: a date with no date_status is confirmed
          { id: 'd2_o3', name: 'Instance three', date: plusDays(38), time: null,
            weight_percent: null, notes: null }
        ] },

      // 2. recurring parent, mixture of dated and unresolved occurrences
      { id: 'd3', course_code: 'CRS202', name: 'Recurring category, partly published', weight_percent: 40,
        date: null, date_status: 'recurring', date_window: null,
        recurrence: 'Some instances are scheduled, some are not.', time: null, group_work: false,
        notes: null,
        occurrences: [
          { id: 'd3_o1', name: 'Published instance', date: plusDays(14), date_status: 'confirmed',
            date_window: null, time: null, weight_percent: 15, notes: null },
          { id: 'd3_o2', name: 'Windowed instance', date: null, date_status: 'tbd_window',
            date_window: { start: plusDays(30), end: plusDays(37) }, time: null,
            weight_percent: null, notes: null },
          { id: 'd3_o3', name: 'Unknown instance', date: null, date_status: 'tbd_unknown',
            date_window: null, time: null, weight_percent: null, notes: null }
        ] },

      // 3. recurring parent, no occurrences, genuinely ongoing
      { id: 'd4', course_code: 'CRS202', name: 'Ongoing requirement', weight_percent: 10,
        date: null, date_status: 'recurring', date_window: null,
        recurrence: 'Runs continuously all term.', time: null, group_work: false,
        notes: 'No single due date.', occurrences: [] },

      // 5. standalone tbd_window
      { id: 'd5', course_code: 'CRS101', name: 'Standalone windowed item', weight_percent: 25,
        date: null, date_status: 'tbd_window',
        date_window: { start: plusDays(50), end: plusDays(57) },
        recurrence: null, time: null, group_work: false, notes: null, occurrences: [] },

      // 6. standalone tbd_unknown
      { id: 'd6', course_code: 'CRS202', name: 'Standalone unknown item', weight_percent: 15,
        date: null, date_status: 'tbd_unknown', date_window: null, recurrence: null,
        time: null, group_work: false, notes: null, occurrences: [] }
    ],
    extraction_meta: { outlines_processed: 2, flagged_items: [], term_note: null, unreadable_files: [] }
  };
}

function load(data) {
  const ctx = loadPage();
  ctx.el['paste-input'].value = JSON.stringify(data);
  ctx.app.submitPaste();
  ctx.items = ctx.app.getRuntimeDeadlines();
  ctx.byId = Object.fromEntries(ctx.items.map(i => [i.id, i]));
  ctx.kinds = Object.fromEntries(ctx.items.map(i => [i.id, i.resolution_kind]));
  return ctx;
}

// ═══════════════════════════════════════════════════════════════════════════
describe('Fixture 1: recurring parent with all occurrences dated');
{
  const { app, items, byId, kinds } = load(genericImport());
  check('parent is not itself an item', !byId.d2);
  check('every occurrence became an item',
    ['d2_o1', 'd2_o2', 'd2_o3'].every(id => byId[id]), Object.keys(byId));
  check('every occurrence is dated', ['d2_o1', 'd2_o2', 'd2_o3'].every(id => kinds[id] === 'dated'));
  check('date with no date_status reads as confirmed',
    byId.d2_o3.date_status === 'confirmed' && kinds.d2_o3 === 'dated');
  check('occurrences inherit course_code', ['d2_o1', 'd2_o2'].every(id => byId[id].course_code === 'CRS101'));
  check('occurrences inherit group_work', byId.d2_o1.group_work === true);
  check('occurrence uses its own name/time/notes',
    byId.d2_o1.name === 'Instance one' && byId.d2_o1.time === '11:59 PM' && byId.d2_o1.notes === 'Instance note.');
  check('occurrence falls back to parent notes', byId.d2_o2.notes === 'Parent note.');
  check('null occurrence weight stays null', byId.d2_o1.weight_percent === null);
  check('parent weight kept as metadata', byId.d2_o1.parent_weight_percent === 20);
  check('parent weight not multiplied',
    items.filter(i => i.parent_id === 'd2').reduce((s, i) => s + (i.weight_percent || 0), 0) === 0);
  check('load share sums to the parent weight',
    Math.abs(items.filter(i => i.parent_id === 'd2').reduce((s, i) => s + i.load_weight, 0) - 20) < 1e-9);
  check('nothing from this parent is unresolved',
    app.getAllFlaggable().every(({ dl }) => dl.parent_id !== 'd2' && dl.id !== 'd2'));
}

describe('Fixture 2: recurring parent with dated and unresolved occurrences');
{
  const { app, byId, kinds } = load(genericImport());
  check('parent is not itself an item', !byId.d3);
  check('dated occurrence is dated', kinds.d3_o1 === 'dated');
  check('windowed occurrence needs a date', kinds.d3_o2 === 'needs_date');
  check('unknown occurrence needs a date', kinds.d3_o3 === 'needs_date');
  check('window preserved on the occurrence',
    !!(byId.d3_o2.date_window && byId.d3_o2.date_window.start && byId.d3_o2.date_window.end));
  check('no date invented for unresolved occurrences',
    byId.d3_o2.date === null && byId.d3_o3.date === null);
  check('stated per-occurrence weight is used', byId.d3_o1.weight_percent === 15);
  check('load share divides by dated siblings only', byId.d3_o1.load_weight === 15);
  const flaggableIds = app.getAllFlaggable().map(({ dl }) => dl.id);
  check('only the unresolved occurrences are flaggable',
    flaggableIds.includes('d3_o2') && flaggableIds.includes('d3_o3') && !flaggableIds.includes('d3_o1'));
  check('unresolved occurrence card offers a date input',
    /type="date"/.test(app.flagCardHtml(byId.d3_o2, app.getEffective(byId.d3_o2))));
  check('unresolved occurrence card shows its window',
    /Somewhere between/.test(app.flagCardHtml(byId.d3_o2, app.getEffective(byId.d3_o2))));
  check('unresolved occurrence card shows parent context',
    /Part of Recurring category, partly published/.test(app.flagCardHtml(byId.d3_o3, app.getEffective(byId.d3_o3))));
}

describe('Fixture 3: recurring parent with no occurrences (ongoing)');
{
  const { app, el, byId, kinds } = load(genericImport());
  check('parent stays visible as an item', !!byId.d4);
  check('classified ongoing, not needs_date', kinds.d4 === 'ongoing');
  check('no date invented', byId.d4.date === null);
  check('not in the flaggable set', !app.getAllFlaggable().some(({ dl }) => dl.id === 'd4'));
  const card = app.flagCardHtml(byId.d4, app.getEffective(byId.d4));
  check('card asks for no exact date', !/type="date"/.test(card) && !/If you know the exact date/.test(card));
  check('card shows the recurrence description', /Runs continuously all term\./.test(card));
  app.renderDashboard();
  check('appears in the ongoing section', /Ongoing requirement/.test(el['ongoing-list'].innerHTML));
  check('absent from the pending section', !/Ongoing requirement/.test(el['pending-list'].innerHTML));
  check('absent from the timeline', !/Ongoing requirement/.test(el['deadline-list'].innerHTML));
}

describe('Fixtures 4 to 6: standalone items');
{
  const { app, el, byId, kinds } = load(genericImport());
  check('4. confirmed standalone is dated', kinds.d1 === 'dated');
  check('4. confirmed standalone keeps its own weight', byId.d1.weight_percent === 30 && byId.d1.load_weight === 30);
  check('5. tbd_window stays unresolved', kinds.d5 === 'needs_date');
  check('6. tbd_unknown stays unresolved', kinds.d6 === 'needs_date');
  const windowCard = app.flagCardHtml(byId.d5, app.getEffective(byId.d5));
  check('5. window card offers an exact date instead', /type="date"/.test(windowCard) && /Somewhere between/.test(windowCard));
  check('6. unknown card offers a date input', /type="date"/.test(app.flagCardHtml(byId.d6, app.getEffective(byId.d6))));
  app.renderDashboard();
  check('4. confirmed standalone is on the timeline', /Standalone confirmed item/.test(el['deadline-list'].innerHTML));
  check('5 and 6 are in the pending section',
    /Standalone windowed item/.test(el['pending-list'].innerHTML) && /Standalone unknown item/.test(el['pending-list'].innerHTML));

  // a saved exact date replaces the window
  app.RESOLUTIONS = {};
  el['date-d5'].value = plusDays(52);
  app.handleFlagConfirm('d5');
  const after = app.getResolvedList().find(r => r.dl.id === 'd5');
  check('5. saved exact date resolves the windowed item', after.eff.resolved && after.eff.date === plusDays(52));
}

describe('Fixture 7: schema 1.0 import with no occurrences');
{
  const v10 = genericImport();
  v10.schema_version = '1.0';
  v10.deadlines = v10.deadlines.map(d => { const c = Object.assign({}, d); delete c.occurrences; return c; });
  const { app, el, items, kinds } = load(v10);
  check('one item per deadline', items.length === 6, items.length);
  check('missing occurrences reads as an empty array',
    items.every(i => Array.isArray(i.occurrences) && i.occurrences.length === 0));
  check('confirmed still dated', kinds.d1 === 'dated');
  check('recurring still ongoing', kinds.d2 === 'ongoing' && kinds.d4 === 'ongoing');
  check('tbd_window still unresolved', kinds.d5 === 'needs_date');
  check('tbd_unknown still unresolved', kinds.d6 === 'needs_date');
  app.renderDashboard();
  check('dashboard renders', /Standalone confirmed item/.test(el['deadline-list'].innerHTML));
  check('recurring parents sit in the ongoing section',
    /Recurring category, all dated/.test(el['ongoing-list'].innerHTML));
}

describe('Fixture 8: malformed occurrence data');
{
  const junk = {
    deadlines: [
      { id: 'm1', course_code: 'CRS101', name: 'Occurrences not an array', weight_percent: null,
        date: null, date_status: 'recurring', recurrence: 'x', occurrences: 'nope' },
      { id: 'm2', course_code: 'CRS101', name: 'Junk entries inside', weight_percent: 12,
        date: null, date_status: 'recurring', recurrence: 'x',
        occurrences: [null, 42, 'text', { name: 'no date and no status' }, { date: 'not-a-date' }] },
      { id: 'm3', course_code: 'CRS101', name: 'Confirmed with no date', weight_percent: 5,
        date: null, date_status: 'confirmed', occurrences: [] },
      { id: 'm4', course_code: 'CRS101', name: 'Broken window', weight_percent: 5,
        date: null, date_status: 'tbd_window', date_window: { start: 'garbage' }, occurrences: [] },
      { id: 'm5', course_code: 'CRS101', name: 'Occurrence claims confirmed without a date',
        weight_percent: 8, date: null, date_status: 'recurring', recurrence: 'x',
        occurrences: [{ id: 'm5_o1', name: 'No date supplied', date: null, date_status: 'confirmed' }] },
      { id: 'm6', course_code: 'CRS101', name: 'Duplicate ids', weight_percent: 5,
        date: null, date_status: 'recurring', recurrence: 'x',
        occurrences: [{ id: 'dup', date: plusDays(5) }, { id: 'dup', date: plusDays(6) }] }
    ]
  };
  const { app, el, items, byId, kinds } = load(junk);
  check('non-array occurrences ignored, parent survives', kinds.m1 === 'ongoing');
  check('junk occurrence entries dropped, parent survives', kinds.m2 === 'ongoing');
  check('occurrence with no date and no status is dropped (1.0 behavior)',
    !items.some(i => i.name === 'no date and no status'));
  check('unparseable occurrence date is not treated as dated',
    !items.some(i => i.parent_id === 'm2' && i.resolution_kind === 'dated'));
  check('confirmed parent with no date is unresolved, not a broken timeline row', kinds.m3 === 'needs_date');
  check('incomplete window is dropped, item still unresolved',
    kinds.m4 === 'needs_date' && byId.m4.date_window === null);
  check('occurrence claiming confirmed without a date becomes unresolved',
    kinds.m5_o1 === 'needs_date' && byId.m5_o1.date === null);
  check('duplicate occurrence ids are made unique', items.filter(i => i.parent_id === 'm6').length === 2
    && new Set(items.map(i => i.id)).size === items.length);
  app.renderDashboard();
  check('dashboard renders without throwing', typeof el['deadline-list'].innerHTML === 'string');
  const ics = app.generateICS(app.getResolvedList());
  check('export only contains genuinely dated items',
    (ics.match(/BEGIN:VEVENT/g) || []).length === items.filter(i => i.resolution_kind === 'dated').length);
}

describe('Cross-cutting behavior');
{
  const { app, el, items } = load(genericImport());
  const dated = items.filter(i => i.resolution_kind === 'dated');
  check('no item is dated without a parseable date', dated.every(i => !!i.date && !isNaN(Date.parse(i.date))));
  check('resolution_kind is always one of the three states',
    items.every(i => ['dated', 'needs_date', 'ongoing'].includes(i.resolution_kind)));
  check('resolved set equals the dated set',
    app.getResolvedList().filter(r => r.eff.resolved).length === dated.length);

  // course filter includes occurrences
  app.renderDashboard();
  app.filterCourse('CRS202', null);
  check('filter to a course with only recurring work is not empty',
    !/No settled deadlines yet for this filter/.test(el['week-list'].innerHTML));
  check('filter shows that course\'s dated occurrence', /Published instance/.test(el['week-list'].innerHTML));
  check('filter excludes the other course', !/Instance one/.test(el['week-list'].innerHTML));

  // weekly workload counts dated occurrences
  const weeks = app.buildWeeks();
  const scores = app.scoreWeeks(weeks, app.getResolvedList());
  const target = plusDays(10);
  const idx = weeks.findIndex(w => target >= w.start && target <= w.end);
  check('the week holding a dated occurrence carries load', idx !== -1 && scores[idx] > 0, scores[idx]);
  check('unresolved occurrences add no load',
    scores.reduce((a, b) => a + b, 0) === app.scoreWeeks(weeks, app.getResolvedList().filter(r => r.eff.resolved)).reduce((a, b) => a + b, 0));
}

describe('Routing: ongoing work never forces the review screen');
{
  const data = genericImport();
  data.deadlines = data.deadlines.filter(d => d.id === 'd1' || d.id === 'd4'); // confirmed + ongoing only
  const { app, el } = load(data);
  check('nothing is still pending', app.getStillPending().length === 0);
  check('lands on the dashboard, not the review screen',
    el['screen-dashboard'].classList.contains('visible') && !el['screen-review'].classList.contains('visible'));
}

console.log('\n' + passes + ' passed, ' + failures + ' failed');
process.exit(failures ? 1 : 0);
