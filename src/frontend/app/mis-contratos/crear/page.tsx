import { Suspense } from 'react';
import ContractCreationView from '@modules/landlord-contracts/components/ContractCreationView';

export default function ContractCreationPage() {
    return (
        <Suspense>
            <ContractCreationView />
        </Suspense>
    );
}
