import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
    vite: () => ({
        plugins: [tailwindcss()],
    }),
    manifest: {
        name: "TabSift",
        description: "Find forgotten tabs and clear browser clutter safely.",
        permissions: ["storage", "tabs", "alarms"]
    }
});
