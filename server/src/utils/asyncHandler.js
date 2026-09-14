// Wraps an async route handler so a rejected promise (or thrown ApiError)
// reaches Express's error-handling middleware via next(), regardless of
// whether the installed Express major version auto-forwards async errors.
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
