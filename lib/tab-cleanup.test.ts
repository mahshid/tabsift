import { browser, type Browser } from "wxt/browser";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { validateSelectedTabs, closeSelectedTabs } from "./tab-cleanup";
import { getTabs } from "./tab-service";

const NOW = 1_800_000_000_000;
const MINUTE = 60_000;
const THRESHOLD = 15;
const githubTab = {
        id: 12,
        url: "https://github.com",
        active: false,
        pinned: false,
        audible: false,
        lastAccessed: NOW - 30 * MINUTE,
} as Browser.tabs.Tab;

vi.mock("./tab-service", () => ({
        getTabs: vi.fn(),
}));

vi.mock("wxt/browser", () => ({
        browser: {
                tabs: {
                        remove: vi.fn(),
                },
        },
}));

beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);
});

afterEach(() => {
        vi.useRealTimers();
        vi.resetAllMocks();
});

describe("validateSelectedTabs", () => {
        it("should return the ID of a selected inactive tab", async () => {
                vi.mocked(getTabs).mockResolvedValue([githubTab]);
                const selectedIds = new Set([12]);

                const results = await validateSelectedTabs(selectedIds, THRESHOLD);

                expect(results).toEqual([12]);
        });

        it.each(["active", "pinned", "audible"] as const)(
                "should exclude selected tabs when %s is true",
                async (property) => {
                        const tab = {
                                ...githubTab,
                                [property]: true,
                        };

                        vi.mocked(getTabs).mockResolvedValue([tab]);
                        const selectedIds = new Set([12]);

                        const results = await validateSelectedTabs(selectedIds, THRESHOLD);

                        expect(results).toEqual([]);
                },
        );

        it("should return an empty array when the selected tab is closed", async () => {
                vi.mocked(getTabs).mockResolvedValue([]);
                const selectedIds = new Set([12]);

                const results = await validateSelectedTabs(selectedIds, THRESHOLD);

                expect(results).toEqual([]);
        });

        it("should return an empty array when no tabs are selected", async () => {
                const selectedIds = new Set<number>();

                const results = await validateSelectedTabs(selectedIds, THRESHOLD);

                expect(results).toEqual([]);
                expect(getTabs).not.toHaveBeenCalled();
        });
});

describe("closeSelectedTabs", () => {
        it("closes all selected tabs when they are still eligible", async () => {
                const tab1 = {
                        id: 12,
                        url: "https://github.com",
                        active: false,
                        pinned: false,
                        audible: false,
                        lastAccessed: NOW - 30 * MINUTE,
                } as Browser.tabs.Tab;

                const tab2 = {
                        id: 13,
                        url: "https://example.com",
                        active: false,
                        pinned: false,
                        audible: false,
                        lastAccessed: NOW - 40 * MINUTE,
                } as Browser.tabs.Tab;

                vi.mocked(getTabs).mockResolvedValue([tab1, tab2]);

                const selectedIds: Set<number> = new Set([12, 13]);

                const result = await closeSelectedTabs(selectedIds, THRESHOLD);

                expect(result).toEqual({ status: "closed", count: 2 });
                expect(browser.tabs.remove).toHaveBeenCalledExactlyOnceWith([12, 13]);
        });

        it.each(["pinned", "audible", "active"] as const)("does not close tabs when one selected tab becomes %s", async (property) => {
                const tab1 = githubTab;
                const tab2 = {
                        ...githubTab,
                        id: 13,
                        url: "https://example.com",
                        [property]: true,
                };

                vi.mocked(getTabs).mockResolvedValue([tab1, tab2]);

                const selectedIds = new Set([12, 13]);

                const result = await closeSelectedTabs(selectedIds, THRESHOLD);

                expect(result).toEqual({ status: "changed", safeIds: [12] });
                expect(browser.tabs.remove).not.toHaveBeenCalled();
        });


        it("propagates the error when browser.tabs.remove fails", async () => {
                const tab1 = githubTab;

                const tab2 = {
                        ...githubTab,
                        id: 13,
                        url: "https://example.com",
                        lastAccessed: NOW - 45 * MINUTE,
                };

                vi.mocked(getTabs).mockResolvedValue([tab1, tab2]);

                const error = new Error("Failed to remove tabs");

                vi.mocked(browser.tabs.remove).mockRejectedValueOnce(error);

                const selectedIds = new Set([12, 13]);

                await expect(closeSelectedTabs(selectedIds, THRESHOLD)).rejects.toThrow("Failed to remove tabs");

                expect(browser.tabs.remove).toHaveBeenCalledExactlyOnceWith([12, 13]);
        });


        it("does not call the browser API when selection is empty", async () => {
                const selectedIds = new Set<number>();

                const result = await closeSelectedTabs(selectedIds, THRESHOLD);

                expect(result).toEqual({ status: "empty" });
                expect(getTabs).not.toHaveBeenCalled();
                expect(browser.tabs.remove).not.toHaveBeenCalled();
        });


        it("does not close remaining tabs when a selected tab no longer exists", async () => {
                vi.mocked(getTabs).mockResolvedValue([githubTab]);

                const selectedIds = new Set([12, 13]);

                const result = await closeSelectedTabs(selectedIds, THRESHOLD);

                expect(result).toEqual({ status: "changed", safeIds: [12] });
                expect(browser.tabs.remove).not.toHaveBeenCalled();
        });
});
