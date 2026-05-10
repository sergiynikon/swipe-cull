import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  status: 'undetermined' | 'limited' | 'denied';
  onRequest: () => void;
};

export function PermissionScreen({ status, onRequest }: Props) {
  const isBlocked = status === 'denied';
  const isLimited = status === 'limited';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PhotosCleaner</Text>
      <Text style={styles.body}>
        {isBlocked
          ? 'Photo library access is turned off. Open Settings to grant access to all photos.'
          : isLimited
            ? 'PhotosCleaner has limited access. Grant access to all photos so the deck shows your full library.'
            : 'PhotosCleaner needs access to your photo library to show items you can swipe through.'}
      </Text>
      {isBlocked || isLimited ? (
        <Pressable style={styles.btn} onPress={() => Linking.openSettings()}>
          <Text style={styles.btnText}>Open Settings</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.btn} onPress={onRequest}>
          <Text style={styles.btnText}>Grant access</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 16,
  },
  body: {
    color: '#bbb',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  btn: {
    paddingHorizontal: 22,
    paddingVertical: 14,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
