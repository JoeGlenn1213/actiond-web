// Server-Sent Events client for streaming action progress
// Used by Action Detail page to display real-time logs

import { apiUrl } from "./api-base";

export interface ProgressMessage {
    job_id: string;
    timestamp: string;
    line: string;
    progress?: number; // 0-100
    is_error?: boolean;
    done?: boolean;
}

export interface SubscribeOptions {
    /** Max consecutive reconnect attempts before giving up (default 5). */
    maxRetries?: number;
}

/**
 * Subscribe to real-time progress updates for an action.
 * A dropped connection is retried with exponential backoff (1s → 15s) until
 * maxRetries is exhausted; a `done` message closes the stream for good.
 *
 * @param actionId - The action/job ID to subscribe to
 * @param onMessage - Callback for each progress message
 * @param onError - Called once reconnect attempts are exhausted
 * @returns Cleanup function to close the connection
 */
export function subscribeToAction(
    actionId: string,
    onMessage: (msg: ProgressMessage) => void,
    onError?: (error: Event) => void,
    options?: SubscribeOptions,
): () => void {
    const maxRetries = options?.maxRetries ?? 5;
    let retries = 0;
    let finished = false;
    let eventSource: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const close = () => {
        finished = true;
        eventSource?.close();
        eventSource = null;
        if (retryTimer) clearTimeout(retryTimer);
        retryTimer = null;
    };

    const connect = () => {
        if (finished) return;
        eventSource = new EventSource(apiUrl(`/api/actions/${actionId}/stream`));

        eventSource.onmessage = (event) => {
            try {
                const msg: ProgressMessage = JSON.parse(event.data);
                retries = 0; // connection is healthy again
                onMessage(msg);

                // Stream finished — close for good
                if (msg.done) {
                    close();
                }
            } catch (e) {
                console.error('Failed to parse SSE message:', e);
            }
        };

        eventSource.onerror = (error) => {
            eventSource?.close();
            eventSource = null;
            if (finished) return;

            if (retries >= maxRetries) {
                onError?.(error);
                close();
                return;
            }
            const delay = Math.min(1_000 * 2 ** retries, 15_000);
            retries += 1;
            console.warn(`SSE connection error — retrying in ${delay}ms (attempt ${retries}/${maxRetries})`);
            retryTimer = setTimeout(connect, delay);
        };
    };

    connect();

    // Return cleanup function
    return close;
}
