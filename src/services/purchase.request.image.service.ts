import { File } from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import type { ChatImage } from "../components/inputChat/inputChat";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_CONVERSATION_IMAGE_BYTES = 4_000_000;
const MAX_DIMENSIONS = [1600, 1200, 900, 700];

function imageMimeType(image: ChatImage) {
  const declared = image.mime?.split(";")[0].trim().toLowerCase();
  if (declared) return declared === "image/jpg" ? "image/jpeg" : declared;
  const extension = (image.name || image.uri).split(/[?#]/)[0].split(".").pop()?.toLowerCase();
  return extension === "jpg" || extension === "jpeg" ? "image/jpeg" :
    extension === "png" ? "image/png" :
    extension === "webp" ? "image/webp" :
    extension === "gif" ? "image/gif" : null;
}

async function prepareImage(
  image: ChatImage,
  maxBytes: number,
  name: string,
  limitLabel: string
): Promise<ChatImage> {
  const mime = imageMimeType(image);
  if (!mime || !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mime)) {
    return image;
  }

  const size = image.size ?? new File(image.uri).size;
  if (!Number.isFinite(size) || size <= 0) {
    throw new Error("No se pudo leer la imagen seleccionada.");
  }
  if (size <= maxBytes) return { ...image, size };
  if (mime === "image/gif") {
    throw new Error(
      `El GIF supera ${limitLabel}. Selecciona uno más pequeño para conservar su animación.`
    );
  }
  if (!image.width || !image.height) {
    throw new Error("No se pudo leer el tamaño de la imagen seleccionada.");
  }

  const format = mime === "image/png" ? ImageManipulator.SaveFormat.PNG :
    mime === "image/webp" ? ImageManipulator.SaveFormat.WEBP :
    ImageManipulator.SaveFormat.JPEG;
  const longestSide = Math.max(image.width, image.height);
  for (const maxDimension of MAX_DIMENSIONS) {
    const scale = Math.min(1, maxDimension / longestSide);
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    let result: Awaited<ReturnType<typeof ImageManipulator.manipulateAsync>>;
    let preparedSize: number;
    try {
      result = await ImageManipulator.manipulateAsync(
        image.uri,
        [{ resize: { width, height } }],
        { format, compress: mime === "image/png" ? 1 : 0.75 }
      );
      preparedSize = new File(result.uri).size;
    } catch {
      throw new Error("No se pudo preparar la imagen. Vuelve a seleccionarla.");
    }
    if (preparedSize > 0 && preparedSize <= maxBytes) {
      const extension = format === ImageManipulator.SaveFormat.JPEG ? "jpg" : format;
      return {
        uri: result.uri,
        mime,
        width: result.width,
        height: result.height,
        size: preparedSize,
        name: `${name}.${extension}`,
      };
    }
  }
  throw new Error(
    `No se pudo reducir la imagen a ${limitLabel}. Selecciona una más pequeña.`
  );
}

export function preparePurchaseRequestImage(image: ChatImage): Promise<ChatImage> {
  return prepareImage(image, MAX_IMAGE_BYTES, "request-image", "2 MB");
}

export function prepareConversationImageForUpload(image: ChatImage): Promise<ChatImage> {
  return prepareImage(image, MAX_CONVERSATION_IMAGE_BYTES, "conversation-image", "4 MB");
}
