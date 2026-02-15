import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";
dotenv.config();

import AppError from "./utils/appError.js";
import oauthRouter from "./routes/oauthRoutes.js";
import mcpRouter from "./routes/mcpRoutes.js";

const app = express();
const NODE_ENV = process.env.NODE_ENV || "development";
const claudeDomains = ["https://claude.ai", "https://api.claude.ai"];

const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:3000"];

const allOrigins = [...corsOrigins, ...claudeDomains];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allOrigins.some((allowed) => origin.startsWith(allowed))) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-engage-gpt-mcp-token",
    "mcp-protocol-version",
    "mcp-connection-token",
    "Mcp-Session-Id",
  ],
  exposedHeaders: ["Mcp-Session-Id", "WWW-Authenticate"],
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
app.use(
  compression({
    filter: (req, res) => {
      if (req.path.includes("/sse")) {
        return false;
      }
      return compression.filter(req, res);
    },
  }),
);
app.use(mongoSanitize());
app.use("/api/", limiter);
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.static("public"));

// Health check endpoint
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "MCP Server is healthy",
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Mount OAuth routes BEFORE root route (required for mcp-remote)
app.use("/", oauthRouter);
app.use("/mcp/oauth", oauthRouter);

// Mount MCP router
app.use("/mcp", mcpRouter);

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
