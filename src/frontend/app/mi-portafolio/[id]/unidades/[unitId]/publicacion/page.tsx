'use client';

import { useParams } from 'next/navigation';
import LandlordRoute from '@modules/landlord-portfolio/components/LandlordRoute';
import ListingManagementView from '@modules/landlord-portfolio/components/ListingManagementView';

function ListingManagementContent() {
    const params = useParams();
    const portfolioId = params.id as string;
    const unitId = params.unitId as string;

    return <ListingManagementView portfolioId={portfolioId} unitId={unitId} />;
}

export default function ListingManagementPage() {
    return (
        <LandlordRoute>
            <ListingManagementContent />
        </LandlordRoute>
    );
}
