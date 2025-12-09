import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

function parseITOknaCSV(csvContent: string): ParsedOrder {
  const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line);
  
  const constructions: Construction[] = [];
  let quote_number: string | null = null;
  let customer_name: string | null = null;
  let order_date: string | null = null;
  
  let currentConstruction: Partial<Construction> | null = null;
  let position = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Parse header info
    if (line.startsWith('Quote №')) {
      const match = line.match(/Quote №\s*(\d+)/);
      if (match) quote_number = match[1];
    }
    
    if (line.startsWith('Customer:')) {
      customer_name = line.replace('Customer:', '').trim();
    }
    
    if (line.startsWith('Date:')) {
      order_date = line.replace('Date:', '').trim();
    }
    
    // Detect construction block start
    if (line.startsWith('Construction №')) {
      // Save previous construction
      if (currentConstruction && currentConstruction.construction_number) {
        constructions.push(currentConstruction as Construction);
      }
      
      const match = line.match(/Construction №\s*(\d+)/);
      const constructionNum = match ? match[1] : String(position + 1);
      
      currentConstruction = {
        construction_number: constructionNum,
        construction_type: 'window',
        width_inches: null,
        height_inches: null,
        width_mm: null,
        height_mm: null,
        rough_opening: null,
        location: null,
        model: null,
        opening_type: null,
        color_exterior: null,
        color_interior: null,
        glass_type: null,
        screen_type: null,
        handle_type: null,
        has_blinds: false,
        blinds_color: null,
        center_seal: false,
        comments: null,
        quantity: 1,
        position_index: position,
      };
      position++;
    }
    
    if (!currentConstruction) continue;
    
    // Parse construction details
    if (line.startsWith('Size:')) {
      // Parse dimensions like "35.98x47.99 inch (914x1219 mm)"
      const dimMatch = line.match(/(\d+\.?\d*)\s*x\s*(\d+\.?\d*)\s*inch\s*\((\d+)\s*x\s*(\d+)\s*mm\)/i);
      if (dimMatch) {
        currentConstruction.width_inches = parseFloat(dimMatch[1]);
        currentConstruction.height_inches = parseFloat(dimMatch[2]);
        currentConstruction.width_mm = parseInt(dimMatch[3]);
        currentConstruction.height_mm = parseInt(dimMatch[4]);
      }
    }
    
    if (line.startsWith('Rough Opening:')) {
      currentConstruction.rough_opening = line.replace('Rough Opening:', '').trim();
    }
    
    if (line.startsWith('Room:') || line.startsWith('Location:')) {
      currentConstruction.location = line.replace(/^(Room|Location):/, '').trim();
    }
    
    if (line.includes('DECA') || line.includes('GEALAN') || line.includes('LINEAR')) {
      currentConstruction.model = line.trim();
    }
    
    // Opening type detection
    if (line.includes('Tilt-Turn') || line.includes('Turn') || line.includes('Fixed') || 
        line.includes('Casement') || line.includes('Awning') || line.includes('Hopper')) {
      if (!currentConstruction.opening_type) {
        currentConstruction.opening_type = line.trim();
      }
    }
    
    // Determine construction type from opening type
    if (line.toLowerCase().includes('door') || line.toLowerCase().includes('entrance')) {
      currentConstruction.construction_type = 'door';
    }
    if (line.toLowerCase().includes('sliding') || line.toLowerCase().includes('psk') || 
        line.toLowerCase().includes('lift and slide') || line.toLowerCase().includes('multi slide')) {
      currentConstruction.construction_type = 'sliding_door';
    }
    
    // Color parsing
    if (line.startsWith('Exterior Color:') || line.startsWith('Color Exterior:')) {
      currentConstruction.color_exterior = line.replace(/^(Exterior Color|Color Exterior):/, '').trim();
    }
    if (line.startsWith('Interior Color:') || line.startsWith('Color Interior:')) {
      currentConstruction.color_interior = line.replace(/^(Interior Color|Color Interior):/, '').trim();
    }
    if (line.startsWith('Color:') && !currentConstruction.color_exterior) {
      const color = line.replace('Color:', '').trim();
      currentConstruction.color_exterior = color;
      currentConstruction.color_interior = color;
    }
    
    // Glass type
    if (line.includes('glass') || line.includes('Glass') || line.includes('Triple') || line.includes('Double')) {
      if (!currentConstruction.glass_type) {
        currentConstruction.glass_type = line.trim();
      }
    }
    
    // Screen
    if (line.includes('screen') || line.includes('Screen')) {
      currentConstruction.screen_type = line.trim();
    }
    
    // Handle
    if (line.includes('handle') || line.includes('Handle')) {
      currentConstruction.handle_type = line.replace(/^Handle:?/i, '').trim();
    }
    
    // Blinds
    if (line.includes('blind') || line.includes('Blind')) {
      currentConstruction.has_blinds = true;
      const colorMatch = line.match(/color:?\s*(\w+)/i);
      if (colorMatch) {
        currentConstruction.blinds_color = colorMatch[1];
      }
    }
    
    // Center seal
    if (line.toLowerCase().includes('center seal')) {
      currentConstruction.center_seal = true;
    }
    
    // Quantity
    if (line.startsWith('Quantity:') || line.startsWith('Qty:')) {
      const qtyMatch = line.match(/(\d+)/);
      if (qtyMatch) {
        currentConstruction.quantity = parseInt(qtyMatch[1]);
      }
    }
    
    // Comments/Notes
    if (line.startsWith('Note:') || line.startsWith('Comments:') || line.startsWith('Comment:')) {
      currentConstruction.comments = line.replace(/^(Note|Comments?):/, '').trim();
    }
  }
  
  // Don't forget the last construction
  if (currentConstruction && currentConstruction.construction_number) {
    constructions.push(currentConstruction as Construction);
  }
  
  // Calculate counts
  const windows_count = constructions
    .filter(c => c.construction_type === 'window')
    .reduce((sum, c) => sum + c.quantity, 0);
  const doors_count = constructions
    .filter(c => c.construction_type === 'door')
    .reduce((sum, c) => sum + c.quantity, 0);
  const sliding_doors_count = constructions
    .filter(c => c.construction_type === 'sliding_door')
    .reduce((sum, c) => sum + c.quantity, 0);
  
  return {
    quote_number,
    customer_name,
    order_date,
    constructions,
    windows_count,
    doors_count,
    sliding_doors_count,
  };
}

async function processPDFWithAI(base64Content: string): Promise<ParsedOrder> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY is not configured');
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `You are an expert at extracting data from window and door order documents. 
Extract all construction items from the document and return structured JSON.
For each construction, identify:
- construction_number (e.g., "1", "2", etc.)
- construction_type: "window", "door", or "sliding_door"
- width_inches and height_inches (convert if needed)
- width_mm and height_mm (convert if needed)
- rough_opening (as text)
- location/room name
- model (e.g., "DECA GEALAN LINEAR")
- opening_type (e.g., "Tilt-Turn", "Fixed", "Casement")
- color_exterior and color_interior
- glass_type (full specification)
- screen_type
- handle_type
- has_blinds (boolean)
- blinds_color
- center_seal (boolean)
- comments
- quantity (how many of this exact configuration)`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all window and door constructions from this order document. Return a JSON object with: quote_number, customer_name, order_date, and an array of constructions with all specifications.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:application/pdf;base64,${base64Content}`
              }
            }
          ]
        }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'extract_order_data',
            description: 'Extract structured order data from the document',
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
                      quantity: { type: 'number' }
                    },
                    required: ['construction_number', 'construction_type', 'quantity']
                  }
                }
              },
              required: ['constructions']
            }
          }
        }
      ],
      tool_choice: { type: 'function', function: { name: 'extract_order_data' } }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI Gateway error:', response.status, errorText);
    throw new Error(`AI processing failed: ${response.status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  
  if (!toolCall || !toolCall.function?.arguments) {
    throw new Error('Failed to extract data from PDF');
  }

  const extracted = JSON.parse(toolCall.function.arguments);
  
  // Add position_index to constructions
  const constructions = (extracted.constructions || []).map((c: any, index: number) => ({
    ...c,
    position_index: index,
    has_blinds: c.has_blinds || false,
    center_seal: c.center_seal || false,
    quantity: c.quantity || 1,
  }));

  // Calculate counts
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file_content, file_type, file_name } = await req.json();
    
    if (!file_content) {
      throw new Error('No file content provided');
    }

    console.log(`Processing ${file_type} file: ${file_name}`);
    
    let result: ParsedOrder;
    
    if (file_type === 'csv' || file_name?.toLowerCase().endsWith('.csv')) {
      // Decode base64 CSV content
      const csvContent = atob(file_content);
      result = parseITOknaCSV(csvContent);
    } else if (file_type === 'pdf' || file_name?.toLowerCase().endsWith('.pdf')) {
      result = await processPDFWithAI(file_content);
    } else {
      throw new Error('Unsupported file type. Please upload a CSV or PDF file.');
    }

    console.log(`Extracted ${result.constructions.length} constructions`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing file:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
