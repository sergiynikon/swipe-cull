import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { CleanerAsset, deleteAssets } from '../lib/media';

type Props = {
  visible: boolean;
  pendingAssets: CleanerAsset[];
  onClose: () => void;
  onDeleted: () => void;
};

export function ConfirmDeleteSheet({ visible, pendingAssets, onClose, onDeleted }: Props) {
  const [working, setWorking] = useState(false);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!visible) {
      setExcludedIds(new Set());
    }
  }, [visible]);

  const toggleExclude = (id: string) => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedAssets = useMemo(
    () => pendingAssets.filter((a) => !excludedIds.has(a.id)),
    [pendingAssets, excludedIds]
  );

  const handleDelete = async () => {
    if (selectedAssets.length === 0) return;
    setWorking(true);
    try {
      const ok = await deleteAssets(selectedAssets.map((a) => a.id));
      if (ok) onDeleted();
      else onClose();
    } catch (e) {
      Alert.alert('Delete failed', e instanceof Error ? e.message : String(e));
      onClose();
    } finally {
      setWorking(false);
    }
  };

  const photoCount = selectedAssets.filter((a) => a.mediaType === 'photo').length;
  const videoCount = selectedAssets.filter((a) => a.mediaType === 'video').length;
  const keptCount = excludedIds.size;
  const deleteDisabled = working || selectedAssets.length === 0;

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>
            Delete {selectedAssets.length} item{selectedAssets.length === 1 ? '' : 's'}?
          </Text>
          <Text style={styles.subtitle}>
            {photoCount} photo{photoCount === 1 ? '' : 's'} · {videoCount} video
            {videoCount === 1 ? '' : 's'}
            {keptCount > 0 ? ` · ${keptCount} kept` : ''}
          </Text>
          <Text style={styles.hint}>Tap an item to spare it from deletion.</Text>

          <ScrollView contentContainerStyle={styles.grid}>
            {pendingAssets.map((asset) => {
              const isExcluded = excludedIds.has(asset.id);
              return (
                <Pressable
                  key={asset.id}
                  onPress={() => toggleExclude(asset.id)}
                  style={({ pressed }) => [
                    styles.thumbWrapper,
                    pressed && styles.thumbPressed,
                  ]}
                >
                  <Image source={{ uri: asset.uri }} style={styles.thumb} contentFit="cover" />
                  {asset.mediaType === 'video' && !isExcluded ? (
                    <View style={styles.videoOverlay} pointerEvents="none">
                      <Text style={styles.videoOverlayText}>▶</Text>
                    </View>
                  ) : null}
                  {isExcluded ? (
                    <View style={styles.excludedOverlay} pointerEvents="none">
                      <Text style={styles.excludedBadge}>✓</Text>
                      <Text style={styles.excludedLabel}>KEEP</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              disabled={working}
              style={({ pressed }) => [
                styles.btn,
                styles.cancelBtn,
                pressed && styles.btnPressed,
              ]}
            >
              <Text style={styles.cancelText}>Keep reviewing</Text>
            </Pressable>
            <Pressable
              onPress={handleDelete}
              disabled={deleteDisabled}
              style={({ pressed }) => [
                styles.btn,
                styles.deleteBtn,
                pressed && !deleteDisabled && styles.btnPressed,
                deleteDisabled && styles.btnDisabled,
              ]}
            >
              {working ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.deleteText}>
                  {selectedAssets.length === 0
                    ? 'Nothing selected'
                    : `Delete ${selectedAssets.length}`}
                </Text>
              )}
            </Pressable>
          </View>
          <Text style={styles.note}>iOS will ask you to confirm before items are removed.</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 30,
    maxHeight: '85%',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 4,
  },
  hint: {
    color: '#7d7d7d',
    fontSize: 12,
    marginTop: 6,
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingBottom: 12,
  },
  thumbWrapper: {
    width: 78,
    height: 78,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#222',
  },
  thumbPressed: {
    opacity: 0.85,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  videoOverlayText: {
    color: '#fff',
    fontSize: 22,
  },
  excludedOverlay: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 64, 32, 0.78)',
    borderWidth: 2,
    borderColor: '#34d399',
    borderRadius: 8,
  },
  excludedBadge: {
    color: '#34d399',
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '900',
  },
  excludedLabel: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.85,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  cancelBtn: {
    backgroundColor: '#262626',
  },
  cancelText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  deleteBtn: {
    backgroundColor: '#dc2626',
  },
  deleteText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  note: {
    color: '#777',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
});
