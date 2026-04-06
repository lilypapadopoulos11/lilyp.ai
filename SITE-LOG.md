# lilyp.ai Site Log

A running record of changes, fixes, and additions to lilyp.ai. Drop this into any new chat for context on what's current.

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
