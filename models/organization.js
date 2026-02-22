import mongoose from "mongoose";
import { newDBConnection } from "../config/db.js";

const organizationSchema = new mongoose.Schema(
  {
    credits: {
      balance: {
        type: Number,
        default: 0,
      },
      totalUsed: {
        type: Number,
        default: 0,
      },
      transactions: [
        {
          type: {
            type: String,
            enum: [
              "purchase",
              "usage",
              "adjustment",
              "refund",
              "bonus",
              "expiry",
            ],
          },
          amount: { type: Number, required: true },
          balance: { type: Number },
          description: { type: String },
          metadata: { type: mongoose.Schema.Types.Mixed },
          createdAt: { type: Date, default: Date.now },
        },
      ],
    },
    activityLog: [
      {
        action: { type: String },
        timestamp: { type: Date, default: Date.now },
        metadata: { type: mongoose.Schema.Types.Mixed },
      },
    ],
  },
  {
    timestamps: true,
  },
);

const Organization = newDBConnection.model("Organization", organizationSchema);

export default Organization;
