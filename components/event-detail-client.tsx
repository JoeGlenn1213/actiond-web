"use client";

import { usePathname } from "next/navigation";
import { EventGroupView } from "./event-group-view";

interface Props {
    eventId: string;
}

export default function EventDetailClient({ eventId: propEventId }: Props) {
    // Extract the real event id from the URL path (static export fallback).
    const pathname = usePathname();
    const eventId = decodeURIComponent(pathname?.split("/events/")[1] || propEventId);

    return <EventGroupView eventId={eventId} />;
}
