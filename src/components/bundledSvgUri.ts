type BundledSvgAsset = {
  localUri: string | null;
  uri: string;
};

export function getBundledSvgUri(
  platform: string,
  asset: BundledSvgAsset
): string | null {
  if (platform === "android") return asset.localUri;
  return asset.localUri ?? (asset.uri || null);
}
