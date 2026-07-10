import { Response } from 'express';

interface SuccessResponseData {
  [key: string]: any;
}

/**
 * Send a standardized success response.
 */
export const sendSuccess = (res: Response, data: SuccessResponseData | null = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Send a standardized error response.
 */
export const sendError = (res: Response, message = 'Internal Server Error', statusCode = 500, errorDetails: any = null) => {
  const response: any = {
    success: false,
    message,
  };
  
  if (errorDetails && process.env.NODE_ENV !== 'production') {
    response.error = errorDetails;
  }
  
  return res.status(statusCode).json(response);
};
