const { z } = require("zod");

const registerDeviceSchema = z.object({
  token: z.string().min(1, "Device token is required"),
  platform: z.enum(["web", "android", "ios"], {
    errorMap: () => ({ message: "Platform must be web, android, or ios" }),
  }),
});

const unregisterDeviceSchema = z.object({
  token: z.string().min(1, "Device token is required"),
});

module.exports = {
  registerDeviceSchema,
  unregisterDeviceSchema,
};

export {};
