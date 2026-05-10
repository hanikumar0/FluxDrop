export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: any;
  timestamp: string;
}

export const SuccessResponse = <T>(data: T, message = 'Success'): ApiResponse<T> => ({
  success: true,
  message,
  data,
  timestamp: new Date().toISOString(),
});

export const ErrorResponse = (message: string, error?: any): ApiResponse<null> => ({
  success: false,
  message,
  error,
  timestamp: new Date().toISOString(),
});
