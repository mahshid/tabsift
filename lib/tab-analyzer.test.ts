import { describe, it, expect } from "vitest";
import type { Browser } from "wxt/browser";
import { getInactiveTabs } from "./tab-analyzer";

const NOW = 1_800_000_000_000;
const MINUTE = 60 * 1000;
const THRESHOLD = 15;

function createMockTab(
    overrides: Partial<Browser.tabs.Tab> = {},
): Browser.tabs.Tab {
    return {
        id: 1,
        title: "Test Tab",
        url: "https://example.com",
        active: false,
        pinned: false,
        audible: false,
        lastAccessed: NOW - 20 * MINUTE,
        ...overrides,
    } as Browser.tabs.Tab;
}

describe("getInactiveTabs", () => {
    it("should include tabs inactive for more than 15 minutes", () => {
        const tab = createMockTab({
            title: "GitHub",
            lastAccessed: NOW - 20 * MINUTE,
        });

        const result = getInactiveTabs([tab], THRESHOLD, NOW);

        expect(result).toEqual([tab]);
    });

    it.each([
        { inactiveMinutes: 5, shouldInclude: false },
        { inactiveMinutes: 15, shouldInclude: true },
    ])(
        "should handle tabs inactive for $inactiveMinutes minutes",
        ({ inactiveMinutes, shouldInclude }) => {
            const tab = createMockTab({
                lastAccessed: NOW - inactiveMinutes * MINUTE,
            });

            const result = getInactiveTabs([tab], THRESHOLD, NOW);

            expect(result.includes(tab)).toBe(shouldInclude);
        },
    );

    it.each(["active", "pinned", "audible"] as const)(
        "should exclude tabs when %s is true",
        (property) => {
            const tab = createMockTab({
                [property]: true,
                lastAccessed: NOW - 30 * MINUTE,
            });

            const result = getInactiveTabs([tab], THRESHOLD, NOW);

            expect(result).toEqual([]);
        },
    );

    it.each([
        { label: "missing", lastAccessed: undefined },
        { label: "NaN", lastAccessed: NaN },
        { label: "Infinity", lastAccessed: Infinity },
    ])("should exclude tabs with $label timestamp", ({ lastAccessed }) => {
        const tab = createMockTab({ lastAccessed });
        const result = getInactiveTabs([tab], THRESHOLD, NOW);

        expect(result).toEqual([]);
    });

    it("should include an inactive unprotected tab", () => {
        const tab = createMockTab({
            lastAccessed: NOW - 30 * MINUTE,
        });

        const result = getInactiveTabs([tab], THRESHOLD, NOW);

        expect(result).toEqual([tab]);
    });

    it("should exclude tabs with a future timestamp", () => {
        const tab = createMockTab({
            lastAccessed: NOW + 10 * MINUTE,
        });

        const result = getInactiveTabs([tab], THRESHOLD, NOW);

        expect(result).toEqual([]);
    });

    it.each([
        [5, [1, 2, 3]],
        [15, [2, 3]],
        [30, [3]],
        [60, []],
    ])("returns correct forgotten tabs for %i minute threshold", (threshold, expectedIds) => {
        const tab1 = createMockTab({ id: 1, lastAccessed: NOW - 10 * MINUTE });
        const tab2 = createMockTab({ id: 2, lastAccessed: NOW - 20 * MINUTE });
        const tab3 = createMockTab({ id: 3, lastAccessed: NOW - 45 * MINUTE });

        const result = getInactiveTabs([tab1, tab2, tab3], threshold, NOW);

        const tabIds = result.map(result => result.id);

        expect(tabIds).toEqual(expectedIds);
    });
});
