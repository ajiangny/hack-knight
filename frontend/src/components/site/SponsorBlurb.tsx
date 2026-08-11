// components/SponsorBlurb.tsx
// Renders a sponsor's blurb as Markdown, so admins can write multiple
// paragraphs and bullet lists instead of one block of text.
// react-markdown skips raw HTML by default, so admin-entered blurbs
// can't inject markup into the page.

import ReactMarkdown from 'react-markdown';

export default function SponsorBlurb({ text }: { text: string }) {
  return (
    // Block styling (paragraph spacing, list bullets) lives in .company-blurb
    <div className="company-blurb">
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
}
