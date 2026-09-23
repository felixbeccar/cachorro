import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

import { colors, radius, spacing } from '../src/theme';

interface Props {
  onFinalText: (text: string) => void;
  onTypeInstead: () => void;
  idleHint?: string;
}

/**
 * A mic button that starts native speech recognition the instant it's tapped — no intermediate
 * text box, no second tap on a keyboard mic icon. Say a set you just did, or an instruction like
 * "no legs today" / "make it a light session", and the final transcript is handed to the caller.
 */
export function VoiceCommandBar({
  onFinalText,
  onTypeInstead,
  idleHint = '"No legs today" · "3 sets of 12 at 15kg" · tap to talk',
}: Props) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [deniedPermission, setDeniedPermission] = useState(false);
  const submittedRef = useRef(false);

  useSpeechRecognitionEvent('start', () => {
    submittedRef.current = false;
    setListening(true);
  });

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript ?? '';
    setTranscript(text);
    if (event.isFinal && text.trim() && !submittedRef.current) {
      submittedRef.current = true;
      onFinalText(text.trim());
    }
  });

  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    // Fallback for a manual stop() before any isFinal result arrived.
    setTranscript((current) => {
      if (!submittedRef.current && current.trim()) {
        submittedRef.current = true;
        onFinalText(current.trim());
      }
      return '';
    });
  });

  useSpeechRecognitionEvent('error', (event) => {
    setListening(false);
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      setDeniedPermission(true);
    }
  });

  async function handlePress() {
    if (listening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }
    const perms = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perms.granted) {
      setDeniedPermission(true);
      return;
    }
    setTranscript('');
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: false,
    });
  }

  if (deniedPermission) {
    return (
      <Pressable style={styles.fallback} onPress={onTypeInstead}>
        <Ionicons name="mic-off-outline" size={16} color={colors.textMuted} />
        <Text style={styles.fallbackText}>Mic access denied — tap to type a command instead</Text>
      </Pressable>
    );
  }

  return (
    <Pressable style={[styles.bar, listening && styles.barListening]} onPress={handlePress}>
      <View style={[styles.micCircle, listening && styles.micCircleActive]}>
        <Ionicons name={listening ? 'radio-button-on' : 'mic'} size={18} color={listening ? colors.bg : colors.primary} />
      </View>
      <Text style={styles.barText} numberOfLines={1}>
        {listening ? transcript || 'Listening…' : idleHint}
      </Text>
      {listening && (
        <Text style={styles.stopHint}>tap to stop</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  barListening: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  micCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micCircleActive: {
    backgroundColor: colors.primary,
  },
  barText: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  stopHint: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  fallback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  fallbackText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 12,
  },
});
