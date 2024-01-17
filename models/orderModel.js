const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.ObjectId,
            ref: "User",
            required: [true, "Order must belong to a user"],
        },
        cartItems: [
            {
                productId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Product",
                },
                quantity: Number,
                color: String,
                price: Number,
            },
        ],
        taxPrice: {
            type: Number,
            default: 0,
        },
        shippingAddress: {
            details: String,
            phone: String,
            city: String,
            postalCode: String,
        },
        shippingPrice: {
            type: Number,
            default: 0,
        },
        totalOrderPrice: {
            type: Number,
        },
        paymentMethodType: {
            type: String,
            enum: ["Cash", "Credit Card"],
            default: "Cash",
        },
        isPaid: {
            type: Boolean,
            default: false,
        },
        paidAt: Date,
        isDelivered: {
            type: Boolean,
            default: false,
        },
        deliveredAt: Date,
    },
    { timestamps: true }
);

OrderSchema.pre(/^find/, function (next) {
    this.populate({
        path: "user",
        select: "name profileImg email phone",
    }).populate({
        path: "cartItems.productId",
        select: "title imageCover",
    });
    next();
});

module.exports = mongoose.model("Order", OrderSchema);
