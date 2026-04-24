import ProtectedRoute from '@modules/users/components/ProtectedRoute';
import TenantContractsListView from '@modules/tenant/components/TenantContractsListView';

export default function TenantContractsPage() {
    return (
        <ProtectedRoute>
            <TenantContractsListView />
        </ProtectedRoute>
    );
}
