import { Link } from "react-router-dom";
import { Car, Users, Shield, Clock, MapPin, Heart, Target, Award, ArrowRight, Sparkles, CheckCircle } from "lucide-react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
const values = [{
  icon: Shield,
  title: "Trust & Transparency",
  description: "No hidden fees, no surprises. We believe in honest pricing and clear communication with every customer."
}, {
  icon: Heart,
  title: "Customer First",
  description: "Your satisfaction is our priority. We go above and beyond to ensure every rental experience exceeds expectations."
}, {
  icon: Clock,
  title: "Flexibility",
  description: "Life is unpredictable. We offer flexible booking, easy modifications, and 24/7 support when you need it."
}, {
  icon: Target,
  title: "Quality Assurance",
  description: "Every vehicle in our fleet undergoes rigorous inspection and maintenance to ensure safety and reliability."
}];
const stats = [{
  value: "500+",
  label: "Happy Customers"
}, {
  value: "50+",
  label: "Premium Vehicles"
}, {
  value: "3",
  label: "Locations"
}, {
  value: "24/7",
  label: "Support Available"
}];
const features = ["Transparent pricing with no hidden fees", "Premium vehicles from top brands", "Flexible pickup and delivery options", "Comprehensive insurance coverage", "24/7 customer support", "Easy online booking process"];
export default function About() {
  return <CustomerLayout>
      {/* Hero Section */}
      <section className="bg-background pt-24 pb-16">
        <div className="container-page">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-4 px-3 py-1.5">
              <Award className="w-3.5 h-3.5 mr-1.5" />
              About C2C Rental
            </Badge>
            <h1 className="heading-1 text-foreground mb-6">
              Making Car Rental 
              <span className="text-muted-foreground"> Simple & Stress-Free</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              We're a local car rental company serving the Lower Mainland with a mission to 
              provide quality vehicles, transparent pricing, and exceptional customer service.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-muted/50">
        <div className="container-page">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map(stat => <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>)}
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="section-spacing bg-background">
        <div className="container-page">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="heading-2 text-foreground mb-6">Our Story</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>C2C Rental was established with a singular mission: to elevate the standard of car rentals throughout the Lower Mainland. Recognizing that the industry was often plagued by opaque pricing, complex logistics, and impersonal service, we committed to a different approach </p>
                <p>Our business is built on the pillars of transparency, uncompromising quality, and genuine client care. We have curated a fleet where every vehicle undergoes rigorous selection and maintenance to guarantee a safe, reliable, and premium driving experience.</p>
                <p>Today, C2C Rental proudly serves a growing community across Surrey, Langley, and Abbotsford. We continue to innovate for your convenience, recently introducing our "Bring Car to Me" service to offer seamless, doorstep vehicle delivery.</p>
              </div>
            </div>
            
            <div className="bg-muted rounded-2xl p-8">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Why customers choose us:
              </h3>
              <ul className="space-y-3">
                {features.map(feature => <li key={feature} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>)}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* New Feature Highlight */}
      <section className="py-16 bg-primary/5">
        <div className="container-page">
          <Card className="border-primary/20 bg-background overflow-hidden">
            <CardContent className="p-8 md:p-12">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <div className="flex-1">
                  <Badge className="mb-2">New Feature</Badge>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Bring Car to Me — Delivery Service
                  </h3>
                  <p className="text-muted-foreground">
                    Too busy to pick up your rental? No problem! With our new delivery service, 
                    we'll bring the car right to your doorstep. Available within 50km of our locations.
                  </p>
                </div>
                <Button asChild size="lg">
                  <Link to="/search">
                    Try It Now
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Values Section */}
      <section className="section-spacing bg-background">
        <div className="container-page">
          <div className="text-center mb-12">
            <h2 className="heading-2 text-foreground mb-3">Our Values</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              These principles guide everything we do
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map(value => <Card key={value.title} className="text-center">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <value.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-muted">
        <div className="container-page text-center">
          <h2 className="heading-2 text-foreground mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Browse our fleet and book your next adventure today. Have questions? We're here to help.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg">
              <Link to="/search">
                Browse Vehicles
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>
    </CustomerLayout>;
}