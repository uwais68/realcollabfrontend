'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogIn } from 'lucide-react'; // Import an icon

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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

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
          <div className="flex justify-center items-center h-screen bg-gradient-to-br from-primary/10 via-background to-background">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div> {/* Spinner */}
          </div>
      );
  }


  return (
     // Apply a subtle gradient background and center the content
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background p-4">
       {/* Use Card component for better structure and styling */}
       <Card className="w-full max-w-md shadow-xl border-t-4 border-primary rounded-lg overflow-hidden flex flex-col justify-center">
         <CardHeader className="text-center bg-primary/5 p-6">
            <div className="mx-auto bg-primary rounded-full p-3 w-fit mb-4 text-primary-foreground">
                <LogIn size={28} />
            </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-center">Welcome Back!</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">Log in to continue to RealCollab</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6"> {/* Increased padding and spacing */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Email Address</FormLabel> {/* Slightly larger label */}
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} disabled={isSubmitting} className="text-base py-2.5" />
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
                    <FormLabel className="text-base">Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} disabled={isSubmitting} className="text-base py-2.5" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full text-lg py-3" disabled={isSubmitting}>
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                     <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground mr-2"></div>
                     Logging In...
                  </div>
                ) : (
                  'Login'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
         <CardFooter className="bg-muted/40 p-4 text-center text-sm justify-center">
             Don't have an account?{" "}
             <Link href="/register" className="ml-1 font-semibold text-primary hover:text-primary/80 hover:underline">
               Sign up now
             </Link>
         </CardFooter>
       </Card>
    </div>
  );
}
