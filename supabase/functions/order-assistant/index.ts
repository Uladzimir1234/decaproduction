import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create Supabase client to fetch order data
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch orders data for context
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        customer_name,
        delivery_date,
        production_status,
        fulfillment_percentage,
        is_priority,
        created_at,
        windows_count,
        doors_count,
        sliding_doors_count,
        glass_status,
        hardware_status,
        screens_status,
        reinforcement_status,
        windows_profile_status,
        hold_started_at
      `)
      .order('delivery_date', { ascending: true })
      .limit(50);

    if (ordersError) {
      console.error("Error fetching orders:", ordersError);
    }

    // Fetch recent audit logs for change tracking
    const { data: auditLogs, error: auditError } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    if (auditError) {
      console.error("Error fetching audit logs:", auditError);
    }

    // Fetch active issues
    const { data: issues, error: issuesError } = await supabase
      .from('construction_issues')
      .select(`
        id,
        description,
        issue_type,
        status,
        created_at,
        construction_id,
        order_constructions!inner(order_id, construction_number, orders!inner(order_number, customer_name))
      `)
      .eq('status', 'open')
      .limit(20);

    if (issuesError) {
      console.error("Error fetching issues:", issuesError);
    }

    // Fetch upcoming deliveries (batches)
    const { data: deliveries, error: deliveriesError } = await supabase
      .from('delivery_batches')
      .select(`
        id,
        delivery_date,
        status,
        delivery_person,
        notes,
        order_id,
        orders!inner(order_number, customer_name)
      `)
      .gte('delivery_date', new Date().toISOString().split('T')[0])
      .order('delivery_date', { ascending: true })
      .limit(20);

    if (deliveriesError) {
      console.error("Error fetching deliveries:", deliveriesError);
    }

    // Build context for the AI
    const today = new Date().toISOString().split('T')[0];
    const activeOrders = orders?.filter(o => o.production_status !== 'completed') || [];
    const criticalOrders = activeOrders.filter(o => {
      const daysUntil = Math.ceil((new Date(o.delivery_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil <= 7 && (o.fulfillment_percentage || 0) < 80;
    });
    const onHoldOrders = activeOrders.filter(o => o.production_status === 'hold');
    const priorityOrders = activeOrders.filter(o => o.is_priority);

    // Format orders for context
    const ordersContext = activeOrders.slice(0, 30).map(o => {
      const daysUntil = Math.ceil((new Date(o.delivery_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return `- Order #${o.order_number} (${o.customer_name}): ${o.production_status}, ${o.fulfillment_percentage || 0}% complete, delivery in ${daysUntil} days (${o.delivery_date})${o.is_priority ? ' [PRIORITY]' : ''}${o.production_status === 'hold' ? ' [ON HOLD]' : ''}`;
    }).join('\n');

    // Format recent changes
    const recentChanges = auditLogs?.slice(0, 15).map(log => {
      const time = new Date(log.created_at).toLocaleString();
      return `- ${time}: ${log.action} - ${log.description} (by ${log.user_email})`;
    }).join('\n') || 'No recent changes';

    // Format open issues
    const openIssues = issues?.map(i => {
      const orderInfo = (i as any).order_constructions?.orders;
      return `- ${i.issue_type}: ${i.description} (Order #${orderInfo?.order_number || 'unknown'})`;
    }).join('\n') || 'No open issues';

    // Format upcoming deliveries
    const upcomingDeliveries = deliveries?.map(d => {
      const orderInfo = (d as any).orders;
      return `- ${d.delivery_date}: Order #${orderInfo?.order_number} (${orderInfo?.customer_name}) - Status: ${d.status}`;
    }).join('\n') || 'No upcoming deliveries';

    const systemPrompt = `You are an AI assistant for a window and door manufacturing order management system. You help the user focus on what matters most in their orders.

CURRENT DATE: ${today}

## ACTIVE ORDERS SUMMARY
Total Active Orders: ${activeOrders.length}
Critical Orders (due within 7 days, <80% complete): ${criticalOrders.length}
Orders On Hold: ${onHoldOrders.length}
Priority Orders: ${priorityOrders.length}

## ACTIVE ORDERS LIST
${ordersContext || 'No active orders'}

## RECENT CHANGES (Last 15)
${recentChanges}

## OPEN ISSUES
${openIssues}

## UPCOMING DELIVERIES
${upcomingDeliveries}

## YOUR ROLE
1. Answer questions about orders, their status, and progress
2. Highlight orders that need attention (critical deadlines, blockers, stalled progress)
3. Track and summarize recent changes
4. Provide actionable insights to help prioritize work
5. Alert to potential issues before they become critical

When responding:
- Be concise and actionable
- Reference specific order numbers
- Highlight urgent items first
- Suggest next actions when appropriate
- Use the data above to provide accurate, specific answers

If asked about a specific order not in the list, say you don't have data for that order number.`;

    console.log("Calling Lovable AI Gateway...");

    // Build OpenAI-compatible messages
    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: chatMessages,
          stream: true,
          temperature: 0.7,
          max_tokens: 2048,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stream the response back
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Order assistant error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
