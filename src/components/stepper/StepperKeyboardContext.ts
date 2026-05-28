import { createContext, useContext } from "react";

type StepperKeyboardContextValue = {
  scrollToFocusedInput: (target?: unknown | null) => void;
};

export const StepperKeyboardContext =
  createContext<StepperKeyboardContextValue | null>(null);

export function useStepperKeyboard() {
  return useContext(StepperKeyboardContext);
}
