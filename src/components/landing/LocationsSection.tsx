import { MapPin, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import locationsBg from "@/assets/locations-bg.png";

const LocationsSection = () => {
  const locations = [
    {
      name: "Tunis Branch",
      address: "Centre Ville, Tunis",
      description: "Our flagship academy in the heart of the capital, featuring state-of-the-art training facilities.",
      mapUrl: "https://maps.google.com/?q=Tunis,Tunisia",
      image: "🏛️",
    },
    {
      name: "Sousse Branch",
      address: "Sahloul 4, Sousse",
      description: "A modern training center in the beautiful coastal city, perfect for focused chess development.",
      mapUrl: "https://maps.google.com/?q=Sahloul+4,Sousse,Tunisia",
      image: "🌊",
    },
  ];

  return (
    <section id="locations" className="relative py-24 overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${locationsBg})` }}
      />
      <div className="absolute inset-0 bg-navy-dark/80" />
      
      {/* Gradient Overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-gold font-medium text-sm uppercase tracking-wider">
            Visit Us
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-ivory mt-4 mb-6">
            Our Locations
          </h2>
          <p className="text-ivory/70 text-lg">
            Train with the best at our two premier chess academies in Tunisia.
          </p>
        </div>

        {/* Locations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {locations.map((location, index) => (
            <div
              key={location.name}
              className="group relative animate-fade-in"
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              <div className="h-full p-8 rounded-2xl bg-card/95 backdrop-blur-md border border-border hover:border-gold/30 transition-all duration-300 hover:shadow-elevated">
                {/* Location Icon */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-xl bg-gradient-gold flex items-center justify-center text-3xl shadow-gold">
                    {location.image}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-gold" />
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-2xl font-semibold text-foreground mb-2">
                  {location.name}
                </h3>
                <p className="text-gold font-medium text-sm mb-3">
                  {location.address}
                </p>
                <p className="text-muted-foreground mb-6">
                  {location.description}
                </p>

                {/* Map Button */}
                <a
                  href={location.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="gold" className="w-full group/btn">
                    <MapPin className="w-4 h-4 mr-2" />
                    Open in Google Maps
                    <ExternalLink className="w-4 h-4 ml-2 opacity-50 group-hover/btn:opacity-100 transition-opacity" />
                  </Button>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LocationsSection;
