import { useState } from "react";
import type { User } from "../types";
import { GoogleLogin } from "@react-oauth/google";
import { Card, CardContent } from "@/components/ui/card";

interface LoginPageProps {
  onLogin: (user: User, token: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    setError(null);
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || "Login failed");
        return;
      }
      const data = await res.json();
      localStorage.setItem("token", data.token);
      onLogin(data.user, data.token);
    } catch {
      setError("Network error — please try again");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">⚡</div>
          <h1 className="text-3xl font-bold text-foreground">InvoiceAI</h1>
          <p className="text-muted-foreground mt-2">Invoicing & proposals for freelancers</p>
        </div>
        <Card>
          <CardContent className="pt-6 pb-6 flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground text-center">
              Sign in to manage invoices and generate AI proposals
            </p>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError("Google sign-in failed")}
              useOneTap={false}
              shape="rectangular"
              size="large"
              width="280"
            />
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
