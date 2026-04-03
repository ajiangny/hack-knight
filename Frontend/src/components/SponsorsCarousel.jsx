// components/SponsorsCarousel.jsx
// Displays a scrolling row of sponsor logos on the homepage.
// Imports sponsor data from data/sponsors.js
// Has a link to the full /sponsors page.

import { Link } from 'react-router-dom';            // Link for navigating to /sponsors
import { sponsors } from '../data/sponsors';        // import the sponsors array from the data folder

export default function SponsorsCarousel() {
  return (
    <section className="section-wrapper py-24">                                       {/* section wrapper for the sponsors carousel block */}
      <h2 className="section-title text-center">Our Sponsors</h2>                         {/* section heading */}

      {/* Horizontal scrolling row of sponsor logos */}
      <div className="marquee-wrapper w-full mt-10 mb-10">                                         {/* carousel track — teammate adds scroll/animation styling */}
        <div className="marquee-track">
          {sponsors.map((sponsor, index) => (         // loop over each sponsor object in the array
            <a
              key={index}                             // key is required by React when rendering a list
              href={sponsor.url}                      // sponsor's website URL
              target="_blank"                         // opens link in a new tab
              rel="noreferrer"                        // security best practice when using target="_blank"
              className="card-sponsor shrink-0 w-48 h-28"
            >
              <img src={sponsor.logo} alt={sponsor.name} className="max-w-[80%] max-h-16" /> {/* sponsor logo image; alt = sponsor name for accessibility */}
            </a>
          ))}
        </div>
      </div>

      <div className="text-center">
        <Link to="/sponsors" className="btn-outline">View All Sponsors</Link> {/* navigates to the dedicated /sponsors page */}
      </div>
    </section>
  );
}