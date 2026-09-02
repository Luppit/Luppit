import { Asset } from "expo-asset";
import React, { useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import { SvgUri } from "react-native-svg";
import { getBundledSvgUri } from "./bundledSvgUri";

type Props = Omit<
  React.ComponentProps<typeof SvgUri>,
  "fallback" | "onError" | "uri"
> & {
  asset: number;
  fallback?: React.ReactNode;
};

export function BundledSvg({ asset, fallback = null, ...svgProps }: Props) {
  const resolvedAsset = useMemo(() => Asset.fromModule(asset), [asset]);
  const [uri, setUri] = useState<string | null>(() =>
    getBundledSvgUri(Platform.OS, resolvedAsset)
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);

    if (Platform.OS !== "android") {
      setUri(getBundledSvgUri(Platform.OS, resolvedAsset));
      return () => {
        active = false;
      };
    }

    const embeddedUri = getBundledSvgUri(Platform.OS, resolvedAsset);
    if (embeddedUri) {
      setUri(embeddedUri);
      return () => {
        active = false;
      };
    }

    setUri(null);
    void resolvedAsset
      .downloadAsync()
      .then((downloadedAsset) => {
        if (!active) return;
        const downloadedUri = getBundledSvgUri(Platform.OS, downloadedAsset);
        if (downloadedUri) {
          setUri(downloadedUri);
          return;
        }
        setFailed(true);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
    };
  }, [resolvedAsset]);

  if (failed || !uri) return <>{fallback}</>;

  return (
    <SvgUri
      {...svgProps}
      uri={uri}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no"
      onError={() => setFailed(true)}
    />
  );
}
