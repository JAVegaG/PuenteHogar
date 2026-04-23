import ContractDetailView from '@modules/landlord-contracts/components/ContractDetailView';

interface ContractDetailPageProps {
    params: Promise<{ id: string }>;
}

export default async function ContractDetailPage({ params }: ContractDetailPageProps) {
    const { id } = await params;
    return <ContractDetailView contractId={id} />;
}
