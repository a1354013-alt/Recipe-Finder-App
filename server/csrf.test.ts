import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { csrfMiddleware, generateCsrfToken } from "./_core/csrf";

function createResponse() {
  return {
    cookie: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response;
}

describe("csrfMiddleware", () => {
  it("sets a CSRF cookie for safe requests", () => {
    const req = {
      method: "GET",
      path: "/api/health",
      cookies: {},
      headers: {},
      protocol: "http",
    } as unknown as Request;
    const res = createResponse();
    const next = vi.fn();

    csrfMiddleware(req, res, next);

    expect(res.cookie).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledOnce();
  });

  it("rejects unsafe requests without a matching header token", () => {
    const token = generateCsrfToken();
    const req = {
      method: "POST",
      path: "/api/trpc/recipe.favorites.add",
      cookies: { csrf_token: token },
      headers: {},
      protocol: "http",
    } as unknown as Request;
    const res = createResponse();
    const next = vi.fn();

    csrfMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "CSRF token missing in header" });
    expect(next).not.toHaveBeenCalled();
  });

  it("allows unsafe requests when cookie and header tokens match", () => {
    const token = generateCsrfToken();
    const req = {
      method: "POST",
      path: "/api/trpc/recipe.favorites.add",
      cookies: { csrf_token: token },
      headers: { "x-csrf-token": token },
      protocol: "http",
    } as unknown as Request;
    const res = createResponse();
    const next = vi.fn();

    csrfMiddleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});
