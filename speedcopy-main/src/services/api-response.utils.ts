export function isNotFoundError(error: any) {
  return error?.response?.status === 404;
}

export function isRouteNotFoundError(error: any) {
  return isNotFoundError(error) &&
         error?.response?.data?.message === 'Route not found';
}

export function wrapSuccess(data: any, message?: string) {
  return {
    success: true,
    data,
    ...(message && { message })
  };
}
