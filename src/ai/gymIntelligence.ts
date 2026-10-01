import { getExerciseById } from '../data/exercises';
import { getAppState, getSessionDetail, listSessionsSince, setAppState } from '../db/queries';
import { fetchRecentWorkouts, isHealthKitLinked } from '../health/healthkit';
import { daysAgoISO } from '../logic/stats';

export interface GymIntelligenceResult {
  summary: string;
  recommendations: string[];
  generatedAt: string;
}

const MODEL = 'claude-haiku-4-5-20251001';
const TOOL_NAME = 'gym_intelligence_report';
const WINDOW_DAYS = 42;
const CACHE_STATE_KEY = 'gym-intelligence-cache';

const TOOL_SCHEMA = {
  name: TOOL_NAME,
  description: 'Summarizes someone\'s recent training log and gives a few concrete recommendations.',
  input_schema: {
    type: 'object',
    properties: {
      summary: {
        type: 'string',
        description:
          '2-4 sentence narrative covering how training has gone over this window: weights trending up or ' +
          'down on key lifts, consistency/frequency, balance across muscle groups, and overall activity ' +
          "level including any non-gym cardio or sports logged. Written directly to the person (\"you\"), " +
          'encouraging but honest — not generic.',
      },
      recommendations: {
        type: 'array',
        items: { type: 'string' },
        description:
          '2-4 short, specific, actionable recommendations grounded in the actual data (e.g. a plateaued ' +
          'lift, a neglected muscle group, inconsistent frequency, or a clear opportunity to progress). ' +
          'Avoid generic fitness advice not tied to what was actually logged.',
      },
    },
    required: ['summary', 'recommendations'],
  },
};

interface SessionForReport {
  date: string;
  exercises: { name: string; muscleGroups: string[]; sets: string; effort: string | null }[];
}

function buildSessionLines(sinceISO: string): SessionForReport[] {
  const sessions = listSessionsSince(sinceISO);
  return sessions.map((s) => {
    const detail = getSessionDetail(s.id);
    return {
      date: s.date,
      exercises: detail.map((d) => {
        const exercise = getExerciseById(d.exerciseId);
        const loggedSets = d.sets.filter((set) => set.weightKg != null || set.reps != null);
        return {
          name: exercise?.name ?? d.exerciseId,
          muscleGroups: exercise?.muscleGroups ?? [],
          sets:
            loggedSets.map((set) => `${set.weightKg ?? '-'}kg x ${set.reps ?? '-'}`).join(', ') ||
            'no sets logged',
          effort: d.effort,
        };
      }),
    };
  });
}

interface HealthActivityLine {
  activityName: string;
  date: string;
  durationMin: number;
}

async function buildHealthLines(days: number): Promise<HealthActivityLine[]> {
  if (!isHealthKitLinked()) return [];
  try {
    const workouts = await fetchRecentWorkouts(days);
    return workouts.map((w) => ({ activityName: w.activityName, date: w.start.slice(0, 10), durationMin: w.durationMin }));
  } catch {
    // Not connected / permission not granted yet — just report on gym data alone.
    return [];
  }
}

export interface DataSignature {
  signature: string;
  hasData: boolean;
}

/**
 * A cheap, local fingerprint of "what's changed" since the last report — used to skip a repeat
 * API call when nothing new has actually been logged (e.g. just switching tabs back and forth).
 */
export async function buildDataSignature(): Promise<DataSignature> {
  const sinceISO = daysAgoISO(WINDOW_DAYS);
  const sessions = listSessionsSince(sinceISO);
  const totalSets = sessions.reduce(
    (sum, s) => sum + getSessionDetail(s.id).reduce((n, d) => n + d.sets.length, 0),
    0
  );
  const health = await buildHealthLines(WINDOW_DAYS);
  const healthKey = health.map((h) => `${h.date}:${h.activityName}`).join('|');
  return {
    signature: `${sessions.length}:${sessions[0]?.id ?? ''}:${totalSets}:${health.length}:${healthKey}`,
    hasData: sessions.length > 0 || health.length > 0,
  };
}

export async function generateGymIntelligence(apiKey: string): Promise<GymIntelligenceResult> {
  const sinceISO = daysAgoISO(WINDOW_DAYS);
  const gymSessions = buildSessionLines(sinceISO);
  const otherActivity = await buildHealthLines(WINDOW_DAYS);

  const payload = { windowDays: WINDOW_DAYS, gymSessions, otherActivity };

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system:
        "You're a knowledgeable, encouraging strength coach reviewing someone's recent training log. " +
        `Below is their gym session history and other logged activity (padel, walking, pilates, etc.) for ` +
        `the last ${WINDOW_DAYS} days, as JSON. Call ${TOOL_NAME} with your analysis. If gymSessions is ` +
        "empty or very sparse, say so plainly rather than inventing detail. If otherActivity is empty, " +
        "don't bring up Apple Health or non-gym activity at all.",
      messages: [{ role: 'user', content: JSON.stringify(payload) }],
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
  if (!toolUseBlock?.input) {
    throw new Error("Didn't get a structured response back.");
  }

  return {
    summary: typeof toolUseBlock.input.summary === 'string' ? toolUseBlock.input.summary : '',
    recommendations: Array.isArray(toolUseBlock.input.recommendations) ? toolUseBlock.input.recommendations : [],
    generatedAt: new Date().toISOString(),
  };
}

interface CacheEntry {
  signature: string;
  result: GymIntelligenceResult;
}

export function getCachedGymIntelligence(): CacheEntry | null {
  const raw = getAppState(CACHE_STATE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CacheEntry;
  } catch {
    return null;
  }
}

export function setCachedGymIntelligence(entry: CacheEntry): void {
  setAppState(CACHE_STATE_KEY, JSON.stringify(entry));
}
