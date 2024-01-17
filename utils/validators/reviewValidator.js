const { check, body } = require("express-validator");
const validatorMiddleware = require("../../middlewares/validatorMiddleware");
const Review = require("../../models/reviewModel");

exports.createReviewValidator = [
    check("title").optional(),
    check("ratings")
        .notEmpty()
        .withMessage("Ratings value is required")
        .isFloat({ min: 1, max: 5 })
        .withMessage("Ratings value must be between 1 and 5"),
    check("user").isMongoId().withMessage("Invalid user id format"),
    check("product")
        .isMongoId()
        .withMessage("Invalid product id format")
        .custom((val, { req }) =>
            //Check if the logged user created a review before
            Review.findOne({ user: req.user._id, product: req.body.product }).then((review) => {
                if (review) {
                    return Promise.reject(
                        new Error("You have already created a review for this product")
                    );
                }
            })
        ),

    validatorMiddleware,
];

exports.getReviewValidator = [
    check("id").isMongoId().withMessage("Invalid Review id format"),
    validatorMiddleware,
];

exports.updateReviewValidator = [
    check("id")
        .isMongoId()
        .withMessage("Invalid Review id format")
        .custom((val, { req }) =>
            //Check review ownership before updating
            Review.findById(val).then((review) => {
                if (!review) {
                    return Promise.reject(new Error(`There is no review with id ${val}`));
                }
                if (review.user._id.toString() !== req.user._id.toString()) {
                    return Promise.reject(new Error("You are not allowed to perform this action"));
                }
            })
        ),
    validatorMiddleware,
];

exports.deleteReviewValidator = [
    check("id")
        .isMongoId()
        .withMessage("Invalid Review id format")
        .custom((val, { req }) => {
            //Check review ownership before updating
            if (req.user.role === "user") {
                return Review.findById(val).then((review) => {
                    if (!review) {
                        return Promise.reject(new Error(`There is no review with id ${val}`));
                    }
                    if (review.user._id.toString() !== req.user._id.toString()) {
                        return Promise.reject(
                            new Error("You are not allowed to perform this action")
                        );
                    }
                });
            }
            return true;
        }),
    validatorMiddleware,
];
