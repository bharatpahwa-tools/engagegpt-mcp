import * as organizationRepository from "../repositories/organizationRepository.js";

const logActivity = async (organizationId, action, metadata) => {
  console.log(organizationId, action, metadata);
  try {
    const logEntry = {
      action,
      timestamp: new Date(),
      metadata,
    };

    await organizationRepository.addToActivityLog(organizationId, logEntry);
    console.log("Logged User activity");
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
};

const logTransaction = async (organizationId, transactionData) => {
  console.log("LOGGING TRANSACTION:", organizationId, transactionData);
  try {
    const transaction = {
      type: transactionData.type || "usage",
      amount: transactionData.amount || 0,
      balance: transactionData.balance || 0,
      description: transactionData.description,
      metadata: transactionData.metadata || {},
      createdAt: new Date(),
    };

    await organizationRepository.addTransaction(organizationId, transaction);
    console.log("Logged Organization transaction");
  } catch (error) {
    console.error("Failed to log transaction:", error);
  }
};

export { logActivity, logTransaction };
