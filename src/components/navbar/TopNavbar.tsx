import { TextField } from "@/src/components/inputField/InputField";
import RoleGate from "@/src/components/role/RoleGate";
import { Text } from "@/src/components/Text";
import { getSession } from "@/src/lib/supabase";
import { getProfileByUserId } from "@/src/services/profile.service";
import { getSegments, Segment } from "@/src/services/segment.service";
import { Asset } from "expo-asset";
import { useTheme } from "@/src/themes/ThemeProvider";
import React, { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import { SvgUri } from "react-native-svg";
import { Icon } from "../Icon";
import { createTopNavbarStyles } from "./topNavbarStyles";

const segmentSvgModules: Record<string, number> = {
  todas: require("../../../assets/segments/todas.svg"),
  vehiculos: require("../../../assets/segments/vehiculos.svg"),
  muebles: require("../../../assets/segments/muebles.svg"),
  plantas: require("../../../assets/segments/plantas.svg"),
  herramientas: require("../../../assets/segments/herramientas.svg"),
};

function SharedTopNavbarContent() {
  const t = useTheme();
  const s = useMemo(() => createTopNavbarStyles(t), [t]);
  const segmentIconUris = useMemo(() => {
    const uris: Record<string, string> = {};
    for (const [svgName, moduleRef] of Object.entries(segmentSvgModules)) {
      uris[svgName] = Asset.fromModule(moduleRef).uri;
    }
    return uris;
  }, []);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [profileName, setProfileName] = useState("Mi perfil");
  const [failedSegmentIcons, setFailedSegmentIcons] = useState<Record<string, true>>({});

  useEffect(() => {
    let active = true;

    const loadProfileName = async () => {
      const session = await getSession();
      if (!session?.user.id) return;

      const profileResult = await getProfileByUserId(session.user.id);
      if (!active || !profileResult || profileResult.ok === false) return;

      const name = profileResult.data.name?.trim();
      if (name) {
        setProfileName(name);
      }
    };

    void loadProfileName();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadSegments = async () => {
      const segmentResult = await getSegments();
      if (!active || segmentResult.ok === false) return;

      setSegments(segmentResult.data);
      setSelectedCategory((current) => {
        const hasCurrentEnabled = segmentResult.data.some(
          (segment) => segment.svgName === current && !segment.isDisabled
        );
        if (hasCurrentEnabled) return current;

        const firstEnabled = segmentResult.data.find((segment) => !segment.isDisabled)?.svgName;
        return firstEnabled ?? segmentResult.data[0]?.svgName ?? "";
      });
    };

    void loadSegments();

    return () => {
      active = false;
    };
  }, []);

  return (
    <View style={s.container}>
      <Pressable onPress={() => console.log("open profile switcher")}>
        <View style={s.profileRow}>
          <Text variant="subtitle">{profileName}</Text>
          <Icon name="chevron-down" size={18} />
          <View style={s.onlineDot} />
        </View>
      </Pressable>

      <TextField
        value={searchValue}
        onChangeText={setSearchValue}
        placeholder="Busca en Luppit"
        leftIcon="search"
        baseContainerStyle={{ marginBottom: 0 }}
        inputContainerStyle={s.searchInputContainer}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.categoryListContainer}
      >
        {segments.map((segment) => {
          const segmentIconUri = segmentIconUris[segment.svgName];

          return (
            <Pressable
              key={segment.svgName}
              disabled={segment.isDisabled}
              onPress={() => {
                if (segment.isDisabled) return;
                setSelectedCategory(segment.svgName);
                console.log("open category", segment.svgName);
              }}
              style={[
                s.categoryButton,
                selectedCategory === segment.svgName &&
                  !segment.isDisabled &&
                  s.categoryButtonActive,
                segment.isDisabled && s.categoryButtonDisabled,
              ]}
            >
              <View style={s.categoryImageContainer}>
                {!segmentIconUri || failedSegmentIcons[segment.svgName] ? (
                  <Image
                    source={require("../../../assets/images/icon.png")}
                    style={s.categoryImage}
                  />
                ) : (
                  <SvgUri
                    uri={segmentIconUri}
                    width={34}
                    height={34}
                    onError={() =>
                      setFailedSegmentIcons((current) =>
                        current[segment.svgName]
                          ? current
                          : { ...current, [segment.svgName]: true }
                      )
                    }
                  />
                )}
              </View>
              <Text color={segment.isDisabled ? "IconColorGray" : "textDark"}>
                {segment.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function TopNavbar() {
  return (
    <RoleGate
      buyer={<SharedTopNavbarContent />}
      seller={<SharedTopNavbarContent />}
      loading={null}
    />
  );
}
