import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const MODELS = {
  gemini15Pro: 'gemini-2.0-flash',
  gemini15Flash: 'gemini-2.0-flash-lite',
};

const DEFAULT_MODEL = MODELS.gemini15Pro;

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
  aggregated_components: {
    component_type: string;
    component_name: string;
    total_quantity: number;
  }[];
  profile_info: {
    model: string | null;
    color_exterior: string | null;
    color_interior: string | null;
  } | null;
}

interface FieldDifference {
  field: string;
  constructionNumber?: string;
  gemini15ProValue: string | null;
  gemini15FlashValue: string | null;
}

interface ModelResult {
  model: string;
  data: ParsedOrder;
  processingTimeMs: number;
  error?: string;
}

interface ComparisonResult {
  gemini15Pro: ModelResult;
  gemini15Flash: ModelResult;
  comparison: {
    constructionCountMatch: boolean;
    componentCountMatch: boolean;
    differences: string[];
    fieldDifferences: FieldDifference[];
    gemini15ProStats: { constructions: number; components: number; filledFields: number };
    gemini15FlashStats: { constructions: number; components: number; filledFields: number };
  };
}

const extractionFunctionDeclaration = {
  name: 'extract_order_data',
  description: 'Extract structured order data from window/door manufacturing documents',
  parameters: {
    type: 'object',
    properties: {
      quote_number: { type: 'string', nullable: true, description: 'Quote or order number from the document' },
      customer_name: { type: 'string', nullable: true, description: 'Customer or client name' },
      order_date: { type: 'string', nullable: true, description: 'Order date in YYYY-MM-DD format' },
      constructions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            construction_number: { type: 'string', description: 'Unique ID like "1", "2", "W-01"' },
            construction_type: { type: 'string', enum: ['window', 'door', 'sliding_door'] },
            width_inches: { type: 'number', nullable: true },
            height_inches: { type: 'number', nullable: true },
            width_mm: { type: 'number', nullable: true },
            height_mm: { type: 'number', nullable: true },
            rough_opening: { type: 'string', nullable: true, description: 'Rough opening dimensions if specified' },
            location: { type: 'string', nullable: true, description: 'Installation location/room' },
            model: { type: 'string', nullable: true, description: 'Profile model/system name (e.g., DECA GEALAN LINEAR, S8000)' },
            opening_type: { type: 'string', nullable: true, description: 'How it opens (tilt-turn, casement, fixed, etc.)' },
            color_exterior: { type: 'string', nullable: true, description: 'Exact exterior color as shown' },
            color_interior: { type: 'string', nullable: true, description: 'Exact interior color as shown' },
            glass_type: { type: 'string', nullable: true, description: 'EXACT glass specification as shown (e.g., "3M Triple Pane Low-E Argon 366/180")' },
            screen_type: { type: 'string', nullable: true, description: 'Screen type - use EXACT value: "Flex screen FlexView" OR "DECA aluminum screen"' },
            handle_type: { type: 'string', nullable: true, description: 'Handle specification with color (e.g., "Std. handle black", "Premium handle white")' },
            has_blinds: { type: 'boolean', description: 'Whether blinds are included' },
            blinds_color: { type: 'string', nullable: true, description: 'EXACT blinds color (e.g., "Cream", "White", "Gray") - REQUIRED if has_blinds=true' },
            center_seal: { type: 'boolean', description: 'Whether center seal is present' },
            comments: { type: 'string', nullable: true, description: 'Any additional notes or comments' },
            quantity: { type: 'number', description: 'Number of this exact construction' },
            components: {
              type: 'array',
              description: 'Components that need ordering for this construction',
              items: {
                type: 'object',
                properties: {
                  component_type: {
                    type: 'string',
                    enum: ['glass', 'blinds', 'screens', 'hardware', 'nailing_fins', 'coupling_profile', 'profile'],
                    description: 'Type of component'
                  },
                  component_name: {
                    type: 'string',
                    nullable: true,
                    description: 'EXACT name/specification of component. For screens use "Flex screen FlexView" or "DECA aluminum screen". For blinds include color.'
                  },
                  quantity: { type: 'number', description: 'Quantity matching construction quantity' }
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
};

const SYSTEM_PROMPT = `You are a specialized AI for extracting window and door order data from IT Okna software exports and manufacturing documents.

## CRITICAL ACCURACY REQUIREMENTS

### 1. CONSTRUCTION TYPES
- "Window" / "Fenster" = window
- "Entrance" / "Door" / "Tür" = door
- "Sliding" / "PSK" / "Lift" / "Multi-slide" / "Smart-slide" = sliding_door

### 2. EXACT VALUE EXTRACTION (DO NOT PARAPHRASE)
Extract these fields EXACTLY as they appear in the document:
- **glass_type**: Copy the COMPLETE glass specification (e.g., "3M Triple Pane Low-E Argon 366/180", "T3 Triple Tempered Low-E")
- **handle_type**: Include type AND color (e.g., "Std. handle black", "Premium handle white", "Hoppe Atlanta black")
- **blinds_color**: Extract EXACT color name (e.g., "Cream", "White", "Gray", "Anthracite") - NEVER leave null if has_blinds=true
- **model**: Full profile system name (e.g., "DECA GEALAN LINEAR", "GEALAN S8000", "DECA 70")
- **color_exterior**: Exact color (e.g., "Black", "Anthracite Gray 7016", "White")
- **color_interior**: Exact color (e.g., "Black", "White", "Natural wood")

### 3. SCREEN TYPE STANDARDIZATION
Use ONLY these exact values for screen_type:
- "Flex screen FlexView" - for any flex/flexview screen
- "DECA aluminum screen" - for any deca/aluminum screen
- null - if no screen

### 4. COMPONENTS ARRAY (CRITICAL FOR ORDERING)
For EACH construction, populate the components array:

| If this field has value | Add component_type | component_name should be |
|------------------------|-------------------|--------------------------|  
| glass_type | "glass" | EXACT glass_type value |
| has_blinds = true | "blinds" | EXACT blinds_color (e.g., "Cream") |
| screen_type | "screens" | EXACT screen_type value |
| handle_type | "hardware" | EXACT handle_type value |
| nailing fins mentioned | "nailing_fins" | null |
| model (profile system) | "profile" | Format: "MODEL - exterior/interior" |

### 5. PROFILE COMPONENT (NEW - IMPORTANT)
Always add a "profile" component with:
- component_type: "profile"
- component_name: Format as "MODEL (exterior_color / interior_color)"
- Example: "DECA GEALAN LINEAR (Black / Black)"
- Example: "GEALAN S8000 (Anthracite Gray / White)"

### 6. QUANTITY MATCHING
- Each component's quantity MUST match its construction's quantity
- If construction.quantity = 2, then each component in that construction has quantity = 2

## EXAMPLE OUTPUT
For a construction with:
- glass: "3M Triple Pane Low-E Argon"
- blinds: Cream color
- screen: flex type
- handle: standard black
- profile: DECA LINEAR, black/black

Components array should be:
[
  {"component_type": "glass", "component_name": "3M Triple Pane Low-E Argon", "quantity": 1},
  {"component_type": "blinds", "component_name": "Cream", "quantity": 1},
  {"component_type": "screens", "component_name": "Flex screen FlexView", "quantity": 1},
  {"component_type": "hardware", "component_name": "Std. handle black", "quantity": 1},
  {"component_type": "profile", "component_name": "DECA GEALAN LINEAR (Black / Black)", "quantity": 1}
]

## CONSISTENCY RULES
1. Same component type + same specification = IDENTICAL component_name across ALL constructions
2. Never abbreviate or modify specifications
3. Never leave blinds_color null when has_blinds = true
4. Always include profile component for every construction`;

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

  const componentMap = new Map<string, { type: string; name: string; qty: number }>();

  for (const construction of constructions) {
    for (const component of construction.components) {
      const key = `${component.component_type}::${component.component_name || 'unnamed'}`;
      const existing = componentMap.get(key);
      if (existing) {
        existing.qty += (component.quantity || construction.quantity);
      } else {
        componentMap.set(key, {
          type: component.component_type,
          name: component.component_name || 'unnamed',
          qty: component.quantity || construction.quantity,
        });
      }
    }

    if (construction.components.length === 0) {
      if (construction.glass_type) {
        const key = `glass::${construction.glass_type}`;
        const existing = componentMap.get(key);
        if (existing) {
          existing.qty += construction.quantity;
        } else {
          componentMap.set(key, { type: 'glass', name: construction.glass_type, qty: construction.quantity });
        }
      }

      if (construction.has_blinds && construction.blinds_color) {
        const key = `blinds::${construction.blinds_color}`;
        const existing = componentMap.get(key);
        if (existing) {
          existing.qty += construction.quantity;
        } else {
          componentMap.set(key, { type: 'blinds', name: construction.blinds_color, qty: construction.quantity });
        }
      }

      if (construction.screen_type) {
        const screenName = construction.screen_type.toLowerCase().includes('flex')
          ? 'Flex screen FlexView'
          : 'DECA aluminum screen';
        const key = `screens::${screenName}`;
        const existing = componentMap.get(key);
        if (existing) {
          existing.qty += construction.quantity;
        } else {
          componentMap.set(key, { type: 'screens', name: screenName, qty: construction.quantity });
        }
      }

      if (construction.handle_type) {
        const key = `hardware::${construction.handle_type}`;
        const existing = componentMap.get(key);
        if (existing) {
          existing.qty += construction.quantity;
        } else {
          componentMap.set(key, { type: 'hardware', name: construction.handle_type, qty: construction.quantity });
        }
      }

      if (construction.model) {
        const profileName = `${construction.model} (${construction.color_exterior || 'N/A'} / ${construction.color_interior || 'N/A'})`;
        const key = `profile::${profileName}`;
        const existing = componentMap.get(key);
        if (existing) {
          existing.qty += construction.quantity;
        } else {
          componentMap.set(key, { type: 'profile', name: profileName, qty: construction.quantity });
        }
      }
    }
  }

  const aggregated_components = Array.from(componentMap.values()).map(c => ({
    component_type: c.type,
    component_name: c.name,
    total_quantity: c.qty,
  }));

  let profile_info = null;
  for (const c of constructions) {
    if (c.model || c.color_exterior || c.color_interior) {
      profile_info = {
        model: c.model,
        color_exterior: c.color_exterior,
        color_interior: c.color_interior,
      };
      break;
    }
  }

  return {
    quote_number: extracted.quote_number || null,
    customer_name: extracted.customer_name || null,
    order_date: extracted.order_date || null,
    constructions,
    windows_count,
    doors_count,
    sliding_doors_count,
    aggregated_components,
    profile_info,
  };
}

function countFilledFields(data: ParsedOrder): number {
  let count = 0;
  const fieldsToCheck = ['quote_number', 'customer_name', 'order_date'];

  for (const field of fieldsToCheck) {
    if ((data as any)[field]) count++;
  }

  for (const c of data.constructions) {
    const constructionFields = [
      'width_mm', 'height_mm', 'width_inches', 'height_inches',
      'model', 'opening_type', 'color_exterior', 'color_interior',
      'glass_type', 'screen_type', 'handle_type', 'blinds_color',
      'location', 'rough_opening', 'comments'
    ];
    for (const field of constructionFields) {
      if ((c as any)[field]) count++;
    }
  }

  return count;
}

function compareResults(result1: ParsedOrder, result2: ParsedOrder) {
  const differences: string[] = [];
  const fieldDifferences: FieldDifference[] = [];

  const formatValue = (val: any): string | null => {
    if (val === null || val === undefined) return null;
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (typeof val === 'number') return String(val);
    return String(val);
  };

  const orderFields = ['quote_number', 'customer_name', 'order_date'];
  for (const field of orderFields) {
    const val1 = (result1 as any)[field];
    const val2 = (result2 as any)[field];
    if (val1 !== val2) {
      fieldDifferences.push({
        field: field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        gemini15ProValue: formatValue(val1),
        gemini15FlashValue: formatValue(val2),
      });
    }
  }

  if (result1.constructions.length !== result2.constructions.length) {
    differences.push(`Construction count: Pro found ${result1.constructions.length}, Flash found ${result2.constructions.length}`);
  }

  if (result1.aggregated_components.length !== result2.aggregated_components.length) {
    differences.push(`Component types: Pro found ${result1.aggregated_components.length}, Flash found ${result2.aggregated_components.length}`);
  }

  if (result1.windows_count !== result2.windows_count) {
    fieldDifferences.push({
      field: 'Windows Count',
      gemini15ProValue: String(result1.windows_count),
      gemini15FlashValue: String(result2.windows_count),
    });
  }
  if (result1.doors_count !== result2.doors_count) {
    fieldDifferences.push({
      field: 'Doors Count',
      gemini15ProValue: String(result1.doors_count),
      gemini15FlashValue: String(result2.doors_count),
    });
  }
  if (result1.sliding_doors_count !== result2.sliding_doors_count) {
    fieldDifferences.push({
      field: 'Sliding Doors Count',
      gemini15ProValue: String(result1.sliding_doors_count),
      gemini15FlashValue: String(result2.sliding_doors_count),
    });
  }

  const constructionFields = [
    'construction_type', 'width_mm', 'height_mm', 'width_inches', 'height_inches',
    'model', 'opening_type', 'color_exterior', 'color_interior',
    'glass_type', 'screen_type', 'handle_type', 'has_blinds', 'blinds_color',
    'location', 'rough_opening', 'comments', 'quantity', 'center_seal'
  ];

  const constructions1Map = new Map(result1.constructions.map(c => [c.construction_number, c]));
  const constructions2Map = new Map(result2.constructions.map(c => [c.construction_number, c]));

  const allConstructionNumbers = new Set([
    ...result1.constructions.map(c => c.construction_number),
    ...result2.constructions.map(c => c.construction_number),
  ]);

  for (const cNum of allConstructionNumbers) {
    const c1 = constructions1Map.get(cNum);
    const c2 = constructions2Map.get(cNum);

    if (!c1 && c2) {
      fieldDifferences.push({
        field: 'Construction',
        constructionNumber: cNum,
        gemini15ProValue: null,
        gemini15FlashValue: `Found (${c2.construction_type})`,
      });
      continue;
    }

    if (c1 && !c2) {
      fieldDifferences.push({
        field: 'Construction',
        constructionNumber: cNum,
        gemini15ProValue: `Found (${c1.construction_type})`,
        gemini15FlashValue: null,
      });
      continue;
    }

    if (c1 && c2) {
      for (const field of constructionFields) {
        const val1 = (c1 as any)[field];
        const val2 = (c2 as any)[field];
        if (val1 !== val2) {
          fieldDifferences.push({
            field: field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            constructionNumber: cNum,
            gemini15ProValue: formatValue(val1),
            gemini15FlashValue: formatValue(val2),
          });
        }
      }
    }
  }

  if (fieldDifferences.length > 0) {
    const constructionDiffs = fieldDifferences.filter(d => d.constructionNumber);
    const orderDiffs = fieldDifferences.filter(d => !d.constructionNumber);

    if (orderDiffs.length > 0) {
      differences.push(`${orderDiffs.length} order-level field differences`);
    }
    if (constructionDiffs.length > 0) {
      differences.push(`${constructionDiffs.length} construction-level field differences`);
    }
  }

  return {
    constructionCountMatch: result1.constructions.length === result2.constructions.length,
    componentCountMatch: result1.aggregated_components.length === result2.aggregated_components.length,
    differences,
    fieldDifferences,
    gemini15ProStats: {
      constructions: result1.constructions.length,
      components: result1.aggregated_components.length,
      filledFields: countFilledFields(result1),
    },
    gemini15FlashStats: {
      constructions: result2.constructions.length,
      components: result2.aggregated_components.length,
      filledFields: countFilledFields(result2),
    },
  };
}

async function extractWithModel(model: string, textContent: string, contentType: 'csv' | 'pdf' | 'excel', base64Content?: string): Promise<ModelResult> {
  const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
  
  if (!GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY is not configured");
  }

  const startTime = Date.now();
  console.log(`Extracting with ${model}...`);

  try {
    let parts: any[];

    if (contentType === 'pdf' && base64Content) {
      parts = [
        {
          text: `${SYSTEM_PROMPT}\n\nExtract all constructions and their components from this order document. Pay special attention to extracting EXACT specifications for glass, blinds, screens, hardware, and profile.`
        },
        {
          inline_data: {
            mime_type: 'application/pdf',
            data: base64Content
          }
        }
      ];
    } else {
      parts = [
        {
          text: `${SYSTEM_PROMPT}\n\nExtract all constructions and their components from this order document. Pay special attention to extracting EXACT specifications for glass, blinds, screens, hardware, and profile.\n\n${textContent}`
        }
      ];
    }

    const requestBody = {
      contents: [{ parts }],
      tools: [{
        function_declarations: [extractionFunctionDeclaration]
      }],
      tool_config: {
        function_calling_config: {
          mode: 'ANY',
          allowed_function_names: ['extract_order_data']
        }
      }
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google AI error for ${model}:`, response.status, errorText);
      throw new Error(`AI processing failed: ${response.status}`);
    }

    const data = await response.json();
    const functionCall = data.candidates?.[0]?.content?.parts?.[0]?.functionCall;

    if (!functionCall?.args) {
      console.error('No function call in response:', JSON.stringify(data, null, 2));
      throw new Error('Failed to extract data - no function call returned');
    }

    const extracted = functionCall.args;
    const processingTimeMs = Date.now() - startTime;

    console.log(`${model} completed in ${processingTimeMs}ms`);

    return {
      model,
      data: processExtractedData(extracted),
      processingTimeMs,
    };
  } catch (error) {
    const processingTimeMs = Date.now() - startTime;
    console.error(`Error with ${model}:`, error);
    return {
      model,
      data: {
        quote_number: null,
        customer_name: null,
        order_date: null,
        constructions: [],
        windows_count: 0,
        doors_count: 0,
        sliding_doors_count: 0,
        aggregated_components: [],
        profile_info: null,
      },
      processingTimeMs,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function parseCSVWithAI(csvContent: string, model: string = DEFAULT_MODEL): Promise<ParsedOrder> {
  console.log(`Parsing CSV with ${model}...`);
  const result = await extractWithModel(model, csvContent, 'csv');
  if (result.error) throw new Error(result.error);
  return result.data;
}

async function processPDFWithAI(base64Content: string, model: string = DEFAULT_MODEL): Promise<ParsedOrder> {
  console.log(`Processing PDF with ${model}...`);
  const result = await extractWithModel(model, '', 'pdf', base64Content);
  if (result.error) throw new Error(result.error);
  return result.data;
}

async function parseExcelWithAI(base64Content: string, model: string = DEFAULT_MODEL): Promise<ParsedOrder> {
  console.log('Converting Excel to text...');

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

  const result = await extractWithModel(model, textContent, 'excel');
  if (result.error) throw new Error(result.error);
  return result.data;
}

async function runComparison(
  fileContent: string,
  fileType: 'csv' | 'pdf' | 'excel',
  base64Content: string
): Promise<ComparisonResult> {
  console.log('Running model comparison...');

  let content = '';
  if (fileType === 'csv') {
    content = atob(base64Content);
  } else if (fileType === 'excel') {
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    let currentString = '';
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13 || byte === 9) {
        currentString += String.fromCharCode(byte);
      } else if (currentString.length > 3) {
        content += currentString + '\n';
        currentString = '';
      } else {
        currentString = '';
      }
    }
    if (currentString.length > 3) {
      content += currentString;
    }
    content = content
      .split('\n')
      .filter(line => line.trim().length > 2)
      .filter(line => !/^[\x00-\x1F\x7F]+$/.test(line))
      .join('\n');
  }

  const [resultPro, resultFlash] = await Promise.all([
    extractWithModel(MODELS.gemini15Pro, content, fileType, fileType === 'pdf' ? base64Content : undefined),
    extractWithModel(MODELS.gemini15Flash, content, fileType, fileType === 'pdf' ? base64Content : undefined),
  ]);

  const comparison = compareResults(resultPro.data, resultFlash.data);

  console.log('Comparison complete:');
  console.log(`  Gemini 1.5 Pro: ${resultPro.processingTimeMs}ms, ${resultPro.data.constructions.length} constructions`);
  console.log(`  Gemini 1.5 Flash: ${resultFlash.processingTimeMs}ms, ${resultFlash.data.constructions.length} constructions`);
  console.log(`  Differences: ${comparison.differences.length}`);

  return {
    gemini15Pro: resultPro,
    gemini15Flash: resultFlash,
    comparison,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    const { file_content, file_type, file_name, compare_models } = await req.json();
    console.log(`Processing ${file_type} file: ${file_name}${compare_models ? ' (COMPARISON MODE)' : ''}`);

    if (compare_models) {
      const comparisonResult = await runComparison(file_content, file_type, file_content);
      return new Response(JSON.stringify(comparisonResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    console.log(`Extracted ${result.constructions.length} constructions, ${result.aggregated_components.length} unique components`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
