import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  title: string;
  subtitle?: string;
  views?: number;
  rating?: number;         // 4.5
  ratingCount?: number;    // 16
  timestamp?: string;      // "Justo ahora"
};

export default function ProductCard({
  title,
  subtitle,
  views = 0,
  rating = 0,
  ratingCount = 0,
  timestamp = "",
}: Props) {
  return (
    <View style={styles.wrapper}>
      {/* Carta blanca */}
      <View style={styles.card}>
        {/* Título y subtítulo */}
        <View style={{ gap: 6 }}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
          ) : null}
        </View>

        {/* Fila inferior: vistas a la izquierda / rating a la derecha */}
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Ionicons name="eye" size={18} color="#9AA09E" />
            <Text style={styles.views}>{views}</Text>
          </View>

          <View style={styles.rowRight}>
            <MaterialIcons name="star" size={20} color="#C89E2B" />
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            <Text style={styles.ratingCount}>({ratingCount})</Text>
          </View>
        </View>
      </View>

      {/* Banda inferior (timestamp) */}
      {timestamp ? (
        <View style={styles.ribbon}>
          <Text style={styles.ribbonText}>{timestamp}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#DDE7CD",    // borde/halo verdoso
    borderRadius: 22,
    padding: 6,
    width: "100%",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: "#0F1413",
  },
  subtitle: {
    fontSize: 18,
    color: "#B0B4B2",
  },
  row: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  views: {
    fontSize: 16,
    color: "#9AA09E",
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ratingText: {
    fontSize: 18,
    color: "#2E2F2E",
  },
  ratingCount: {
    fontSize: 16,
    color: "#B0B4B2",
  },
  ribbon: {
    backgroundColor: "#DDE7CD",
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    paddingVertical: 8,
    alignItems: "center",
  },
  ribbonText: {
    fontSize: 16,
    color: "#0F1413",
  },
});