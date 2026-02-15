import dotenv from "dotenv";
import app from "./app.js";
import "./config/db.js";
dotenv.config();

const PORT = Number(process.env.PORT) || 8080;
const TimeZone = (process.env.TZ = "UTC");

(async () => {
  try {
    const server = app.listen(PORT, () => {
      console.log(`🚀 MCP Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV.toUpperCase()}`);
      console.log("🕒 Server Time Zone:", TimeZone);
    });

    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}. Shutting down...`);

      server.close(() => {
        console.log("✅ HTTP server closed.");
        process.exit(0);
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));

    process.on("uncaughtException", (err) => {
      console.error("🔥 Uncaught Exception:", err.message);
      process.exit(1);
    });

    process.on("unhandledRejection", (err) => {
      console.error("🔥 Unhandled Rejection:", err.message);
      server.close(() => {
        process.exit(1);
      });
    });
  } catch (e) {
    console.error("❌ Fatal server error:", e);
    process.exit(1);
  }
})();
