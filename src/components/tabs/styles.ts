import { Theme } from "@/src/themes";
import { ViewStyle } from "react-native";

export type TabsStyles = {
    base : {
        container: ViewStyle;
    },
    header: {
        tabsContainer: ViewStyle;
        tabsContainerActive: ViewStyle;
    },
    content : {
        container: ViewStyle;
    }
};

export function createTabsStyles(t: Theme): TabsStyles {
    return {
        base: {
            container: {
                flexDirection: "row",
                backgroundColor: t.colors.border,
                padding: t.spacing.xs,
                borderRadius: t.borders.lg,
                height: 44,
                gap: t.spacing.xs,
            }
        },
        header: {
            tabsContainer: {
                alignItems: "center",
                justifyContent: "center",
                borderRadius: t.borders.lg,
                flex : 1
            },
            tabsContainerActive: {
                backgroundColor: t.colors.background,
            }
        },
        content: {
            container: {
                marginTop: t.spacing.lg
            }
        }
    };
}