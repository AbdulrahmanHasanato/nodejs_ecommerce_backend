const slugify = require("slugify");
const { check } = require("express-validator");
const validatorMiddleware = require("../../middlewares/validatorMiddleware");
const User = require("../../models/userModel");

exports.signupValidator = [
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
    validatorMiddleware,
];

exports.loginValidator = [
    check("email")
        .notEmpty()
        .withMessage("Email required")
        .isEmail()
        .withMessage("Please enter a valid email address"),
    check("password")
        .notEmpty()
        .withMessage("Please enter a passowrd")
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters"),
    validatorMiddleware,
];
