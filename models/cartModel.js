const mongoose = require("mongoose");

const CartSchema = new mongoose.Schema(
    {
        cartItems: [
            {
                productId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Product",
                },
                quantity: {
                    type: Number,
                    default: 1,
                },
                color: String,
                price: Number,
            },
        ],
        totalCartPrice: Number,
        totalPriceAfterDiscount: Number,
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);
module.exports = mongoose.model("Cart", CartSchema);
