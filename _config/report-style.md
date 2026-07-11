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
