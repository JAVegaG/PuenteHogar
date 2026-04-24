import ProtectedRoute from '@modules/users/components/ProtectedRoute';
import RentalDetailView from '@modules/tenant/components/RentalDetailView';

export default function RentalDetailPage() {
    return (
        <ProtectedRoute>
            <RentalDetailView />
        </ProtectedRoute>
    );
}
