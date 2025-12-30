import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { PageContainer } from "@/components/layout/PageContainer";

export default function LocationDetail() {
  return (
    <CustomerLayout>
      <PageContainer className="pt-28">
        <h1 className="heading-2 mb-8">Location Details</h1>
        <p className="text-muted-foreground">Location details and map will appear here.</p>
      </PageContainer>
    </CustomerLayout>
  );
}
