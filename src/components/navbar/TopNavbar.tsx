import { TextField } from "@/src/components/inputField/InputField";
import RoleGate from "@/src/components/role/RoleGate";
import { Text } from "@/src/components/Text";
import { getSession } from "@/src/lib/supabase";
import { getProfileByUserId } from "@/src/services/profile.service";
import { useTheme } from "@/src/themes/ThemeProvider";
import React, { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import { Icon } from "../Icon";
import { createTopNavbarStyles } from "./topNavbarStyles";

const categories = [
  {
    key: "all",
    label: "Todas",
    image: require("../../../assets/images/icon.png"),
  },
  {
    key: "vehicles",
    label: "Vehículos",
    image: require("../../../assets/images/icon.png"),
  },
  {
    key: "furniture",
    label: "Muebles",
    image: require("../../../assets/images/icon.png"),
  },
  {
    key: "plants",
    label: "Plantas",
    image: require("../../../assets/images/icon.png"),
  },
  {
    key: "tools",
    label: "Herramientas",
    image: require("../../../assets/images/icon.png"),
  },
];

function SharedTopNavbarContent() {
  const t = useTheme();
  const s = useMemo(() => createTopNavbarStyles(t), [t]);
  const [selectedCategory, setSelectedCategory] = useState(categories[0].key);
  const [searchValue, setSearchValue] = useState("");
  const [profileName, setProfileName] = useState("Mi perfil");

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
        {categories.map((category) => (
          <Pressable
            key={category.key}
            onPress={() => {
              setSelectedCategory(category.key);
              console.log("open category", category.key);
            }}
            style={[
              s.categoryButton,
              selectedCategory === category.key && s.categoryButtonActive,
            ]}
          >
            <Image source={category.image} style={s.categoryImage} />
            <Text>{category.label}</Text>
          </Pressable>
        ))}
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
