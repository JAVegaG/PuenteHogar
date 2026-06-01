import ProtectedRoute from '@modules/users/components/ProtectedRoute';
import PaymentHistoryView from '@modules/tenant/components/PaymentHistoryView';

export default function PaymentHistoryPage() {
    return (
        <ProtectedRoute>
            <PaymentHistoryView />
        </ProtectedRoute>
    );
}
