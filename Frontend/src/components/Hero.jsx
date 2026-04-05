import { Link } from 'react-router-dom';            // Link for navigating to /schedule without a page refresh
import CountdownTimer from './CountdownTimer';       // import the countdown as its own component to keep this file clean

export default function Hero() {
  return (
    <section id="hero" className="section-wrapper flex flex-col items-center justify-center min-h-[80vh] text-center pt-32">

      <h1 className="pt-12 font-display font-bold text-hero text-text-primary mb-4"><span class="text-ultraviolet">HackKnight</span> 2026</h1>                      {/* main page heading — biggest text on the page */}
      <p className="font-body text-text-primary text-2xl mb-8">October 17th - 19th, 2026</p>             {/* event date subtitle */}

      <p className="section-subtitle max-w-3xl text-center mx-auto">
        HackKnight is a 48-hour hackathon where students come together to create
        innovative projects. We are a student run organization dedicated to providing
        a great event for students to learn and grow. Join us for a weekend of coding,
        learning, and fun!
      </p>                                          {/* event description paragraph */}

      <div className="flex gap-4 my-12">                                         {/* wrapper to group the two side-by-side buttons */}
        <Link to="/register" className="btn-primary">Register Now</Link>     {/* Change from button to link temporarily*/}
        <Link to="/schedule" className="btn-outline">View Schedule</Link>   {/* navigates to the full /schedule page */}
      </div>

      <CountdownTimer />                            {/* renders the countdown block — it's its own component */}


    </section>
  );
}