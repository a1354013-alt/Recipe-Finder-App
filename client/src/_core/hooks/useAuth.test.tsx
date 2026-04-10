// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "./useAuth";

const trpcState = vi.hoisted(() => ({
  meData: null as null | { id: number; name: string },
  isLoading: false,
  meError: null as unknown,
  logoutError: null as unknown,
  isPending: false,
  mutateAsync: vi.fn(async () => undefined),
  setData: vi.fn(),
  invalidate: vi.fn(async () => undefined),
  refetch: vi.fn(async () => ({ data: trpcState.meData })),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      auth: {
        me: {
          setData: trpcState.setData,
          invalidate: trpcState.invalidate,
        },
      },
    }),
    auth: {
      me: {
        useQuery: () => ({
          data: trpcState.meData,
          isLoading: trpcState.isLoading,
          error: trpcState.meError,
          refetch: trpcState.refetch,
        }),
      },
      logout: {
        useMutation: ({ onSuccess }: { onSuccess?: () => void }) => ({
          isPending: trpcState.isPending,
          error: trpcState.logoutError,
          mutateAsync: async () => {
            await trpcState.mutateAsync();
            onSuccess?.();
          },
        }),
      },
    },
  },
}));

function Harness() {
  const auth = useAuth();

  return (
    <div>
      <div data-testid="auth-state">
        {auth.isAuthenticated ? auth.user?.name : "guest"}
      </div>
      <button onClick={() => void auth.logout()} type="button">
        logout
      </button>
      <button onClick={() => void auth.refresh()} type="button">
        refresh
      </button>
    </div>
  );
}

describe("useAuth", () => {
  beforeEach(() => {
    trpcState.meData = null;
    trpcState.isLoading = false;
    trpcState.meError = null;
    trpcState.logoutError = null;
    trpcState.isPending = false;
    trpcState.mutateAsync.mockClear();
    trpcState.setData.mockClear();
    trpcState.invalidate.mockClear();
    trpcState.refetch.mockClear();
    window.localStorage.clear();
  });

  it("cleans the legacy manus runtime user key on refresh without rewriting it", async () => {
    trpcState.meData = { id: 1, name: "Tester" };
    window.localStorage.setItem("manus-runtime-user-info", '{"stale":true}');

    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByTestId("auth-state").textContent).toBe("Tester");
      expect(window.localStorage.getItem("manus-runtime-user-info")).toBeNull();
    });

    fireEvent.click(screen.getByRole("button", { name: "refresh" }));

    await waitFor(() => {
      expect(trpcState.refetch).toHaveBeenCalled();
      expect(window.localStorage.getItem("manus-runtime-user-info")).toBeNull();
    });
  });

  it("cleans the legacy manus runtime user key on logout", async () => {
    trpcState.meData = { id: 1, name: "Tester" };
    window.localStorage.setItem("manus-runtime-user-info", '{"stale":true}');

    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "logout" }));

    await waitFor(() => {
      expect(trpcState.mutateAsync).toHaveBeenCalled();
      expect(trpcState.setData).toHaveBeenCalledWith(undefined, null);
      expect(trpcState.invalidate).toHaveBeenCalled();
      expect(window.localStorage.getItem("manus-runtime-user-info")).toBeNull();
    });
  });
});
