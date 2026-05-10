import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  processed: number;
  total: number;
  pendingDeleteCount: number;
  canUndo: boolean;
  onUndo: () => void;
  onFinish: () => void;
};

export function HeaderBar({
  processed,
  total,
  pendingDeleteCount,
  canUndo,
  onUndo,
  onFinish,
}: Props) {
  const finishDisabled = pendingDeleteCount === 0;
  return (
    <View style={styles.bar}>
      <Pressable
        onPress={onUndo}
        disabled={!canUndo}
        style={({ pressed }) => [
          styles.iconBtn,
          !canUndo && styles.iconBtnDisabled,
          pressed && canUndo && styles.iconBtnPressed,
        ]}
        accessibilityLabel="Undo last swipe"
      >
        <Text style={[styles.iconText, !canUndo && styles.iconTextDisabled]}>↶</Text>
      </Pressable>

      <View style={styles.center}>
        <Text style={styles.counterMain}>
          {processed} / {total}
        </Text>
        <Text style={styles.counterSub}>{pendingDeleteCount} marked to delete</Text>
      </View>

      <Pressable
        onPress={onFinish}
        disabled={finishDisabled}
        style={({ pressed }) => [
          styles.finishBtn,
          finishDisabled && styles.finishBtnDisabled,
          pressed && !finishDisabled && styles.finishBtnPressed,
        ]}
      >
        <Text
          style={[styles.finishText, finishDisabled && styles.finishTextDisabled]}
        >
          Finish
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#1f1f1f',
  },
  iconBtnDisabled: {
    opacity: 0.35,
  },
  iconBtnPressed: {
    backgroundColor: '#333',
  },
  iconText: {
    color: '#fff',
    fontSize: 24,
    lineHeight: 28,
  },
  iconTextDisabled: {
    color: '#888',
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  counterMain: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  counterSub: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 2,
  },
  finishBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f87171',
  },
  finishBtnDisabled: {
    backgroundColor: '#333',
  },
  finishBtnPressed: {
    backgroundColor: '#dc2626',
  },
  finishText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  finishTextDisabled: {
    color: '#888',
  },
});
