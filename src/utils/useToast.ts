import Toast from "react-native-toast-message";

export function showSuccess(message?: string, description?: string) {
  Toast.show({
    type: "success",
    text1: message || "Éxito",
    text2: description,
    position: "bottom",
  });
}

export function showError(message?: string, description?: string) {
  Toast.show({
    type: "error",
    text1: message || "Error",
    text2: description,
    position: "bottom",
  });
}

export function showInfo(message?: string, description?: string) {
  Toast.show({
    type: "info",
    text1: message || "Información",
    text2: description,
    position: "bottom",
  });
}