import { Theme } from "@/src/themes";
import { TextStyle, ViewStyle } from "react-native";

export type InputFieldStyles = {
    label : TextStyle;
    input: TextStyle;
    inputError?: ViewStyle;
    inputFocused?: ViewStyle;
    inputContainer: ViewStyle;
};

export function createInputFieldStyles(t : Theme): InputFieldStyles {
    return {
        label: {
           paddingLeft: t.spacing.sm 
        },
        inputContainer: {
            borderWidth: 1,
            borderRadius: t.borders.sm,
            borderColor: t.colors.border,
            height: 44,
            paddingHorizontal: t.spacing.sm,
        },
        input: {
            flex: 1,
            fontFamily: t.typography.body.fontFamily
        },
        inputError: {
            borderColor: t.colors.error
        },
        inputFocused: {
            borderWidth: 2
        }
    }
}