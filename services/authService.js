const crypto = require("crypto");

const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const sendEmail = require("../utils/sendEmail");
const createToken = require("../utils/createToken");
const ApiError = require("../utils/apiError");
const User = require("../models/userModel");

// @desc    Signup
// @route   GET /api/v1/auth/signup
// @access  Public
exports.signup = asyncHandler(async (req, res, next) => {
    //1- Create user
    const user = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
    });
    //2- Generate token
    const token = createToken(user._id);

    res.status(201).json({ data: user, token });
});

// @desc    Login
// @route   GET /api/v1/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
    // 1- Chekc if password and email in the body (validation)
    // 2- Check if the user exists and if the password is correct
    const user = await User.findOne({ email: req.body.email });

    if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
        return next(new ApiError("Incorrect email or password", 401));
    }

    //3- Check if user account is active
    if (!user.active) {
        return next(new ApiError("Your account has been deactivated", 401));
    }

    // 4- Generate Token
    const token = createToken(user._id);
    // 5- Send results to client side
    res.status(200).json({ data: user, token });
});

// @desc    Make sure the user is logged in
exports.protect = asyncHandler(async (req, res, next) => {
    //1- Check if token exists, if exists, get
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
    }
    if (!token) {
        return next(
            new ApiError("You are not logged in, please login to get access this route", 401)
        );
    }

    //2- Verify token (no change happened / expired token)
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const currentUser = await User.findById(decoded.userId);

    if (!currentUser.active) {
        return next(new ApiError("Your account has been deactivated", 401));
    }

    //3- Check if user exists
    if (!currentUser) {
        return next(new ApiError("The user that belongs to this token no longer exists", 401));
    }
    //4- Check if user changed password after token created
    if (currentUser.passwordChangeAt) {
        const passChangedTimestamp = parseInt(currentUser.passwordChangeAt.getTime() / 1000, 10);
        //Password changed after token created (Error)
        if (passChangedTimestamp > decoded.iat) {
            return next(
                new ApiError("Your password has changed recently, please login again", 401)
            );
        }
    }
    req.user = currentUser;
    next();
});

// @desc    Authorization (User Permissions)
exports.allowedTo = (...roles) =>
    asyncHandler(async (req, res, next) => {
        // 1- Access roles
        //2- Access registered user (req.user.role)
        if (!roles.includes(req.user.role)) {
            return next(new ApiError("You are not authorized to access this route", 403));
        }
        next();
    });

// @desc    Forgot Password
// @route   POST /api/v1/auth/forgotPassword
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
    //1- Get user by email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return next(new ApiError("User not found", 404));
    }

    //2- Generate hash reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedResetCode = crypto.createHash("sha256").update(resetCode).digest("hex");

    //3- Save hashed reset code in DB
    user.passwordResetCode = hashedResetCode;
    //Add expiration time for password reset code (10 mins)
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    user.passwordResetVerified = false;

    await user.save();

    //4- Send reset code via email
    try {
        await sendEmail({
            email: user.email,
            subject: "Your password reset code (valid for 10 mins)",
            message: `Your password reset code ${resetCode}`,
        });
    } catch (e) {
        user.passwordResetCode = undefined;
        user.passwordResetExpires = undefined;
        user.passwordResetVerified = undefined;
        await user.save();
        return next(new ApiError("There was an error in sending the reset code", 500));
    }

    res.status(200).json({ status: "Success", message: "Reset code sent to email" });
});

// @desc    Verify password reset code
// @route   POST /api/v1/auth/verifyResetCode
// @access  Public
exports.verifyPassResetCode = asyncHandler(async (req, res, next) => {
    //1- Get user based on reset code
    const hashedResetCode = crypto.createHash("sha256").update(req.body.resetCode).digest("hex");

    const user = await User.findOne({
        passwordResetCode: hashedResetCode,
        passwordResetExpires: { $gt: Date.now() },
    });
    if (!user) {
        return next(new ApiError("Reset code inalid or expired", 400));
    }

    //2- Reset code valid
    user.passwordResetVerified = true;
    await user.save();

    res.status(200).json({ status: "Success" });
});

// @desc    Verify password reset code
// @route   POST /api/v1/auth/verifyResetCode
// @access  Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
    //1- Get user based on email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return next(new ApiError(`There's no user with the email ${req.body.email}`, 404));
    }

    //2- Check if reset code verified
    if (!user.passwordResetVerified) {
        return next(new ApiError("Reset code not verified", 400));
    }

    user.password = req.body.newPassword;
    user.passwordResetCode = undefined;
    user.passwordResetExpires = undefined;
    user.passwordResetVerified = undefined;

    await user.save();

    //3- If everything is good, generate token
    const token = createToken(user._id);
    res.status(200).json({ token });
});
