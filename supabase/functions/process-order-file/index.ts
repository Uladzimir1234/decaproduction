import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Use fastest model for all file processing
const AI_MODEL = 'google/gemini-2.5-flash-lite';

interface ConstructionComponent {
  component_type: string;
  component_name: string | null;
  quantity: number;
}

interface Construction {
  construction_number: string;
  construction_type: 'window' | 'door' | 'sliding_door';
  width_inches: number | null;
  height_inches: number | null;
  width_mm: number | null;
  height_mm: number | null;
  rough_opening: string | null;
  location: string | null;
  model: string | null;
  opening_type: string | null;
  color_exterior: string | null;
  color_interior: string | null;
  glass_type: string | null;
  screen_type: string | null;
  handle_type: string | null;
  has_blinds: boolean;
  blinds_color: string | null;
  center_seal: boolean;
  comments: string | null;
  quantity: number;
  position_index: number;
  components: ConstructionComponent[];
}

interface ParsedOrder {
  quote_number: string | null;
  customer_name: string | null;
  order_date: string | null;
  constructions: Construction[];
  windows_count: number;
  doors_count: number;
  sliding_doors_count: number;
}

// Shared tool definition for extraction
const extractionTool = {
  type: 'function',
  function: {
    name: 'extract_order_data',
    description: 'Extract structured order data',
    parameters: {
      type: 'object',
      properties: {
        quote_number: { type: 'string', nullable: true },
        customer_name: { type: 'string', nullable: true },
        order_date: { type: 'string', nullable: true },
        constructions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              construction_number: { type: 'string' },
              construction_type: { type: 'string', enum: ['window', 'door', 'sliding_door'] },
              width_inches: { type: 'number', nullable: true },
              height_inches: { type: 'number', nullable: true },
              width_mm: { type: 'number', nullable: true },
              height_mm: { type: 'number', nullable: true },
              rough_opening: { type: 'string', nullable: true },
              location: { type: 'string', nullable: true },
              model: { type: 'string', nullable: true },
              opening_type: { type: 'string', nullable: true },
              color_exterior: { type: 'string', nullable: true },
              color_interior: { type: 'string', nullable: true },
              glass_type: { type: 'string', nullable: true },
              screen_type: { type: 'string', nullable: true },
              handle_type: { type: 'string', nullable: true },
              has_blinds: { type: 'boolean' },
              blinds_color: { type: 'string', nullable: true },
              center_seal: { type: 'boolean' },
              comments: { type: 'string', nullable: true },
              quantity: { type: 'number' },
              components: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    component_type: { type: 'string' },
                    component_name: { type: 'string', nullable: true },
                    quantity: { type: 'number' }
                  },
                  required: ['component_type', 'quantity']
                }
              }
            },
            required: ['construction_number', 'construction_type', 'quantity']
          }
        }
      },
      required: ['constructions']
    }
  }
};

// Enhanced system prompt for complete component extraction
const SYSTEM_PROMPT = `You are extracting window/door order data from IT Okna software exports.

CRITICAL INSTRUCTIONS:
1. Each "Construction" = one window or door with specs (dimensions, colors, glass, hardware)
2. Types mapping: "Window" = window, "Entrance/Door" = door, "Sliding/PSK/Lift" = sliding_door
3. Extract glass_type exactly as shown in file (e.g. "3M Triple Pane Low-E Argon")
4. Extract blinds_color if blinds are mentioned (e.g. "Cream", "White", "Gray")
5. Extract screen_type: look for "flex screen" or "DECA aluminum" or "deca screen"
6. Extract handle_type with color (e.g. "Std. black", "Premium white")
7. Extract color_exterior and color_interior exactly as shown

FOR EACH CONSTRUCTION, you MUST populate the "components" array with items that need ordering:
- If glass_type is set: add component {component_type: "glass", component_name: "<glass_type value>", quantity: 1}
- If has_blinds is true: add component {component_type: "blinds", component_name: "<blinds_color value>", quantity: 1}
- If screen_type is set: add component {component_type: "screens", component_name: "<exact screen type>", quantity: 1}
- If handle_type is set: add component {component_type: "hardware", component_name: "<handle_type value>", quantity: 1}
- If nailing fins/flanges mentioned: add component {component_type: "nailing_fins", component_name: null, quantity: 1}
- If coupling profile mentioned: add component {component_type: "coupling_profile", component_name: null, quantity: 1}

This components array is CRITICAL for tracking what materials need to be ordered for manufacturing.`;

function processExtractedData(extracted: any): ParsedOrder {
  const constructions = (extracted.constructions || []).map((c: any, index: number) => ({
    ...c,
    position_index: index,
    has_blinds: c.has_blinds || false,
    center_seal: c.center_seal || false,
    quantity: c.quantity || 1,
    components: c.components || [],
  }));

  const windows_count = constructions
    .filter((c: Construction) => c.construction_type === 'window')
    .reduce((sum: number, c: Construction) => sum + c.quantity, 0);
  const doors_count = constructions
    .filter((c: Construction) => c.construction_type === 'door')
    .reduce((sum: number, c: Construction) => sum + c.quantity, 0);
  const sliding_doors_count = constructions
    .filter((c: Construction) => c.construction_type === 'sliding_door')
    .reduce((sum: number, c: Construction) => sum + c.quantity, 0);

  return {
    quote_number: extracted.quote_number || null,
    customer_name: extracted.customer_name || null,
    order_date: extracted.order_date || null,
    constructions,
    windows_count,
    doors_count,
    sliding_doors_count,
  };
}

async function parseCSVWithAI(csvContent: string): Promise<ParsedOrder> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY is not configured');
  }

  console.log('Parsing CSV with AI...');

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Extract constructions from this order:\n\n${csvContent}` }
      ],
      tools: [extractionTool],
      tool_choice: { type: 'function', function: { name: 'extract_order_data' } }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI error:', response.status, errorText);
    if (response.status === 429) throw new Error('Rate limit exceeded. Try again later.');
    if (response.status === 402) throw new Error('AI credits exhausted.');
    throw new Error(`AI processing failed: ${response.status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  
  if (!toolCall?.function?.arguments) {
    throw new Error('Failed to extract data from CSV');
  }

  return processExtractedData(JSON.parse(toolCall.function.arguments));
}

async function processPDFWithAI(base64Content: string): Promise<ParsedOrder> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY is not configured');
  }

  console.log('Processing PDF with AI...');

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract all constructions from this order document.' },
            { type: 'image_url', image_url: { url: `data:application/pdf;base64,${base64Content}` } }
          ]
        }
      ],
      tools: [extractionTool],
      tool_choice: { type: 'function', function: { name: 'extract_order_data' } }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI error:', response.status, errorText);
    throw new Error(`AI processing failed: ${response.status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  
  if (!toolCall?.function?.arguments) {
    throw new Error('Failed to extract data from PDF');
  }

  return processExtractedData(JSON.parse(toolCall.function.arguments));
}

async function parseExcelWithAI(base64Content: string): Promise<ParsedOrder> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY is not configured');
  }

  console.log('Converting Excel to text...');

  // Extract text from Excel binary
  const binaryString = atob(base64Content);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  let textContent = '';
  let currentString = '';
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13 || byte === 9) {
      currentString += String.fromCharCode(byte);
    } else if (currentString.length > 3) {
      textContent += currentString + '\n';
      currentString = '';
    } else {
      currentString = '';
    }
  }
  if (currentString.length > 3) {
    textContent += currentString;
  }

  textContent = textContent
    .split('\n')
    .filter(line => line.trim().length > 2)
    .filter(line => !/^[\x00-\x1F\x7F]+$/.test(line))
    .join('\n');

  console.log('Extracted text preview:', textContent.substring(0, 500));

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Extract constructions from this order:\n\n${textContent}` }
      ],
      tools: [extractionTool],
      tool_choice: { type: 'function', function: { name: 'extract_order_data' } }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI error:', response.status, errorText);
    throw new Error(`AI processing failed: ${response.status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  
  if (!toolCall?.function?.arguments) {
    throw new Error('Failed to extract data from Excel');
  }

  return processExtractedData(JSON.parse(toolCall.function.arguments));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file_content, file_type, file_name } = await req.json();
    console.log(`Processing ${file_type} file: ${file_name}`);

    let result: ParsedOrder;

    if (file_type === 'csv') {
      const csvContent = atob(file_content);
      result = await parseCSVWithAI(csvContent);
    } else if (file_type === 'pdf') {
      result = await processPDFWithAI(file_content);
    } else if (file_type === 'excel') {
      result = await parseExcelWithAI(file_content);
    } else {
      throw new Error(`Unsupported file type: ${file_type}`);
    }

    console.log(`Extracted ${result.constructions.length} constructions`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
