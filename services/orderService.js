const stripe = require("stripe")(process.env.STRIPE_SECRET);
const asyncHandler = require("express-async-handler");

const ApiError = require("../utils/apiError");
const factory = require("./handlersFactory");

const Product = require("../models/productModel");
const Cart = require("../models/cartModel");
const Order = require("../models/orderModel");

// @desc    Create cash order
// @route   POST /api/v1/orders/cartId
// @access  Protected/User
exports.createCashOrder = asyncHandler(async (req, res, next) => {
    //App settings
    const taxPrice = 0;
    const shippingPrice = 0;

    //1- Get cart depending on cartId
    const cart = await Cart.findById(req.params.cartId);
    if (!cart) return next(new ApiError(`There's no cart with ID: ${req.params.cartId}`, 404));

    //2- Get order price depending on cart price "check if coupon is applied"
    const cartPrice = cart.totalPriceAfterDiscount
        ? cart.totalPriceAfterDiscount
        : cart.totalCartPrice;
    const totalOrderPrice = cartPrice + taxPrice + shippingPrice;

    //3- Create order with default payment method (cash)
    const order = await Order.create({
        user: req.user._id,
        cartItems: cart.cartItems,
        shippingAddress: req.body.shippingAddress,
        totalOrderPrice,
    });
    //4- After creating order, decrease product quantity and increase product sold quantity
    if (order) {
        const bulkOption = cart.cartItems.map((item) => ({
            updateOne: {
                filter: { _id: item.product },
                update: { $inc: { quantity: -item.quantity, sold: +item.quantity } },
            },
        }));
        await Product.bulkWrite(bulkOption, {});

        //5- Clear cart depending on cartId
        await Cart.findByIdAndDelete(req.params.cartId);
    }

    res.status(201).json({
        success: "success",
        data: order,
    });
});

exports.filterOrderForLoggedUser = asyncHandler(async (req, res, next) => {
    if (req.user.role === "user") req.filterObj = { user: req.user._id };
    next();
});

// @desc    Get all order
// @route   POST /api/v1/orders
// @access  Protected/User-Admin-Manager
exports.findAllOrders = factory.getAll(Order);

// @desc    Get all order
// @route   POST /api/v1/orders
// @access  Protected/User-Admin-Manager
exports.findSpecificOrder = factory.getOne(Order);

// @desc    Update order paid status to paid
// @route   PUT /api/v1/orders/:id/pay
// @access  Protected/Admin-Manager
exports.updateOrderToPaid = asyncHandler(async (req, res, next) => {
    const order = await Order.findById(req.params.id);
    if (!order) {
        return next(new ApiError(`There's no order with ID: ${req.params.id}`, 404));
    }

    //Update order to paid
    order.isPaid = true;
    order.paidAt = Date.now();
    const updateOrder = await order.save();

    res.status(200).json({
        success: "success",
        data: updateOrder,
    });
});

// @desc    Update order delivered status to delivered
// @route   PUT /api/v1/orders/:id/deliver
// @access  Protected/Admin-Manager
exports.updateOrderToDelivered = asyncHandler(async (req, res, next) => {
    const order = await Order.findById(req.params.id);
    if (!order) {
        return next(new ApiError(`There's no order with ID: ${req.params.id}`, 404));
    }

    //Update order to delivered
    order.isDelivered = true;
    order.deliveredAt = Date.now();
    const updateOrder = await order.save();

    res.status(200).json({
        success: "success",
        data: updateOrder,
    });
});

// @desc    Get checkout session from stripe and send it as response
// @route   GET /api/v1/orders/checkout-session/cartId
// @access  Protected/User
exports.checkoutSession = asyncHandler(async (req, res, next) => {
    //App settings
    const taxPrice = 0;
    const shippingPrice = 0;

    //1- Get cart depending on cartId
    const cart = await Cart.findById(req.params.cartId);
    if (!cart) return next(new ApiError(`There's no cart with ID: ${req.params.cartId}`, 404));

    //2- Get order price depending on cart price "check if coupon is applied"
    const cartPrice = cart.totalPriceAfterDiscount
        ? cart.totalPriceAfterDiscount
        : cart.totalCartPrice;
    const totalOrderPrice = cartPrice;

    //3- Create stripe checout session
    const session = await stripe.checkout.sessions.create({
        line_items: [
            {
                price_data: {
                    currency: "try",
                    unit_amount: totalOrderPrice * 100,
                    product_data: {
                        name: req.user.name,
                    },
                },
                quantity: 1,
            },
        ],
        mode: "payment",
        success_url: `${req.protocol}://${req.get("host")}/api/v1/orders`,
        cancel_url: `${req.protocol}://${req.get("host")}/api/v1/cart`,
        customer_email: req.user.email,
        client_reference_id: req.params.cartId,
        metadata: req.body.shippingAddress,
    });
    //4- Send session to response
    res.status(200).json({ status: "success", session });
});

exports.webhookCheckout = asyncHandler(async (req, res, next) => {
    const sig = req.headers["stripe-signature"];

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
});
