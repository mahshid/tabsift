import type { Browser } from "wxt/browser";

const MINUTE = 60 * 1000;

function getHostname(url?: string): string {
        if (!url) return "Unknown site";

        try {
                return new URL(url).hostname || "Unknown site";
        } catch {
                return "Unknown site";
        }
}

function formatInactiveTime(
        lastAccessed: number | undefined,
        now: number,
): string {
        if (typeof lastAccessed !== "number" || !Number.isFinite(lastAccessed)) {
                return "Unknown";
        }

        const minutes = Math.max(0, Math.floor((now - lastAccessed) / MINUTE));

        return `${minutes}m`;
}

export function createTabRow(
        tab: Browser.tabs.Tab,
        now: number,
        onSelectionChange: (tabId: number, checked: boolean) => void,
): HTMLElement {
        const row = document.createElement("div");
        row.className =
                "flex items-center gap-3 rounded-xl p-2 hover:bg-[#FFF9EE]";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className =
                "size-4 shrink-0 cursor-pointer accent-[#B7743B]";

        checkbox.disabled = typeof tab.id !== "number";

        checkbox.setAttribute(
                "aria-label",
                `Select ${tab.title || "Untitled tab"}`,
        );

        checkbox.addEventListener("change", () => {
                if (typeof tab.id !== "number") return;

                onSelectionChange(tab.id, checkbox.checked);
        });

        const faviconContainer = document.createElement("div");
        faviconContainer.className =
                "flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#F9EAD5]";

        if (tab.favIconUrl) {
                const favicon = document.createElement("img");
                favicon.className = "size-5 rounded-sm";
                favicon.alt = "";

                favicon.addEventListener("error", () => {
                        favicon.replaceWith(document.createTextNode("🌐"));
                });

                faviconContainer.append(favicon);
                favicon.src = tab.favIconUrl;
        } else {
                faviconContainer.textContent = "🌐";
        }

        const tabInfo = document.createElement("div");
        tabInfo.className = "min-w-0 flex-1";

        const tabTitle = document.createElement("p");
        tabTitle.className = "truncate text-sm font-medium";
        tabTitle.textContent = tab.title || "Untitled tab";

        const tabDomain = document.createElement("p");
        tabDomain.className = "truncate text-xs text-[#967A61]";
        tabDomain.textContent = getHostname(tab.url);

        const inactiveTime = document.createElement("span");
        inactiveTime.className = "shrink-0 text-xs tabular-nums text-[#967A61]";
        inactiveTime.textContent = formatInactiveTime(tab.lastAccessed, now);

        tabInfo.append(tabTitle, tabDomain);
        row.append(checkbox, faviconContainer, tabInfo, inactiveTime);

        return row;
}
