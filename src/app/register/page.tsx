'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus } from 'lucide-react'; // Import an icon

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  firstName: z.string().min(1, { message: 'First name is required.' }),
  lastName: z.string().min(1, { message: 'Last name is required.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  confirmPassword: z.string(),
  role: z.enum(['User', 'Admin']).optional().default('User'), // Match backend schema
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'], // Path of error
});

type RegisterFormValues = z.infer<typeof formSchema>;

export default function RegisterPage() {
  const { toast } = useToast();
  const { register, isLoading, user } = useAuth(); // Use auth context
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Redirect if already logged in
  React.useEffect(() => {
    if (user && !isLoading) {
      console.log('User already logged in, redirecting to /');
      router.push('/');
    }
  }, [user, isLoading, router]);


  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'User',
    },
  });

  async function onSubmit(values: RegisterFormValues) {
    setIsSubmitting(true);
    try {
        // Exclude confirmPassword from the data sent to the API
        const { confirmPassword, ...registerData } = values;
        console.log('Attempting registration with:', registerData.email);
        await register(registerData);
        toast({
            title: 'Registration Successful',
            description: 'Your account has been created. Please log in.',
        });
        router.push('/login'); // Redirect to login page after successful registration
    } catch (error) {
        console.error('Registration failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        toast({
            title: 'Registration Failed',
            description: errorMessage,
            variant: 'destructive',
        });
         setIsSubmitting(false); // Re-enable form on error
    }
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
       <Card className="w-full max-w-lg shadow-xl border-t-4 border-primary rounded-lg overflow-hidden"> {/* Slightly wider card */}
        <CardHeader className="text-center bg-primary/5 p-6">
           <div className="mx-auto bg-primary rounded-full p-3 w-fit mb-4 text-primary-foreground">
                <UserPlus size={28} />
            </div>
          <CardTitle className="text-3xl font-bold tracking-tight">Create Your Account</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">Join CollabFlow to start collaborating.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6"> {/* Increased padding and spacing */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6"> {/* Responsive grid */}
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} disabled={isSubmitting} className="text-base py-2.5" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} disabled={isSubmitting} className="text-base py-2.5" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Email Address</FormLabel>
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
               <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} disabled={isSubmitting} className="text-base py-2.5" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               {/* Optional Role Selection - Consider if needed during registration */}
               {/* <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="User">User</SelectItem>
                            <SelectItem value="Admin">Admin</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
               /> */}
              <Button type="submit" className="w-full text-lg py-3" disabled={isSubmitting}>
                 {isSubmitting ? (
                  <div className="flex items-center justify-center">
                     <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground mr-2"></div>
                     Creating Account...
                  </div>
                ) : (
                  'Sign Up'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
         <CardFooter className="bg-muted/40 p-4 text-center text-sm justify-center">
             Already have an account?{" "}
             <Link href="/login" className="ml-1 font-semibold text-primary hover:text-primary/80 hover:underline">
               Log in
             </Link>
         </CardFooter>
       </Card>
    </div>
  );
}
