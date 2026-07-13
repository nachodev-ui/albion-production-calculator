import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AccountApiError,
  createBillingCheckout,
  createBillingPortal,
} from "./accountApi";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("billing account API", () => {
  it("creates an authenticated checkout redirect", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ url: "https://checkout.lemonsqueezy.com/example" }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(createBillingCheckout("access-token")).resolves.toEqual({
      url: "https://checkout.lemonsqueezy.com/example",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/billing\/checkout$/);
    expect(options.method).toBe("POST");
    expect(options.cache).toBe("no-store");
    expect(options.headers).toMatchObject({
      Accept: "application/json",
      Authorization: "Bearer access-token",
    });
  });

  it("rejects a provider redirect that is not HTTPS", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ url: "http://billing.example/portal" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(createBillingPortal("access-token")).rejects.toMatchObject({
      name: "AccountApiError",
      status: 502,
    } satisfies Partial<AccountApiError>);
  });

  it("preserves a controlled API error response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "subscription not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(createBillingPortal("access-token")).rejects.toMatchObject({
      message: "subscription not found",
      status: 404,
    });
  });
});
