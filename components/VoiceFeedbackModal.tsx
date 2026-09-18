import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { setVoiceCommandFeedback } from '../src/db/queries';
import { colors, radius, spacing } from '../src/theme';
import { VoiceCommandFeedback, VoiceCommandLogRow } from '../src/types';

interface Props {
  visible: boolean;
  logs: VoiceCommandLogRow[];
  onClose: () => void;
}

const INTENT_LABEL: Record<string, string> = {
  log_sets: 'Logged a set',
  adjust_routine: 'Replanned session',
  unclear: "Didn't understand",
};

/**
 * Shown once, right after saving a session that used the voice command — a quick rating per
 * command used that day. Ratings + notes accumulate in voice_command_logs for later review
 * (see "Share voice command log" in Progress) to tighten parseVoiceCommand's system prompt.
 */
export function VoiceFeedbackModal({ visible, logs, onClose }: Props) {
  const [rated, setRated] = useState<Record<number, VoiceCommandFeedback>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [noteOpenFor, setNoteOpenFor] = useState<number | null>(null);

  function handleRate(id: number, feedback: VoiceCommandFeedback) {
    setRated((prev) => ({ ...prev, [id]: feedback }));
    setVoiceCommandFeedback(id, feedback, notes[id]?.trim() || null);
    if (feedback === 'down') {
      setNoteOpenFor(id);
    } else if (noteOpenFor === id) {
      setNoteOpenFor(null);
    }
  }

  function handleSaveNote(id: number) {
    const feedback = rated[id];
    if (!feedback) return;
    setVoiceCommandFeedback(id, feedback, notes[id]?.trim() || null);
    setNoteOpenFor(null);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>How were today's voice commands?</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={26} color={colors.text} />
          </Pressable>
        </View>
        <Text style={styles.hint}>Quick rating helps tighten what the voice command understands.</Text>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {logs.map((log) => {
            const feedback = rated[log.id];
            return (
              <View key={log.id} style={styles.card}>
                <Text style={styles.intentLabel}>{INTENT_LABEL[log.intent] ?? log.intent}</Text>
                <Text style={styles.transcript}>"{log.transcript}"</Text>
                <Text style={styles.summary}>{log.resultSummary}</Text>
                <View style={styles.ratingRow}>
                  <Pressable
                    style={[styles.ratingButton, feedback === 'up' && styles.ratingButtonActiveUp]}
                    onPress={() => handleRate(log.id, 'up')}
                  >
                    <Ionicons
                      name="thumbs-up"
                      size={16}
                      color={feedback === 'up' ? colors.success : colors.textMuted}
                    />
                  </Pressable>
                  <Pressable
                    style={[styles.ratingButton, feedback === 'down' && styles.ratingButtonActiveDown]}
                    onPress={() => handleRate(log.id, 'down')}
                  >
                    <Ionicons
                      name="thumbs-down"
                      size={16}
                      color={feedback === 'down' ? colors.danger : colors.textMuted}
                    />
                  </Pressable>
                </View>
                {noteOpenFor === log.id && (
                  <View style={styles.noteRow}>
                    <TextInput
                      style={styles.noteInput}
                      placeholder="What went wrong? (optional)"
                      placeholderTextColor={colors.textMuted}
                      value={notes[log.id] ?? ''}
                      onChangeText={(v) => setNotes((prev) => ({ ...prev, [log.id]: v }))}
                      onSubmitEditing={() => handleSaveNote(log.id)}
                      returnKeyType="done"
                    />
                    <Pressable onPress={() => handleSaveNote(log.id)} hitSlop={10}>
                      <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        <Pressable style={styles.doneButton} onPress={onClose}>
          <Text style={styles.doneButtonText}>Done</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginRight: spacing.md,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  intentLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  transcript: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  summary: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ratingButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  ratingButtonActiveUp: {
    backgroundColor: colors.successMuted,
    borderColor: colors.success,
  },
  ratingButtonActiveDown: {
    backgroundColor: 'rgba(248,113,113,0.15)',
    borderColor: colors.danger,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  noteInput: {
    flex: 1,
    backgroundColor: colors.cardAlt,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    fontSize: 13,
  },
  doneButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  doneButtonText: {
    color: colors.bg,
    fontSize: 15,
    fontWeight: '700',
  },
});
