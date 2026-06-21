import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockConnectDB, mockUserFindById } = vi.hoisted(() => ({
  mockConnectDB: vi.fn(),
  mockUserFindById: vi.fn(),
}));
vi.mock("@/lib/mongodb", () => ({ connectDB: mockConnectDB }));
vi.mock("@/models/User", () => ({ User: { findById: (...a: unknown[]) => mockUserFindById(...a) } }));

function leanResult(result: unknown) {
  return { select: () => ({ lean: () => Promise.resolve(result) }) };
}

const agent = { id: "agent1", role: "agent", email: "a@x.com" } as never;
const admin = { id: "adminX", role: "admin", email: "ad@x.com" } as never;

beforeEach(() => {
  vi.resetAllMocks();
  mockConnectDB.mockResolvedValue(undefined);
});
afterEach(() => vi.restoreAllMocks());

describe("assertOwnsCustomer", () => {
  it("allows the owning agent", async () => {
    mockUserFindById.mockReturnValueOnce(leanResult({ _id: "c1", email: "c@x.com", role: "customer", agentId: "agent1" }));
    const { assertOwnsCustomer } = await import("./agentOwnership");
    const c = await assertOwnsCustomer(agent, "c1");
    expect(c.id).toBe("c1");
  });

  it("403s a non-owning agent", async () => {
    mockUserFindById.mockReturnValueOnce(leanResult({ _id: "c1", email: "c@x.com", role: "customer", agentId: "someoneElse" }));
    const { assertOwnsCustomer } = await import("./agentOwnership");
    await expect(assertOwnsCustomer(agent, "c1")).rejects.toMatchObject({ status: 403 });
  });

  it("lets an admin act on any customer", async () => {
    mockUserFindById.mockReturnValueOnce(leanResult({ _id: "c1", email: "c@x.com", role: "customer", agentId: "otherAgent" }));
    const { assertOwnsCustomer } = await import("./agentOwnership");
    const c = await assertOwnsCustomer(admin, "c1");
    expect(c.id).toBe("c1");
  });

  it("404s when the target is missing or not a customer", async () => {
    mockUserFindById.mockReturnValueOnce(leanResult(null));
    const { assertOwnsCustomer } = await import("./agentOwnership");
    await expect(assertOwnsCustomer(agent, "c1")).rejects.toMatchObject({ status: 404 });

    mockUserFindById.mockReturnValueOnce(leanResult({ _id: "ag2", role: "agent" }));
    const mod = await import("./agentOwnership");
    await expect(mod.assertOwnsCustomer(agent, "ag2")).rejects.toMatchObject({ status: 404 });
  });
});
