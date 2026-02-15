import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";

// UTILS
import AppError from "./utils/appError.js";

// ROUTES
import mcpRouter from "./routes/mcpRoutes.js";

const app = express();

// ENVIRONMENT VARIABLES
const NODE_ENV = process.env.NODE_ENV || "development";

// Enhanced CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
    : ["http://localhost:3000"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-engage-gpt-mcp-token",
    "mcp-protocol-version",
  ],
  credentials: true,
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// Rate limiter
const createRateLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      console.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({ error: message });
    },
  });

const limiter = createRateLimiter(
  15 * 60 * 1000,
  200,
  "Too many requests from this IP, please try again later.",
);

// Middleware
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(helmet());
app.use(compression());
app.use(mongoSanitize());
app.use("/api/", limiter);
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.json({ limit: "10mb" }));

// API Routes
app.use("/mcp", mcpRouter);

// Health check route
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "MCP Server is healthy",
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Default route
app.get("/", (req, res) => {
  res.status(200).json({
    message: "EngageGPT MCP Server is up and running",
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Handle undefined routes
app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err);

  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "production") {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.isOperational ? err.message : "Something went wrong!",
    });
  } else {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }
});

export default app;
