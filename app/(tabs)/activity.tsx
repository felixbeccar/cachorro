import { useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

import { fetchRecentWorkouts, HealthWorkout, initHealthKit, isHealthKitLinked } from '../../src/health/healthkit';
import { colors, radius, spacing } from '../../src/theme';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function ActivityScreen() {
  const [status, setStatus] = useState<'idle' | 'requesting' | 'ready' | 'error'>('idle');
  const [workouts, setWorkouts] = useState<HealthWorkout[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const linked = isHealthKitLinked();

  const loadWorkouts = useCallback(async () => {
    try {
      const results = await fetchRecentWorkouts(30);
      setWorkouts(results);
      setStatus('ready');
    } catch (e: any) {
      setErrorMessage(e?.message ?? 'Failed to load workouts');
      setStatus('error');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (linked && status === 'idle') {
        // Permissions were likely already granted in a previous session; try loading directly.
        loadWorkouts();
      }
    }, [linked, status, loadWorkouts])
  );

  async function handleConnect() {
    setStatus('requesting');
    try {
      await initHealthKit();
      await loadWorkouts();
    } catch (e: any) {
      setErrorMessage(e?.message ?? 'Could not connect to Apple Health');
      setStatus('error');
    }
  }

  if (!linked) {
    return (
      <View style={styles.center}>
        <Ionicons name="heart-outline" size={48} color={colors.textMuted} />
        <Text style={styles.notLinkedTitle}>Apple Health not connected</Text>
        <Text style={styles.notLinkedBody}>
          {Platform.OS === 'ios'
            ? 'HealthKit needs a custom dev-client build (not Expo Go). See the README for how to build it.'
            : 'Apple Health is only available on iOS.'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Activity</Text>
      <Text style={styles.subtitle}>Workouts from Apple Health, last 30 days</Text>

      {status === 'idle' && (
        <Pressable style={styles.connectButton} onPress={handleConnect}>
          <Text style={styles.connectButtonText}>Connect Apple Health</Text>
        </Pressable>
      )}

      {status === 'requesting' && <Text style={styles.emptyText}>Requesting access…</Text>}

      {status === 'error' && (
        <View>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable style={styles.connectButton} onPress={handleConnect}>
            <Text style={styles.connectButtonText}>Try again</Text>
          </Pressable>
        </View>
      )}

      {status === 'ready' && workouts.length === 0 && (
        <Text style={styles.emptyText}>No workouts found in Apple Health for the last 30 days.</Text>
      )}

      {status === 'ready' &&
        workouts.map((w) => (
          <View key={w.id} style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.activityName}>{w.activityName}</Text>
              <Text style={styles.activityDate}>{formatDate(w.start)}</Text>
            </View>
            <View style={styles.statsRow}>
              <Text style={styles.statText}>{w.durationMin} min</Text>
              {w.calories != null && <Text style={styles.statText}>{Math.round(w.calories)} kcal</Text>}
              {w.distanceKm != null && <Text style={styles.statText}>{w.distanceKm.toFixed(1)} km</Text>}
            </View>
          </View>
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
    marginBottom: spacing.lg,
  },
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  notLinkedTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  notLinkedBody: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  connectButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  connectButtonText: {
    color: colors.bg,
    fontSize: 15,
    fontWeight: '700',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  activityName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  activityDate: {
    color: colors.textMuted,
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  statText: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
