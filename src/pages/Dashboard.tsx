import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { PageContainer } from "@/components/layout/PageContainer";

export default function Dashboard() {
  return (
    <CustomerLayout>
      <PageContainer className="pt-28">
        <h1 className="heading-2 mb-8">My Dashboard</h1>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-6 bg-card rounded-2xl border border-border">
            <h3 className="font-semibold mb-2">Active Bookings</h3>
            <p className="text-3xl font-bold text-primary">0</p>
          </div>
          <div className="p-6 bg-card rounded-2xl border border-border">
            <h3 className="font-semibold mb-2">Past Rentals</h3>
            <p className="text-3xl font-bold">0</p>
          </div>
          <div className="p-6 bg-card rounded-2xl border border-border">
            <h3 className="font-semibold mb-2">Pending Verification</h3>
            <p className="text-3xl font-bold text-warning">0</p>
          </div>
        </div>
      </PageContainer>
    </CustomerLayout>
  );
}
