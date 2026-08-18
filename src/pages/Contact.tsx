import { useState } from "react";
import { SEO } from "@/components/shared/SEO";
import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, Clock, Send, CheckCircle, Instagram, Facebook, ArrowRight, ExternalLink } from "lucide-react";
import { GBP_LINKS } from "@/constants/gbpLinks";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { PageHero } from "@/components/shared/PageHero";
import { TrustMarquee } from "@/components/landing/TrustMarquee";
import contactHero from "@/assets/contact-counter.jpg";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";

const faqs = [
  {
    q: "How quickly do you respond to inquiries?",
    a: "We typically reply within 1–2 hours during business hours. For urgent same-day bookings, call or text directly.",
  },
  {
    q: "Can I book a car without calling?",
    a: "Yes — you can start a booking entirely online. Contact us if you have specific questions about your licence, coverage, or vehicle availability.",
  },
  {
    q: "Do you offer vehicle delivery in Surrey or Langley?",
    a: "Limited delivery is available in some areas subject to booking type and fee. Contact us with your location and we'll confirm options.",
  },
  {
    q: "I need a replacement rental — can you help today?",
    a: "Yes. We coordinate regularly with body shops for insurance replacement rentals. Call us directly for same-day availability.",
  },
];

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    inquiryType: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const contactSchema = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact C2C Rental",
    url: "https://c2crental.ca/contact",
    description: "Contact C2C Rental for car rental bookings and inquiries in Surrey, Langley, and Abbotsford, BC.",
    publisher: {
      "@type": "Organization",
      name: "C2C Rental",
      url: "https://c2crental.ca",
      telephone: "+1-604-763-4242",
      email: "support@c2crental.ca",
    },
  };


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.message) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("send-contact-email", {
        body: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          subject: `${formData.inquiryType || "General"} — ${formData.location || "Not specified"}`,
          message: formData.message,
        },
      });
      if (error) throw error;
      trackEvent("contact_form_submitted", { inquiry_type: formData.inquiryType, location: formData.location });
      setIsSubmitted(true);
    } catch (err: any) {
      console.error("Contact form error:", err);
      toast.error("Failed to send message. Please try again or call us directly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CustomerLayout>
      <SEO
        title="Contact C2C Rental – Surrey, Langley & Abbotsford Car Rental"
        description="Get in touch with C2C Rental. Call, email, or send a message for bookings and rental inquiries in Surrey, Langley, and Abbotsford, BC."
        path="/contact"
        jsonLd={contactSchema}
      />
      {/* Hero */}
      <PageHero
        image={contactHero}
        imageAlt="C2C Rental team member handing car keys to a customer at the counter"
        eyebrow="Surrey · Langley · Abbotsford"
        priority
        title="Contact C2C Rental"
        subtitle="Questions about rentals, insurance or availability? We're a local team and we answer fast — usually within the hour during business hours."
        actions={
          <>
            <a href="tel:+16047634242" className="btn-corp">
              Call (604) 763-4242 <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="mailto:support@c2crental.ca"
              className="btn-corp-outline !text-white !border-white/40 hover:!border-white hover:!text-white"
            >
              Email us
            </a>
          </>
        }
      />

      <TrustMarquee region="British Columbia" />


      {/* Two-column layout */}
      <section className="section-corp bg-background">
        <div className="container-corp">
          <div className="grid lg:grid-cols-5 gap-10">
            {/* LEFT: Contact Details */}
            <div className="lg:col-span-2 space-y-8">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-6">Get in Touch</h2>
                <div className="space-y-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-none bg-primary/10 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-medium text-foreground">Surrey, BC (Fraser Valley)</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-none bg-primary/10 flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <a href="tel:+16047634242" className="font-medium text-foreground hover:text-primary transition-colors">
                        +1 (604) 763-4242
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-none bg-primary/10 flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <a href="mailto:support@c2crental.ca" className="font-medium text-foreground hover:text-primary transition-colors">
                        support@c2crental.ca
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-none bg-primary/10 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Hours</p>
                      <p className="font-medium text-foreground">Mon–Fri: 9:00 AM – 6:00 PM</p>
                      <p className="font-medium text-foreground">Sat–Sun: 10:00 AM – 4:00 PM</p>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Prefer to text? Send us a message at{" "}
                <a href="sms:+16047634242" className="text-primary hover:underline">+1 (604) 763-4242</a>{" "}
                and we'll reply within the hour during business hours.
              </p>

              <div>
                <p className="text-sm font-medium text-foreground mb-3">Find Us on Google</p>
                <div className="flex flex-col gap-2">
                  {[
                    { label: "Surrey Newton", url: GBP_LINKS.surrey },
                    { label: "Langley Centre", url: GBP_LINKS.langley },
                    { label: "Abbotsford Centre", url: GBP_LINKS.abbotsford },
                  ].map((loc) => (
                    <a
                      key={loc.label}
                      href={loc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
                    >
                      <MapPin className="w-4 h-4 text-primary" />
                      {loc.label}
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </a>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-foreground mb-3">Follow Us</p>
                <div className="flex items-center gap-3">
                  <a
                    href="https://www.instagram.com/c2c.rental/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-none bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
                    aria-label="Instagram"
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                  <a
                    href="https://www.facebook.com/people/C2C-Rental/61587985570949/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-none bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
                    aria-label="Facebook"
                  >
                    <Facebook className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </div>

            {/* RIGHT: Contact Form */}
            <div className="lg:col-span-3">
              <Card className="rounded-none border-border shadow-none">
                <CardContent className="p-6 md:p-8">
                  {isSubmitted ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-none bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">Thanks! We'll be in touch within a few hours.</h3>
                      <p className="text-muted-foreground mb-6">For urgent requests, call or text us directly.</p>
                      <Button variant="outline" onClick={() => setIsSubmitted(false)}>Send Another Message</Button>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <h2 className="text-lg font-semibold text-foreground">Send Us a Message</h2>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name *</Label>
                          <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="Jane Smith" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address *</Label>
                          <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="jane@example.com" required />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="(604) 123-4567" />
                        </div>
                        <div className="space-y-2">
                          <Label>Location / City</Label>
                          <Select value={formData.location} onValueChange={(v) => setFormData((p) => ({ ...p, location: v }))}>
                            <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Surrey">Surrey</SelectItem>
                              <SelectItem value="Langley">Langley</SelectItem>
                              <SelectItem value="Abbotsford">Abbotsford</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Rental Inquiry Type</Label>
                        <Select value={formData.inquiryType} onValueChange={(v) => setFormData((p) => ({ ...p, inquiryType: v }))}>
                          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="General Question">General Question</SelectItem>
                            <SelectItem value="Booking Request">Booking Request</SelectItem>
                            <SelectItem value="Replacement Rental">Replacement Rental</SelectItem>
                            <SelectItem value="Long-Term Rental">Long-Term Rental</SelectItem>
                            <SelectItem value="Cross-Border Travel">Cross-Border Travel</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="message">Message *</Label>
                        <Textarea id="message" name="message" value={formData.message} onChange={handleChange} placeholder="Tell us about your rental needs..." rows={5} required />
                      </div>

                      <Button size="lg" onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? "Sending..." : <>Send Message <Send className="w-4 h-4 ml-2" /></>}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Strip */}
      <section className="section-corp bg-brand-tint border-t border-border">
        <div className="container-corp">
          <span className="eyebrow">FAQ</span>
          <h2 className="heading-2 text-foreground mb-10">Quick Answers</h2>
          <div className="grid md:grid-cols-2 gap-6 ">
            {faqs.map((faq) => (
              <Card key={faq.q} className="rounded-none border-border shadow-none">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-foreground mb-2">{faq.q}</h3>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </CustomerLayout>
  );
}
