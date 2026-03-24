import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-export-key',
};

const TABLES = [
  'orders',
  'customers',
  'order_constructions',
  'order_fulfillment',
  'construction_manufacturing',
  'construction_components',
  'construction_delivery',
  'construction_issues',
  'construction_notes',
  'delivery_batches',
  'batch_construction_items',
  'batch_shipping_items',
  'batch_custom_shipping_items',
  'custom_steps',
  'procurement_cart',
  'audit_logs',
  'user_profiles',
  'user_roles',
  'user_invitations',
  'batch_construction_components',
  'batch_delivery_items',
  'batch_custom_delivery_items',
  'custom_shipping_items',
  'custom_delivery_items',
  'order_delivery_log',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const exportSecret = Deno.env.get('EXPORT_SECRET');
    const providedKey = req.headers.get('x-export-key');

    if (!exportSecret || providedKey !== exportSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const result: Record<string, unknown[]> = {};

    for (const table of TABLES) {
      const allRows: unknown[] = [];
      let from = 0;
      const pageSize = 1000;

      while (true) {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select('*')
          .range(from, from + pageSize - 1);

        if (error) {
          console.error(`Error querying ${table}:`, error.message);
          result[table] = { error: error.message } as any;
          break;
        }

        if (!data || data.length === 0) break;
        allRows.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }

      if (!result[table]) {
        result[table] = allRows;
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
