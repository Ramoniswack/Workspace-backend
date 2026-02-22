const { z } = require("zod");

const sendInviteSchema = z.object({
  email: z
    .string()
    .email("Please provide a valid email address")
    .min(1, "Email is required")
    .toLowerCase(),
  role: z
    .enum(["admin", "member"])
    .default("member")
});

module.exports = {
  sendInviteSchema
};

export {};
