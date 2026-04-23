'use client';

import { useParams } from 'next/navigation';
import LandlordRoute from '@modules/landlord-portfolio/components/LandlordRoute';
import ListingEditForm from '@modules/landlord-portfolio/components/ListingEditForm';

function ListingEditContent() {
    const params = useParams();
    const portfolioId = params.id as string;
    const unitId = params.unitId as string;

    return <ListingEditForm portfolioId={portfolioId} unitId={unitId} />;
}

export default function ListingEditPage() {
    return (
        <LandlordRoute>
            <ListingEditContent />
        </LandlordRoute>
    );
}
