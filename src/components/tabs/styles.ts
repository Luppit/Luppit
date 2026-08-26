import { Theme } from "@/src/themes";
import { TextStyle, ViewStyle } from "react-native";

export type TabsStyles = {
    base : {
        container: ViewStyle;
        content: ViewStyle;
    },
    header: {
        tabsContainer: ViewStyle;
        tabsContainerActive: ViewStyle;
        tabsContainerPressed: ViewStyle;
        tabLabelActive: TextStyle;
        tabLabelInactive: TextStyle;
    },
    content : {
        container: ViewStyle;
    }
};

export function createTabsStyles(t: Theme): TabsStyles {
    return {
        base: {
            container: {
                height: 44,
            },
            content: {
                flex: 1,
                flexDirection: "row",
                padding: t.spacing.xs,
                gap: t.spacing.xs,
            }
        },
        header: {
            tabsContainer: {
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: t.glass.radius.control - t.spacing.xs,
                flex: 1,
            },
            tabsContainerActive: {
                ...t.glass.segmentActive,
            },
            tabsContainerPressed: {
                opacity: 0.8,
            },
            tabLabelActive: {
                color: t.colors.textDark,
                fontFamily: t.typography.subtitle.fontFamily,
            },
            tabLabelInactive: {
                color: t.colors.textMedium,
                opacity: 0.64,
            }
        },
        content: {
            container: {
                marginTop: t.spacing.xl
            }
        }
    };
}
