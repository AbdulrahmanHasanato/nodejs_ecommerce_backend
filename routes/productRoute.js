const express = require("express");
const {
    getProductValidator,
    createProductValidator,
    updateProductValidator,
    deleteProductValidator,
} = require("../utils/validators/productValidator");

const {
    getProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadProductImages,
    resizeProductImages,
} = require("../services/productService");

const authService = require("../services/authService");
const reviewsRoute = require("./reviewRoute");

const router = express.Router();

//POST  /products/kjhbakrf7y2huf2/reviews
//GET   /products/kjhbakrf7y2huf2/reviews
//GET   /products/kjhbakrf7y2huf2f33/reviews/ahgf34yrbw4rb3a3hp
router.use("/:productId/reviews", reviewsRoute);

router
    .route("/")
    .get(getProducts)
    .post(
        authService.protect,
        authService.allowedTo("admin", "manager"),
        uploadProductImages,
        resizeProductImages,
        createProductValidator,
        createProduct
    );
router
    .route("/:id")
    .get(getProductValidator, getProduct)
    .put(
        authService.protect,
        authService.allowedTo("admin", "manager"),
        uploadProductImages,
        resizeProductImages,
        updateProductValidator,
        updateProduct
    )
    .delete(
        authService.protect,
        authService.allowedTo("admin"),
        deleteProductValidator,
        deleteProduct
    );

module.exports = router;
