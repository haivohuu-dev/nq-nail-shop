# Invoice Signature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a hand-drawn signature to Settings, toggleable, rendered bottom-right on the exported invoice PDF.

**Architecture:** Store one signature (base64 PNG data-URL) plus a `showSignature` boolean in the single `settings` DB row — same pattern as the existing `logo`/`qrImage`. A new self-contained canvas component (`SignaturePad`) captures the drawing via pointer events (mouse + touch). The PDF route already spreads the settings row to the document; the document renders a signature block when enabled.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Drizzle ORM + Turso/libSQL (SQLite), Zod 4, `@react-pdf/renderer`, Tailwind CSS v4.

## Global Constraints

- Signature stored as base64 PNG data-URL in a nullable `text` column (mirror `logo`/`qrImage`).
- No new npm dependency — SignaturePad uses the native `<canvas>` + Pointer Events API.
- No test runner exists in this project. Verification = `npm run build` (TypeScript typecheck) + manual browser/PDF checks. Do NOT add a test framework.
- Migrations applied via `npm run db:push` (drizzle-kit push). Requires `.env.local` with `TURSO_DATABASE_URL`.
- All user-facing copy in Vietnamese, matching existing settings page.
- Follow existing file style: no semicolintrouble — match surrounding code (double quotes, existing Toggle/ComponentCard usage).

---

### Task 1: Data model — DB column + Zod field

Add the two persistence fields end-to-end at the data layer so later UI/PDF tasks have somewhere to read/write.

**Files:**
- Modify: `src/db/schema.ts:20-36` (settings table)
- Modify: `src/lib/validation.ts:16-29` (settingsInput)
- (run) `npm run db:push`

**Interfaces:**
- Consumes: nothing.
- Produces: `settings.showSignature` (boolean column), `settings.signature` (nullable text column). Zod `settingsInput` accepts `showSignature?: boolean`, `signature?: string | null`. The settings API PUT (`route.ts`) already does `.set(parsed.data)` generically, so no route change needed.

- [ ] **Step 1: Add columns to the settings table**

In `src/db/schema.ts`, inside the `settings = sqliteTable(...)` object, add after the `qrText` line (line 35):

```ts
  qrText: text("qr_text").notNull().default(""),
  showSignature: integer("show_signature", { mode: "boolean" }).notNull().default(false),
  signature: text("signature"), // base64 PNG data URL, nullable
```

- [ ] **Step 2: Add fields to the Zod schema**

In `src/lib/validation.ts`, inside `settingsInput = z.object({...})`, add after the `qrText` line (line 28):

```ts
  qrText: z.string().optional(),
  showSignature: z.boolean().optional(),
  signature: z.string().nullable().optional(),
```

- [ ] **Step 3: Apply the migration**

Run: `npm run db:push`
Expected: drizzle-kit reports the `settings` table altered with new `show_signature` and `signature` columns, completes without error. (If it prompts, accept the additive column changes.)

- [ ] **Step 4: Typecheck**

Run: `npm run build`
Expected: build succeeds, no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/db/schema.ts src/lib/validation.ts
git commit -m "feat: add signature + showSignature fields to settings schema"
```

---

### Task 2: SignaturePad canvas component

Self-contained drawing surface. No dependency. Renders a bordered canvas, draws with mouse/touch, exposes the drawing as a PNG data-URL, restores an existing value on mount, and clears.

**Files:**
- Create: `src/components/form/SignaturePad.tsx`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: default-exported React component
  `SignaturePad(props: { value: string | null; onChange: (dataUrl: string | null) => void }): JSX.Element`.
  Calls `onChange(canvas.toDataURL("image/png"))` on each stroke end, `onChange(null)` on clear.

- [ ] **Step 1: Create the component**

Create `src/components/form/SignaturePad.tsx`:

```tsx
"use client";
import { useEffect, useRef } from "react";
import Button from "@/components/ui/button/Button";

const CANVAS_W = 600;
const CANVAS_H = 200;

export default function SignaturePad({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  // Draw the saved signature onto the canvas on mount / when value arrives from load.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = value;
    }
    // Only redraw from an external value change, not on every stroke (strokes draw directly).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value === null]);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    canvasRef.current!.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.current!.x, last.current!.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    onChange(canvasRef.current!.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    onChange(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className="w-full touch-none rounded-lg border border-gray-200 bg-white dark:border-gray-800"
        style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}`, cursor: "crosshair" }}
      />
      <div>
        <Button variant="outline" size="sm" onClick={clear}>
          Xoá chữ ký
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run build`
Expected: build succeeds, no TypeScript errors. (Component not yet imported anywhere — this only proves it compiles.)

- [ ] **Step 3: Commit**

```bash
git add src/components/form/SignaturePad.tsx
git commit -m "feat: add SignaturePad canvas component"
```

---

### Task 3: Wire signature into the Settings page

Extend the client type + PUT body, add the "Chữ ký" card with toggle and the SignaturePad.

**Files:**
- Modify: `src/app/settings/page.tsx:8-13` (Settings type)
- Modify: `src/app/settings/page.tsx:38-50` (save/PUT body)
- Modify: `src/app/settings/page.tsx:165-174` (add new ComponentCard after the "Hiển thị trên hóa đơn PDF" card)

**Interfaces:**
- Consumes: `SignaturePad` from Task 2 (`{ value, onChange }`); `settings.signature`/`showSignature` from Task 1.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Import SignaturePad**

In `src/app/settings/page.tsx`, add after line 6 (`import { Label, TextInput } ...`):

```tsx
import SignaturePad from "@/components/form/SignaturePad";
```

- [ ] **Step 2: Extend the Settings type**

Change the `Settings` type (lines 8-13) to add the two fields:

```tsx
type Settings = {
  shopName: string; address: string; phone: string;
  logo: string | null; defaultTaxRate: number;
  showDiscount: boolean; showTax: boolean; showTip: boolean; showLogo: boolean;
  enableQr: boolean; qrImage: string | null; qrText: string;
  showSignature: boolean; signature: string | null;
};
```

- [ ] **Step 3: Extend the PUT body in save()**

In `save()`, change the `body: JSON.stringify({...})` object (lines 41-47) to include the new fields:

```tsx
      body: JSON.stringify({
        shopName: s!.shopName, address: s!.address, phone: s!.phone,
        logo: s!.logo, defaultTaxRate: s!.defaultTaxRate,
        showDiscount: s!.showDiscount, showTax: s!.showTax,
        showTip: s!.showTip, showLogo: s!.showLogo,
        enableQr: s!.enableQr, qrImage: s!.qrImage, qrText: s!.qrText,
        showSignature: s!.showSignature, signature: s!.signature,
      }),
```

- [ ] **Step 4: Add the "Chữ ký" ComponentCard**

In `src/app/settings/page.tsx`, insert a new block between the closing `</div>` of the "Hiển thị trên hóa đơn PDF" card (line 174) and the "Lưu" button block (line 176). Insert:

```tsx
          <div className="mt-6">
            <ComponentCard title="Chữ ký" desc="Chữ ký hiển thị góc phải cuối hoá đơn PDF">
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                <Toggle label="Bật hiển thị chữ ký trên PDF" checked={!!s.showSignature} onChange={(v) => setS({ ...s, showSignature: v })} />
              </div>
              {s.showSignature && (
                <div className="mt-4">
                  <Label>Ký tại đây (dùng chuột hoặc chạm để ký)</Label>
                  <SignaturePad value={s.signature} onChange={(dataUrl) => setS({ ...s, signature: dataUrl })} />
                </div>
              )}
            </ComponentCard>
          </div>
```

- [ ] **Step 5: Typecheck**

Run: `npm run build`
Expected: build succeeds, no TypeScript errors.

- [ ] **Step 6: Manual verification**

Run: `npm run start` (or `next dev` if configured), open `/settings`.
Verify:
- New "Chữ ký" card shows; toggle off by default hides the canvas.
- Toggle on → canvas appears. Draw with mouse → strokes render.
- Click "Lưu" → toast "Đã lưu thành công".
- Reload page → toggle still on, drawn signature reappears on the canvas.
- Click "Xoá chữ ký" → canvas clears; Lưu; reload → canvas empty.

- [ ] **Step 7: Commit**

```bash
git add src/app/settings/page.tsx
git commit -m "feat: add signature card to settings page"
```

---

### Task 4: Render signature on the invoice PDF

Extend the `Shop` type, add the bottom-right signature block, complete the no-shop fallback object.

**Files:**
- Modify: `src/pdf/InvoiceDocument.tsx:31-35` (Shop type)
- Modify: `src/pdf/InvoiceDocument.tsx:91-100` (add signature block near page bottom)
- Modify: `src/app/api/invoices/[id]/pdf/route.tsx:29` (fallback object)

**Interfaces:**
- Consumes: `settings.showSignature`/`signature` (Task 1), passed through via `shopProps` spread (already `{ ...shop, finalQrImage }`).
- Produces: nothing.

- [ ] **Step 1: Extend the Shop type**

In `src/pdf/InvoiceDocument.tsx`, change the `Shop` type (lines 31-35) to:

```tsx
type Shop = {
  shopName: string; address: string; phone: string; logo: string | null;
  showDiscount?: boolean; showTax?: boolean; showTip?: boolean; showLogo?: boolean;
  finalQrImage?: string | null;
  showSignature?: boolean; signature?: string | null;
};
```

- [ ] **Step 2: Add a signature style**

In the `StyleSheet.create({...})` block, add after the `logo` style (line 28):

```tsx
  logo: { height: 48, marginBottom: 6 },
  signature: { marginTop: 24, marginLeft: "auto", width: 160, alignItems: "flex-end" },
  signatureImg: { width: 140, height: 60, objectFit: "contain" },
```

- [ ] **Step 3: Render the signature block**

In `InvoiceDocument`, insert the signature block after the note line (line 91) and before the QR block (line 93):

```tsx
        {invoice.note ? <Text style={[s.muted, { marginTop: 12 }]}>Ghi chú: {invoice.note}</Text> : null}

        {shop.showSignature && shop.signature ? (
          <View style={s.signature}>
            <Text style={s.muted}>Chữ ký</Text>
            <Image src={shop.signature} style={s.signatureImg} />
          </View>
        ) : null}

        {shop.finalQrImage ? (
```

- [ ] **Step 4: Complete the fallback object**

In `src/app/api/invoices/[id]/pdf/route.tsx`, extend the no-shop fallback (line 29) so its type matches the settings row:

```tsx
  const shopProps = shop ? { ...shop, finalQrImage } : { shopName: "", address: "", phone: "", logo: null, showDiscount: true, showTax: true, showTip: true, showLogo: true, showSignature: false, signature: null, finalQrImage: null };
```

- [ ] **Step 5: Typecheck**

Run: `npm run build`
Expected: build succeeds, no TypeScript errors.

- [ ] **Step 6: Manual verification**

With a signature saved and `showSignature` on (from Task 3), open an invoice detail page and click "Tải PDF" (`/api/invoices/{id}/pdf`).
Verify:
- Signature image appears bottom-right, under the "Chữ ký" label, above/near the QR block.
- Toggle `showSignature` off in settings, save, re-open PDF → no signature block, no "Chữ ký" label.
- Toggle on but clear signature (null), save, re-open PDF → no signature block (guarded by `shop.signature`).

- [ ] **Step 7: Commit**

```bash
git add src/pdf/InvoiceDocument.tsx "src/app/api/invoices/[id]/pdf/route.tsx"
git commit -m "feat: render signature bottom-right on invoice PDF"
```

---

## Self-Review

**Spec coverage:**
- Data model (2 columns + Zod) → Task 1. ✓
- SignaturePad canvas, mouse+touch, clear, restore → Task 2. ✓
- Settings UI card + toggle + type + PUT → Task 3. ✓
- PDF bottom-right block + "Chữ ký" label + fallback → Task 4. ✓
- `npm run db:push` migration → Task 1 Step 3. ✓
- Toggle-off preserves data (guarded render, no data deletion) → Task 4 Step 6 verification. ✓

**Placeholder scan:** No TBD/TODO/"handle edge cases". All code shown in full.

**Type consistency:** `SignaturePad({ value, onChange })` defined in Task 2, consumed identically in Task 3. `showSignature`/`signature` names identical across schema (Task 1), Settings type + PUT (Task 3), Shop type + render (Task 4), and pass-through/fallback (Task 4). `onChange(dataUrl: string | null)` matches `setS({ ...s, signature: dataUrl })`.

**Note on touch:** canvas has `touch-none` (Tailwind `touch-action: none`) so touch-drag draws instead of scrolling; pointer events cover mouse + touch + pen uniformly.
