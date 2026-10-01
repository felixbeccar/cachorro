import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

import { getApiKey } from '../src/ai/apiKeyStore';
import {
  buildDataSignature,
  generateGymIntelligence,
  getCachedGymIntelligence,
  GymIntelligenceResult,
  setCachedGymIntelligence,
} from '../src/ai/gymIntelligence';
import { colors, radius, spacing } from '../src/theme';

type Status = 'checking' | 'no-key' | 'loading' | 'ready' | 'error' | 'empty';

function formatGeneratedAt(iso: string): string {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function GymIntelligenceCard() {
  const [status, setStatus] = useState<Status>('checking');
  const [result, setResult] = useState<GymIntelligenceResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const runningRef = useRef(false);

  const refresh = useCallback(async (force: boolean) => {
    if (runningRef.current) return;
    runningRef.current = true;
    try {
      const apiKey = await getApiKey();
      if (!apiKey) {
        setStatus('no-key');
        return;
      }

      const { signature, hasData } = await buildDataSignature();
      if (!hasData) {
        setStatus('empty');
        return;
      }

      const cached = getCachedGymIntelligence();
      if (!force && cached && cached.signature === signature) {
        setResult(cached.result);
        setStatus('ready');
        return;
      }

      setStatus('loading');
      const fresh = await generateGymIntelligence(apiKey);
      setCachedGymIntelligence({ signature, result: fresh });
      setResult(fresh);
      setStatus('ready');
    } catch (err: any) {
      setErrorMessage(err?.message ?? 'Could not generate your summary.');
      setStatus('error');
    } finally {
      runningRef.current = false;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh(false);
    }, [refresh])
  );

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles" size={16} color={colors.primary} />
          <Text style={styles.title}>Gym intelligence</Text>
        </View>
        {status === 'ready' && (
          <Pressable hitSlop={10} onPress={() => refresh(true)}>
            <Ionicons name="refresh" size={16} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {status === 'checking' && <Text style={styles.mutedText}>Loading…</Text>}

      {status === 'no-key' && (
        <Text style={styles.mutedText}>
          Add your Anthropic API key (tap the mic on Today's tab once) to get an AI summary of your last six
          weeks.
        </Text>
      )}

      {status === 'empty' && (
        <Text style={styles.mutedText}>Finish a few workouts and this'll start summarizing your progress.</Text>
      )}

      {status === 'loading' && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.mutedText}>Reviewing your last six weeks…</Text>
        </View>
      )}

      {status === 'error' && (
        <View>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable style={styles.retryButton} onPress={() => refresh(true)}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
        </View>
      )}

      {status === 'ready' && result && (
        <>
          <Text style={styles.summaryText}>{result.summary}</Text>
          {result.recommendations.map((rec, i) => (
            <View key={i} style={styles.recRow}>
              <Ionicons name="bulb-outline" size={14} color={colors.primary} style={styles.recIcon} />
              <Text style={styles.recText}>{rec}</Text>
            </View>
          ))}
          <Text style={styles.generatedAt}>Generated {formatGeneratedAt(result.generatedAt)}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  mutedText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  retryButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  retryButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  summaryText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: spacing.sm,
  },
  recRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  recIcon: {
    marginTop: 2,
  },
  recText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  generatedAt: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: spacing.xs,
  },
});
