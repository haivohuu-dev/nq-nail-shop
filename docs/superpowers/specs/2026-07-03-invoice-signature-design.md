# Chữ ký trên hoá đơn PDF — Design

**Date:** 2026-07-03
**Project:** d:\07. Nextjs (Next.js invoice app)

## Goal

Add a signature feature to Settings. A toggle controls whether the signature
shows on the exported invoice PDF. When enabled, the user draws a signature by
hand (mouse or touch) on a canvas. The saved signature renders bottom-right of
the PDF under a "Chữ ký" label.

## Scope

- Draw-by-canvas only (mouse + touch). No image upload. No typed-name fallback.
- One signature stored globally in the single `settings` row (same as logo/QR).
- PDF placement: bottom-right, label "Chữ ký" above the signature image.
- Toggle off ⇒ signature not rendered; stored signature data is preserved.

Out of scope (YAGNI): per-invoice signatures, upload, customizable label,
signature positioning options.

## Data model

Mirror the existing `logo` / `qrImage` pattern: base64 PNG data-URL in a nullable
`text` column, plus a boolean toggle.

**`src/db/schema.ts`** — add to `settings` table:
```ts
showSignature: integer("show_signature", { mode: "boolean" }).notNull().default(false),
signature: text("signature"), // base64 PNG data URL, nullable
```

**Migration:** `npm run db:push` (drizzle-kit push, per package.json).

**`src/lib/validation.ts`** — add to `settingsInput`:
```ts
showSignature: z.boolean().optional(),
signature: z.string().nullable().optional(),
```

**`src/app/api/settings/route.ts`** — no change. PUT already `.set(parsed.data)`
generically; GET returns the full row.

## Settings UI — `src/app/settings/page.tsx`

1. Extend the client `Settings` type with `showSignature: boolean; signature: string | null;`.
2. Extend the PUT body in `save()` to include both fields.
3. New `<ComponentCard title="Chữ ký" desc="Chữ ký hiển thị góc phải cuối hoá đơn PDF">`
   placed after the "Hiển thị trên hóa đơn PDF" card:
   - `<Toggle label="Bật hiển thị chữ ký trên PDF" checked={!!s.showSignature} onChange={(v) => setS({ ...s, showSignature: v })} />`
   - When `s.showSignature`: render `<SignaturePad value={s.signature} onChange={(dataUrl) => setS({ ...s, signature: dataUrl })} />`.

## New component — `src/components/form/SignaturePad.tsx`

Self-contained, no new dependency. Client component.

**Props:** `{ value: string | null; onChange: (dataUrl: string | null) => void }`

**Behavior:**
- `<canvas>` (~fixed height, e.g. 160px, full width, white background, bordered)
  matching existing Tailwind border/rounded styles.
- Pointer events (`onPointerDown/Move/Up` + `setPointerCapture`) → works for both
  mouse and touch. Draw strokes with `ctx.lineTo` (round caps/joins, ~2px).
- On pointer-up: `onChange(canvas.toDataURL("image/png"))`.
- "Xoá" button: clears canvas + `onChange(null)`.
- On mount, if `value` is set, draw it onto the canvas (via `Image` → `drawImage`)
  so a saved signature shows after reload.
- Handle canvas coordinate scaling: map client coords to canvas pixel space using
  `getBoundingClientRect` (canvas display size may differ from its pixel size).

## PDF render — `src/pdf/InvoiceDocument.tsx`

1. Extend `Shop` type: `showSignature?: boolean; signature?: string | null;`.
2. Add a bottom-right signature block. Render only when
   `shop.showSignature && shop.signature`. Right-aligned block with label "Chữ ký"
   above `<Image src={shop.signature} />` (sized ~width 140, height auto/60).
   Place after the totals / near page bottom, right-aligned (`marginLeft: "auto"`).

**`src/app/api/invoices/[id]/pdf/route.tsx`** — `shopProps = { ...shop, finalQrImage }`
already spreads the new columns. Add `showSignature: false, signature: null` to the
no-shop fallback object for type completeness.

## Data flow

```
Settings page → draw canvas → toDataURL → s.signature
   → PUT /api/settings → settings row (signature, showSignature)
Invoice PDF request → GET route reads settings row
   → shopProps spreads signature + showSignature
   → InvoiceDocument renders bottom-right block if enabled
```

## Testing / verification

- Settings: toggle on, draw, save → reload → signature preview persists.
- Clear button resets to null; save with null → PDF shows no signature.
- Toggle off with signature stored → PDF omits signature, data kept in DB.
- Export PDF with signature on → image appears bottom-right under "Chữ ký".
- Mouse and touch both draw (test pointer events).

## Files touched

| File | Change |
|---|---|
| `src/db/schema.ts` | +2 columns on `settings` |
| `src/lib/validation.ts` | +2 fields on `settingsInput` |
| `src/app/settings/page.tsx` | type + PUT body + new ComponentCard |
| `src/components/form/SignaturePad.tsx` | new canvas component |
| `src/pdf/InvoiceDocument.tsx` | Shop type + signature block |
| `src/app/api/invoices/[id]/pdf/route.tsx` | fallback object completeness |
| (run) `npm run db:push` | apply migration |
