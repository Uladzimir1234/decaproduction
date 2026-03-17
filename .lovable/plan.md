

## Revert `process-order-file` Back to Direct Google API

### What went wrong
You asked to upgrade the model to Gemini 3.0 Flash. I incorrectly also migrated `process-order-file` from the direct Google Generative AI API (`GOOGLE_API_KEY`) to the Lovable AI Gateway (`LOVABLE_API_KEY`). You only wanted the model change.

### What needs to happen

**1. `supabase/functions/process-order-file/index.ts`** — Revert to direct Google API
- Restore using `GOOGLE_API_KEY` instead of `LOVABLE_API_KEY`
- Restore calling Google's native Generative AI endpoint (`generativelanguage.googleapis.com`) instead of the Lovable AI Gateway
- Restore Google's native function calling format (`functionDeclarations`) instead of OpenAI-compatible `tools` format
- Restore Google's native PDF handling (`inlineData` with `mimeType`) instead of OpenAI `image_url` format
- Update the model to `gemini-3.0-flash-preview` (or the correct Google model ID for Gemini 3.0 Flash)
- Parse the response using Google's native format (`functionCall.args`) instead of OpenAI's `tool_calls`

**2. `supabase/functions/order-assistant/index.ts`** — Model update only
- This was already on the Lovable AI Gateway before my changes, so that's fine
- Just update the model from `google/gemini-3-flash-preview` to the correct Gemini 3.0 Flash identifier (this is already done)

**3. No frontend changes needed**
- The UI labels were updated to "Gemini 2.5 Pro" in the previous round — those should be updated to reflect "Gemini 3.0 Flash" instead

### Important note on model names
The direct Google API uses different model identifiers than the Lovable AI Gateway. I'll need to confirm the correct Google API model name for Gemini 3.0 Flash (likely `gemini-3.0-flash-preview` or similar).

### Files to modify
| File | Change |
|------|--------|
| `supabase/functions/process-order-file/index.ts` | Revert to direct Google API with `GOOGLE_API_KEY`, update model to Gemini 3.0 Flash |
| `src/components/order/FileUploadZone.tsx` | Update labels from "Gemini 2.5 Pro" to "Gemini 3.0 Flash" |
| `src/components/order/ModelComparisonView.tsx` | Update labels from "Gemini 2.5 Pro" to "Gemini 3.0 Flash" |

