import { Link } from 'react-router-dom';  // Link lets us navigate back home without a page refresh

export default function ComingSoon() {
  return (
    <section className="section-wrapper flex flex-col items-center justify-center min-h-screen text-center">

      <h1 className="font-display font-bold text-hero text-text-primary mb-4">
        Applications <span className="text-ultraviolet">Opening Soon</span>
      </h1>

      <p className="section-subtitle max-w-xl text-center mx-auto">
        We're putting the finishing touches on registration. Check back soon!
      </p>

      <Link to="/" className="btn-outline mt-6">
        ← Back to Home
      </Link>

    </section>
  );
}