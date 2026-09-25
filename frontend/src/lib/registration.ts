// Label for the site's Apply buttons (navbar and hero). Once applications
// have closed (registration_open off, registration_closed_mode "closed") they
// read "Applications Closed"; before opening they stay "Apply Now" and lead to
// the Opening Soon page. The mode is unset until settings load, so the label
// starts as "Apply Now".

import type { SiteSettings } from "../types";

export function applyButtonLabel(settings: SiteSettings): string {
  const closed =
    settings.registration_open !== "true" &&
    settings.registration_closed_mode === "closed";
  return closed ? "Applications Closed" : "Apply Now";
}
