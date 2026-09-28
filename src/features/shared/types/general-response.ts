export type IGeneralResponse<T = undefined> =
  | { success: true;  error?: false; message: string; data: T      }
  | { success: false; error: true;   message: string; data?: never };