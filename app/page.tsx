import { redirect } from "next/navigation";

// Root route simply redirects to the login page.
export default function Home() {
  redirect("/login");
}
