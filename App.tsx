import * as MediaLibrary from 'expo-media-library';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DeckScreen } from './src/screens/DeckScreen';
import { PermissionScreen } from './src/screens/PermissionScreen';

type PermissionUiStatus = 'loading' | 'granted' | 'limited' | 'denied' | 'undetermined';

function mapStatus(p: MediaLibrary.PermissionResponse | null): PermissionUiStatus {
  if (!p) return 'loading';
  if (p.accessPrivileges === 'all') return 'granted';
  if (p.accessPrivileges === 'limited') return 'limited';
  if (p.status === 'granted') return 'granted';
  if (p.status === 'undetermined' || p.canAskAgain) return 'undetermined';
  return 'denied';
}

export default function App() {
  const [permission, setPermission] = useState<MediaLibrary.PermissionResponse | null>(null);

  useEffect(() => {
    MediaLibrary.getPermissionsAsync().then(setPermission);
  }, []);

  const requestPermission = useCallback(async () => {
    const next = await MediaLibrary.requestPermissionsAsync();
    setPermission(next);
  }, []);

  const status = mapStatus(permission);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        {status === 'loading' ? (
          <View style={styles.loading}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : status === 'granted' ? (
          <DeckScreen />
        ) : (
          <PermissionScreen
            status={status === 'undetermined' ? 'undetermined' : status === 'limited' ? 'limited' : 'denied'}
            onRequest={requestPermission}
          />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  loading: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
