import catchAsyncError from "../middlewares/catchAsyncError.js";
import User from "../models/user.js";
import { delete_file, upload_file } from "../utils/cloudinary.js";
import { getRestPasswordTemplate } from "../utils/emailTemplates.js";
import ErrorHandler from "../utils/errorHandler.js";
import sendEmail from "../utils/sendEmail.js";
import sendToken from "../utils/sendToken.js";
import crypto from "crypto";

// Register user  =>  /api/v1/register
export const registerUser = catchAsyncError(async (req, res, next) => {
  const { name, email, password } = req.body;

  const user = await User.create({
    name,
    email,
    password,
  });
  res.status(201).json({
    message: "Đăng kí thành công",
  });
  // sendToken(user, 201, res);
});
// Login user  =>  /api/v1/login
export const loginUser = catchAsyncError(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new ErrorHandler("Please enter email & password", 400));
  }

  // Find user in the database
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return next(new ErrorHandler("Invalid email or password", 401));
  }

  // Check if password is correct
  const isPasswordMatched = await user.comparePassword(password);

  if (!isPasswordMatched) {
    return next(new ErrorHandler("Invalid email or password", 401));
  }
  const token = await user.getJwtToken();

  sendToken(user, 200, res);
});
// Logout user  =>  /api/v1/logout
export const logout = catchAsyncError(async (req, res, next) => {
  res.cookie("token", null, {
    expires: new Date(Date.now()),
    httpOnly: true,
  });
  res.status(200).json({
    message: "Logged out successfully",
  });
});

// Upload user avatar =>  /api/v1/me/upload_avatar
export const uploadAvatar = catchAsyncError(async (req, res, next) => {
  const avatarResponse = await upload_file(
    req.body.avatar,
    "Home/TECHSTORE/avatars"
  );

  // Remove previous avatar
  if (req?.user?.avatar?.url) {
    await delete_file(req?.user?.avatar?.public_id);
  }
  console.log(">>>check req: ", req.body.avatar);
  console.log(">>>check avatar: ", avatarResponse);
  const user = await User.findByIdAndUpdate(req.user._id, {
    avatar: avatarResponse,
  });
  res.status(200).json({
    user,
  });
});
// Forgot password  =>  /api/v1/password/forgot
export const forgotPassword = catchAsyncError(async (req, res, next) => {
  // Find user in the database
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new ErrorHandler("User not found with this email", 404));
  }

  // Get reset password token
  const resetToken = user.getResetPasswordToken();
  await user.save();

  // Create reset password url
  const resetUrl = `${process.env.FRONTEND_URL}/password/reset/${resetToken}`;
  const message = getRestPasswordTemplate(user?.name, resetUrl);

  try {
    await sendEmail({
      email: user.email,
      subject: "ShopIT Password Recovery",
      message,
    });
    res.status(200).json({
      message: `Email sent to : ${user.email}`,
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    return next(new ErrorHandler(error?.message, 500));
  }
});

// Reset password   =>  /api/v1/password/reset/:token
export const resetPassword = catchAsyncError(async (req, res, next) => {
  // Hash the URL token
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });
  if (!user) {
    return next(
      new ErrorHandler(
        "Password reset token is invalid or has been expired",
        400
      )
    );
  }
  if (req.body.password !== req.body.confirmPassword) {
    return next(new ErrorHandler("Password does not match", 400));
  }
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();
  sendToken(user, 200, res);
});

// Get current user profile  => /api/v1/me

export const getUserProfile = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req?.user?._id);
  res.status(200).json({ user });
});

// Update password  =>   /api//v1/password/update
export const updatePassword = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req?.user?._id).select("+password");

  // check the previous user password
  const isPasswordMatched = await user.comparePassword(req.body.oldPassword);
  console.log(">>>check password: ", isPasswordMatched);
  if (!isPasswordMatched) {
    return next(new ErrorHandler("Old Password is incorrect"));
  }

  user.password = req.body.password;
  await user.save();
  return res.status(200).json({
    success: true,
  });
});
// Update User Profile  =>   /api//v1/me/update
export const updateProfile = catchAsyncError(async (req, res, next) => {
  const newUserData = {
    name: req.body.name,
    email: req.body.email,
  };

  const user = await User.findByIdAndUpdate(req.user._id, newUserData, {
    new: true,
  });
  res.status(200).json({ user });
});

// Get all Users - ADMIN   =>  /api/v1/admin/users
export const getAllUsers = catchAsyncError(async (req, res, next) => {
  const users = await User.find();
  res.status(200).json({ users });
});
// Get User Detail Users - ADMIN   =>  /api/v1/admin/user/:id
export const getUserDetail = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return next(
      new ErrorHandler(`User not found with id: ${req.params.id}`),
      404
    );
  }
  res.status(200).json({ user });
});

// Update User Detail Users - ADMIN   =>  /api/v1/admin/user/:id
export const updateUser = catchAsyncError(async (req, res, next) => {
  const newUserData = {
    name: req.body.name,
    email: req.body.email,
    role: req.body.role,
  };
  const user = await User.findByIdAndUpdate(req.params.id, newUserData, {
    new: true,
  });
  if (!user) {
    return next(
      new ErrorHandler(`User not found with id: ${req.params.id}`),
      404
    );
  }
  res.status(200).json({ user });
});

// Delete User - ADMIN   =>  /api/v1/admin/user/:id
export const deleteUser = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return next(
      new ErrorHandler(`User not found with id: ${req.params.id}`),
      404
    );
  }
  // TODO - Remove user avatar from
  if (user?.avatar?.public_id) {
    await delete_file(user?.avatar?.public_id);
  }
  await user.deleteOne();
  res.status(200).json({ success: true });
});
