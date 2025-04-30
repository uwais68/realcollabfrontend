'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext'; // Import useAuth hook
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const formSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

type LoginFormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
  const { toast } = useToast();
  const { login, isLoading, user } = useAuth(); // Use auth context
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

   // Redirect if already logged in
   React.useEffect(() => {
    if (user && !isLoading) {
        console.log('User already logged in, redirecting to /');
        router.push('/');
    }
   }, [user, isLoading, router]);


  const form = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setIsSubmitting(true);
    try {
      console.log('Attempting login with:', values.email);
      await login(values.email, values.password);
      toast({
        title: 'Login Successful',
        description: 'Welcome back!',
      });
      // No need to manually redirect here, effect hook handles it
      // router.push('/'); // Redirect to dashboard after successful login
    } catch (error) {
      console.error('Login failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
      toast({
        title: 'Login Failed',
        description: errorMessage,
        variant: 'destructive',
      });
       setIsSubmitting(false); // Only set submitting false on error
    }
    // Don't set isSubmitting to false on success, as the redirect will happen
  }

  // Render null or a loading indicator while checking auth state
  if (isLoading || user) {
      return (
          <div className="flex justify-center items-center h-screen">
              <p>Loading...</p> {/* Or a spinner component */}
          </div>
      );
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
       <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome Back!</CardTitle>
          <CardDescription>Log in to your RealCollab account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="m@example.com" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="********" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Logging In...' : 'Login'}
              </Button>
            </form>
          </Form>
           <div className="mt-4 text-center text-sm">
             Don't have an account?{" "}
             <Link href="/register" className="underline text-primary hover:text-primary/80">
               Sign up
             </Link>
            </div>
             {/* Optional: Add Forgot Password link here */}
            {/* <div className="mt-2 text-center text-sm">
                <Link href="/forgot-password" passHref>
                    <a className="underline text-muted-foreground hover:text-primary">Forgot password?</a>
                </Link>
             </div> */}
        </CardContent>
       </Card>
    </div>
  );
}
