import "./style.css";

import { createIcons, RefreshCw, Clock3, Layers3, Settings2 } from "lucide";
import { getTabCount, getForgottenTabs } from "@/lib/tab-service";
import { createTabRow } from "@/components/tab-row";
import { prepareTabCleanup, closeSelectedTabs } from "@/lib/tab-cleanup";
import { DEFAULT_THRESHOLD, THRESHOLD_OPTIONS, } from "@/lib/constants";
import { getSavedThreshold, saveThreshold, isValidThreshold } from "@/lib/threshold-service";
import type { FeedbackType } from "@/lib/types";

const elements = {
    tabCount: document.querySelector<HTMLElement>("#tab-count"),
    forgottenStatCount: document.querySelector<HTMLElement>("#forgotten-stat-count"),
    error: document.querySelector<HTMLElement>("#error-message"),
    mainSection: document.querySelector<HTMLElement>("#main-section"),
    forgottenSection: document.querySelector<HTMLElement>("#forgotten-tabs"),

    settingsSection: document.querySelector<HTMLElement>("#settings-section"),
    retryButton: document.querySelector<HTMLButtonElement>("#retry-button"),
    settingsButton: document.querySelector<HTMLButtonElement>("#settings-button"),
    thresholdDescription: document.querySelector<HTMLElement>("#threshold-description"),

    forgottenList: document.querySelector<HTMLElement>("#forgotten-list"),
    forgottenCount: document.querySelector<HTMLElement>("#forgotten-count"),
    forgottenEmpty: document.querySelector<HTMLElement>("#forgotten-empty"),
    forgottenThreshold: document.querySelector<HTMLSelectElement>("#forgotten-threshold"),

    selectedCount: document.querySelector<HTMLElement>("#selected-count"),
    clearSelection: document.querySelector<HTMLButtonElement>("#clear-selection"),
    closeSelected: document.querySelector<HTMLButtonElement>("#close-selected"),

    closeDialog: document.querySelector<HTMLDialogElement>("#close-confirm-dialog"),
    closeDialogCount: document.querySelector<HTMLElement>("#close-dialog-count"),
    cancelClose: document.querySelector<HTMLButtonElement>("#cancel-close"),
    confirmClose: document.querySelector<HTMLButtonElement>("#confirm-close"),

    cleanupFeedback: document.querySelector<HTMLElement>("#cleanup-feedback"),
};

let currentThreshold = DEFAULT_THRESHOLD;
const selectedTabIds = new Set<number>();
const feedbackStyles: Record<FeedbackType, string[]> = {
    success: ["bg-green-50", "text-green-800", "border-green-200"],
    warning: ["bg-amber-50", "text-amber-800", "border-amber-200"],
    error: ["bg-red-50", "text-red-800", "border-red-200"],
};

let isLoading = false;
let isPreparingCleanup = false;
let isClosingTabs = false;
let isSavingThreshold = false;
let forgottenRequestId = 0;
let pendingCloseIds: Set<number> | null = null;
let pendingCloseThreshold: number | null = null;

async function initializeThresholdSetting(): Promise<void> {
    const select = elements.forgottenThreshold;

    if (!select) return;

    select.disabled = true;

    try {
        currentThreshold = await getSavedThreshold();
    } catch (error) {
        console.error("Failed to load threshold:", error);
        currentThreshold = DEFAULT_THRESHOLD;
    } finally {
        select.value = String(currentThreshold);
        
        updateThresholdDescription();
        
        select.disabled = false;
    }
}

async function saveThresholdSetting(): Promise<void> {
    const select = elements.forgottenThreshold;

    if (!select || select.disabled || isSavingThreshold || isPreparingCleanup || isClosingTabs || elements.closeDialog?.open) return;

    const selected = Number(select.value);
    const previousThreshold = currentThreshold;

    if (!isValidThreshold(selected)) {
        select.value = String(previousThreshold);
        return;
    }

    if (selected === previousThreshold) return;

    isSavingThreshold = true;
    select.disabled = true;
    updateSelectionUI();

    try {
        try {
            await saveThreshold(selected);
        } catch (error) {
            console.error("Failed to save threshold:", error);
            select.value = String(previousThreshold);
            return;
        }

        currentThreshold = selected;
        updateThresholdDescription();

        try {
            await renderForgottenTabs();
        } catch (error) {
            console.error("Failed to refresh forgotten tabs:", error);
        }
    } finally {
        isSavingThreshold = false;
        select.disabled = false;

        updateSelectionUI();
    }
}

function updateThresholdDescription(): void {
    const description = elements.thresholdDescription;
    if (!description) return;

    const option = THRESHOLD_OPTIONS.find(
        (item) => item.value === currentThreshold,
    );

    if (!option) return;

    description.textContent =
        `Tabs inactive for ${option.label.toLowerCase()} or longer`;
}

function updateSelectionUI(): void {
    const count = selectedTabIds.size;

    if (elements.selectedCount) {
        elements.selectedCount.textContent = `${count} selected`;
    }

    const disabled = count === 0 || isPreparingCleanup || isClosingTabs || isSavingThreshold;

    if (elements.clearSelection) elements.clearSelection.disabled = disabled;
    if (elements.closeSelected) elements.closeSelected.disabled = disabled;
}

function clearSelectedTabs(): void {
    selectedTabIds.clear();

    elements.forgottenList?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
        .forEach((checkbox) => { checkbox.checked = false; });

    updateSelectionUI();
}

function handleTabSelection(tabId: number, checked: boolean): void {
    if (isPreparingCleanup || isClosingTabs) return;
    if (checked) selectedTabIds.add(tabId);
    else selectedTabIds.delete(tabId);

    updateSelectionUI();
}

function showCleanupFeedback(type: FeedbackType, message: string): void {
    const feedback = elements.cleanupFeedback;

    if (!feedback) return;

    for (const styles of Object.values(feedbackStyles)) {
        feedback.classList.remove(...styles);
    }

    feedback.classList.add(...feedbackStyles[type]);
    feedback.textContent = message;
    feedback.classList.remove("hidden");
}

function hideCleanupFeedback(): void {
    elements.cleanupFeedback?.classList.add("hidden");
}

async function renderForgottenTabs(): Promise<void> {
    const requestId = ++forgottenRequestId;
    const { forgottenList: list, forgottenCount: count, forgottenEmpty: empty } = elements;

    if (!list || !count || !empty) return;

    clearSelectedTabs();

    count.textContent = "0 tabs";

    if (elements.forgottenStatCount) elements.forgottenStatCount.textContent = "…";

    empty.textContent = "Checking your tabs...";
    empty.classList.remove("hidden");
    list.replaceChildren();

    try {
        const tabs = await getForgottenTabs(currentThreshold);

        if (requestId !== forgottenRequestId) return;

        count.textContent = `${tabs.length} ${tabs.length === 1 ? "tab" : "tabs"}`;

        if (elements.forgottenStatCount) {
            elements.forgottenStatCount.textContent = String(tabs.length);
        }

        if (tabs.length === 0) {
            empty.textContent = "No forgotten tabs. ✨";
            return;
        }

        const now = Date.now();

        list.replaceChildren(...tabs.map((tab) => createTabRow(tab, now, handleTabSelection)));
        empty.classList.add("hidden");
    } catch (error) {
        if (requestId !== forgottenRequestId) return;

        console.error("Failed to load forgotten tabs:", error);
        count.textContent = "—";

        if (elements.forgottenStatCount) elements.forgottenStatCount.textContent = "—";

        empty.textContent = "Couldn't load forgotten tabs. Please retry.";
        empty.classList.remove("hidden");

        list.replaceChildren();
    }
}

async function openCloseDialog(): Promise<void> {
    const dialog = elements.closeDialog;

    if (!dialog || dialog.open || selectedTabIds.size === 0 || isPreparingCleanup || isClosingTabs || isSavingThreshold) return;

    const selectedIds = new Set(selectedTabIds);
    isPreparingCleanup = true;

    if (elements.forgottenThreshold) {
        elements.forgottenThreshold.disabled = true;
    }

    updateSelectionUI();
    hideCleanupFeedback();

    try {
        const threshold = currentThreshold;
        const result = await prepareTabCleanup(selectedIds, threshold);

        if (result.status === "empty") return;

        if (result.status === "changed") {
            await renderForgottenTabs();

            showCleanupFeedback("warning", "Some selected tabs changed. Please select again.");

            return;
        }

        if (result.status !== "ready") return;

        const selectionUnchanged = selectedIds.size === selectedTabIds.size && [...selectedIds].every((id) => selectedTabIds.has(id));

        if (!selectionUnchanged) return;

        if (elements.closeDialogCount) {
            elements.closeDialogCount.textContent = String(result.safeIds.length);
        }

        pendingCloseIds = new Set(result.safeIds);
        pendingCloseThreshold = threshold;

        if (elements.forgottenThreshold) {
            elements.forgottenThreshold.disabled = true;
        }

        dialog.showModal();

    } catch (error) {
        console.error("Failed to prepare tab cleanup:", error);
        showCleanupFeedback("error", "Couldn't check your tabs. Please try again.");
    } finally {
        isPreparingCleanup = false;

        if (elements.forgottenThreshold && !dialog.open) {
            elements.forgottenThreshold.disabled = isSavingThreshold;
        }

        updateSelectionUI();
    }
}

async function confirmCloseTabs(): Promise<void> {
    const dialog = elements.closeDialog;
    const confirmButton = elements.confirmClose;
    const cancelButton = elements.cancelClose;

    if (!dialog?.open || !pendingCloseIds?.size || pendingCloseThreshold === null || isClosingTabs) return;

    const confirmedIds = new Set(pendingCloseIds);
    isClosingTabs = true;

    updateSelectionUI();

    if (confirmButton) {
        confirmButton.disabled = true;
        confirmButton.textContent = "Closing...";
    }

    if (cancelButton) cancelButton.disabled = true;

    try {
        const confirmedThreshold = pendingCloseThreshold;
        const result = await closeSelectedTabs(confirmedIds, confirmedThreshold);

        if (result.status === "changed") {
            showCleanupFeedback("warning", "Some selected tabs changed. Please review again.");
        } else if (result.status === "closed") {
            showCleanupFeedback("success", `${result.count} tabs closed successfully!`);
        }
    } catch (error) {
        console.error("Failed to close selected tabs:", error);
        showCleanupFeedback("error", "Couldn't close tabs. Please check which tabs are still open.");
    } finally {
        dialog.close();

        await Promise.allSettled([initializePopup(), renderForgottenTabs()]);

        isClosingTabs = false;

        if (confirmButton) {
            confirmButton.disabled = false;
            confirmButton.textContent = "Close tabs";
        }

        if (cancelButton) cancelButton.disabled = false;

        updateSelectionUI();
    }
}

function setErrorVisibility(isVisible: boolean): void {
    elements.error?.classList.toggle("hidden", !isVisible);

    elements.mainSection?.classList.toggle("hidden", isVisible);
    elements.forgottenSection?.classList.toggle("hidden", isVisible);
}

async function initializePopup(): Promise<void> {
    if (isLoading) return;

    isLoading = true;

    if (elements.retryButton) elements.retryButton.disabled = true;

    try {
        const tabCount = await getTabCount();

        if (elements.tabCount) elements.tabCount.textContent = String(tabCount);

        setErrorVisibility(false);
    } catch (error) {
        console.error("Failed to load tabs:", error);
        setErrorVisibility(true);
    } finally {
        isLoading = false;

        if (elements.retryButton) elements.retryButton.disabled = false;
    }
}

async function initializeForgottenTabs(): Promise<void> {
    await initializeThresholdSetting();
    await renderForgottenTabs();
}

function registerEventListeners(): void {
    elements.retryButton?.addEventListener("click", () => {
        void initializePopup();
        void renderForgottenTabs();
    });

    elements.clearSelection?.addEventListener("click", clearSelectedTabs);

    elements.closeSelected?.addEventListener("click", () => { void openCloseDialog(); });

    elements.cancelClose?.addEventListener("click", () => {
        if (!isClosingTabs) elements.closeDialog?.close();
    });

    elements.confirmClose?.addEventListener("click", () => { void confirmCloseTabs(); });

    elements.closeDialog?.addEventListener("close", () => { 
        pendingCloseIds = null;
        pendingCloseThreshold = null;

        if (elements.forgottenThreshold) {
            elements.forgottenThreshold.disabled = isSavingThreshold;
        }
    });

    elements.closeDialog?.addEventListener("cancel", (event) => {
        if (isClosingTabs) event.preventDefault();
    });

    elements.settingsButton?.addEventListener("click", toggleSettings);

    elements.forgottenThreshold?.addEventListener("change", () => {
        void saveThresholdSetting();
    });
}

function toggleSettings(): void {
    if (elements.closeDialog?.open || isPreparingCleanup || isClosingTabs) return;

    const button = elements.settingsButton;
    const section = elements.settingsSection;

    if (!button || !section) return;

    const isOpening = section.classList.contains("hidden");

    section.classList.toggle("hidden", !isOpening);
    button.setAttribute("aria-expanded", String(isOpening));
}

function main(): void {
    createIcons({ icons: { RefreshCw, Clock3, Layers3, Settings2 } });

    registerEventListeners();

    void initializePopup();
    void initializeForgottenTabs();
}

main();
