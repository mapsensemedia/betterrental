import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { PageContainer } from "@/components/layout/PageContainer";

export default function BookingDetail() {
  return (
    <CustomerLayout>
      <PageContainer className="pt-28">
        <h1 className="heading-2 mb-8">Booking Details</h1>
        <p className="text-muted-foreground">Booking details will appear here.</p>
      </PageContainer>
    </CustomerLayout>
  );
}
