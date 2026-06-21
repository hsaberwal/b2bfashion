import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockRequireAdmin, mockConnectDB, mockUserFind, mockUserFindOne, mockUserCreate,
  mockUserAggregate, mockHashPassword, mockMakeInviteToken, mockSendAgentInvite, mockAudit,
} = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockConnectDB: vi.fn(),
  mockUserFind: vi.fn(),
  mockUserFindOne: vi.fn(),
  mockUserCreate: vi.fn(),
  mockUserAggregate: vi.fn(),
  mockHashPassword: vi.fn(),
  mockMakeInviteToken: vi.fn(),
  mockSendAgentInvite: vi.fn(),
  mockAudit: vi.fn(),
}));

vi.mock("@/lib/requireAdmin", () => ({ requireAdmin: (...a: unknown[]) => mockRequireAdmin(...a) }));
vi.mock("@/lib/mongodb", () => ({ connectDB: mockConnectDB }));
vi.mock("@/lib/auth", () => ({ hashPassword: (...a: unknown[]) => mockHashPassword(...a) }));
vi.mock("@/lib/audit", () => ({ audit: (...a: unknown[]) => mockAudit(...a) }));
vi.mock("@/lib/rateLimit", () => ({ getClientIp: () => "1.1.1.1" }));
vi.mock("@/lib/agentInvite", () => ({
  makeInviteToken: (...a: unknown[]) => mockMakeInviteToken(...a),
  inviteLink: (t: string) => `https://x/reset-password?token=${t}`,
  sendAgentInviteEmail: (...a: unknown[]) => mockSendAgentInvite(...a),
}));
vi.mock("@/models/User", () => ({
  User: {
    find: (...a: unknown[]) => mockUserFind(...a),
    findOne: (...a: unknown[]) => mockUserFindOne(...a),
    create: (...a: unknown[]) => mockUserCreate(...a),
    aggregate: (...a: unknown[]) => mockUserAggregate(...a),
  },
}));

function chain(result: unknown) {
  const c: Record<string, unknown> = { sort: () => c, select: () => c, lean: () => Promise.resolve(result) };
  return c;
}
function postReq(body: unknown) {
  return new Request("http://x/api/admin/agents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireAdmin.mockResolvedValue({ id: "admin1", email: "a@x.com", role: "admin" });
  mockConnectDB.mockResolvedValue(undefined);
  mockHashPassword.mockResolvedValue("hashed");
  mockMakeInviteToken.mockReturnValue({ token: "tok123", expires: new Date("2030-01-01") });
  mockSendAgentInvite.mockResolvedValue(undefined);
  mockAudit.mockResolvedValue(undefined);
  vi.resetModules();
});
afterEach(() => vi.restoreAllMocks());

describe("GET /api/admin/agents", () => {
  it("403s for non-admins", async () => {
    mockRequireAdmin.mockRejectedValueOnce(Object.assign(new Error("f"), { status: 403 }));
    const { GET } = await import("./route");
    expect((await GET()).status).toBe(403);
  });

  it("lists agents with customer counts", async () => {
    mockUserFind.mockReturnValueOnce(chain([{ _id: "ag1", email: "ag1@x.com", name: "Ag One", active: true, emailVerified: true }]));
    mockUserAggregate.mockResolvedValueOnce([{ _id: "ag1", count: 3 }]);
    const { GET } = await import("./route");
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(mockUserFind).toHaveBeenCalledWith({ role: "agent" });
    expect(data.agents[0]).toMatchObject({ id: "ag1", customerCount: 3, active: true });
  });
});

describe("POST /api/admin/agents", () => {
  it("403s for non-admins", async () => {
    mockRequireAdmin.mockRejectedValueOnce(Object.assign(new Error("f"), { status: 403 }));
    const { POST } = await import("./route");
    expect((await POST(postReq({ email: "x@y.com" }) as never)).status).toBe(403);
  });

  it("400s on a bad email", async () => {
    const { POST } = await import("./route");
    expect((await POST(postReq({ email: "not-an-email" }) as never)).status).toBe(400);
  });

  it("409s when the email already exists", async () => {
    mockUserFindOne.mockReturnValueOnce(chain({ role: "customer" }));
    const { POST } = await import("./route");
    expect((await POST(postReq({ email: "dupe@x.com" }) as never)).status).toBe(409);
  });

  it("creates an agent, emails an invite, and audits", async () => {
    mockUserFindOne.mockReturnValueOnce(chain(null));
    mockUserCreate.mockResolvedValueOnce({ _id: { toString: () => "newAgentId" } });
    const { POST } = await import("./route");
    const res = await POST(postReq({ email: "New@X.com", name: "New Agent" }) as never);
    expect(res.status).toBe(201);
    // created with agent role + invite token, lowercased email
    const createArg = mockUserCreate.mock.calls[0][0] as Record<string, unknown>;
    expect(createArg).toMatchObject({ email: "new@x.com", role: "agent", emailVerified: true, resetToken: "tok123" });
    expect(mockSendAgentInvite).toHaveBeenCalledWith(expect.objectContaining({ to: "new@x.com" }));
    expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "agent_created" }));
  });
});
