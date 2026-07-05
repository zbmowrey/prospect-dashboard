import { z } from "zod";

// Accept both snake_case and camelCase for the multi-word fields so the input
// files are forgiving. `name` and `website` are the only required fields.
export const prospectInputSchema = z.object({
  name: z.string().min(1, "name is required"),
  website: z.string().min(1, "website is required"),
  city: z.string().optional(),
  state: z.string().optional(),
  phone: z.string().optional(),
  industry: z.string().optional(),
  est_size: z.string().optional(),
  estSize: z.string().optional(),
  saas_needs: z.array(z.string()).optional(),
  saasNeeds: z.array(z.string()).optional(),
  notes: z.string().optional(),
  source: z.string().optional(),
});

// A dropped file may be a single prospect or an array of them.
export const prospectFileSchema = z.union([
  prospectInputSchema,
  z.array(prospectInputSchema),
]);

export type ProspectInput = z.infer<typeof prospectInputSchema>;
