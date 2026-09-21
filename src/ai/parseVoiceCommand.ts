import { EXERCISES } from '../data/exercises';
import { MUSCLE_GROUPS, MUSCLE_GROUP_LABEL } from '../types';

export interface ParsedSet {
  reps: number | null;
  weightKg: number | null;
}

export interface ParsedLogEntry {
  exerciseId: string | null;
  exerciseNameGuess: string;
  sets: ParsedSet[];
}

export interface ParsedVoiceCommand {
  intent: 'log_sets' | 'adjust_routine' | 'unclear';
  logEntries: ParsedLogEntry[];
  excludeMuscleGroups: string[];
  setsOverride: number | null;
  targetMinutes: number | null;
  summary: string;
}

const MODEL = 'claude-haiku-4-5-20251001';

const TOOL_NAME = 'handle_voice_command';

const TOOL_SCHEMA = {
  name: TOOL_NAME,
  description: "Classifies and structures what a gym-goer said into today's workout app.",
  input_schema: {
    type: 'object',
    properties: {
      intent: {
        type: 'string',
        enum: ['log_sets', 'adjust_routine', 'unclear'],
        description:
          "'log_sets' when they're reporting what they just did (weights/reps for an exercise). " +
          "'adjust_routine' when they're asking to change today's plan before or during the session " +
          '(feeling tired, an injury, wanting it shorter/lighter/harder, skipping a muscle group). ' +
          "'unclear' if it's neither or too vague to act on.",
      },
      logEntries: {
        type: 'array',
        description: 'Only for intent=log_sets. One entry per distinct exercise mentioned, in the order mentioned.',
        items: {
          type: 'object',
          properties: {
            exerciseId: {
              type: ['string', 'null'],
              description: 'The id of the best-matching exercise from the catalog, or null if nothing matches well.',
            },
            exerciseNameGuess: { type: 'string' },
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
      excludeMuscleGroups: {
        type: 'array',
        description:
          'Only for intent=adjust_routine. Muscle group ids to leave out of today\'s routine entirely ' +
          '(e.g. an injury or soreness there). Empty if nothing should be excluded.',
        items: { type: 'string', enum: MUSCLE_GROUPS },
      },
      setsOverride: {
        type: ['number', 'null'],
        description:
          'Only for intent=adjust_routine. A new number of sets per exercise for the whole session ' +
          '(e.g. 2 for "light"/"tired"/"short on time", 4 for "go hard"). Null to leave sets as they are.',
      },
      targetMinutes: {
        type: ['number', 'null'],
        description:
          'Only for intent=adjust_routine, and only when they gave an explicit session length ' +
          '("45 minutes", "half an hour", "plan 45\'"). The routine will be padded with extra exercises ' +
          'in the included muscle groups to fill this time — important when they also narrowed to just ' +
          'one or two groups (e.g. "legs and core, 45 minutes" needs several leg/core exercises, not one ' +
          'of each). Null if no duration was mentioned.',
      },
      summary: {
        type: 'string',
        description:
          'One short, friendly sentence confirming what you understood and are about to do ' +
          '(e.g. "Skipping legs and glutes, 2 sets per exercise today." or "Logged 3 sets of squats.").',
      },
    },
    required: ['intent', 'logEntries', 'excludeMuscleGroups', 'setsOverride', 'targetMinutes', 'summary'],
  },
};

function buildSystemPrompt(): string {
  const catalog = EXERCISES.map((e) => `${e.id}: ${e.name}`).join('\n');
  const groups = MUSCLE_GROUPS.map((g) => `${g}: ${MUSCLE_GROUP_LABEL[g]}`).join(', ');
  return `You're the voice control for a gym app. The user just spoke or typed one thing, mid- or pre-workout.
Decide what they want and call ${TOOL_NAME} with the result — never reply in plain text.

Two things they might mean:

1. Reporting a set they just did ("Bulgarian split squat, 3 sets of 12 at 15 kilos") → intent=log_sets.
   Match each exercise mentioned to the closest id below, allowing for spoken variations, synonyms, or
   minor mishearings. If nothing is a good match, set exerciseId to null and put your best guess of the
   name in exerciseNameGuess instead. If a single weight/rep count covers multiple sets, expand it into
   that many set entries. Assume kilograms unless they say otherwise (convert lbs: 1 lb = 0.453592 kg,
   round to 1 decimal). If reps or weight aren't mentioned, use null for that field.

Exercise catalog (id: name):
${catalog}

2. Asking to change today's plan ("I'm wiped, make it light", "no legs today, my knee hurts", "skip
   shoulders", "legs and core, 45 minutes", "give me a harder session") → intent=adjust_routine.
   Muscle groups (id: label): ${groups}
   - If they named the groups they DO want (e.g. "legs and core today"), set excludeMuscleGroups to every
     OTHER group — everything not named gets excluded. If they named a group to skip (e.g. "no legs"), just
     exclude that one (plus any group sharing the same movements, per the injury rule below).
   - Exception: legs and glutes are trained together in practice and the exercise catalog reflects that —
     don't exclude one just because only the other was named (e.g. "just legs today" keeps glutes in too).
     Only exclude one without the other if they're clearly distinguishing between the two (e.g. "legs but
     not glutes", or an injury specific to one).
   - An injury or pain mention means excluding that group AND any group that shares a lot of the same
     movements (e.g. knee/leg pain → legs and glutes).
   - Map tiredness/soreness/short-on-time language to a lower setsOverride (2), and "go hard"/"more
     intense" language to a higher one (4). Leave setsOverride null if they didn't say anything about
     volume/intensity.
   - If they gave an explicit session length ("45 minutes", "half an hour", "plan 45'"), set
     targetMinutes to that many minutes — this matters most when they've also narrowed to one or two
     groups, since without it the routine would only pick one exercise per group and fall way short of
     the requested time. Leave targetMinutes null if no duration was mentioned.

Speech-to-text mishears things. If a word doesn't match any muscle group or exercise but sounds close to
one and the rest of the sentence is clearly a workout instruction (e.g. "legs and cold" when talking about
today's session — "cold" isn't a muscle group but sounds like "core"), infer the intended word rather than
returning unclear. Only use intent=unclear when nothing in the message reasonably maps to logging a set or
adjusting the routine, even allowing for mishearings.

If what they said doesn't clearly fit either case, use intent=unclear with empty logEntries/excludeMuscleGroups,
setsOverride=null, targetMinutes=null, and a summary explaining you didn't catch a usable instruction.`;
}

export async function parseVoiceCommand(apiKey: string, text: string): Promise<ParsedVoiceCommand> {
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

  const input = toolUseBlock.input;
  if (!input || typeof input.intent !== 'string') {
    throw new Error("Didn't get a structured response back — try rephrasing.");
  }

  return {
    intent: input.intent,
    logEntries: Array.isArray(input.logEntries) ? input.logEntries : [],
    excludeMuscleGroups: Array.isArray(input.excludeMuscleGroups) ? input.excludeMuscleGroups : [],
    setsOverride: typeof input.setsOverride === 'number' ? input.setsOverride : null,
    targetMinutes: typeof input.targetMinutes === 'number' ? input.targetMinutes : null,
    summary: typeof input.summary === 'string' ? input.summary : '',
  };
}
