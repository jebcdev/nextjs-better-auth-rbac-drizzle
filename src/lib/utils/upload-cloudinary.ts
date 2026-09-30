
interface UploadOptions {
    maxRetries?: number;
    timeoutMs?: number;
    onProgress?: (percent: number) => void;
  }
  
  export interface CloudinaryResponse {
    secure_url: string;
    public_id: string;
    bytes: number;
    format: string;
  }
  
  /**
   * Error de subida con un `code` estable.
   *
   * Se exporta porque el editor de avatar necesita distinguir los casos
   * (decisión D13): el usuario ve un mensaje distinto para un archivo no
   * permitido que para un tiempo de espera agotado, y eso se decide por
   * `code`, nunca por `message` — el texto es para las personas y puede cambiar
   * sin aviso.
   */
  export class UploadError extends Error {
    constructor(
      message: string,
      public readonly code: "TIMEOUT" | "NETWORK" | "SERVER" | "INVALID_FILE",
      public readonly status?: number
    ) {
      super(message);
      this.name = "UploadError";
    }
  }
  
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const MAX_FILE_SIZE_MB = 10;
  
  function validateFile(file: File): void {
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new UploadError(
        `Tipo de archivo no permitido: ${file.type}`,
        "INVALID_FILE"
      );
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      throw new UploadError(
        `El archivo excede el límite de ${MAX_FILE_SIZE_MB}MB`,
        "INVALID_FILE"
      );
    }
  }
  
  async function attemptUpload(
    formData: FormData,
    timeoutMs: number,
    onProgress?: (percent: number) => void
  ): Promise<CloudinaryResponse> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`;
  
      // Timeout manual
      const timer = setTimeout(() => {
        xhr.abort();
        reject(new UploadError("La subida tardó demasiado", "TIMEOUT"));
      }, timeoutMs);
  
      // Progreso real del upload
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          onProgress?.(Math.round((e.loaded / e.total) * 100));
        }
      });
  
      xhr.addEventListener("load", () => {
        clearTimeout(timer);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          const msg = JSON.parse(xhr.responseText)?.error?.message ?? "Error del servidor";
          reject(new UploadError(msg, "SERVER", xhr.status));
        }
      });
  
      xhr.addEventListener("error", () => {
        clearTimeout(timer);
        reject(new UploadError("Error de red al subir la imagen", "NETWORK"));
      });
  
      xhr.addEventListener("abort", () => clearTimeout(timer));
  
      xhr.open("POST", url);
      xhr.send(formData);
    });
  }
  
  export async function uploadToCloudinary(
    file: File,
    options: UploadOptions = {}
  ): Promise<CloudinaryResponse> {
    const { maxRetries = 3, timeoutMs = 30_000, onProgress } = options;
  
    // 1. Validar antes de hacer cualquier request
    validateFile(file);
  
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);
  
    let lastError: UploadError | null = null;
  
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const data = await attemptUpload(formData, timeoutMs, onProgress);
        return data;
      } catch (err) {
        lastError = err as UploadError;
  
        // No reintentar si el archivo es inválido o el servidor rechazó (4xx)
        const shouldRetry =
          lastError.code !== "INVALID_FILE" &&
          !(lastError.code === "SERVER" && lastError.status && lastError.status < 500);
  
        if (!shouldRetry || attempt === maxRetries) break;
  
        // Espera exponencial: 1s, 2s, 4s...
        const delay = 1000 * 2 ** (attempt - 1);
        console.warn(`Intento ${attempt} fallido. Reintentando en ${delay}ms...`);
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  
    throw lastError;
  }
  
  /**
   * Prefijo de entrega de las imágenes del proyecto en Cloudinary.
   *
   * Cloudinary produce exactamente esta forma al subir una imagen sin
   * transformaciones: `https://res.cloudinary.com/<cloud>/image/upload/`.
   * Todo lo que no empiece por aquí —otro cloud, otro host, un enlace firmado
   * de otro proveedor— NO es un activo del proyecto.
   */
  function ownCloudinaryPrefix(cloudName: string): string {
    return `https://res.cloudinary.com/${cloudName}/image/upload/`;
  }

  /**
   * ¿Es `url` una imagen servida por el Cloudinary DEL PROYECTO?
   *
   * Esta es la allowlist de host que exige la decisión D21: la subida ocurre
   * navegador→Cloudinary, así que el `secure_url` que llega a la server action
   * es lo que el llamador AFIRME que es. Sin esta comprobación, cualquiera
   * podría guardar como su avatar una URL de un host ajeno (seguimiento,
   * contenido que él controla). La comprobación es de prefijo exacto, no de
   * `includes`, para que `https://evil.test/?x=res.cloudinary.com/...` no pase.
   */
  export function isOwnCloudinaryUrl(
    url: string,
    cloudName: string,
  ): boolean {
    if (!cloudName) return false;
    return url.startsWith(ownCloudinaryPrefix(cloudName));
  }

  /**
   * Reconstruye el `public_id` a partir del `secure_url` guardado, para poder
   * pedirle a Cloudinary que borre ese activo.
   *
   * `users.image` guarda solo una URL, así que el identificador de borrado se
   * deriva de la URL **previamente almacenada en la base de datos** —nunca de
   * la petición— que es lo que hace estructuralmente imposible que un llamador
   * elija qué activo se destruye (decisión D14).
   *
   * Forma reconocida:
   *   https://res.cloudinary.com/<cloud>/image/upload/[v<digits>/]<public_id>.<ext>
   *
   * ⚠️ Falla en cerrado: cualquier forma no reconocida devuelve `""` y quien
   * llama NO intenta borrar. El modo de fallo es un activo huérfano, jamás el
   * borrado de un id equivocado.
   */
  export function publicIdFromSecureUrl(
    url: string,
    cloudName: string,
  ): string {
    if (!isOwnCloudinaryUrl(url, cloudName)) return "";

    // Sin query ni fragmento: `destroy` trabaja sobre el recurso, no sobre una
    // variante de entrega.
    let rest = url.slice(ownCloudinaryPrefix(cloudName).length);
    rest = rest.split(/[?#]/, 1)[0] ?? "";
    if (!rest) return "";

    // Segmento de versión `v<dígitos>/`, si está.
    const versionMatch = /^v\d+\//.exec(rest);
    if (versionMatch) rest = rest.slice(versionMatch[0].length);
    if (!rest) return "";

    // Extensión de formato: solo se quita si el último segmento tiene una.
    const lastSlash = rest.lastIndexOf("/");
    const lastSegment = rest.slice(lastSlash + 1);
    const lastDot = lastSegment.lastIndexOf(".");
    if (lastDot > 0) {
      rest = rest.slice(0, lastSlash + 1) + lastSegment.slice(0, lastDot);
    }

    return rest;
  }

  /**
   * Firma de una llamada REST firmada de Cloudinary.
   *
   * Algoritmo documentado: ordenar los parámetros alfabéticamente, unirlos como
   * `clave=valor&…`, concatenar el `api_secret` y aplicar SHA-1 en hexadecimal.
   * El `api_key` NO entra en la firma; el `api_secret` actúa como sufijo de la
   * cadena a firmar, jamás como parámetro.
   *
   * Se usa Web Crypto (`crypto.subtle`) en vez de `node:crypto` porque este
   * módulo también lo importa el navegador para subir: un `import` de un builtin
   * de Node al tope arrastraría el módulo entero al bundle del cliente.
   */
  async function cloudinarySignature(
    params: Record<string, string>,
    apiSecret: string,
  ): Promise<string> {
    const toSign =
      Object.keys(params)
        .sort()
        .map((key) => `${key}=${params[key]}`)
        .join("&") + apiSecret;

    const digest = await crypto.subtle.digest(
      "SHA-1",
      new TextEncoder().encode(toSign),
    );

    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  export async function deleteFromCloudinary(
    publicId: string,
  ): Promise<boolean> {
    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const apiKey = process.env.CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;
  
      if (!apiKey || !apiSecret || !cloudName) {
        console.error("deleteFromCloudinary: Missing CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET or NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME");
        return false;
      }

      if (!publicId) return false;
  
      // Cloudinary exige `timestamp` + `signature` en su API firmada, y rechaza
      // `api_secret` como parámetro de autenticación directo. La versión
      // anterior de esta función enviaba `api_key` + `api_secret` en crudo, sin
      // `timestamp` ni `signature`: esa llamada NO podía funcionar.
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = await cloudinarySignature(
        { public_id: publicId, timestamp },
        apiSecret,
      );

      const formData = new FormData();
      formData.append("public_id", publicId);
      formData.append("timestamp", timestamp);
      formData.append("api_key", apiKey);
      formData.append("signature", signature);
  
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
        { method: "POST", body: formData },
      );
  
      const data = await res.json();
      // Un id inexistente devuelve 200 con `result: "not found"`: no es un error
      // del que haya que informar, simplemente no había nada que borrar.
      return data.result === "ok";
    } catch {
      return false;
    }
  }
  
  export async function deleteMultipleFromCloudinary(
    publicIds: string[],
  ): Promise<boolean> {
    const results = await Promise.allSettled(
      publicIds.map((id) => deleteFromCloudinary(id)),
    );
    return results.some((r) => r.status === "fulfilled" && r.value);
  }