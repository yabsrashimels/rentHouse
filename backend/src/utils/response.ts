import { Response } from 'express';

interface ApiResponseOptions {
  success: boolean;
  message: string;
  data?: any;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

export const sendResponse = (
  res: Response,
  statusCode: number,
  options: ApiResponseOptions
) => {
  return res.status(statusCode).json({
    success: options.success,
    message: options.message,
    data: options.data,
    meta: options.meta,
  });
};

export const sendSuccess = (res: Response, data?: any, message = 'Success', statusCode = 200) => {
  return sendResponse(res, statusCode, { success: true, message, data });
};

export const sendPaginatedSuccess = (
  res: Response,
  data: any[],
  total: number,
  page: number,
  limit: number,
  message = 'Success'
) => {
  const totalPages = Math.ceil(total / limit);
  return res.status(200).json({
    success: true,
    message,
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
};

export const sendError = (res: Response, statusCode: number, message: string, errors?: any[]) => {
  return sendResponse(res, statusCode, { success: false, message, data: errors });
};
