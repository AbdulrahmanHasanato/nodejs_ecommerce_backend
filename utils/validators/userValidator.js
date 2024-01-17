const bcrypt = require("bcryptjs");
const slugify = require("slugify");
const { check, body } = require("express-validator");
const validatorMiddleware = require("../../middlewares/validatorMiddleware");
const User = require("../../models/userModel");
const ApiError = require("../apiError");

exports.createUserValidator = [
    check("name")
        .notEmpty()
        .withMessage("User required")
        .isLength({ min: 3 })
        .withMessage("Too short User name")
        .isLength({ max: 32 })
        .withMessage("Too long User name")
        .custom((val, { req }) => {
            req.body.slug = slugify(val);
            return true;
        }),
    check("email")
        .notEmpty()
        .withMessage("Email required")
        .isEmail()
        .withMessage("Please enter a valid email address")
        .custom((val) =>
            User.findOne({ email: val }).then((user) => {
                if (user) {
                    return Promise.reject(new Error("Email already in use"));
                }
            })
        ),
    check("password")
        .notEmpty()
        .withMessage("Please enter a passowrd")
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters")
        .custom((password, { req }) => {
            if (password !== req.body.passwordConfirm) {
                throw new Error("Password confirmation failed");
            }
            return true;
        }),
    check("passwordConfirm").notEmpty().withMessage("Passowrd confirmation required"),
    check("phone")
        .optional()
        .isMobilePhone(["tr-TR" /*Add another locales as needed */])
        .withMessage("Please enter a Turkish phone number"),
    check("profileImg").optional(),
    check("role").optional(),
    validatorMiddleware,
];

exports.getUserValidator = [
    check("id").isMongoId().withMessage("Invalid User id format"),
    validatorMiddleware,
];

exports.updateUserValidator = [
    check("id").isMongoId().withMessage("Invalid User id format"),
    body("name")
        .optional()
        .custom((val, { req }) => {
            req.body.slug = slugify(val);
            return true;
        }),
    check("email")
        .notEmpty()
        .withMessage("Email required")
        .isEmail()
        .withMessage("Please enter a valid email address")
        .custom((val) =>
            User.findOne({ email: val }).then((user) => {
                if (user) {
                    return Promise.reject(new Error("Email already in use"));
                }
            })
        ),
    check("phone")
        .optional()
        .isMobilePhone(["tr-TR" /*Add another locales as needed */])
        .withMessage("Please enter a Turkish phone number"),
    check("profileImg").optional(),
    check("role").optional(),

    validatorMiddleware,
];

exports.changeUserPasswordValidator = [
    check("id").isMongoId().withMessage("Invalid User id format"),
    body("currentPassword").notEmpty().withMessage("You must enter your current password"),
    body("passwordConfirm").notEmpty().withMessage("Please enter the password confirmation"),
    body("password")
        .notEmpty()
        .withMessage("Please enter the new password")
        .custom(async (val, { req }) => {
            //1- verify current password
            const user = await User.findById(req.params.id);
            if (!user) {
                throw new Error("There's no user for this ID");
            }
            const isCorrectPassword = await bcrypt.compare(req.body.currentPassword, user.password);
            if (!isCorrectPassword) {
                throw new Error("Your current password is incorrect");
            }
            //2- verify password confirmation
            if (val !== req.body.passwordConfirm) {
                throw new Error("Password confirmation failed");
            }
            return true;
        }),
    validatorMiddleware,
];

exports.deleteUserValidator = [
    check("id").isMongoId().withMessage("Invalid User id format"),
    validatorMiddleware,
];

exports.updateLoggedUserValidator = [
    body("name")
        .optional()
        .custom((val, { req }) => {
            req.body.slug = slugify(val);
            return true;
        }),
    check("email")
        .notEmpty()
        .withMessage("Email required")
        .isEmail()
        .withMessage("Please enter a valid email address")
        .custom((val) =>
            User.findOne({ email: val }).then((user) => {
                if (user) {
                    return Promise.reject(new ApiError("Email already in use", 400));
                }
            })
        ),
    check("phone")
        .optional()
        .isMobilePhone(["tr-TR" /*Add another locales as needed */])
        .withMessage("Please enter a Turkish phone number"),

    validatorMiddleware,
];
