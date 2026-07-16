import { describe, expect, it, vi } from "vitest";
import type { AccountAccess } from "../types";
import { ENTITLEMENT_KEYS } from "../types";
import { AccountApiError } from "./accountApi";
import {
  AccountAccessTimeoutError,
  synchronizeAccountAccess,
} from "./accountAccessSync";

const ACCESS: AccountAccess = {
  user: {
    id: "user-1",
    email: "user@example.com",
    displayName: "User",
    createdAt: "2026-07-13T00:00:00Z",
    updatedAt: "2026-07-13T00:00:00Z",
    lastLoginAt: "2026-07-13T00:00:00Z",
  },
  subscription: {
    plan: "pro",
    status: "active",
    accessUntil: null,
  },
  entitlements: {
    [ENTITLEMENT_KEYS.optimizerLiquidity]: true,
  },
};

describe("synchronizeAccountAccess", () => {
  it("retries transient API failures and returns the verified access", async () => {
    const fetchAccess = vi
      .fn()
      .mockRejectedValueOnce(new AccountApiError("temporary", 503))
      .mockResolvedValueOnce(ACCESS);
    const wait = vi.fn(async () => undefined);

    await expect(
      synchronizeAccountAccess("token", new AbortController().signal, {
        fetchAccess,
        wait,
      }),
    ).resolves.toEqual(ACCESS);

    expect(fetchAccess).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledWith(400, expect.any(AbortSignal));
  });

  it("does not retry authentication or authorization failures", async () => {
    const fetchAccess = vi
      .fn()
      .mockRejectedValue(new AccountApiError("unauthorized", 401));
    const wait = vi.fn(async () => undefined);

    await expect(
      synchronizeAccountAccess("token", new AbortController().signal, {
        fetchAccess,
        wait,
      }),
    ).rejects.toMatchObject({ status: 401 });

    expect(fetchAccess).toHaveBeenCalledTimes(1);
    expect(wait).not.toHaveBeenCalled();
  });

  it("bounds an unresponsive account request with a timeout", async () => {
    const fetchAccess = vi.fn(
      (_accessToken: string, signal: AbortSignal) =>
        new Promise<AccountAccess>((_resolve, reject) => {
          signal.addEventListener(
            "abort",
            () => {
              const error = new Error("aborted");
              error.name = "AbortError";
              reject(error);
            },
            { once: true },
          );
        }),
    );

    await expect(
      synchronizeAccountAccess("token", new AbortController().signal, {
        requestTimeoutMs: 5,
        retryDelaysMs: [],
        fetchAccess,
      }),
    ).rejects.toBeInstanceOf(AccountAccessTimeoutError);
  });
});
