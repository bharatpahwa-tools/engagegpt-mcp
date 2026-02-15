import dotenv from "dotenv";
import mongoose from "mongoose";
dotenv.config();

const createConnections = () => {
  const DB = process.env.DATABASE;

  if (!DB) {
    console.error("Database URLs are missing in environment variables!");
    process.exit(1);
  }

  const newDBConnection = mongoose.createConnection(DB, {});

  newDBConnection.on("connected", () => {});
  newDBConnection.on("error", (error) => {
    console.error("New MongoDB Connection Error:", error);
  });
  return { newDBConnection };
};

const connections = createConnections();
export const { newDBConnection } = connections;
export default connections;
