
interface UploadOptions {
    maxRetries?: number;
    timeoutMs?: number;
    onProgress?: (percent: number) => void;
  }
  
  interface CloudinaryResponse {
    secure_url: string;
    public_id: string;
    bytes: number;
    format: string;
  }
  
  class UploadError extends Error {
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
  
  export async function deleteFromCloudinary(
    publicId: string,
  ): Promise<boolean> {
    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const apiKey = process.env.CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;
  
      if (!apiKey || !apiSecret) {
        console.error("deleteFromCloudinary: Missing CLOUDINARY_API_KEY or CLOUDINARY_API_SECRET");
        return false;
      }
  
      const formData = new FormData();
      formData.append("public_id", publicId);
      formData.append("api_key", apiKey);
      formData.append("api_secret", apiSecret);
  
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
        { method: "POST", body: formData },
      );
  
      const data = await res.json();
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