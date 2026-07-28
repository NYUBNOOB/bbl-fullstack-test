import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError } from "axios";
import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  apiClient,
  setTokenProvider,
  setUnauthorizedHandler,
} from "./axiosConfig";

type TaggedConfig = InternalAxiosRequestConfig & { hadToken?: boolean };

/**
 * The last config the adapter saw — i.e. the config AFTER the request
 * interceptor has run. Swapping the adapter is axios public API, so these
 * tests exercise the real interceptor chain rather than reaching into
 * `apiClient.interceptors.*.handlers` internals.
 */
let seenConfig: TaggedConfig | null = null;

function adapterReturning(status: number, data: unknown): AxiosAdapter {
  return (config) => {
    seenConfig = config as TaggedConfig;

    const response = {
      data,
      status,
      statusText: String(status),
      headers: {},
      config,
    } as AxiosResponse;

    if (status >= 400) {
      return Promise.reject(
        new AxiosError(
          `Request failed with status code ${status}`,
          String(status),
          config as InternalAxiosRequestConfig,
          {},
          response,
        ),
      );
    }
    return Promise.resolve(response);
  };
}

const originalAdapter = apiClient.defaults.adapter;

beforeEach(() => {
  seenConfig = null;
  setTokenProvider(async () => null);
  setUnauthorizedHandler(() => {});
});

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
});

describe("apiClient — request interceptor", () => {
  it("attaches the access token as a Bearer header", async () => {
    setTokenProvider(async () => "token-for-user-a");
    apiClient.defaults.adapter = adapterReturning(200, []);

    await apiClient.get("/collections");

    expect(seenConfig?.headers.Authorization).toBe("Bearer token-for-user-a");
    expect(seenConfig?.hadToken).toBe(true);
  });

  it("sends no Authorization header when there is no session", async () => {
    setTokenProvider(async () => null);
    apiClient.defaults.adapter = adapterReturning(200, []);

    await apiClient.get("/collections");

    expect(seenConfig?.headers.Authorization).toBeUndefined();
    expect(seenConfig?.hadToken).toBe(false);
  });
});

describe("apiClient — 401 handling", () => {
  /**
   * REGRESSION GUARD. If the API rejects a token we actually sent, logging in
   * again mints the same token and earns the same 401. Redirecting here is an
   * infinite consent-screen loop, so the handler must be told a token WAS
   * present and leave the redirect decision alone.
   */
  it("reports hadToken=true when a token was sent and still got 401", async () => {
    const onUnauthorized = vi.fn();
    setTokenProvider(async () => "token-the-api-rejects");
    setUnauthorizedHandler(onUnauthorized);
    apiClient.defaults.adapter = adapterReturning(401, {
      message: "Invalid or expired token",
    });

    await expect(apiClient.get("/collections")).rejects.toThrow();

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).toHaveBeenCalledWith({ hadToken: true });
  });

  it("reports hadToken=false when no token went out — the one case a login redirect repairs", async () => {
    const onUnauthorized = vi.fn();
    setTokenProvider(async () => null);
    setUnauthorizedHandler(onUnauthorized);
    apiClient.defaults.adapter = adapterReturning(401, {
      message: "Missing Authorization header",
    });

    await expect(apiClient.get("/collections")).rejects.toThrow();

    expect(onUnauthorized).toHaveBeenCalledWith({ hadToken: false });
  });

  it("does not invoke the unauthorized handler for non-401 failures", async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    apiClient.defaults.adapter = adapterReturning(404, {
      message: "Collection not found",
    });

    await expect(apiClient.get("/collections/someone-elses-id")).rejects.toThrow();

    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});

describe("apiClient — error surfacing", () => {
  it("propagates the backend message so the UI can show it verbatim", async () => {
    // The backend answers 404 for a record that is not yours, deliberately
    // indistinguishable from one that does not exist. That wording must reach
    // the user unchanged rather than being replaced by an axios stack message.
    apiClient.defaults.adapter = adapterReturning(404, {
      message: "Collection not found",
    });

    await expect(apiClient.get("/collections/user-b-collection")).rejects.toThrow(
      "Collection not found",
    );
  });

  it("falls back to a readable message when the backend sends no body", async () => {
    apiClient.defaults.adapter = adapterReturning(500, {});

    await expect(apiClient.get("/collections")).rejects.toThrow(
      /Request failed with status code 500/,
    );
  });
});
