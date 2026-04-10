import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  createShoppingList: vi.fn(),
  getShoppingListByIdForUser: vi.fn(),
  getShoppingListItemByIdForUser: vi.fn(),
  addShoppingListItem: vi.fn(),
  updateShoppingListItemStatus: vi.fn(),
  getShoppingListItems: vi.fn(),
  getUserShoppingLists: vi.fn(),
  deleteShoppingList: vi.fn(),
  deleteShoppingListItem: vi.fn(),
}));

vi.mock("./db", () => dbMocks);

import {
  addItemToList,
  deleteShoppingListItem,
  getListItems,
} from "./services/shoppingListService";

describe("shoppingListService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects reading items for a list the user does not own", async () => {
    dbMocks.getShoppingListByIdForUser.mockResolvedValueOnce(null);

    await expect(getListItems(9, 44, "rid-1")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("rejects adding an item to a list the user does not own", async () => {
    dbMocks.getShoppingListByIdForUser.mockResolvedValueOnce(null);

    await expect(addItemToList(9, 44, "milk", 1, "bottle", "rid-2")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("deletes an owned shopping list item", async () => {
    dbMocks.getShoppingListItemByIdForUser.mockResolvedValueOnce({
      id: 55,
      shoppingListId: 44,
    });

    await deleteShoppingListItem(9, 55, "rid-3");

    expect(dbMocks.deleteShoppingListItem).toHaveBeenCalledWith(55);
  });

  it("rejects deleting an item that belongs to another user", async () => {
    dbMocks.getShoppingListItemByIdForUser.mockResolvedValueOnce(null);

    await expect(deleteShoppingListItem(9, 55, "rid-4")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
