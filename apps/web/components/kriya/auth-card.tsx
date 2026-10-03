import Image, { type StaticImageData } from "next/image";
import loginImage from "@/public/images/auth-kriya.jpg";
import signupImage from "@/public/images/auth-signup.webp";

const images: Record<"login" | "signup", StaticImageData> = {
  login: loginImage,
  signup: signupImage,
};

export const authLabelClass = "block text-[17px] text-neutral-900";
export const authInputClass =
  "mt-2 block h-[50px] w-full rounded-md border border-neutral-300 px-5 text-[15px] text-neutral-900 placeholder:text-neutral-500 focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none";
export const authSubmitClass =
  "h-[52px] w-full rounded-md bg-brand text-[15px] font-semibold uppercase tracking-wide text-white transition-colors hover:bg-brand-strong disabled:opacity-50";

// Kartu auth terbelah: form di kiri, foto interior di kanan (desktop saja).
// `footer` dirender di luar kartu — dipakai untuk tautan beralih login/daftar.
export function AuthCard({
  children,
  footer,
  image = "login",
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  image?: keyof typeof images;
}) {
  return (
    <>
      <div className="mx-auto grid w-full max-w-[900px] overflow-hidden rounded-lg bg-white md:grid-cols-[1.22fr_1fr]">
        <div className="flex items-center justify-center px-6 py-10 sm:px-12 md:py-16">
          <div className="w-full max-w-[316px]">{children}</div>
        </div>
        <div className="relative hidden min-h-[600px] md:block">
          <Image
            src={images[image]}
            alt=""
            fill
            priority
            placeholder="blur"
            sizes="(min-width: 768px) 405px, 0px"
            className="object-cover"
          />
        </div>
      </div>
      {footer && <div className="mt-10 text-center text-base text-neutral-800 md:mt-14">{footer}</div>}
    </>
  );
}
