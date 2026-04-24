import ProtectedRoute from '@modules/users/components/ProtectedRoute';
import PaymentsView from '@modules/tenant/components/PaymentsView';

export default function PaymentsPage() {
    return (
        <ProtectedRoute>
            <PaymentsView />
        </ProtectedRoute>
    );
}
