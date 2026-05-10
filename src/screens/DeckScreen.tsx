import * as MediaLibrary from 'expo-media-library';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmDeleteSheet } from '../components/ConfirmDeleteSheet';
import { HeaderBar } from '../components/HeaderBar';
import { SwipeDeck } from '../components/SwipeDeck';
import { useAssets } from '../hooks/useAssets';
import { useDecisions } from '../hooks/useDecisions';

const PREFETCH_AHEAD = 10;

export function DeckScreen() {
  const {
    assets,
    totalCount,
    hasNextPage,
    loading,
    error,
    permissionDenied,
    loadMore,
    reset: resetAssets,
  } = useAssets();
  const {
    pastDecidedIds,
    pendingDeleteIds,
    loaded: decisionsLoaded,
    pastDecidedCount,
    sessionProcessedCount,
    totalProcessedCount,
    canUndo,
    swipe,
    undo,
    reset: resetDecisions,
    commitSessionToPast,
  } = useDecisions();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const pastDecidedSet = useMemo(() => new Set(pastDecidedIds), [pastDecidedIds]);

  const visibleAssets = useMemo(
    () => assets.filter((a) => !pastDecidedSet.has(a.id)),
    [assets, pastDecidedSet]
  );

  const cursor = sessionProcessedCount;
  const remaining = visibleAssets.length - cursor;

  useEffect(() => {
    if (decisionsLoaded && hasNextPage && !loading && remaining < PREFETCH_AHEAD) {
      loadMore();
    }
  }, [decisionsLoaded, hasNextPage, loading, remaining, loadMore]);

  const pendingAssets = useMemo(
    () => assets.filter((a) => pendingDeleteIds.includes(a.id)),
    [assets, pendingDeleteIds]
  );

  const handleDeleted = () => {
    setConfirmOpen(false);
    commitSessionToPast();
    resetAssets();
  };

  const handleResetProgress = () => {
    Alert.alert(
      'Reset progress?',
      `This forgets all ${pastDecidedCount} past decisions and starts the deck from the newest item again. Your photos won’t be touched.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetDecisions();
            resetAssets();
          },
        },
      ]
    );
  };

  if (permissionDenied) {
    const requestAndRetry = async () => {
      await MediaLibrary.requestPermissionsAsync();
      resetAssets();
      loadMore();
    };
    return (
      <View style={styles.center}>
        <Text style={styles.permissionTitle}>Full photo access needed</Text>
        <Text style={styles.permissionBody}>
          PhotosCleaner can&apos;t read your library. If iOS Settings already shows Full
          Access, tap &quot;Re-request access&quot; below to refresh — that re-binds the
          permission inside the JS runtime.
        </Text>
        <Pressable style={styles.btn} onPress={requestAndRetry}>
          <Text style={styles.btnText}>Re-request access</Text>
        </Pressable>
        <Pressable style={styles.btnSecondary} onPress={() => Linking.openSettings()}>
          <Text style={styles.btnSecondaryText}>Open Settings</Text>
        </Pressable>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.btnSecondary} onPress={loadMore}>
          <Text style={styles.btnSecondaryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!decisionsLoaded || (assets.length === 0 && loading)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" />
        <Text style={styles.loadingText}>Loading your library…</Text>
      </View>
    );
  }

  if (assets.length === 0 && !loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>No photos or videos found.</Text>
      </View>
    );
  }

  if (visibleAssets.length === cursor && !hasNextPage && !loading) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <HeaderBar
          processed={totalProcessedCount}
          total={totalCount}
          pendingDeleteCount={pendingDeleteIds.length}
          canUndo={canUndo}
          onUndo={undo}
          onFinish={() => setConfirmOpen(true)}
        />
        <View style={styles.center}>
          <Text style={styles.permissionTitle}>All caught up</Text>
          <Text style={styles.permissionBody}>
            You&apos;ve reviewed every photo and video in your library.
            {pendingDeleteIds.length > 0
              ? ` Tap Finish to delete the ${pendingDeleteIds.length} marked item${
                  pendingDeleteIds.length === 1 ? '' : 's'
                }.`
              : ''}
          </Text>
          <Pressable style={styles.btnSecondary} onPress={handleResetProgress}>
            <Text style={styles.btnSecondaryText}>Reset progress</Text>
          </Pressable>
        </View>
        <ConfirmDeleteSheet
          visible={confirmOpen}
          pendingAssets={pendingAssets}
          onClose={() => setConfirmOpen(false)}
          onDeleted={handleDeleted}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <HeaderBar
        processed={totalProcessedCount}
        total={totalCount}
        pendingDeleteCount={pendingDeleteIds.length}
        canUndo={canUndo}
        onUndo={undo}
        onFinish={() => setConfirmOpen(true)}
      />
      {pastDecidedCount > 0 ? (
        <Pressable onPress={handleResetProgress} style={styles.resumeBanner}>
          <Text style={styles.resumeText}>
            Resuming after {pastDecidedCount} reviewed · tap to reset
          </Text>
        </Pressable>
      ) : null}
      <SwipeDeck assets={visibleAssets} cursor={cursor} onSwipe={swipe} />
      <View style={styles.legend}>
        <Text style={[styles.legendText, styles.legendDelete]}>← Delete</Text>
        <Text style={[styles.legendText, styles.legendKeep]}>Keep →</Text>
      </View>
      <ConfirmDeleteSheet
        visible={confirmOpen}
        pendingAssets={pendingAssets}
        onClose={() => setConfirmOpen(false)}
        onDeleted={handleDeleted}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#aaa',
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    color: '#f87171',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  permissionTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionBody: {
    color: '#bbb',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  btn: {
    paddingHorizontal: 22,
    paddingVertical: 14,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    marginBottom: 12,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  btnSecondary: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnSecondaryText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  resumeBanner: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: 'center',
  },
  resumeText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  legendText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  legendDelete: {
    color: '#f87171',
  },
  legendKeep: {
    color: '#34d399',
  },
});
