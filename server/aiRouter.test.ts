import { describe, expect, it } from "vitest";
import { aiRouter } from "./routers/ai";
import { createAuthenticatedContext } from "./testUtils";

describe("ai router image validation", () => {
  it("rejects images when the declared mime type does not match the magic number", async () => {
    const caller = aiRouter.createCaller(createAuthenticatedContext());
    const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43]);

    await expect(
      caller.recognizeIngredients({
        imageBase64: jpegBytes.toString("base64"),
        mimeType: "image/png",
      })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("does not match declared mimeType"),
    });
  });

  it("rejects images that exceed the decoded size limit", async () => {
    const caller = aiRouter.createCaller(createAuthenticatedContext());
    const tooLargeBuffer = Buffer.alloc(5 * 1024 * 1024 + 1, 0xff);

    await expect(
      caller.recognizeIngredients({
        imageBase64: tooLargeBuffer.toString("base64"),
        mimeType: "image/jpeg",
      })
    ).rejects.toMatchObject({
      code: "PAYLOAD_TOO_LARGE",
      message: expect.stringContaining("5MB"),
    });
  });
});
