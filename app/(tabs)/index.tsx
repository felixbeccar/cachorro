import { StyleSheet, View } from 'react-native';

import { WorkoutMode } from '../../components/WorkoutMode';
import { colors } from '../../src/theme';

export default function TodayScreen() {
  return (
    <View style={styles.container}>
      <WorkoutMode />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
