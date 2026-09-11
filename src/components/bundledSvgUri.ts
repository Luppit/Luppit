type BundledSvgAsset = {
  localUri: string | null;
  uri: string;
};

type BundledSvgDownloadAsset = BundledSvgAsset & {
  name: string;
  type: string;
};

const ANDROID_EMBEDDED_RESOURCE_PREFIX = "file:///android_res/";

function isFetchableAndroidSvgUri(uri: string | null): uri is string {
  if (!uri || uri.startsWith(ANDROID_EMBEDDED_RESOURCE_PREFIX)) return false;

  return /^(?:file:\/\/|https?:\/\/|data:image\/svg\+xml(?:;|,))/i.test(uri);
}

export function getBundledSvgUri(
  platform: string,
  asset: BundledSvgAsset
): string | null {
  if (platform === "android") {
    return isFetchableAndroidSvgUri(asset.localUri) ? asset.localUri : null;
  }
  return asset.localUri ?? (asset.uri || null);
}

export function getAndroidBundledSvgDownloadDescriptor(
  asset: BundledSvgDownloadAsset
) {
  return {
    name: asset.name,
    type: asset.type,
    uri: asset.uri,
    hash: null,
  };
}
