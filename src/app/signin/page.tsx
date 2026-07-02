import type { Metadata } from "next";
import SignInForm from "@/components/auth/SignInForm";

export const metadata: Metadata = {
  title: "Đăng nhập | Nail Salon",
  description: "Đăng nhập hệ thống quản lý hóa đơn tiệm nail",
};

export default function SignIn() {
  return <SignInForm />;
}
