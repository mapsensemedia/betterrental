import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Users,
  BookOpen,
  CheckCircle2,
  Settings,
  KeyRound,
  Car,
  RotateCcw,
  Receipt,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";

const customerGuide = [
  {
    id: "customer-booking",
    title: "Section 1: How to Book (Customer Guide)",
    icon: Users,
    color: "text-blue-500",
    steps: [
      "**Step 1:** Visit our website and select your desired vehicle, dates, and pickup location.",
      "**Step 2:** Review your booking summary and proceed to checkout.",
      "**Step 3:** Complete your reservation — **driver's license upload is NOT required online**.",
      "**Step 4:** Receive your booking confirmation via email.",
      "**Step 5:** At pickup, bring your **valid driver's license** — it will be verified in person.",
      "**Step 6:** Sign the **rental agreement in person** at the time of pickup.",
    ],
  },
];

const adminWorkflowGuide = [
  {
    id: "incoming-booking",
    title: "2.1 Incoming Booking (Bookings Menu)",
    icon: BookOpen,
    color: "text-blue-500",
    steps: [
      "**Step 1:** Go to **Admin Panel → Bookings** to see all reservations.",
      "**Step 2:** Find the booking by scrolling the list OR use the **search bar** to find by booking code.",
      "**Step 3:** Click on the booking row to open and review booking details.",
      "**Step 4:** Review: customer info, vehicle, dates, location, and total amount.",
      "**Step 5:** Decide next action: keep as pending OR mark as confirmed.",
    ],
  },
  {
    id: "confirmation",
    title: "2.2 Confirmation + In-Person Requirements",
    icon: CheckCircle2,
    color: "text-green-500",
    steps: [
      "**Step 1:** Confirm the booking when ready to proceed.",
      "**Step 2:** Note: Customer's **ID will be verified in person** at pickup.",
      "**Step 3:** Note: **Rental agreement will be signed in person** at pickup.",
      "Driver's license upload is **not required** during online checkout.",
    ],
  },
  {
    id: "operations",
    title: "2.3 Move to Operations Panel (Preparation Stage)",
    icon: Settings,
    color: "text-purple-500",
    steps: [
      "**Step 1:** Once confirmed, the booking appears in the **Operations Panel**.",
      "**Step 2:** Open the Operations entry for the confirmed booking.",
      "**Step 3:** Complete vehicle preparation steps: **vehicle readiness, cleanliness, full condition readiness**.",
      "**Step 4:** Ensure all prep steps are complete before proceeding.",
      "**Step 5:** Mark operations as complete — the booking moves to **Pickups**.",
    ],
  },
  {
    id: "pickups-workflow",
    title: "2.4 Pickups Workflow (Today / Tomorrow / This Week / Later)",
    icon: KeyRound,
    color: "text-green-500",
    steps: [
      "**Step 1:** Go to **Pickups** in the sidebar.",
      "**Step 2:** Choose the correct time bucket: **Today / Tomorrow / This Week / Later**.",
      "**Step 3:** Open the booking card for the scheduled pickup.",
      "**Step 4:** At pickup: **verify the customer's driver's license in person**.",
      "**Step 5:** At pickup: have the customer **sign the rental agreement in person**.",
      "**Step 6:** Complete the vehicle handover to the customer.",
      "**Step 7:** Mark the pickup as completed — the booking moves to **Active Rentals**.",
    ],
  },
  {
    id: "active-rentals-workflow",
    title: "2.5 Active Rentals Workflow (During Rental)",
    icon: Car,
    color: "text-primary",
    steps: [
      "**Step 1:** Go to **Active Rentals** in the sidebar.",
      "**Step 2:** Browse the list or use filters to find the rental.",
      "**Step 3:** Each rental displays: **remaining time**, **consumed time**, and rental details.",
      "**Step 4:** Click on any rental card to open the **detailed panel**.",
      "**Inside the detail panel, staff can:**",
      "• **Flag issues** — record any problems reported by the customer",
      "• **Contact customer** — view customer contact details",
      "• **SMS customer** — send a message to the customer",
      "• **Track vehicle location** — (Coming soon)",
      "• **Initiate return** — start the return process",
    ],
  },
  {
    id: "returns-workflow",
    title: "2.6 Returns Workflow (Return Initiation → Returns Menu)",
    icon: RotateCcw,
    color: "text-orange-500",
    steps: [
      "**Step 1:** Initiate return from the **Active Rental detail panel**.",
      "**Step 2:** The return also appears in the **Returns** menu.",
      "**Step 3:** Go to **Returns** and open the return entry.",
      "**Step 4:** Follow the return steps to complete the return and bring the car back to the facility.",
      "**Step 5:** Mark the return as processed/completed.",
    ],
  },
  {
    id: "billing-workflow",
    title: "2.7 Billing & Financial Workflow",
    icon: Receipt,
    color: "text-indigo-500",
    steps: [
      "**Step 1:** Go to **Billing** in the sidebar to access all financial records.",
      "**Step 2:** The **Receipts** tab shows all generated receipts — click 'Create Receipt' to generate one for any booking.",
      "**Step 3:** The **Payments** tab displays all payment transactions with status (completed, pending, failed).",
      "**Step 4:** The **Deposits** tab shows all security deposit records — click 'Process Return' to handle deposit release.",
      "**Step 5:** Click any booking code to navigate directly to its details page.",
      "**Step 6:** Use the refresh button to update data in real-time.",
    ],
  },
];

const statusGlossary = [
  {
    id: "glossary",
    title: "Section 3: Status Glossary",
    icon: BookOpen,
    color: "text-slate-500",
    steps: [
      "**Bookings:** Where new bookings arrive and can be searched/opened.",
      "**Operations:** Preparation stage after confirmation — vehicle readiness and prep steps.",
      "**Pickups:** Scheduled handovers grouped by time buckets (Today / Tomorrow / This Week / Later).",
      "**Active Rentals:** Vehicles currently out with customers — shows time remaining and rental details.",
      "**Returns:** Processing vehicles coming back to the facility.",
      "**Billing:** Financial records including receipts, payments, and security deposits.",
    ],
  },
];

const importantNotes = [
  {
    id: "important-notes",
    title: "Section 4: Important Notes",
    icon: AlertTriangle,
    color: "text-amber-500",
    steps: [
      "**Driver's license upload is NOT required during online booking.**",
      "**ID is verified in person at pickup.**",
      "**Rental agreement is signed in person at pickup.**",
      "**Security deposit:** Fixed at $350 — handled in Billing → Deposits tab.",
      "**Hover over buttons** to see tooltips explaining their functions.",
      "**Vehicle tracking:** Coming soon — will allow staff to track vehicle location.",
      "Always ensure vehicle is in full-fledged, clean condition before handover.",
    ],
  },
];

const quickGuide = [
  ...customerGuide,
  ...adminWorkflowGuide,
  ...statusGlossary,
  ...importantNotes,
];

interface HelpGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpGuideModal({ open, onOpenChange }: HelpGuideModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            Admin Panel Guide
          </DialogTitle>
          <DialogDescription>
            Step-by-step instructions for common admin tasks
          </DialogDescription>
        </DialogHeader>
        <Accordion type="single" collapsible className="w-full">
          {quickGuide.map((section) => (
            <AccordionItem key={section.id} value={section.id}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                    <section.icon className={`w-4 h-4 ${section.color}`} />
                  </div>
                  <span className="font-medium">{section.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <ol className="space-y-3 pl-11 pt-2">
                  {section.steps.map((step, idx) => (
                    <li key={idx} className="flex gap-3 text-sm text-muted-foreground">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                        {idx + 1}
                      </span>
                      <span
                        dangerouslySetInnerHTML={{
                          __html: step.replace(
                            /\*\*(.*?)\*\*/g,
                            '<strong class="text-foreground">$1</strong>'
                          ),
                        }}
                      />
                    </li>
                  ))}
                </ol>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <div className="mt-4 p-4 rounded-xl bg-muted/50 border border-border">
          <h4 className="font-medium flex items-center gap-2 mb-2">
            <Users className="w-4 h-4" />
            Need More Help?
          </h4>
          <p className="text-sm text-muted-foreground">
            For additional support, contact your system administrator or refer to the full documentation.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
