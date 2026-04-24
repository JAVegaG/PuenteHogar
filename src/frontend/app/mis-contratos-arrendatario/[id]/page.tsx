import ProtectedRoute from '@modules/users/components/ProtectedRoute';
import TenantContractDetailView from '@modules/tenant/components/TenantContractDetailView';

export default function TenantContractDetailPage() {
    return (
        <ProtectedRoute>
            <TenantContractDetailView />
        </ProtectedRoute>
    );
}
