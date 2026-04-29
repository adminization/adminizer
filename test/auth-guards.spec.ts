import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  requireAnyPermission,
  requireAuthAPI,
  requireAuthUI,
  requirePermission,
} from "../src/middlewares/authGuards";

const redirectToLoginMock = vi.fn();

vi.mock("../src/helpers/inertiaAutHelper", () => ({
  redirectToLogin: (...args: any[]) => redirectToLoginMock(...args),
}));

type MockReq = any;
type MockRes = any;

function createReq(overrides: Partial<MockReq> = {}): MockReq {
  return {
    adminizer: {
      config: {
        auth: { enable: true },
      },
      accessRightsHelper: {
        hasPermission: vi.fn().mockReturnValue(false),
        enoughPermissions: vi.fn().mockReturnValue(false),
      },
    },
    user: undefined,
    i18n: { __: (v: string) => v },
    ...overrides,
  };
}

function createRes(): MockRes {
  const res: MockRes = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    sendStatus: vi.fn().mockReturnThis(),
    headersSent: false,
  };

  return res;
}

describe("authGuards middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requireAuthAPI returns 401 when auth is enabled and user is missing", () => {
    const req = createReq();
    const res = createRes();
    const next = vi.fn();

    requireAuthAPI()(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("requireAuthUI redirects to login when auth is enabled and user is missing", () => {
    const req = createReq();
    const res = createRes();
    const next = vi.fn();

    requireAuthUI()(req, res, next);

    expect(redirectToLoginMock).toHaveBeenCalledWith(req, res);
    expect(next).not.toHaveBeenCalled();
  });

  it("requirePermission returns 403 when user has no token", () => {
    const req = createReq({
      user: { id: 1, login: "john" },
      adminizer: {
        config: {
          auth: { enable: true },
        },
        accessRightsHelper: {
          hasPermission: vi.fn().mockReturnValue(false),
        },
      },
    });
    const res = createRes();
    const next = vi.fn();

    requirePermission("read-test-model")(req, res, next);

    expect(req.adminizer.accessRightsHelper.hasPermission).toHaveBeenCalledWith("read-test-model", req.user);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" });
    expect(next).not.toHaveBeenCalled();
  });

  it("requirePermission calls next when user has token", () => {
    const req = createReq({
      user: { id: 1, login: "john" },
      adminizer: {
        config: {
          auth: { enable: true },
        },
        accessRightsHelper: {
          hasPermission: vi.fn().mockReturnValue(true),
        },
      },
    });
    const res = createRes();
    const next = vi.fn();

    requirePermission("read-test-model")(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("requireAnyPermission calls next when at least one token matches", () => {
    const req = createReq({
      user: { id: 1, login: "john" },
      adminizer: {
        config: {
          auth: { enable: true },
        },
        accessRightsHelper: {
          enoughPermissions: vi.fn().mockReturnValue(true),
        },
      },
      params: { entityName: "test" },
    });
    const res = createRes();
    const next = vi.fn();

    requireAnyPermission(["create-test-model", "update-test-model"])(req, res, next);

    expect(req.adminizer.accessRightsHelper.enoughPermissions).toHaveBeenCalledWith(
      ["create-test-model", "update-test-model"],
      req.user
    );
    expect(next).toHaveBeenCalledTimes(1);
  });
});
