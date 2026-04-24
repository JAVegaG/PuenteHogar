import ProtectedRoute from '@modules/users/components/ProtectedRoute';
import RentalsListView from '@modules/tenant/components/RentalsListView';

export default function RentalsPage() {
    return (
        <ProtectedRoute>
            <RentalsListView />
        </ProtectedRoute>
    );
}
