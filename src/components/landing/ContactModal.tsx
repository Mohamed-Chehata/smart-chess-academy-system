import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mail, Phone, MapPin, Crown } from "lucide-react";

interface ContactModalProps {
  children?: React.ReactNode;
}

const ContactModal = ({ children }: ContactModalProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children || (
          <Button variant="hero" size="xl">
            Join the Academy
            <ArrowRight className="w-5 h-5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-gold mb-4">
            <Crown className="w-7 h-7 text-navy-dark" />
          </div>
          <DialogTitle className="font-display text-2xl text-foreground">
            Join Our Chess Academy
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Contact us to begin your chess journey. Our team will set up your account and guide you through enrollment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Email */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border hover:border-gold/30 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
              <Mail className="w-6 h-6 text-gold" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email Us</p>
              <a 
                href="mailto:contact@chessacademy.tn" 
                className="text-foreground font-medium hover:text-gold transition-colors"
              >
                contact@chessacademy.tn
              </a>
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border hover:border-gold/30 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-navy/10 flex items-center justify-center flex-shrink-0">
              <Phone className="w-6 h-6 text-navy" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Call Us</p>
              <a 
                href="tel:+21612345678" 
                className="text-foreground font-medium hover:text-gold transition-colors"
              >
                +216 12 345 678
              </a>
            </div>
          </div>

          {/* Visit */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border hover:border-gold/30 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-6 h-6 text-gold" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Visit Our Academies</p>
              <p className="text-foreground font-medium">Tunis & Sousse, Tunisia</p>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-border">
          <p className="text-center text-sm text-muted-foreground">
            Our team will respond within 24 hours to help you get started.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContactModal;
