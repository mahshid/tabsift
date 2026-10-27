
import { beforeEach, describe, expect, it, vi } from "vitest";
import { storage } from "wxt/utils/storage";

import { getSavedThreshold, isValidThreshold, saveThreshold } from "./threshold-service";
import { DEFAULT_THRESHOLD, THRESHOLD_STORAGE_KEY } from "./constants";

vi.mock("wxt/utils/storage", () => ({
        storage: {
                getItem: vi.fn(),
                setItem: vi.fn(),
        },
}));

beforeEach(() => {
        vi.resetAllMocks();
});

describe("isValidThreshold", () => {
        it.each([5, 15, 30, 60, 180, 1440])(
                "accepts %i minutes",
                (value) => {
                        expect(isValidThreshold(value)).toBe(true);
                },
        );

        it.each([-5, 0, 10, 90, NaN, Infinity])(
                "rejects invalid threshold %s",
                (value) => {
                        expect(isValidThreshold(value)).toBe(false);
                },
        );
});

describe("getSavedThreshold", () => {
        it("returns the saved threshold when valid", async () => {
                vi.mocked(storage.getItem).mockResolvedValue(30);

                const result = await getSavedThreshold();

                expect(result).toBe(30);
                expect(storage.getItem).toHaveBeenCalledExactlyOnceWith(THRESHOLD_STORAGE_KEY);
        });

        it("returns the default threshold when storage is empty", async () => {
                vi.mocked(storage.getItem).mockResolvedValue(null);

                const result = await getSavedThreshold();

                expect(result).toBe(DEFAULT_THRESHOLD);
        });

        it("returns the default threshold when saved value is invalid", async () => {
                vi.mocked(storage.getItem).mockResolvedValue(-5);

                const result = await getSavedThreshold();

                expect(result).toBe(DEFAULT_THRESHOLD);
        });

        it("propagates storage read errors", async () => {
                vi.mocked(storage.getItem).mockRejectedValueOnce(
                        new Error("Storage read failed"),
                );

                await expect(getSavedThreshold()).rejects.toThrow("Storage read failed");
        });
});

describe("saveThreshold", () => {
        it("saves a valid threshold", async () => {
                vi.mocked(storage.setItem).mockResolvedValue(undefined);

                await saveThreshold(60);

                expect(storage.setItem).toHaveBeenCalledExactlyOnceWith(THRESHOLD_STORAGE_KEY, 60);
        });

        it("rejects invalid values without writing to storage", async () => {
                await expect(saveThreshold(-5)).rejects.toThrow(
                        "Invalid threshold value",
                );

                expect(storage.setItem).not.toHaveBeenCalled();
        });

        it("propagates storage write errors", async () => {
                vi.mocked(storage.setItem).mockRejectedValueOnce(
                        new Error("Storage write failed"),
                );

                await expect(saveThreshold(30)).rejects.toThrow("Storage write failed");

                expect(storage.setItem).toHaveBeenCalledExactlyOnceWith(THRESHOLD_STORAGE_KEY, 30);
        });
});
