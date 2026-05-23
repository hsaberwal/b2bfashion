import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

const { mockSend, mockUserFind, mockConnectDB, mockGetStored } = vi.hoisted(() => ({
  mockSend: vi.fn(),
  mockUserFind: vi.fn(),
  mockConnectDB: vi.fn(),
  mockGetStored: vi.fn(),
}));

vi.mock("resend", () => {
  class Resend {
    emails = { send: mockSend };
  }
  return { Resend };
});

vi.mock("@/lib/mongodb", () => ({
  connectDB: mockConnectDB,
}));

vi.mock("@/models/User", () => ({
  User: {
    find: (...args: unknown[]) => mockUserFind(...args),
  },
}));

vi.mock("@/lib/notificationRecipients", () => ({
  getStoredRecipients: mockGetStored,
}));

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  mockSend.mockReset();
  mockUserFind.mockReset();
  mockConnectDB.mockReset();
  mockGetStored.mockReset();
  // Successful resend response by default.
  mockSend.mockResolvedValue({ id: "em_1" });
  // Default: no users in DB unless a test overrides.
  mockUserFind.mockReturnValue({ select: () => ({ lean: () => Promise.resolve([]) }) });
  // Default: no DB-managed recipients unless a test overrides.
  mockGetStored.mockResolvedValue([]);
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

const baseData = {
  orderId: "abc123",
  orderShortCode: "abc123",
  customerName: "Jane Buyer",
  customerCompany: "Acme",
  customerEmail: "jane@acme.com",
  total: 199.99,
  paymentOption: "pay_deposit",
  paymentStatus: "paid",
  itemCount: 4,
  signedAt: new Date("2026-05-15T10:00:00Z"),
};

describe("sendNewOrderEmail", () => {
  it("skips silently when EMAIL_API_KEY is missing", async () => {
    delete process.env.EMAIL_API_KEY;
    process.env.EMAIL_FROM = "from@example.com";
    const { sendNewOrderEmail } = await import("./adminNotifications");
    await sendNewOrderEmail(baseData);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("skips silently when EMAIL_FROM is missing", async () => {
    process.env.EMAIL_API_KEY = "re_test";
    delete process.env.EMAIL_FROM;
    const { sendNewOrderEmail } = await import("./adminNotifications");
    await sendNewOrderEmail(baseData);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("uses the DB-managed recipient list first, ahead of env and admin users", async () => {
    process.env.EMAIL_API_KEY = "re_test";
    process.env.EMAIL_FROM = "from@example.com";
    process.env.ADMIN_NOTIFICATION_EMAILS = "ops@example.com";
    mockGetStored.mockResolvedValue(["sales@example.com", "warehouse@example.com"]);
    const { sendNewOrderEmail } = await import("./adminNotifications");
    await sendNewOrderEmail(baseData);
    expect(mockUserFind).not.toHaveBeenCalled();
    const args = (mockSend as Mock).mock.calls[0][0];
    expect(args.to).toEqual(["sales@example.com", "warehouse@example.com"]);
  });

  it("falls back to ADMIN_NOTIFICATION_EMAILS when the DB list is empty", async () => {
    process.env.EMAIL_API_KEY = "re_test";
    process.env.EMAIL_FROM = "from@example.com";
    process.env.ADMIN_NOTIFICATION_EMAILS = "ops@example.com, manager@example.com";
    mockGetStored.mockResolvedValue([]);
    const { sendNewOrderEmail } = await import("./adminNotifications");
    await sendNewOrderEmail(baseData);
    expect(mockUserFind).not.toHaveBeenCalled();
    const args = (mockSend as Mock).mock.calls[0][0];
    expect(args.to).toEqual(["ops@example.com", "manager@example.com"]);
  });

  it("falls back to admin role users when ADMIN_NOTIFICATION_EMAILS is unset", async () => {
    process.env.EMAIL_API_KEY = "re_test";
    process.env.EMAIL_FROM = "from@example.com";
    delete process.env.ADMIN_NOTIFICATION_EMAILS;
    mockUserFind.mockReturnValue({
      select: () => ({ lean: () => Promise.resolve([{ email: "admin@example.com" }]) }),
    });
    const { sendNewOrderEmail } = await import("./adminNotifications");
    await sendNewOrderEmail(baseData);
    expect(mockConnectDB).toHaveBeenCalled();
    expect(mockUserFind).toHaveBeenCalledWith({ role: "admin" });
    const args = (mockSend as Mock).mock.calls[0][0];
    expect(args.to).toEqual(["admin@example.com"]);
  });

  it("skips send when there are no recipients to email", async () => {
    process.env.EMAIL_API_KEY = "re_test";
    process.env.EMAIL_FROM = "from@example.com";
    delete process.env.ADMIN_NOTIFICATION_EMAILS;
    mockUserFind.mockReturnValue({ select: () => ({ lean: () => Promise.resolve([]) }) });
    const { sendNewOrderEmail } = await import("./adminNotifications");
    await sendNewOrderEmail(baseData);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("composes a subject that includes the order code, total, and customer", async () => {
    process.env.EMAIL_API_KEY = "re_test";
    process.env.EMAIL_FROM = "from@example.com";
    process.env.ADMIN_NOTIFICATION_EMAILS = "ops@example.com";
    const { sendNewOrderEmail } = await import("./adminNotifications");
    await sendNewOrderEmail(baseData);
    const args = (mockSend as Mock).mock.calls[0][0];
    expect(args.subject).toContain("abc123");
    expect(args.subject).toContain("£199.99");
    expect(args.subject).toContain("Jane Buyer");
  });

  it("includes a link back to the order page using NEXTAUTH_URL", async () => {
    process.env.EMAIL_API_KEY = "re_test";
    process.env.EMAIL_FROM = "from@example.com";
    process.env.ADMIN_NOTIFICATION_EMAILS = "ops@example.com";
    process.env.NEXTAUTH_URL = "https://claudia-c.com";
    const { sendNewOrderEmail } = await import("./adminNotifications");
    await sendNewOrderEmail({ ...baseData, orderId: "ord_42" });
    const args = (mockSend as Mock).mock.calls[0][0];
    expect(args.html).toContain("https://claudia-c.com/admin/orders/ord_42");
  });

  it("swallows Resend errors so a failed send never breaks the caller", async () => {
    process.env.EMAIL_API_KEY = "re_test";
    process.env.EMAIL_FROM = "from@example.com";
    process.env.ADMIN_NOTIFICATION_EMAILS = "ops@example.com";
    mockSend.mockRejectedValueOnce(new Error("network down"));
    const { sendNewOrderEmail } = await import("./adminNotifications");
    // Should resolve without throwing.
    await expect(sendNewOrderEmail(baseData)).resolves.toBeUndefined();
  });
});
