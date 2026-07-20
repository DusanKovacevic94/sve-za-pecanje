import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Unesite ispravan email."),
  username: z.string().min(3, "Korisničko ime mora imati najmanje 3 karaktera."),
  password: z.string().min(8, "Lozinka mora imati najmanje 8 karaktera."),
  accepted_terms: z.literal(true, { errorMap: () => ({ message: "Morate prihvatiti uslove korišćenja." }) })
});

export const loginSchema = z.object({
  email: z.string().email("Unesite ispravan email."),
  password: z.string().min(1, "Unesite lozinku.")
});

export const listingSchema = z.object({
  category_id: z.string().min(1, "Izaberite kategoriju."),
  title: z.string().min(8, "Naslov mora imati najmanje 8 karaktera.").max(120),
  description: z.string().min(20, "Opis mora imati najmanje 20 karaktera.").max(5000),
  condition: z.string().min(1, "Izaberite stanje opreme."),
  price_type: z.enum(["fixed", "negotiable", "on_request", "free"]).default("fixed"),
  price_amount: z.preprocess(
    (value) => value === "" || value === null || value === undefined ? undefined : Number(value),
    z.number().positive("Cena mora biti veća od nule.").optional()
  ),
  currency: z.enum(["RSD", "EUR"]),
  delivery_methods: z.array(
    z.enum(["personal_pickup", "courier", "seller_arrangement"])
  ).default([]),
  delivery_note: z.string().max(500, "Napomena može imati najviše 500 karaktera.").optional(),
  city: z.string().min(2, "Unesite lokaciju."),
  brand_id: z.string().optional(),
  model: z.string().optional(),
  allow_messages: z.boolean().default(true),
  phone_visible: z.boolean().default(false)
}).passthrough().superRefine((data, context) => {
  if (["fixed", "negotiable"].includes(data.price_type) && !data.price_amount) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["price_amount"],
      message: "Unesite cenu veću od nule za izabrani tip cene."
    });
  }
});


export const forgotPasswordSchema = z.object({
  email: z.string().email("Unesite ispravan email.")
});

export const resetPasswordSchema = z
  .object({
    new_password: z.string().min(8, "Lozinka mora imati najmanje 8 karaktera."),
    confirm_password: z.string()
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Lozinke se ne poklapaju.",
    path: ["confirm_password"]
  });
