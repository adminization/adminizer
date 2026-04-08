export function isAdminizerViteDevMode(): boolean {
    return process.env.ADMINIZER_VITE_ENV === "dev";
}
