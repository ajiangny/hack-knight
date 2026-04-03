// Displays the FAQ accordion on the homepage.
// Imports FAQ data from data/faq.js
// The navbar's "FAQ" link uses href="/#faq" to scroll to this section.

import { faqs } from '../data/faq';                // import the faqs array from the data folder

export default function FAQ() {
  return (
    <div className="section-wrapper max-w-3xl">             {/* wrapper for the FAQ block */}
      <h2 className="section-title text-center">Frequently Asked Questions</h2>           {/* section heading */}

      <div className="mt-8">
        {faqs.map((faq, index) => (                   // .map() loops over each faq object in the array
          <details key={index} className="faq-item group"> {/* <details> is native HTML for a disclosure/accordion */}
            <summary className="faq-question list-none cursor-pointer">{faq.question}</summary> {/* <summary> is the visible clickable part */}
            <p className="faq-answer">{faq.answer}</p>                       {/* the answer text shown when the item is expanded */}
          </details>
        ))}
      </div>

    </div>
  );
}