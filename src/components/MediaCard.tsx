import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { CleanerAsset, getPlayableVideoUri, getVideoThumbnail } from '../lib/media';

type Props = { asset: CleanerAsset };

type VideoLoadState = 'idle' | 'loading' | 'loaded' | 'failed';

export function MediaCard({ asset }: Props) {
  const [videoThumb, setVideoThumb] = useState<string | null>(null);
  const [thumbLoading, setThumbLoading] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoLoadState, setVideoLoadState] = useState<VideoLoadState>('idle');
  const [showSlowMessage, setShowSlowMessage] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const [playMode, setPlayMode] = useState<'direct' | 'copy'>('direct');

  const isVideo = asset.mediaType === 'video';

  useEffect(() => {
    if (!isVideo) return;
    let cancelled = false;
    setThumbLoading(true);
    getVideoThumbnail(asset).then((uri) => {
      if (!cancelled) {
        setVideoThumb(uri);
        setThumbLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [asset, isVideo]);

  useEffect(() => {
    if (!isVideo || !showPlayer) return;
    let cancelled = false;
    setVideoLoadState('loading');
    getPlayableVideoUri(asset, { copyToSandbox: playMode === 'copy' }).then((uri) => {
      if (cancelled) return;
      if (uri) {
        setVideoUri(uri);
        setVideoLoadState('loaded');
      } else {
        setVideoLoadState('failed');
      }
    });
    return () => {
      cancelled = true;
    };
    // videoLoadState intentionally omitted from deps — see notes in commit history.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset, isVideo, showPlayer, retryNonce, playMode]);

  useEffect(() => {
    if (videoLoadState !== 'loading') {
      setShowSlowMessage(false);
      return;
    }
    const t = setTimeout(() => setShowSlowMessage(true), 2500);
    return () => clearTimeout(t);
  }, [videoLoadState]);

  const handleCardPress = () => {
    if (isVideo && !showPlayer) setShowPlayer(true);
  };

  const handleRetry = () => {
    setVideoUri(null);
    setPlayMode('direct');
    setRetryNonce((n) => n + 1);
  };

  const handlePlayerError = () => {
    if (playMode === 'direct') {
      console.log('[PhotosCleaner] direct play failed, retrying via sandbox copy');
      setVideoUri(null);
      setPlayMode('copy');
    } else {
      setVideoLoadState('failed');
    }
  };

  const displayUri = isVideo ? videoThumb : asset.uri;
  const playerActive = isVideo && showPlayer && videoLoadState === 'loaded' && videoUri;
  const playerLoading = isVideo && showPlayer && videoLoadState === 'loading';
  const playerFailed = isVideo && showPlayer && videoLoadState === 'failed';

  return (
    <Pressable style={styles.card} onPress={handleCardPress}>
      {playerActive ? (
        <VideoPlaybackView uri={videoUri} onError={handlePlayerError} />
      ) : displayUri ? (
        <Image
          source={{ uri: displayUri }}
          style={styles.image}
          contentFit="contain"
          transition={120}
          cachePolicy="memory"
        />
      ) : (
        <View style={styles.placeholder}>
          {thumbLoading ? (
            <ActivityIndicator color="#fff" />
          ) : isVideo ? (
            <Text style={styles.placeholderGlyph}>🎬</Text>
          ) : null}
        </View>
      )}

      {isVideo && !showPlayer ? (
        <View style={styles.playOverlay} pointerEvents="none">
          <View style={styles.playButton}>
            <Text style={styles.playButtonGlyph}>▶</Text>
          </View>
        </View>
      ) : null}

      {playerLoading ? (
        <View style={styles.statusOverlay} pointerEvents="none">
          <ActivityIndicator color="#fff" />
          {showSlowMessage ? (
            <Text style={styles.statusText}>Still loading…</Text>
          ) : null}
        </View>
      ) : null}

      {playerFailed ? (
        <View style={styles.statusOverlay}>
          <Text style={styles.statusTitle}>Couldn&apos;t load video</Text>
          <Text style={styles.statusBody}>
            Expo Go couldn&apos;t open this file even after copying it locally. Likely an
            iCloud or sandbox limitation. Just swipe to skip — a development build would
            handle this.
          </Text>
          <Pressable style={styles.retryBtn} onPress={handleRetry} hitSlop={10}>
            <Text style={styles.retryBtnText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {isVideo && !showPlayer ? (
        <View style={styles.videoBadge} pointerEvents="none">
          <Text style={styles.videoBadgeText}>{formatDuration(asset.duration)}</Text>
        </View>
      ) : null}

      <View style={styles.metaBar} pointerEvents="none">
        <Text style={styles.metaText} numberOfLines={1}>
          {asset.filename}
        </Text>
        <Text style={styles.metaText}>{formatDate(asset.creationTime)}</Text>
      </View>
    </Pressable>
  );
}

function VideoPlaybackView({ uri, onError }: { uri: string; onError: () => void }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = false;
    p.play();
  });
  const [hasEnded, setHasEnded] = useState(false);

  useEffect(() => {
    const statusSub = player.addListener('statusChange', (event) => {
      console.log(
        '[PhotosCleaner] player status',
        event.status,
        event.error ? `error: ${event.error.message}` : ''
      );
      if (event.status === 'error') {
        onError();
      }
    });
    const endSub = player.addListener('playToEnd', () => {
      setHasEnded(true);
    });
    return () => {
      statusSub.remove();
      endSub.remove();
    };
  }, [player, onError]);

  const handleTap = () => {
    if (hasEnded) {
      player.replay();
      setHasEnded(false);
      return;
    }
    if (player.playing) player.pause();
    else player.play();
  };

  return (
    <Pressable style={styles.image} onPress={handleTap}>
      <VideoView
        player={player}
        style={styles.image}
        contentFit="contain"
        nativeControls={false}
        allowsPictureInPicture={false}
      />
      {hasEnded ? (
        <View style={styles.playOverlay} pointerEvents="none">
          <View style={styles.playButton}>
            <Text style={styles.replayGlyph}>↻</Text>
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(timestampMs: number): string {
  if (!timestampMs) return '';
  const d = new Date(timestampMs);
  return d.toLocaleDateString();
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    borderRadius: 16,
    overflow: 'hidden',
  },
  image: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderGlyph: {
    fontSize: 48,
    opacity: 0.4,
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonGlyph: {
    color: '#fff',
    fontSize: 30,
    marginLeft: 4,
  },
  replayGlyph: {
    color: '#fff',
    fontSize: 38,
    fontWeight: '600',
  },
  statusOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  statusText: {
    color: '#ddd',
    fontSize: 14,
    marginTop: 12,
  },
  statusTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  statusBody: {
    color: '#bbb',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  retryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#3b82f6',
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  videoBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
  },
  videoBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  metaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    color: '#fff',
    fontSize: 12,
    flexShrink: 1,
  },
});
