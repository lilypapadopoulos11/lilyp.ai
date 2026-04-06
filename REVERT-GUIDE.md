# Revert Guide: April 6, 2026 Deploy

If something breaks after this deploy, here's exactly how to undo it.

## What this deploy changes

### File 1: `public/library/item.html`
The dynamic template that renders all Airtable-powered library articles.

**Before:** Plain text parser. Research sources, prompts, step instructions, and "what to read next" all rendered as basic paragraphs.

**After:** Rich parser that detects patterns and renders: research source citation box, dark prompt blocks with copy buttons, USE THIS WHEN comparison grids, step timelines with numbered bubbles, styled markdown tables, clickable "what to read next" cards, stats bar (when data exists), pull quote blocks.

### File 2: `netlify/functions/library-item.js`
The Netlify function that fetches a single article from Airtable.

**Before:** Fetches 11 fields (Content Title, Slug, Category, Type, Status, Length, Hook, Summary, Pull_Quote, Date_Added, Featured on Website).

**After:** Also fetches Stat_1_Value, Stat_1_Label, Stat_2_Value, Stat_2_Label, Stat_3_Value, Stat_3_Label, Stat_4_Value, Stat_4_Label (8 new fields). Returns them in the API response.

### Airtable: Content Library table
8 new fields added: Stat_1_Value, Stat_1_Label through Stat_4_Value, Stat_4_Label. These are purely additive (new columns). Removing them later won't break anything.

---

## How to revert

### Option 1: Git revert (safest)
The last known working commit before this deploy:
```
80d05b6 Fix library item formatting — always use smart parser on Summary content
```

To revert both files to their pre-deploy state:
```bash
git checkout 80d05b6 -- public/library/item.html netlify/functions/library-item.js
git commit -m "Revert library item template to pre-April-6 version"
git push origin main
```
This restores both files to exactly what's live right now. Netlify auto-deploys.

### Option 2: Use the backup files
Backup copies were saved in the repo:
```bash
cp public/library/item.BACKUP-2026-04-06.html public/library/item.html
cp netlify/functions/library-item.BACKUP-2026-04-06.js netlify/functions/library-item.js
git add public/library/item.html netlify/functions/library-item.js
git commit -m "Revert to backup copies"
git push origin main
```

### Option 3: Tell Claude
Paste this into any new chat:
> "Revert public/library/item.html and netlify/functions/library-item.js to commit 80d05b6. The REVERT-GUIDE.md in the repo has full context."

---

## What does NOT need reverting

The Airtable stat fields (Stat_1_Value etc.) are harmless empty columns. They don't affect anything if the code reverts. You can delete them manually from Airtable if you want a clean slate, but they won't cause issues if left in place.

The SITE-LOG.md file is documentation only. No effect on the site.
