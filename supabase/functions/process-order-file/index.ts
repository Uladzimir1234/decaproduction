import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

async function parseCSVWithAI(csvContent: string): Promise<ParsedOrder> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY is not configured');
  }

  console.log('Sending CSV to AI for parsing...');
  console.log('CSV content preview:', csvContent.substring(0, 500));

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
          content: `You are an expert at extracting data from IT Okna window and door order CSV exports.
These CSV files have a specific structure:
- Company info at the top
- Quote number and date (e.g., "Quote ? 1/1681 Date 11/26/2025")
- Customer name and phone
- Multiple "Construction ?" sections, each representing a window or door
- Each construction has: dimensions in inches and mm, room/location, model, system type, opening type, colors, glass specs, handle type, screen type, blinds info, and quantity

IMPORTANT: For each construction, also extract all COMPONENTS that need to be ordered separately:
- "blinds" - if the construction has blinds/shades
- "screen" or "flex_screen" or "deca_screen" - if screens are specified
- "coupling_profile" - if coupling profiles or mullions are mentioned
- "reinforcement" - if reinforcement is mentioned
- "hardware" - if special hardware is mentioned
- "glass" - always include glass as a component
- "nailing_fins" - if nailing fins or installation flanges are mentioned
- Any other custom components mentioned in the order

Extract all construction items and return structured JSON.
For dimensions like "35.98x47.99 inch (914x1219 mm)", extract both inch and mm values.
Determine construction_type from the "System" field: "Window" = window, "Entrance" or "Door" = door, "Sliding" or "PSK" or "Lift" = sliding_door.
Look for quantity in "Number of constructions pcs:" or assume 1 if not specified.`
        },
        {
          role: 'user',
          content: `Extract all window and door constructions from this IT Okna CSV export. Return structured JSON with quote_number, customer_name, order_date, and an array of constructions. For each construction, include a "components" array listing all components that need ordering.\n\nCSV Content:\n${csvContent}`
        }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'extract_order_data',
            description: 'Extract structured order data from the IT Okna CSV',
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
                            component_type: { 
                              type: 'string',
                              description: 'Type of component: glass, blinds, screen, coupling_profile, reinforcement, hardware, nailing_fins, or custom type'
                            },
                            component_name: { 
                              type: 'string', 
                              nullable: true,
                              description: 'Specific name/model of the component if available'
                            },
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
        }
      ],
      tool_choice: { type: 'function', function: { name: 'extract_order_data' } }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI Gateway error:', response.status, errorText);
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    if (response.status === 402) {
      throw new Error('AI credits exhausted. Please add funds.');
    }
    throw new Error(`AI processing failed: ${response.status}`);
  }

  const data = await response.json();
  console.log('AI response:', JSON.stringify(data, null, 2));
  
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  
  if (!toolCall || !toolCall.function?.arguments) {
    throw new Error('Failed to extract data from CSV');
  }

  const extracted = JSON.parse(toolCall.function.arguments);
  console.log('Extracted data:', JSON.stringify(extracted, null, 2));
  
  // Add position_index to constructions and ensure components array exists
  const constructions = (extracted.constructions || []).map((c: any, index: number) => ({
    ...c,
    position_index: index,
    has_blinds: c.has_blinds || false,
    center_seal: c.center_seal || false,
    quantity: c.quantity || 1,
    components: c.components || [],
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
- quantity (how many of this exact configuration)

IMPORTANT: For each construction, also extract all COMPONENTS that need to be ordered separately:
- "blinds" - if the construction has blinds/shades
- "screen" or "flex_screen" or "deca_screen" - if screens are specified
- "coupling_profile" - if coupling profiles or mullions are mentioned
- "reinforcement" - if reinforcement is mentioned
- "hardware" - if special hardware is mentioned
- "glass" - always include glass as a component with specs
- "nailing_fins" - if nailing fins or installation flanges are mentioned
- Any other custom components mentioned (e.g., "extension profile", "sill", etc.)`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all window and door constructions from this order document. Return a JSON object with: quote_number, customer_name, order_date, and an array of constructions with all specifications. For each construction, include a "components" array listing all components that need ordering with their types, names, and quantities.'
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
                      quantity: { type: 'number' },
                      components: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            component_type: { 
                              type: 'string',
                              description: 'Type of component: glass, blinds, screen, coupling_profile, reinforcement, hardware, nailing_fins, or custom type'
                            },
                            component_name: { 
                              type: 'string', 
                              nullable: true,
                              description: 'Specific name/model of the component if available'
                            },
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
  
  // Add position_index to constructions and ensure components array exists
  const constructions = (extracted.constructions || []).map((c: any, index: number) => ({
    ...c,
    position_index: index,
    has_blinds: c.has_blinds || false,
    center_seal: c.center_seal || false,
    quantity: c.quantity || 1,
    components: c.components || [],
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

async function parseExcelWithAI(base64Content: string): Promise<ParsedOrder> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY is not configured');
  }

  console.log('Converting Excel to text for AI parsing...');

  // Decode base64 to binary
  const binaryString = atob(base64Content);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Extract text content from the Excel file
  // We'll extract readable text by looking for string patterns in the binary data
  let textContent = '';
  
  // Try to extract text from the binary - Excel files contain text in various encoding
  // Look for ASCII/UTF-8 readable sequences
  let currentString = '';
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    // Check if it's a printable ASCII character or common special chars
    if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13 || byte === 9) {
      currentString += String.fromCharCode(byte);
    } else if (currentString.length > 3) {
      // Only keep strings longer than 3 chars to filter noise
      textContent += currentString + '\n';
      currentString = '';
    } else {
      currentString = '';
    }
  }
  if (currentString.length > 3) {
    textContent += currentString;
  }

  // Clean up the extracted text
  textContent = textContent
    .split('\n')
    .filter(line => line.trim().length > 2)
    .filter(line => !/^[\x00-\x1F\x7F]+$/.test(line)) // Remove control character lines
    .join('\n');

  console.log('Extracted text content preview:', textContent.substring(0, 1000));

  // Now send the extracted text to AI for parsing, similar to CSV
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
          content: `You are an expert at extracting data from IT Okna window and door order exports.
The data comes from an Excel file and contains:
- Company info at the top
- Quote number and date (e.g., "Quote ? 1/1681 Date 11/26/2025")
- Customer name and phone
- Multiple "Construction ?" sections, each representing a window or door
- Each construction has: dimensions in inches and mm, room/location, model, system type, opening type, colors, glass specs, handle type, screen type, blinds info, and quantity

IMPORTANT: For each construction, extract all COMPONENTS that need to be ordered separately:
- "blinds" - if "Blinds By code" or blinds are mentioned in comments
- "screen" or "flex_screen" - if "Flex screen FlexView" or similar is specified
- "deca_screen" - if "Deca aluminum screen" is specified
- "coupling_profile" - if "Mull Kit" or coupling profiles are mentioned
- "sash_limiter" - if "Sash limiters By code" is mentioned
- "extension_profile" - if extension profiles are mentioned
- "reinforcement" - if reinforcement is mentioned
- "hardware" - if special hardware beyond standard handle is mentioned
- "glass" - always include glass as a component with full specs
- "nailing_fins" - if nailing fins or installation flanges are mentioned

Look for these patterns in the data:
- "Blinds By code" with quantity
- "Flex screen FlexView" or "Insect screen"
- "Mull Kit" comments about coupling
- "Sash limiters By code"
- Glass specifications like "3M Triple Pane" or "T3 Triple Tempered"

Extract all construction items and return structured JSON.`
        },
        {
          role: 'user',
          content: `Extract all window and door constructions from this IT Okna order data. Return a JSON object with: quote_number, customer_name, order_date, and an array of constructions with all specifications. For each construction, include a "components" array listing all components that need ordering (blinds, screens, coupling profiles, sash limiters, glass, etc.) with their types, names, and quantities.\n\nOrder Data:\n${textContent}`
        }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'extract_order_data',
            description: 'Extract structured order data from the IT Okna order data',
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
                            component_type: { 
                              type: 'string',
                              description: 'Type: glass, blinds, screen, flex_screen, deca_screen, coupling_profile, sash_limiter, extension_profile, reinforcement, hardware, nailing_fins, or custom'
                            },
                            component_name: { 
                              type: 'string', 
                              nullable: true,
                              description: 'Specific name/model of the component'
                            },
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
        }
      ],
      tool_choice: { type: 'function', function: { name: 'extract_order_data' } }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI Gateway error:', response.status, errorText);
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    if (response.status === 402) {
      throw new Error('AI credits exhausted. Please add funds.');
    }
    throw new Error(`AI processing failed: ${response.status}`);
  }

  const data = await response.json();
  console.log('AI Excel response:', JSON.stringify(data, null, 2));
  
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  
  if (!toolCall || !toolCall.function?.arguments) {
    throw new Error('Failed to extract data from Excel');
  }

  const extracted = JSON.parse(toolCall.function.arguments);
  console.log('Extracted Excel data:', JSON.stringify(extracted, null, 2));
  
  // Add position_index to constructions and ensure components array exists
  const constructions = (extracted.constructions || []).map((c: any, index: number) => ({
    ...c,
    position_index: index,
    has_blinds: c.has_blinds || false,
    center_seal: c.center_seal || false,
    quantity: c.quantity || 1,
    components: c.components || [],
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
    const lowerName = file_name?.toLowerCase() || '';
    
    if (file_type === 'csv' || lowerName.endsWith('.csv')) {
      // Decode base64 CSV content
      const csvContent = atob(file_content);
      result = await parseCSVWithAI(csvContent);
    } else if (file_type === 'excel' || lowerName.endsWith('.xls') || lowerName.endsWith('.xlsx')) {
      result = await parseExcelWithAI(file_content);
    } else if (file_type === 'pdf' || lowerName.endsWith('.pdf')) {
      result = await processPDFWithAI(file_content);
    } else {
      throw new Error('Unsupported file type. Please upload a CSV, PDF, or Excel file.');
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
