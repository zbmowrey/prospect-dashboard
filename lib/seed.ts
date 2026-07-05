import { upsertFromInput } from "./prospects";
import type { ProspectInput } from "./validation";

// A couple of rows so the dashboard has something to render before you drop
// real data. They start as `pending`, so `npm run capture` will screenshot them.
const samples: ProspectInput[] = [
  {
    name: "Blue Ridge Landscaping",
    website: "https://example.com",
    city: "Asheville",
    state: "NC",
    industry: "Landscaping",
    est_size: "1-10",
    saas_needs: ["online booking", "invoicing", "review capture"],
    source: "seed",
  },
  {
    name: "Coastal Coffee Roasters",
    website: "https://example.org",
    city: "Portland",
    state: "ME",
    industry: "Food & Beverage",
    est_size: "11-50",
    saas_needs: ["ecommerce", "loyalty program"],
    source: "seed",
  },
];

for (const s of samples) upsertFromInput(s);
console.log(
  `Seeded ${samples.length} prospects (capture pending). Run "npm run capture" to screenshot them.`,
);
process.exit(0);
