import { Image } from 'expo-image';
import { useState } from 'react';
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

  const handleDelete = async () => {
    setWorking(true);
    try {
      const ok = await deleteAssets(pendingAssets.map((a) => a.id));
      if (ok) onDeleted();
      else onClose();
    } catch (e) {
      Alert.alert('Delete failed', e instanceof Error ? e.message : String(e));
      onClose();
    } finally {
      setWorking(false);
    }
  };

  const photoCount = pendingAssets.filter((a) => a.mediaType === 'photo').length;
  const videoCount = pendingAssets.filter((a) => a.mediaType === 'video').length;

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Delete {pendingAssets.length} items?</Text>
          <Text style={styles.subtitle}>
            {photoCount} photo{photoCount === 1 ? '' : 's'} · {videoCount} video
            {videoCount === 1 ? '' : 's'}
          </Text>

          <ScrollView contentContainerStyle={styles.grid}>
            {pendingAssets.map((asset) => (
              <View key={asset.id} style={styles.thumbWrapper}>
                <Image source={{ uri: asset.uri }} style={styles.thumb} contentFit="cover" />
                {asset.mediaType === 'video' ? (
                  <View style={styles.videoOverlay}>
                    <Text style={styles.videoOverlayText}>▶</Text>
                  </View>
                ) : null}
              </View>
            ))}
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
              disabled={working || pendingAssets.length === 0}
              style={({ pressed }) => [
                styles.btn,
                styles.deleteBtn,
                pressed && styles.btnPressed,
                (working || pendingAssets.length === 0) && styles.btnDisabled,
              ]}
            >
              {working ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.deleteText}>Delete {pendingAssets.length}</Text>
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
