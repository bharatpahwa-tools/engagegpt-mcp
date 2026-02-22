import Organization from "../models/organization.js";
import Member from "../models/members.js";

const addToActivityLog = async (id, logEntry) => {
  return await Organization.findByIdAndUpdate(
    id,
    { $push: { activityLog: logEntry } },
    { new: true },
  );
};

const addTransaction = async (id, transaction) => {
  return await Organization.findByIdAndUpdate(
    id,
    { $push: { "credits.transactions": transaction } },
    { new: true },
  );
};

// Use existing member repository methods
const findMemberById = async (memberId) => {
  return await Member.findById(memberId);
};

const findOrganizationById = async (organizationId) => {
  return await Organization.findById(organizationId);
};

const updateMemberCredits = async (
  memberId,
  { creditsUsedToday, lastActive, totalCreditsUsed },
) => {
  const update = {
    creditsUsedToday,
  };

  if (totalCreditsUsed !== undefined) {
    update.totalCreditsUsed = totalCreditsUsed;
  }

  const updatedMember = await Member.findByIdAndUpdate(memberId, update, {
    new: true,
  });
  return updatedMember;
};

const updateOrganizationCredits = async (
  orgId,
  { balance, totalUsed, transaction },
) => {
  const update = {
    "credits.balance": balance,
    "credits.totalUsed": totalUsed,
  };

  if (transaction) {
    update.$push = { "credits.transactions": transaction };
  }

  update.lastActive = new Date();

  const updatedOrg = await Organization.findByIdAndUpdate(orgId, update, {
    new: true,
  });
  return updatedOrg;
};

const checkMemberCredits = async (memberId, requiredCredits) => {
  const member = await Member.findById(memberId);
  if (!member) {
    throw new Error("Member not found");
  }
  // MCP Member model doesn't have creditsLeft, it has creditLimitperDay and creditsUsedToday
  const creditsLeft =
    (member.creditLimitperDay || 0) - (member.creditsUsedToday || 0);
  return creditsLeft >= requiredCredits;
};

const checkOrganizationCredits = async (organizationId, requiredCredits) => {
  const organization = await Organization.findById(organizationId);
  if (!organization) {
    throw new Error("Organization not found");
  }
  // MCP Organization model has credits.balance
  return (organization.credits?.balance || 0) >= requiredCredits;
};

const getMemberCredits = async (memberId) => {
  const member = await Member.findById(memberId);
  if (!member) {
    throw new Error("Member not found");
  }
  const creditsLeft =
    (member.creditLimitperDay || 0) - (member.creditsUsedToday || 0);
  return {
    creditsLeft: creditsLeft,
    totalCreditsUsed: member.totalCreditsUsed || 0,
  };
};

const getMembersByOrganizationWithCredits = async (organizationId) => {
  const members = await Member.find({ organizationId });
  return members.map((member) => {
    const creditsLeft =
      (member.creditLimitperDay || 0) - (member.creditsUsedToday || 0);
    return {
      id: member._id,
      name: member.name,
      email: member.email,
      creditsLeft: creditsLeft,
      totalCreditsUsed: member.totalCreditsUsed || 0,
      lastActive: member.lastActive,
    };
  });
};

export {
  addToActivityLog,
  addTransaction,
  findMemberById,
  findOrganizationById,

  // Individual credit updates
  updateMemberCredits,
  updateOrganizationCredits,

  // Credit checks
  checkMemberCredits,
  checkOrganizationCredits,

  // Credit getters
  getMemberCredits,

  // Aggregated data fetch
  getMembersByOrganizationWithCredits,
};
