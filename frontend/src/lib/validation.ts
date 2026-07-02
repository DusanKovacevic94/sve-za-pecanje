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
  price_amount: z.coerce.number().positive("Cena mora biti veća od nule."),
  currency: z.enum(["RSD", "EUR"]),
  city: z.string().min(2, "Unesite lokaciju."),
  brand_id: z.string().optional(),
  model: z.string().optional(),
  allow_messages: z.boolean().default(true),
  phone_visible: z.boolean().default(false)
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
