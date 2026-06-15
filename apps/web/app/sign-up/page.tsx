import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex flex-col items-center py-8">
      <h1 className="text-2xl font-bold mb-6">Créer un compte</h1>
      <SignUp
        routing="hash"
        signInUrl="/login"
        forceRedirectUrl="/dashboard"
        signInForceRedirectUrl="/dashboard"
      />
    </div>
  );
}
