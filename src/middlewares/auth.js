import jwt from "jsonwebtoken";
import ErrorHandler from "../utils/errorHandler.js";
import User from "../models/user.js";
import catchAsyncError from "./catchAsyncError.js";

// checks if user is authenticated or not
export const isAuthenticatedUser = catchAsyncError(async (req, res, next) => {
  const { token } = req.cookies;
  if (!token) {
    return next(new ErrorHandler("Login first to access this resource", 401));
  }
  const decode = jwt.verify(token, process.env.JWT_SECRET);
  req.user = await User.findById(decode.id);
  next();
});

// Authorize user roles

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorHandler(
          `Role (${req.user.role}) is not allowed access this resource`,
          403
        )
      );
    }
    next();
  };
};
