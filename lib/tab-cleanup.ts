import { browser } from "wxt/browser";
import type { CleanupResult } from "./types";
import { getTabs } from "./tab-service";
import { getInactiveTabs } from "./tab-analyzer";

export async function validateSelectedTabs(
    selectedIds: Set<number>,
    thresholdMinutes: number,
): Promise<number[]> {
    if (selectedIds.size === 0) return [];

    const tabs = await getTabs();
    const now = Date.now();

    const inactiveTabs = getInactiveTabs(tabs, thresholdMinutes, now);

    return inactiveTabs.flatMap((tab) => typeof tab.id === "number" && selectedIds.has(tab.id) ? [tab.id] : []);
}


export async function prepareTabCleanup(selectedIds: Set<number>, thresholdMinutes: number): Promise<CleanupResult> {
    if (selectedIds.size === 0) {
        return { status: "empty" };
    }

    const safeIds = await validateSelectedTabs(selectedIds, thresholdMinutes);

    if (safeIds.length !== selectedIds.size) {
        return {
            status: "changed",
            safeIds,
        };
    }

    return {
        status: "ready",
        safeIds,
    };
}

export async function closeSelectedTabs(selectedIds: Set<number>, thresholdMinutes: number): Promise<CleanupResult> {
    const result = await prepareTabCleanup(selectedIds, thresholdMinutes);

    if (result.status !== "ready") return result;
        
    await browser.tabs.remove(result.safeIds);

    return {
        status: "closed",
        count: result.safeIds.length,
    };
}