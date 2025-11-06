import { useTheme } from "@/src/themes";
import { useMemo, useState } from "react";
import { TextInput, TextInputProps, View } from "react-native";
import { Text } from "../Text";
import { createInputFieldStyles } from "./styles";

type TextFieldProps = TextInputProps & {
  label?: string;
  error?: string;
};

export const TextField: React.FC<TextFieldProps> = ({
  label,
  error,
  ...props
}) => {
  const t = useTheme();
  const s = useMemo(() => createInputFieldStyles(t), [t]);
  const [focused, setFocused] = useState(false);

  return (
    <View>
      <Text color="stateAnulated" style={s.label}>
        {label}:
      </Text>
      <View style={[s.inputContainer, focused && s.inputFocused]}>
        <TextInput
          {...props}
          style={s.input}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
    </View>
  );
};
