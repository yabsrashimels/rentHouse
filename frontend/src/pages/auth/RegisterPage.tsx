import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { UserRoundPlus } from "lucide-react";
import toast from "react-hot-toast";
import { z } from "zod";
import { useAuth } from "../../context/AuthContext";

const schema = z.object({
  fullName: z.string().trim().min(2, "Enter your name").max(100),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z.string().trim().min(9, "Enter a valid phone number").max(15, "Phone number must be 15 characters or fewer"),
  password: z.string()
    .min(8, "Use at least 8 characters")
    .max(100)
    .regex(/[A-Z]/, "Include at least one uppercase letter")
    .regex(/[0-9]/, "Include at least one number"),
  confirmPassword: z.string(),
}).refine(value => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" });
type RegisterValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register: createAccount } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterValues>({ resolver: zodResolver(schema) });

  async function submit(values: RegisterValues) {
    setSubmitting(true);
    try {
      await createAccount({ fullName: values.fullName, email: values.email, phone: values.phone, password: values.password });
      const redirect = params.get("redirect");
      navigate(redirect?.startsWith("/") && !redirect.startsWith("//") ? redirect : "/", { replace: true });
    } catch (error: any) {
      toast.error(error.response?.data?.errors?.[0]?.message || error.response?.data?.message || "Unable to create your account");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-3 text-sm focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100";

  return (
    <main className="flex min-h-[75vh] items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 grid h-11 w-11 place-items-center rounded-lg bg-emerald-50 text-emerald-800">
          <UserRoundPlus size={21} />
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Get started</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Create your account</h1>
        <p className="mt-2 text-sm text-slate-600">Browse homes as a tenant.</p>

        <form onSubmit={handleSubmit(submit)} className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-slate-800">Full name</label>
            <input id="fullName" autoComplete="name" className={inputClass} {...register("fullName")} />
            {errors.fullName && <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>}
          </div>

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-800">Email address</label>
            <input id="email" type="email" autoComplete="email" className={inputClass} {...register("email")} />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-slate-800">Phone number</label>
            <input id="phone" type="tel" autoComplete="tel" placeholder="+251..." className={inputClass} {...register("phone")} />
            {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-800">Password</label>
            <input id="password" type="password" autoComplete="new-password" className={inputClass} {...register("password")} />
            {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-slate-800">Confirm password</label>
            <input id="confirmPassword" type="password" autoComplete="new-password" className={inputClass} {...register("confirmPassword")} />
            {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>}
          </div>

          <button type="submit" disabled={submitting} className="sm:col-span-2 mt-2 inline-flex items-center justify-center rounded-lg bg-emerald-800 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70">
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-600">
          Already have an account?
          <Link to={`/login${params.get("redirect") ? `?redirect=${encodeURIComponent(params.get("redirect")!)}` : ""}`} className="font-semibold text-emerald-800 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}