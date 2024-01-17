const mongoose = require("mongoose");
const Product = require("./productModel");

const reviewSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            trim: true,
            required: [true, "Title is required"],
        },
        ratings: {
            type: Number,
            min: [1, "Rating must be above or equal 1.0"],
            max: [5, "Rating must be below or equal 5.0"],
            required: [true, "Reviews must have a rating"],
        },
        user: {
            type: mongoose.Schema.ObjectId,
            ref: "User",
            required: [true, "Review must belong to a user"],
        },
        //Parent reference (one to many)
        product: {
            type: mongoose.Schema.ObjectId,
            ref: "Product",
            required: [true, "Review must belong to a product"],
        },
    },
    { timestamps: true }
);

reviewSchema.pre(/^find/, function (next) {
    this.populate({ path: "user", select: "name" });
    next();
});

reviewSchema.statics.calcAverageRatingsAndQuantity = async function (productId) {
    const result = await this.aggregate([
        //Stage 1: get all reviews in specific product
        {
            $match: { product: productId },
        },
        //Stage 2: Grpup reviews based on productID and calculate avgRatings, ratingsQuantity
        {
            $group: {
                _id: "product",
                avgRatings: { $avg: "$ratings" },
                ratingsQuantity: { $sum: 1 },
            },
        },
    ]);
    console.log(result);
    if (result.length > 0) {
        await Product.findByIdAndUpdate(productId, {
            ratingsAverage: result[0].avgRatings,
            ratingsQuantity: result[0].ratingsQuantity,
        });
    } else {
        await Product.findByIdAndUpdate(productId, {
            ratingsAverage: 0,
            ratingsQuantity: 0,
        });
    }
};

reviewSchema.post("save", async function () {
    await this.constructor.calcAverageRatingsAndQuantity(this.product);
});

reviewSchema.post("remove", async function () {
    await this.constructor.calcAverageRatingsAndQuantity(this.product);
});

module.exports = mongoose.model("Review", reviewSchema);
