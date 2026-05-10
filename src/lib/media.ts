import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as VideoThumbnails from 'expo-video-thumbnails';

export type CleanerAsset = MediaLibrary.Asset;

export type AssetPage = {
  assets: CleanerAsset[];
  endCursor: string;
  hasNextPage: boolean;
  totalCount: number;
};

export const PAGE_SIZE = 50;

export async function requestPermissions(): Promise<MediaLibrary.PermissionResponse> {
  return MediaLibrary.requestPermissionsAsync();
}

export async function getPermissions(): Promise<MediaLibrary.PermissionResponse> {
  return MediaLibrary.getPermissionsAsync();
}

export async function loadPage(after?: string): Promise<AssetPage> {
  const result = await MediaLibrary.getAssetsAsync({
    mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video],
    sortBy: [[MediaLibrary.SortBy.creationTime, false]],
    first: PAGE_SIZE,
    after,
  });

  return {
    assets: result.assets,
    endCursor: result.endCursor,
    hasNextPage: result.hasNextPage,
    totalCount: result.totalCount,
  };
}

export async function getVideoThumbnail(asset: CleanerAsset): Promise<string | null> {
  try {
    const info = await MediaLibrary.getAssetInfoAsync(asset, {
      shouldDownloadFromNetwork: false,
    });
    const sourceUri = stripUriFragment(info.localUri);
    if (!sourceUri) return null;
    const { uri } = await VideoThumbnails.getThumbnailAsync(sourceUri, {
      time: 0,
      quality: 0.5,
    });
    return uri;
  } catch (e) {
    console.warn('[PhotosCleaner] getVideoThumbnail failed', asset.id, e);
    return null;
  }
}

function stripUriFragment(uri: string | null | undefined): string | null {
  if (!uri) return null;
  const hashIndex = uri.indexOf('#');
  return hashIndex === -1 ? uri : uri.slice(0, hashIndex);
}

const PREVIEW_DIR = `${FileSystem.cacheDirectory ?? ''}previews/`;

async function ensurePreviewDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(PREVIEW_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PREVIEW_DIR, { intermediates: true });
  }
}

function safeCacheName(asset: CleanerAsset): string {
  const ext = (asset.filename.split('.').pop() ?? 'mov').toLowerCase();
  const safeId = asset.id.replace(/[^a-zA-Z0-9]/g, '_');
  return `${safeId}.${ext}`;
}

export async function getPlayableVideoUri(
  asset: CleanerAsset,
  options: { copyToSandbox?: boolean } = {}
): Promise<string | null> {
  try {
    let info = await MediaLibrary.getAssetInfoAsync(asset, {
      shouldDownloadFromNetwork: false,
    });

    if (!info.localUri) {
      console.log(
        '[PhotosCleaner] not local, fetching from iCloud',
        asset.id,
        asset.filename
      );
      info = await MediaLibrary.getAssetInfoAsync(asset, {
        shouldDownloadFromNetwork: true,
      });
    }

    const sourceUri = stripUriFragment(info.localUri);
    if (!sourceUri) {
      console.warn('[PhotosCleaner] no localUri for video', asset.id, asset.filename);
      return null;
    }

    if (!options.copyToSandbox) {
      console.log('[PhotosCleaner] video uri (direct)', asset.id, asset.filename);
      return sourceUri;
    }

    await ensurePreviewDir();
    const dest = `${PREVIEW_DIR}${safeCacheName(asset)}`;
    const destInfo = await FileSystem.getInfoAsync(dest);
    if (!destInfo.exists) {
      await FileSystem.copyAsync({ from: sourceUri, to: dest });
    }
    console.log('[PhotosCleaner] video uri (sandbox copy)', asset.id, dest);
    return dest;
  } catch (e) {
    console.warn(
      '[PhotosCleaner] getPlayableVideoUri failed',
      asset.id,
      'copy:',
      options.copyToSandbox,
      e
    );
    return null;
  }
}

export async function deleteAssets(ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true;
  return MediaLibrary.deleteAssetsAsync(ids);
}
