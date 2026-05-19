export class ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  message: string;

  static ok<T>(data: T, message = 'Success'): ApiResponse<T> {
    return { success: true, data, message };
  }

  static fail(message: string): ApiResponse<null> {
    return { success: false, data: null, message };
  }
}
