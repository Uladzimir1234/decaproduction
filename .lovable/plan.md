

## Remove Dual-Run / Compare Feature

Remove the "Compare Gemini 3.0 Flash (dual run)" checkbox and all associated comparison logic since it's no longer needed.

### Changes

**`src/components/order/FileUploadZone.tsx`**
- Remove `compareModels` state and `comparisonData` state
- Remove `GitCompare` icon import, `Checkbox`/`Label` imports if unused elsewhere
- Remove the compare checkbox UI at the bottom
- Remove `compare_models` from the edge function request body
- Remove the comparison result handling branch
- Remove `handleSelectModel` callback
- Remove the `ModelComparisonView` rendering block
- Remove `ModelComparisonView` import

**`src/components/order/ModelComparisonView.tsx`**
- Delete this file entirely (no longer used)

**`supabase/functions/process-order-file/index.ts`**
- Remove the `compare_models` parameter handling
- Remove the dual-run logic that calls `extractWithModel` twice
- Simplify to always do a single extraction run

