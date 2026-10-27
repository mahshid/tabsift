export type CleanupResult =
        | { status: "ready"; safeIds: number[] }
        | { status: "changed"; safeIds: number[] }
        | { status: "empty" }
        | { status: "closed"; count: number };

export type FeedbackType = "success" | "warning" | "error";