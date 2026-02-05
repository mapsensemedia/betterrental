import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  MessageSquare,
  Send,
  Car,
  Sparkles,
  ArrowRight,
  CheckCircle
} from "lucide-react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useLocations } from "@/hooks/use-locations";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";

function formatHours(hoursJson: Record<string, string> | null): string {
  if (!hoursJson) return "Hours not available";
  
  const weekdayHours = hoursJson.mon || hoursJson.tue || hoursJson.wed;
  const weekendHours = hoursJson.sat || hoursJson.sun;
  
  if (weekdayHours && weekendHours) {
    return `Mon-Fri: ${weekdayHours}, Sat-Sun: ${weekendHours}`;
  }
  return weekdayHours || weekendHours || "Hours not available";
}

export default function Contact() {
  const { data: locations, isLoading } = useLocations();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Send email via edge function
      const { data, error } = await supabase.functions.invoke("send-contact-email", {
        body: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          subject: formData.subject,
          message: formData.message,
        },
      });

      if (error) throw error;

      trackEvent("contact_form_submitted", {
        has_phone: !!formData.phone,
        subject_length: formData.subject.length,
      });

      setIsSubmitted(true);
      toast.success("Message sent! We'll get back to you within 24 hours.");
      
      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });
    } catch (error: any) {
      console.error("Contact form error:", error);
      trackEvent("contact_form_error", { error_message: error.message });
      toast.error("Failed to send message. Please try again or call us directly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <CustomerLayout>
      {/* Hero Section */}
      <section className="bg-background pt-24 pb-12">
        <div className="container-page">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-4 px-3 py-1.5">
              <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
              Get in Touch
            </Badge>
            <h1 className="heading-1 text-foreground mb-6">
              We're Here to 
              <span className="text-muted-foreground"> Help</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Have questions about our vehicles or services? Need assistance with a booking? 
              Our friendly team is ready to assist you.
            </p>
          </div>
        </div>
      </section>

      {/* Delivery Feature Highlight */}
      <section className="py-8 bg-primary/5">
        <div className="container-page">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-background rounded-2xl border border-primary/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <Badge variant="secondary" className="mb-1">New Service</Badge>
                <h3 className="font-semibold text-foreground">Bring Car to Me — Delivery Service</h3>
                <p className="text-sm text-muted-foreground">We'll deliver your rental right to your doorstep!</p>
              </div>
            </div>
            <Button asChild>
              <Link to="/search">
                Book with Delivery
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="section-spacing bg-background">
        <div className="container-page">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Contact Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Send Us a Message</CardTitle>
                  <CardDescription>
                    Fill out the form below and we'll get back to you within 24 hours.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isSubmitted ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        Message Sent!
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Thank you for reaching out. We'll get back to you within 24 hours.
                      </p>
                      <Button variant="outline" onClick={() => setIsSubmitted(false)}>
                        Send Another Message
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name *</Label>
                          <Input 
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="John Doe"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address *</Label>
                          <Input 
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="john@example.com"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input 
                            id="phone"
                            name="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="(604) 123-4567"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="subject">Subject *</Label>
                          <Input 
                            id="subject"
                            name="subject"
                            value={formData.subject}
                            onChange={handleChange}
                            placeholder="How can we help?"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="message">Message *</Label>
                        <Textarea 
                          id="message"
                          name="message"
                          value={formData.message}
                          onChange={handleChange}
                          placeholder="Tell us more about your inquiry..."
                          rows={5}
                          required
                        />
                      </div>
                      
                      <Button type="submit" size="lg" disabled={isSubmitting}>
                        {isSubmitting ? (
                          "Sending..."
                        ) : (
                          <>
                            Send Message
                            <Send className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Contact Info Sidebar */}
            <div className="space-y-6">
              {/* Quick Contact */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <a href="tel:+16041234567" className="font-medium text-foreground hover:text-primary transition-colors">
                        (604) 123-4567
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <a href="mailto:info@c2crental.ca" className="font-medium text-foreground hover:text-primary transition-colors">
                        info@c2crental.ca
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Support Hours</p>
                      <p className="font-medium text-foreground">24/7 Available</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Locations */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Our Locations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="animate-pulse">
                          <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                          <div className="h-3 bg-muted rounded w-full" />
                        </div>
                      ))}
                    </div>
                  ) : locations && locations.length > 0 ? (
                    locations.map(location => (
                      <div key={location.id} className="pb-4 border-b last:border-0 last:pb-0">
                        <div className="flex items-start gap-3">
                          <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-foreground text-sm">{location.name}</p>
                            <p className="text-xs text-muted-foreground">{location.address}</p>
                            {location.phone && (
                              <a 
                                href={`tel:${location.phone}`}
                                className="text-xs text-primary hover:underline"
                              >
                                {location.phone}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No locations available.</p>
                  )}
                  
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link to="/locations">View All Locations</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-muted/50">
        <div className="container-page">
          <div className="text-center mb-12">
            <h2 className="heading-2 text-foreground mb-3">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">Quick answers to common questions</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              {
                q: "What documents do I need to rent a car?",
                a: "You'll need a valid driver's license, a credit or debit card, and be at least 21 years old. International visitors may need an International Driving Permit."
              },
              {
                q: "Can you deliver the car to my location?",
                a: "Yes! Our new 'Bring Car to Me' service delivers vehicles within 50km of our locations. Select this option during checkout."
              },
              {
                q: "What's your cancellation policy?",
                a: "Free cancellation anytime prior to pickup. No-shows (cancellations after pickup time) are subject to a $19.99 CAD fee."
              },
              {
                q: "Is insurance included?",
                a: "Basic insurance is included with all rentals. We offer additional coverage options during the booking process."
              },
            ].map((faq) => (
              <Card key={faq.q}>
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
