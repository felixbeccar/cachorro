import { EXERCISES } from '../data/exercises';

export interface ParsedSet {
  reps: number | null;
  weightKg: number | null;
}

export interface ParsedWorkoutEntry {
  exerciseId: string | null;
  exerciseNameGuess: string;
  sets: ParsedSet[];
}

const MODEL = 'claude-haiku-4-5-20251001';

const TOOL_NAME = 'log_workout_entries';

const TOOL_SCHEMA = {
  name: TOOL_NAME,
  description: 'Structured workout entries parsed from the user’s spoken or typed description of what they just did.',
  input_schema: {
    type: 'object',
    properties: {
      entries: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            exerciseId: {
              type: ['string', 'null'],
              description: 'The id of the best-matching exercise from the provided catalog, or null if nothing matches well.',
            },
            exerciseNameGuess: {
              type: 'string',
              description: "The exercise name as the user described it, for display when exerciseId is null.",
            },
            sets: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  reps: { type: ['number', 'null'] },
                  weightKg: { type: ['number', 'null'] },
                },
                required: ['reps', 'weightKg'],
              },
            },
          },
          required: ['exerciseId', 'exerciseNameGuess', 'sets'],
        },
      },
    },
    required: ['entries'],
  },
};

function buildSystemPrompt(): string {
  const catalog = EXERCISES.map((e) => `${e.id}: ${e.name}`).join('\n');
  return `You parse a gym-goer's spoken or typed description of a workout into structured log entries.

Exercise catalog (id: name) — match to the closest id if there's a clear match, allowing for spoken
variations, synonyms, or minor mishearings. If nothing in the catalog is a good match, set exerciseId
to null and put your best guess of the exercise name in exerciseNameGuess instead.

${catalog}

Rules:
- One entry per distinct exercise mentioned, in the order mentioned.
- If the user gives a single weight/rep count for multiple sets (e.g. "3 sets of 12 at 15 kilos"),
  expand it into that many set entries, each with the same reps and weightKg.
- If weight isn't mentioned (bodyweight exercise, or just not said), use weightKg: null.
- If reps aren't mentioned for a set, use reps: null.
- Assume kilograms unless the user says otherwise (e.g. "lbs" or "pounds") — convert pounds to kg
  (1 lb = 0.453592 kg) and round to 1 decimal place.
- For time-based exercises (e.g. plank), put the held duration in seconds into the reps field.
- Always call the ${TOOL_NAME} tool with your result — never reply in plain text.`;
}

export async function parseWorkoutText(apiKey: string, text: string): Promise<ParsedWorkoutEntry[]> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1536,
      system: buildSystemPrompt(),
      messages: [{ role: 'user', content: text }],
      tools: [TOOL_SCHEMA],
      tool_choice: { type: 'tool', name: TOOL_NAME },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    if (response.status === 401) {
      throw new Error('That API key was rejected. Double-check it in console.anthropic.com.');
    }
    throw new Error(`Request failed (${response.status}): ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  const toolUseBlock = (data?.content ?? []).find((block: any) => block.type === 'tool_use');
  if (!toolUseBlock) {
    throw new Error("Didn't get a structured response back — try rephrasing.");
  }

  const entries = toolUseBlock.input?.entries;
  if (!Array.isArray(entries)) {
    throw new Error("Didn't get a structured response back — try rephrasing.");
  }

  return entries as ParsedWorkoutEntry[];
}
