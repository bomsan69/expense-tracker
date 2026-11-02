import { z } from "zod";

export const INVALID_CREDENTIALS_ERROR = "Invalid email or password.";
export const PASSWORD_POLICY_ERROR =
  "Use at least 10 characters with a letter and a number.";
// Not in SPEC.md §8.1's table (which has no row for a wrong *current*
// password specifically); this is the server-verified check from §7 SUP-03.
export const WRONG_CURRENT_PASSWORD_ERROR = "Your current password is incorrect.";

export const loginSchema = z.object({
  email: z.string().trim().email({ message: "Enter a valid email address." }),
  password: z.string().min(1, { message: "Enter your password." }),
});

export type LoginInput = z.infer<typeof loginSchema>;

const newPasswordSchema = z
  .string()
  .min(10, { message: PASSWORD_POLICY_ERROR })
  .regex(/[A-Za-z]/, { message: PASSWORD_POLICY_ERROR })
  .regex(/\d/, { message: PASSWORD_POLICY_ERROR });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: "Enter your password." }),
    newPassword: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "The passwords do not match.",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: PASSWORD_POLICY_ERROR,
    path: ["newPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
