import { Suspense } from "react";
import { ActionsClient } from "./actions-client";

export default function ActionsPage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <h2 className="text-3xl font-bold tracking-tight">Actions List</h2>
            {/* Suspense boundary required for useSearchParams in static export */}
            <Suspense>
                <ActionsClient />
            </Suspense>
        </div>
    );
}
