import { SignIn } from "@clerk/nextjs";

export function LoginGate() {
  return (
    <div className="flex flex-col items-center">
      <h1 className="text-2xl font-bold">Connexion</h1>
      <p className="mt-2 text-gray-600 text-center">
        Connectez-vous pour accéder à vos listes partagées.
      </p>
      <div className="mt-6 flex justify-center">
        <SignIn
          routing="hash"
          signUpUrl="/sign-up"
          forceRedirectUrl="/dashboard"
          signUpForceRedirectUrl="/dashboard"
        />
      </div>
    </div>
  );
}
