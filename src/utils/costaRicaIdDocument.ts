export const COSTA_RICA_PERSONAL_ID_LENGTH = 9;
export const COSTA_RICA_LEGAL_ID_LENGTH = 10;

export const COSTA_RICA_PERSONAL_ID_ERROR =
  "Ingresa una cédula personal válida de 9 dígitos, sin espacios ni guiones.";
export const COSTA_RICA_LEGAL_ID_ERROR =
  "Ingresa una cédula jurídica válida de 10 dígitos, sin espacios ni guiones.";

export function isValidCostaRicaPersonalId(value: string) {
  return /^[1-9]\d{8}$/.test(value);
}

export function isValidCostaRicaLegalId(value: string) {
  return /^[1-9]\d{9}$/.test(value);
}
