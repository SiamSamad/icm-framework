# Report Style Standard

This file defines the HTML report conventions shared by all five ICM stages. Every stage that emits a `report.html` must follow these rules. Stage-specific sections, badges, and call-to-action text are defined in each stage's own CONTEXT.md — this file covers what is the same everywhere.

---

## Technical Requirements

- **Pure HTML and inline CSS only.** Zero external dependencies — no CDN, no imported fonts, no JS frameworks, no `<link>` or `<script src>` tags. The report must open and render correctly in a browser with no network access.
- **Filename is always `report.html`**, never ticket-prefixed, never stage-prefixed. The folder name already identifies the ticket.
- **Every stage's markdown output links to its report** using a relative path at the top of the file:
  ```
  🌐 **HTML Report:** [Open Report](./report.html)
  ```
  This line appears above all other content in the markdown file.

---

## VS Code Open Message

After saving the HTML file, always show this exact message in the conversation:

```
📂 HTML report ready.
In VS Code: find the file in the Explorer panel (left sidebar), right-click it, and select Open in Integrated Browser.

📄 File: stages/<NN>-<stage-name>/output/<TICKET-ID>/report.html
```

---

## Header

Every report opens with a header section containing:
- Ticket ID — large, bold
- Product badge
- Date generated
- Stage-specific additional fields (e.g., test count for Stage 02, verdict badge for Stage 04)

---

## Status Colors

Use these colors consistently for status badges, section borders, and highlighted boxes:

| Status | Background | Border / text |
|--------|-----------|--------------|
| Pass / confirmed / green | `#dcfce7` | `#16a34a` |
| Warning / amber / gap | `#fef9c3` | `#ca8a04` |
| Fail / red / missing | `#fee2e2` | `#dc2626` |
| Info / blue / regression | `#dbeafe` | `#2563eb` |
| Neutral / grey / unverified | `#f3f4f6` | `#6b7280` |

---

## Code / Identifier Styling

Inline code, selectors, and `data-testid` values appear in monospace with a light grey chip background:

```html
<code style="background:#f3f4f6; padding:2px 6px; border-radius:4px; font-family:monospace;">data-testid="btn-confirm"</code>
```

---

## Source-of-Truth Linking

Every source the pipeline read is hyperlinked where it is mentioned — so the reader can open it in one click:

- **Ticket ID** anywhere in the report (header, spec fields, any inline reference): links to `<tracker-browse-url>/<TICKET-ID>`
- **MRs**: link to the full MR URL wherever an MR is mentioned (e.g., `<code-host-url>/.../merge_requests/N`)
- **requirements docs**: link to the page URL when listed as a source that was read
- **design files/frames**: link to the design URL when listed as a source that was read

Apply this rule in intake items, spec field cards, finding bodies, and any other report prose where a trackable source is cited.

---

## Finding Rendering (Three-Part Structure)

Whenever a finding (gap, regression risk, missing selector, unverified element) is rendered in HTML, use this layout:

- **"What we found:"** — normal weight text, full width
- **"In technical terms:"** — monospace / code chip styling for identifiers
- **"What to do about it:"** — preceded by a `→` prefix to mark it as an action item

Section boxes that contain findings use a left-border color from the status table above (amber for gaps, red for missing selectors, amber for unverified).

---

## Call-to-Action Box

Every report ends with a call-to-action box at the very bottom. Shared structure:

- Subtle rounded border box (not a colored alert — neutral)
- Title: stage-specific (e.g., "✅ Stage 01 Complete")

**Step 1 — Review / Feedback (listed first):**
> "Review the [output type] above. If anything is wrong or missing, tell Claude what to change — it will be updated and this report regenerated."

**Step 2 — Proceed (listed second):**
> "If everything looks good, type either keyword to move to [next stage name]:"

Then render **proceed** and **continue** as two **separate bordered pill/chip elements** — monospace font, visible border, light background — with the plain word "or" between them. They must not appear as one run-together phrase or a list.

The exact title, output-type label, and next-stage name are stage-specific — defined in each CONTEXT.md. Keep any stage-specific gate language (e.g., the explicit approval step before Stage 04).

---

## Canonical Stylesheet

Every `report.html` produced by the ICM pipeline uses the stylesheet below **VERBATIM**. Copy it into the `<style>` tag — do not restyle, do not invent new variants, do not omit classes. This is the single source of visual truth across all stages.

**Stage-specific additions** (for example, Stage 02's collapsible TC cards or Stage 04's verdict banner) go in a separate `<style>` block immediately after the canonical one, clearly marked. They are defined in this file once they stabilise, under the sub-section "Stage-Specific Additions" below.

```css
/* === ICM Canonical Stylesheet v1 ===
   Every report.html uses this block VERBATIM.
   Copy it — do not restyle, do not invent variants.
   Stage-specific rules go in a second <style> block after this one. */

* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #1e293b; background: #f9fafb; line-height: 1.6; }
.page { max-width: 960px; margin: 0 auto; padding: 32px 24px 64px; }

/* ── Header ── */
.header { background: #fff; border: 1px solid #d1d5db; border-radius: 10px; padding: 28px 32px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.07); }
.header-top { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
.ticket-id { font-size: 28px; font-weight: 700; color: #1e293b; text-decoration: none; }
.ticket-id:hover { color: #2563eb; }
.header-subtitle { font-size: 15px; font-weight: 600; color: #334155; margin-bottom: 4px; }
.header-meta { color: #64748b; font-size: 13px; }

/* ── Badges ── */
.badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; letter-spacing: 0.3px; }
.badge-product  { background: #f1f5f9; color: #374151; border: 1px solid #e2e8f0; }
.badge-type     { background: #f1f5f9; color: #374151; border: 1px solid #e2e8f0; }
.badge-priority { background: #fef9c3; color: #92400e; }
.badge-status   { background: #f1f5f9; color: #374151; border: 1px solid #e2e8f0; }
.badge-ambiguity-low    { background: #dcfce7; color: #166534; }
.badge-ambiguity-medium { background: #fef9c3; color: #92400e; }
.badge-ambiguity-high   { background: #fee2e2; color: #b91c1c; }

/* ── Sections ── */
.section { background: #fff; border: 1px solid #d1d5db; border-radius: 10px; padding: 24px 28px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.07); }
.section-title { font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1px solid #f1f5f9; }
.section-subtitle { font-size: 12px; font-weight: 400; color: #64748b; margin-left: 8px; }

/* ── Intake Summary ── */
.intake-item { display: flex; gap: 12px; padding: 10px 14px; border-radius: 7px; margin-bottom: 8px; align-items: flex-start; }
.intake-item:last-child { margin-bottom: 0; }
.intake-green { background: #dcfce7; border-left: 3px solid #16a34a; }
.intake-amber { background: #fef9c3; border-left: 3px solid #ca8a04; }
.intake-grey  { background: #f3f4f6; border-left: 3px solid #9ca3af; }
.intake-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
.intake-body { flex: 1; }
.intake-label { font-weight: 600; color: #1e293b; }
.intake-detail { color: #475569; font-size: 13px; margin-top: 2px; }

/* ── Field rows ── */
.field-row { margin-bottom: 14px; }
.field-row:last-child { margin-bottom: 0; }
.field-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 4px; }
.field-value { color: #1e293b; }

/* ── Acceptance criteria list ── */
.ac-list { list-style: none; }
.ac-item { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f1f5f9; align-items: flex-start; }
.ac-item:last-child { border-bottom: none; }
.ac-id { font-size: 12px; font-weight: 600; color: #475569; background: #f1f5f9; border: 1px solid #e2e8f0; padding: 2px 8px; border-radius: 4px; white-space: nowrap; flex-shrink: 0; margin-top: 2px; font-family: 'SFMono-Regular', Consolas, monospace; }
.ac-text { flex: 1; color: #334155; }
.ac-source { font-size: 11px; color: #94a3b8; margin-top: 3px; font-style: italic; }
.verifiable-badge { display: inline-block; font-size: 11px; font-weight: 600; padding: 1px 7px; border-radius: 4px; margin-left: 8px; vertical-align: middle; }
.verifiable-true  { background: #dcfce7; color: #16a34a; }
.verifiable-false { background: #f3f4f6; color: #6b7280; }

/* ── Count chips ── */
.count-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
.count-chip { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 20px; padding: 4px 12px; font-size: 13px; color: #475569; }
.count-chip strong { color: #1e293b; }

/* ── Finding boxes ── */
.finding-box { border-radius: 7px; padding: 14px 16px; margin-bottom: 12px; }
.finding-box:last-child { margin-bottom: 0; }
.finding-amber { background: #fef9c3; border-left: 4px solid #ca8a04; }
.finding-blue  { background: #dbeafe; border-left: 4px solid #2563eb; }
.finding-red   { background: #fee2e2; border-left: 4px solid #dc2626; }
.finding-grey  { background: #f3f4f6; border-left: 4px solid #9ca3af; }
.finding-part  { margin-bottom: 8px; }
.finding-part:last-child { margin-bottom: 0; }
.finding-what   { font-weight: 600; color: #1e293b; }
.finding-action { color: #1e293b; margin-top: 4px; display: block; }
.finding-action::before { content: "→ "; font-weight: 600; }

/* ── Generic lists ── */
.plain-list { list-style: none; }
.plain-list li { padding: 6px 0 6px 20px; border-bottom: 1px solid #f1f5f9; color: #475569; position: relative; }
.plain-list li::before { content: "•"; position: absolute; left: 6px; color: #94a3b8; }
.plain-list li:last-child { border-bottom: none; }
.oos-list { list-style: none; }
.oos-item { padding: 6px 0 6px 20px; border-bottom: 1px solid #f1f5f9; color: #475569; position: relative; }
.oos-item::before { content: "✗"; position: absolute; left: 2px; color: #94a3b8; }
.oos-item:last-child { border-bottom: none; }

/* ── Inline code / identifier chips ── */
code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: 'SFMono-Regular', Consolas, monospace; font-size: 12px; color: #1e293b; }

/* ── Links ── */
a { color: #2563eb; text-decoration: none; }
a:hover { text-decoration: underline; }

/* ── CTA box ── */
.cta { background: #fff; border: 2px solid #9ca3af; border-radius: 10px; padding: 24px 28px; margin-top: 24px; box-shadow: 0 2px 6px rgba(0,0,0,0.08); }
.cta-title { font-size: 16px; font-weight: 700; color: #16a34a; margin-bottom: 14px; }
.cta-step { margin-bottom: 14px; }
.cta-step-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; margin-bottom: 6px; }
.cta-text { color: #475569; margin-bottom: 8px; }
.pill-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.pill { display: inline-block; font-family: 'SFMono-Regular', Consolas, monospace; font-size: 13px; font-weight: 600; padding: 5px 14px; border: 2px solid #16a34a; border-radius: 6px; background: #f0fdf4; color: #16a34a; }
.pill-or { color: #94a3b8; font-size: 13px; }
.cta-divider { border: none; border-top: 1px solid #f1f5f9; margin: 14px 0; }
.cta-subtext { color: #94a3b8; font-size: 13px; }
```

### Stage-Specific Additions

Stage-specific CSS additions are appended here once they stabilise. Each block is clearly labelled with the stage it belongs to. Copy the relevant block into a second `<style>` tag immediately after the canonical one.

*(No stage-specific additions yet — will be added as Stage 02 TC cards, Stage 04 verdict banner, etc. stabilise.)*
