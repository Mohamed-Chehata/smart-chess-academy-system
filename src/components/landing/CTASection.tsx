import { Crown } from "lucide-react";
import ContactModal from "./ContactModal";
import { Button } from "@/components/ui/button";

const CTASection = () => {
  return (
    <section id="contact" className="py-24 bg-gradient-hero relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="container mx-auto px-4 relative">
        <div className="max-w-3xl mx-auto text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-ivory/10 mb-8">
            <Crown className="w-8 h-8 text-gold" />
          </div>

          {/* Heading */}
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-ivory mb-6">
            Ready to Become a{" "}
            <span className="text-gold">Chess Champion?</span>
          </h2>

          {/* Description */}
          <p className="text-lg text-ivory/70 mb-10 max-w-xl mx-auto">
            Join our elite chess academy in Tunisia. Contact us today to start your training with FIDE-certified coaches.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <ContactModal />
            <a href="/login">
              <Button variant="heroOutline" size="xl">
                Existing Member? Sign In
              </Button>
            </a>
          </div>

          {/* Trust Badge */}
          <p className="mt-8 text-ivory/50 text-sm">
            ✓ FIDE certified coaches &nbsp; ✓ Two locations in Tunisia &nbsp; ✓ All skill levels welcome
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
