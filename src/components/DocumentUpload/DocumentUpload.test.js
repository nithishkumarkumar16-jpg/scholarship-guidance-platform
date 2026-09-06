jest.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: jest.fn(),
}));

import { shouldUseMockCaptcha } from "./captchaConfig";

describe("shouldUseMockCaptcha", () => {
  test("falls back to a local mock when no Enterprise key is configured in development", () => {
    expect(shouldUseMockCaptcha("", "development")).toBe(true);
  });

  test("keeps the real Google Enterprise flow enabled in production", () => {
    expect(shouldUseMockCaptcha("real-key", "production")).toBe(false);
  });
});
