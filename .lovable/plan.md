

## Upgrade Both Edge Functions to Gemini 2.5 Pro

### Current State
| Function | Current Model(s) |
|----------|-----------------|
| `order-assistant` | `gemini-2.5-flash` |
| `process-order-file` | `gemini-2.0-flash` (labeled "Gemini 1.5 Pro") + `gemini-2.0-flash-lite` (labeled "Gemini 1.5 Flash") |

### Changes

**1. `supabase/functions/order-assistant/index.ts`**
- Change model in the API URL from `gemini-2.5-flash` to `gemini-2.5-pro`

**2. `supabase/functions/process-order-file/index.ts`**
- Update `MODELS` object: both models become `gemini-2.5-pro`
- Since both models are now the same, the comparison feature becomes redundant with identical models — but we'll keep the structure intact and just update the model strings

**3. Fix outdated UI labels in frontend**
- `src/components/order/FileUploadZone.tsx`: Update "Gemini 1.5 Pro" → "Gemini 2.5 Pro" and "Gemini 1.5 Flash" → "Gemini 2.5 Pro"
- `src/components/order/ModelComparisonView.tsx`: Same label updates throughout

### Files Modified
| File | What Changes |
|------|-------------|
| `supabase/functions/order-assistant/index.ts` | Model → `gemini-2.5-pro` |
| `supabase/functions/process-order-file/index.ts` | Both models → `gemini-2.5-pro` |
| `src/components/order/FileUploadZone.tsx` | Update UI labels |
| `src/components/order/ModelComparisonView.tsx` | Update UI labels |

### Note
Since both extraction models will now be identical (`gemini-2.5-pro`), the "Compare Models" toggle won't produce meaningful differences. We can address removing/repurposing that feature separately if you'd like.

