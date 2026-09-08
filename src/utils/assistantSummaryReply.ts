export function shouldOpenAssistantSummary(value: string) {
  const reply = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.,!?¿¡]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return [
    "si", "si ok", "si por favor", "si porfa", "yes", "ok", "dale", "claro",
    "mostrar resumen", "ver resumen", "revisar resumen", "muestrame el resumen",
    "ensename el resumen", "si quiero ver el resumen",
  ].includes(reply);
}

export function isAssistantReviewInstruction(value: string) {
  return [
    "Listo. Revisa que todo esté correcto antes de publicar.",
    "Aqui tienes el resumen. ¿Deseas publicar o seguir ajustando?",
  ].includes(value.replace(/\s+/g, " ").trim());
}
