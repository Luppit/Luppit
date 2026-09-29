import React from "react";

export type DetailTopBarMenu = {
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
  testID?: string;
};

export const DetailTopBarMenuContext = React.createContext<
  React.Dispatch<React.SetStateAction<DetailTopBarMenu | null>> | null
>(null);
