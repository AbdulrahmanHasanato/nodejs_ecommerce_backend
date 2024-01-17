const path = require("path");

const express = require("express");
const dotenv = require("dotenv");
const morgan = require("morgan");
const cors = require("cors");
const compression = require("compression");

dotenv.config({ path: "config.env" });
const dbConnection = require("./config/database");
const ApiError = require("./utils/apiError");
const globalError = require("./middlewares/errorMiddleware");

// Mount Routes
const mountRoutes = require("./routes");
const { webhookCheckout } = require("./services/orderService");

//Connect with DB
dbConnection();

//Express apps
const app = express();

//Allow other domains to access the application
app.use(cors());
app.options("*", cors());

//Compress all responses
app.use(compression());

//Checkout webhook
app.post("/webhook-checkout", express.raw({ type: "application/json" }), webhookCheckout);

//Middlewares
app.use(express.json());
app.use(express.static(path.join(__dirname, "uploads")));

if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
    console.log(`Mode: ${process.env.NODE_ENV}`);
}

mountRoutes(app);
app.all("*", (req, res, next) => {
    next(new ApiError(`Can't find this route: ${req.originalUrl}`, 400));
});

// Global error handling middleware for express
app.use(globalError);

const PORT = process.env.PORT || 8000;
const server = app.listen(PORT, () => {
    console.log(`App running on port: ${PORT}`);
});

// Handle rejections outside express
process.on("unhandledRejection", (err) => {
    console.error(`UnhandledRejection error: ${err.name} | ${err.message}`);
    server.close(() => {
        console.error("Sutting server down...");
        process.exit(1);
    });
});
