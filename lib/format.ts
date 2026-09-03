/** Format a duration in milliseconds as a compact human-readable string. */
export function formatDuration(ms?: number | null): string {
    if (ms == null || Number.isNaN(ms) || ms < 0) return "—";
    if (ms < 1000) return `${Math.round(ms)}ms`;
    const totalSeconds = ms / 1000;
    if (totalSeconds < 60) return `${totalSeconds.toFixed(1)}s`;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const seconds = Math.round(totalSeconds % 60);
    if (totalMinutes < 60) return seconds > 0 ? `${totalMinutes}m ${seconds}s` : `${totalMinutes}m`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

/** Short 7-char commit SHA, falling back through available fields. */
export function shortCommit(hash?: string | null): string | null {
    if (!hash) return null;
    return hash.substring(0, 7);
}
