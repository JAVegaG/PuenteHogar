import ProtectedRoute from '@modules/users/components/ProtectedRoute';
import PaymentDetailView from '@modules/tenant/components/PaymentDetailView';

export default function PaymentDetailPage() {
    return (
        <ProtectedRoute>
            <PaymentDetailView />
        </ProtectedRoute>
    );
}
