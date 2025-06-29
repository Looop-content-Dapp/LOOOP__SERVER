// This file is for reference when setting up the frontend client
// It shows how to configure the Better Auth client

/*
// In your frontend project (React, Vue, etc.)
import { createAuthClient } from "better-auth/react" // or vue, svelte, etc.

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
})

// Export specific methods if preferred
export const { 
  signIn, 
  signUp, 
  signOut, 
  useSession, 
  getSession 
} = authClient;

// Example usage:

// Sign up with email/password
const handleSignUp = async (email: string, password: string, name: string) => {
  const { data, error } = await authClient.signUp.email({
    email,
    password,
    name,
    callbackURL: "/dashboard"
  }, {
    onSuccess: (ctx) => {
      // Redirect to dashboard
      router.push("/dashboard");
    },
    onError: (ctx) => {
      // Show error
      alert(ctx.error.message);
    }
  });
}

// Sign in with email/password
const handleSignIn = async (email: string, password: string) => {
  const { data, error } = await authClient.signIn.email({
    email,
    password,
    callbackURL: "/dashboard"
  });
}

// Sign in with Google
const handleGoogleSignIn = async () => {
  await authClient.signIn.social({
    provider: "google",
    callbackURL: "/dashboard"
  });
}

// Sign out
const handleSignOut = async () => {
  await authClient.signOut({
    fetchOptions: {
      onSuccess: () => {
        router.push("/login");
      }
    }
  });
}

// Use session hook
const Profile = () => {
  const { data: session, isPending, error } = authClient.useSession();
  
  if (isPending) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!session) return <div>Not authenticated</div>;
  
  return (
    <div>
      <h1>Welcome, {session.user.name}!</h1>
      <p>Email: {session.user.email}</p>
    </div>
  );
}
*/

export const authClientConfig = {
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5000"
};
