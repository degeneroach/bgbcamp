import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm rounded-xl border bg-background p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-1 text-center">
          <span className="text-lg font-semibold tracking-tight">BGBCamp</span>
          <p className="text-sm text-muted-foreground">
            Sign in with your work email
          </p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
