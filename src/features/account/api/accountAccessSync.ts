import type { AccountAccess } from "../types";
import { AccountApiError, fetchCurrentAccount } from "./accountApi";

const DEFAULT_REQUEST_TIMEOUT_MS = 12_000;
const DEFAULT_RETRY_DELAYS_MS = [400, 1_200] as const;

type AccountAccessFetcher = (
  accessToken: string,
  signal: AbortSignal,
) => Promise<AccountAccess>;

export interface AccountAccessSyncOptions {
  readonly requestTimeoutMs?: number;
  readonly retryDelaysMs?: readonly number[];
  readonly fetchAccess?: AccountAccessFetcher;
  readonly wait?: (delayMs: number, signal: AbortSignal) => Promise<void>;
}

export class AccountAccessTimeoutError extends Error {
  constructor() {
    super("La API de cuenta tardó demasiado en responder.");
    this.name = "AccountAccessTimeoutError";
  }
}

function createAbortError(): Error {
  const error = new Error("Account access synchronization aborted");
  error.name = "AbortError";
  return error;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function isRetryable(error: unknown): boolean {
  if (error instanceof AccountAccessTimeoutError) return true;
  if (error instanceof AccountApiError) {
    return error.status === 408 || error.status === 429 || error.status >= 500;
  }
  return error instanceof TypeError;
}

function waitForRetry(delayMs: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(createAbortError());

  return new Promise((resolve, reject) => {
    const timeoutId = globalThis.setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, delayMs);

    function abort() {
      globalThis.clearTimeout(timeoutId);
      signal.removeEventListener("abort", abort);
      reject(createAbortError());
    }

    signal.addEventListener("abort", abort, { once: true });
  });
}

async function runAttempt(
  accessToken: string,
  signal: AbortSignal,
  timeoutMs: number,
  fetchAccess: AccountAccessFetcher,
): Promise<AccountAccess> {
  if (signal.aborted) throw createAbortError();

  const controller = new AbortController();
  let timedOut = false;
  const abortFromParent = () => controller.abort();
  signal.addEventListener("abort", abortFromParent, { once: true });

  const timeoutId = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await fetchAccess(accessToken, controller.signal);
  } catch (error: unknown) {
    if (signal.aborted) throw createAbortError();
    if (timedOut && isAbortError(error)) throw new AccountAccessTimeoutError();
    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
    signal.removeEventListener("abort", abortFromParent);
  }
}

export async function synchronizeAccountAccess(
  accessToken: string,
  signal: AbortSignal,
  options: AccountAccessSyncOptions = {},
): Promise<AccountAccess> {
  const requestTimeoutMs =
    options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const retryDelaysMs = options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
  const fetchAccess = options.fetchAccess ?? fetchCurrentAccount;
  const wait = options.wait ?? waitForRetry;

  let lastError: unknown = null;
  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
    try {
      return await runAttempt(
        accessToken,
        signal,
        requestTimeoutMs,
        fetchAccess,
      );
    } catch (error: unknown) {
      if (signal.aborted || isAbortError(error)) throw createAbortError();
      lastError = error;

      const retryDelay = retryDelaysMs[attempt];
      if (retryDelay === undefined || !isRetryable(error)) throw error;
      await wait(retryDelay, signal);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("No fue posible sincronizar la cuenta.");
}
