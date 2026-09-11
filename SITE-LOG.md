# lilyp.ai Site Log

A running record of changes, fixes, and additions to lilyp.ai. Drop this into any new chat for context on what's current.

---

## 2026-09-11 | Semester tool: unresolved-date logic is now structural, plus occurrence-level date status

**Context:** This is a public tool. It has to work for any student, any school, any outline. Nothing in it may key off a particular course code, assessment name, or semester.

**What was still wrong:** A recurring parent has `date: null` by design, because it stands for several instances rather than one. The unresolved sections read `date_status` directly, so any recurring parent was treated as "missing a date" and the review screen asked the student to supply one exact date for it. For genuinely ongoing work (participation, attendance, weekly engagement, anything non-terminal) there is no such date to give.

**The change:** Unresolved-ness is now a derived property of the normalized item, not a status string the UI re-interprets. Every item carries `resolution_kind`, one of:

- `dated` : a real, parseable date. Timeline, weekly view, workload chart, export.
- `needs_date` : no date, and the import says one exists or is expected (`tbd_window`, `tbd_unknown`). The student is asked for it.
- `ongoing` : a repeating requirement with no single due date. Shown as ongoing work, never asked for one exact date.

`getAllFlaggable()`, `getStillPending()` and the pending/ongoing split now branch on that field alone. No component reads `date_status`, names, or wording to decide whether something is unresolved.

**Occurrence-level dates (still schema 1.1):** An occurrence may now carry its own `date_status` (`confirmed`, `tbd_window`, `tbd_unknown`) and `date_window`, so a partly published schedule survives the import. Each occurrence is evaluated on its own: the dated ones land on the timeline, the undated ones appear individually in the pending section where the student can supply a date.

**Backward compatibility:**

- Occurrence with a date and no `date_status`: confirmed.
- Occurrence with `date: null` and no `date_status`: ignored, exactly as before. No status is invented.
- Schema 1.0 imports with no `occurrences` behave as they always did.
- An entry that claims `confirmed` but supplies no usable date is now unresolved rather than a broken timeline row. That was a latent crash: the timeline sorts on the date string.

**Never inferred:** no date is calculated from week numbers, ranges, or surrounding schedule information anywhere in the frontend. A window is shown as a window until the student replaces it.

**Also:** the load share across an assessment's dated instances is no longer rounded, so the instances sum to the parent's weight exactly. Scores are only ever compared or displayed rounded.

**Extraction prompt (`public/tools/semester/index.html`):** now documents occurrence-level `date_status` and `date_window`, and instructs the model that a recurring category stays one parent deadline, that every explicitly stated instance date belongs in `occurrences`, that partly known instances use `tbd_window` or `tbd_unknown`, that dates must never be calculated from week numbers or inferred from surrounding schedule information, that parent weights must never be split or copied onto instances, and that an ongoing requirement with no meaningful single deadline stays `recurring` with an empty array instead of being pushed into a date-chasing workflow.

**Tests:** `npm test` runs `test/semester-plan.test.js`. It pulls the real `<script>` out of `plan.html` and runs it against a DOM stub, so it always tests the shipped file. Fixtures are generic and every date is relative to the run date, so the suite does not rot. Coverage: recurring parent with all instances dated, recurring parent with a mixture of dated and unresolved instances, recurring parent with no instances (ongoing), standalone confirmed, standalone `tbd_window`, standalone `tbd_unknown`, a schema 1.0 import, and malformed occurrence data (non-array, junk entries, unparseable dates, contradictory statuses, duplicate ids). 71 checks, all passing.

**Files changed:** `public/tools/semester/plan.html`, `public/tools/semester/index.html`, `test/semester-plan.test.js` (new), `package.json`

**Revert:** Safe commit to revert to: `a08e9db`.

---

## 2026-09-11 | Semester tool: recurring assessments with real dates now show up

**What changed:** The semester plan tool treated a repeating assessment (a repeating assessment) as one deadline object with `date_status: "recurring"`, and kept its actual calendar dates as prose inside `recurrence`. Every view built itself from objects that had a real `date`, so those dated instances were invisible: no timeline rows, no workload, no course filter hits. Filtering to a course whose work is mostly recurring said "No settled deadlines yet for this filter" even though the course had many explicitly dated assessments.

**Import schema is now 1.1.** A recurring deadline can carry an `occurrences` array of its real dated instances:

```
{ "id": "d29", "name": "<recurring assessment>", "weight_percent": 35,
  "date": null, "date_status": "recurring",
  "recurrence": "<plain description of the pattern>",
  "occurrences": [
    { "id": "d29_o1", "name": "<instance name>",
      "date": "YYYY-MM-DD", "time": "11:59 PM",
      "weight_percent": null, "notes": "<instance note>" }
  ] }
```

**The fix (`public/tools/semester/plan.html`):** Added one normalization layer. `normalizeDeadlines()` flattens the raw import into a single runtime list of actionable items, and `getResolvedList()`, which every view already called, now reads that list instead of the raw JSON. So no component interprets the syllabus JSON on its own any more.

- A dated occurrence becomes its own deadline, inheriting `course_code`, `group_work` and parent context, using its own name, date, time, notes and weight.
- A null occurrence weight stays null. The parent's weight is never copied onto each instance (that would multiply a 35% assessment by five). It is kept as category metadata and shown as context, "Part of <assessment name> (35% total), 1 of 5".
- The workload chart shares the parent's weight across its dated instances (`load_weight`), so five instances of a 35% assessment total 35 rather than 175 or 15.
- A parent represented by its occurrences is no longer a dated item itself, so nothing is counted twice.
- A recurring parent with an empty array is untouched: still visible as ongoing work, still no invented date.
- Collision warnings stop claiming a combined percentage when an item on that day has no stated weight.

**Backward compatible:** Schema 1.0 JSON has no `occurrences` property. The parser normalizes missing to an empty array, so old saved imports in localStorage and old pastes behave exactly as before. Confirmed standalone deadlines are unchanged.

**Also updated (`public/tools/semester/index.html`):** The locked extraction prompt now documents the `occurrences` field, tells the model to put stated instance dates there instead of burying them in the recurrence sentence, never to invent or split weights, and emits `schema_version: "1.1"`. The preferences object stays at its own 1.0.

**Contract note:** `semester-build-data-contract.md` is not in this repo. It is the stated source of truth for that prompt string and needs the same 1.1 update so the two do not drift.

**Tested:** Ran the real `plan.html` script in a stubbed DOM against a 1.1 fixture, a 1.0 version with `occurrences` stripped, and a malformed one. 45 checks covering flattening, inheritance, weight handling, course filters, weekly scoring, warnings, counts and the ICS export. (Superseded by the committed suite in the next entry.)

**Files changed:** `public/tools/semester/plan.html`, `public/tools/semester/index.html`

**Revert:** Safe commit to revert to: `a08e9db`.

---

## 2026-04-05 | Dynamic article template upgrade

**What changed:** Rewrote `public/library/item.html` so dynamically rendered articles (ones pulling from Airtable, not hand-crafted HTML) look dramatically better.

**Why:** Articles like `/library/variance-commentary-workflow` were rendering as plain text walls, while hand-crafted ones like `/library/meeting-notes-to-airtable` had rich visual components. The dynamic template's `contentToHtml()` parser couldn't detect structured patterns in the Airtable `Summary` field.

**What the parser now handles:**

- Research source blocks (text starting with "Research source:") render as a styled stone-colored citation below the article header
- `---` delimited content renders as dark prompt blocks with copy buttons
- `USE THIS WHEN` / `NOT THE RIGHT FIT` sections render as a green/coral comparison grid
- `Step N:` headers render as a vertical timeline with numbered bubbles and gradient connecting line
- Markdown tables (`| col | col |`) render as styled tables with stone-colored headers
- `What to read next:` sections render as clickable card grids at the bottom
- Trailing CTA lines ("If this helped...") are stripped since the template already has one

**Also fixed:**

- Header detection regex was matching partial words (e.g., "hen" from "When"), causing valid headers to be missed. Fixed with word-boundary-aware matching.
- Added colon-pattern header detection (e.g., "Before you prompt: build the input document")
- Added text normalization step so `---` markers and known section headers are always parsed as standalone blocks regardless of single vs. double newline spacing in Airtable content

**Files changed:** `public/library/item.html`

**No regressions:** Tested against all 14 featured Content Library records. Short-summary articles render as before. Long-form articles with structured content now get the rich treatment.

---

## Earlier changes (from git history)

### 2026-04-04 | Library item formatting fix
- Fixed: always use smart parser on Summary content
- Fixed: removed nonexistent `Draft_Content` field from Airtable query (was causing 422 errors that broke ALL library items, not just one)
- Added: `Draft_Content` style formatting to Summary field parsing

### 2026-03-31 | Mobile hamburger menu
- Added mobile hamburger menu to homepage nav (was missing, gap in desktop-first build)

### 2026-03-30 | Forms and course updates
- Wired Formspree forms (homepage pain point inbox + course waitlist)
- Updated course copy, pointed CTA to waitlist
- Updated course price to $25
- Added Loom video placeholder to course landing page

### 2026-03-29 | Course section launch
- Added full course section: `/course` landing page, `/course/login`, `/course/dashboard`
- Auth function with localStorage-based access (hardcoded `approvedEmails` array, needs Airtable/Gumroad migration before real students)

### 2026-03-27 | Builds page and About fix
- Created `netlify/functions/builds.js` API endpoint
- Wired builds page to Airtable dynamically
- Fixed About page width (was rendering too narrow on desktop)

### 2026-03-26 | Airtable function fixes
- Fixed library.js: switched to https module, corrected field names (case-sensitive)

### 2026-03-25 | V5 site build
- Full site rebuild: static HTML + Netlify Functions + Airtable CMS
- Design system locked (colors, fonts, motion, typography scale)

---

## 2026-04-06 | Stats bar, pull quote, and Netlify function upgrade

**What changed:**

1. `netlify/functions/library-item.js`: Added 8 new fields to FIELD_NAMES (Stat_1_Value, Stat_1_Label through Stat_4_Value, Stat_4_Label). Updated `normalise()` to return a `stats` array of {value, label} pairs.

2. `public/library/item.html`: Added CSS for stats bar (matching hand-crafted template style), pull quote callout block, and mobile responsive rules. Added `stats-container` and `pull-quote-container` divs. Added JS rendering: stats bar appears below the header when stat data exists, pull quote appears as a styled callout between the divider and body content. Fixed title tag em dash (replaced with `|` per brand rules).

3. Airtable Content Library table: All 14 featured articles backfilled with type-appropriate stats (tools, setup time, time per use, difficulty for Workflows/How-Tos; tone, best for, pairs with, time to adapt for Prompts; scope, time invested, verdict, pairs with for Experiments/Teardowns; etc.)

**Article Engine note:** The `atricle-engine` scheduled task prompt needs to be updated to include instructions for populating Stat_1 through Stat_4 fields and Pull_Quote when creating new drafts. Cannot update automatically because the current prompt text is not readable from this session. Next time you open a chat about the Article Engine, add these field requirements to the prompt.

**Revert:** See REVERT-GUIDE.md. Safe commit to revert to: `80d05b6`.

---

## Known open items

- [ ] Course dashboard video placeholders are still gray boxes (need real Loom embeds)
- [ ] Course landing page Loom placeholder section (gray box with play icon)
- [ ] `course-auth.js` has hardcoded `approvedEmails` array (needs Airtable or Gumroad webhook)
- [ ] Only `module-3-demo.xlsx` exists in `/course/resources/` (no other module resources yet)
- [ ] Accessibility pass needed: replace clickable divs with proper button elements
- [ ] "Why tables are harder than text" type headers (5+ consecutive lowercase words of 3+ chars) occasionally not detected as headers by the dynamic parser
- [ ] Hand-crafted articles (meeting-notes-to-airtable, cre-outbound-engine, extract-and-structure-megaprompt) are separate from the dynamic system. Any visual changes to those need manual HTML edits.
