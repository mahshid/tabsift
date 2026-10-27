import type { Browser } from "wxt/browser";

export function getInactiveTabs(tabs: Browser.tabs.Tab[], thresholdMinutes: number, now: number): Browser.tabs.Tab[] {
        const thresholdMs = thresholdMinutes * 60 * 1000;

        return tabs.filter((tab) => {
                if (!isManageableTab(tab.url)) return false;

                if (tab.active || tab.pinned || tab.audible) return false;

                if (typeof tab.lastAccessed !== "number" || !Number.isFinite(tab.lastAccessed)) {
                        return false;
                }

                const inactiveTime = now - tab.lastAccessed;

                return inactiveTime >= thresholdMs;
        });
}

function isManageableTab(url?: string): boolean {
    if (!url) return false;

    try {
        const parsedUrl = new URL(url);

        return (
            parsedUrl.protocol === "https:" ||
            parsedUrl.protocol === "http:"
        );
    } catch {
        return false;
    }
}