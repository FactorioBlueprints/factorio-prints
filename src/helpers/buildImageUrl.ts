const localImageGatewayOrigin = "http://localhost:8787";
const productionImageGatewayOrigin = "https://images.factorioprints.com";
const placeholderImageUrl = "/icons/entity-unknown.png";

interface ImageGatewayEnvironment {
  readonly DEV: boolean;
  readonly VITE_IMAGE_GATEWAY_ORIGIN?: string;
}

export enum ImageVariant {
  Large = "large",
  Original = "original",
  Thumbnail = "thumbnail",
}

const imageExtensions: Readonly<Record<string, string>> = {
  "image/gif": "gif",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
  "image/png": "png",
};

export const resolveImageGatewayOrigin = (environment: ImageGatewayEnvironment): string => {
  const configuredOrigin = environment.VITE_IMAGE_GATEWAY_ORIGIN;

  if (configuredOrigin === undefined) {
    return environment.DEV ? localImageGatewayOrigin : productionImageGatewayOrigin;
  }

  if (configuredOrigin === "") {
    return "";
  }

  const parsedOrigin = new URL(configuredOrigin);
  if (
    (parsedOrigin.protocol !== "http:" && parsedOrigin.protocol !== "https:") ||
    parsedOrigin.username ||
    parsedOrigin.password ||
    parsedOrigin.pathname !== "/" ||
    parsedOrigin.search ||
    parsedOrigin.hash
  ) {
    throw new TypeError("VITE_IMAGE_GATEWAY_ORIGIN must contain only an HTTP origin");
  }

  return parsedOrigin.origin;
};

const buildImageUrl = (
  imgurId: string,
  imgurType: string,
  variant: ImageVariant,
  gatewayOrigin = resolveImageGatewayOrigin(import.meta.env),
): string => {
  if (!imgurId) {
    return placeholderImageUrl;
  }

  const extension = imageExtensions[imgurType] ?? "png";
  return `${gatewayOrigin}/legacy-imgur/${imgurId}/${variant}.${extension}`;
};

export default buildImageUrl;
