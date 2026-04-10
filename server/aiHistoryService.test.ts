import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getUserAIRecognitionHistory: vi.fn(),
  getAIRecognitionHistoryByIdForUser: vi.fn(),
  deleteAIRecognitionHistory: vi.fn(),
}));

vi.mock("./db", () => dbMocks);

import { deleteHistory } from "./services/aiHistoryService";

describe("aiHistoryService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes AI history only when the record belongs to the user", async () => {
    dbMocks.getAIRecognitionHistoryByIdForUser.mockResolvedValueOnce({
      id: 7,
      userId: 3,
    });

    await deleteHistory(3, 7, "rid-1");

    expect(dbMocks.deleteAIRecognitionHistory).toHaveBeenCalledWith(3, 7);
  });

  it("rejects deleting AI history owned by another user", async () => {
    dbMocks.getAIRecognitionHistoryByIdForUser.mockResolvedValueOnce(null);

    await expect(deleteHistory(3, 7, "rid-2")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
