import EventDetailClient from "@/components/event-detail-client";

// Force static generation for export compatibility
export const dynamic = 'force-static';

// Generate at least one static page
export function generateStaticParams() {
    return [{ id: ['placeholder'] }];
}

interface Props {
    params: Promise<{ id: string[] }>;
}

export default async function EventPage({ params }: Props) {
    const { id } = await params;
    const eventId = id.join('/');
    return <EventDetailClient eventId={eventId} />;
}
