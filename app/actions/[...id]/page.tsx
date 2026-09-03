import ActionDetailClient from "@/components/action-detail-client";

// Force static generation for export compatibility
export const dynamic = 'force-static';

// Generate at least one static page
export function generateStaticParams() {
    return [{ id: ['placeholder'] }];
}

interface Props {
    params: Promise<{ id: string[] }>;
}

export default async function ActionDetailPage({ params }: Props) {
    const { id } = await params;
    const actionId = id.join("/"); // Handle nested paths just in case
    return <ActionDetailClient actionId={actionId} />;
}
