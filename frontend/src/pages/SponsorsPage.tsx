// Groups sponsors by tier using .filter() on the data from the API (static fallback)

import { useSponsors } from '../hooks/useSponsors';
import SponsorBlurb from '../components/site/SponsorBlurb'; // renders the blurb as Markdown
import type { Sponsor } from '../types';

/** Logo, wrapped in a link only when the sponsor has a real URL. */
function SponsorLogo({ sponsor, size }: { sponsor: Sponsor; size: string }) {
  const logo = <img src={sponsor.logo} alt={sponsor.name} loading="lazy" decoding="async" data-size={size} />;
  if (!sponsor.url || sponsor.url === '#') return logo;
  return <a href={sponsor.url} target="_blank" rel="noreferrer">{logo}</a>;
}

export default function SponsorsPage() {
  const { sponsors } = useSponsors();

  // Filter sponsors by tier
  const platinum = sponsors.filter(s => s.tier === "platinum");
  const gold     = sponsors.filter(s => s.tier === "gold");
  const silver   = sponsors.filter(s => s.tier === "silver");
  const bronze   = sponsors.filter(s => s.tier === "bronze");

  return (
    <main className="section-wrapper">
      {/* Back button */}
      <div className="mb-12">
        <a href="/" className="inline-flex items-center gap-2 font-mono uppercase text-sm text-text-secondary hover:text-ultraviolet hover:-translate-x-1 transition-all duration-300">
          <span>&larr;</span> Back to Home
        </a>
      </div>

      {/* Page heading */}
      <h1 className="section-title text-center">Our Sponsors</h1>
      <p className="section-subtitle text-center">
        HackKnight is made possible by the support of our amazing sponsors.
      </p>

      {/* Platinum tier — Logo size: Large+, Company Blurb: Yes */}
      {platinum.length > 0 && (
        <section>
          <div className="sponsors-grid-platinum">
            {platinum.map((sponsor, index) => (
              <div key={index} className="sponsor-card platinum">
                <SponsorLogo sponsor={sponsor} size="large-plus" />
                <p className="sponsor-name">{sponsor.name}</p>
                {sponsor.companyBlurb && (
                  <SponsorBlurb text={sponsor.companyBlurb} />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Gold tier — Logo size: Large, Company Blurb: Yes */}
      {gold.length > 0 && (
        <section>
          <div className="sponsors-grid-gold">
            {gold.map((sponsor, index) => (
              <div key={index} className="sponsor-card gold">
                <SponsorLogo sponsor={sponsor} size="large" />
                <p className="sponsor-name">{sponsor.name}</p>
                {sponsor.companyBlurb && (
                  <SponsorBlurb text={sponsor.companyBlurb} />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Silver tier — Logo size: Medium, Company Blurb: Yes */}
      {silver.length > 0 && (
        <section>
          <div className="sponsors-grid-silver">
            {silver.map((sponsor, index) => (
              <div key={index} className="sponsor-card silver">
                <SponsorLogo sponsor={sponsor} size="medium" />
                <p className="sponsor-name">{sponsor.name}</p>
                {sponsor.companyBlurb && (
                  <SponsorBlurb text={sponsor.companyBlurb} />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Bronze tier — Logo size: Small, Company Blurb: No */}
      {bronze.length > 0 && (
        <section>
          <div className="sponsors-grid-bronze">
            {bronze.map((sponsor, index) => (
              <div key={index} className="sponsor-card bronze">
                <SponsorLogo sponsor={sponsor} size="small" />
                <p className="sponsor-name">{sponsor.name}</p>
              </div>
            ))}
          </div>
        </section>
      )}

    </main>
  );
}
