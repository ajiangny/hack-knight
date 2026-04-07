// Imports and stacks every section component in order.
// FAQ and Team are wrapped in <section> tags with IDs so the navbar can anchor-scroll to them.

import Hero from '../components/Hero';                       // top banner: title, description, countdown, buttons
import SchedulePreview from '../components/SchedulePreview'; // mini schedule grid + link to full schedule page
import PhotoGallery from '../components/PhotoGallery';       // photo gallery of past events
import FAQ from '../components/FAQ';                         // FAQ accordion
import TeamSection from '../components/TeamSection';         // team member grid
import SponsorsCarousel from '../components/SponsorsCarousel'; // sponsor logo carousel + link to full sponsors page

export default function Home() {
  return (
    <main>                                          {/* <main> is the semantic HTML wrapper for the page's primary content */}

      <Hero />                                      {/* section 1: title, dates, description, countdown, CTA buttons */}

      <section id="sponsors" className="scroll-mt-64 bg-void border-t border-void pb-24">                       {/* id="sponsors" is the scroll target for the navbar's href="/#sponsors" */}
        <SponsorsCarousel />                          {/* section 2: sponsor logos carousel*/}
      </section>

      <section id="photos" className="scroll-mt-36">
        <PhotoGallery />                              {/* section 3: photo gallery of past events */}
      </section>

      <section id="schedule" className="scroll-mt-5">                       {/* id="schedule" is the scroll target for the navbar's href="/#schedule" */}
        <SchedulePreview />                           {/* section 4: schedule preview grid */}
      </section>

      <section id="team" className="scroll-mt-36">                           {/* id="team" is the scroll target for the navbar's href="/#team" */}
        <TeamSection />                             {/* section 5: team member grid */}
      </section>

      <section id="faq" className="scroll-mt-36">                            {/* id="faq" is the scroll target for the navbar's href="/#faq" */}
        <FAQ />                                     {/* section 6: FAQ accordion */}
      </section>

    </main>
  );
}