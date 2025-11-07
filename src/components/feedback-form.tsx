
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Star, Loader2, Send } from 'lucide-react';

const formSchema = z.object({
  rating: z.number().min(1, { message: 'Please select a rating.' }),
  message: z.string().min(10, { message: 'Message must be at least 10 characters.' }).max(500, { message: 'Message cannot exceed 500 characters.' }),
});

export default function FeedbackForm() {
    const { toast } = useToast();
    const router = useRouter();
    const [hoverRating, setHoverRating] = useState(0);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            rating: 0,
            message: "",
        },
    });
    
    const { setValue, watch, formState: { isSubmitting } } = form;
    const currentRating = watch('rating');

    async function onSubmit(data: z.infer<typeof formSchema>) {
        try {
            await addDoc(collection(db, 'feedback'), {
                ...data,
                createdAt: serverTimestamp(),
            });
            toast({
                title: "Feedback Submitted",
                description: "Thank you! We've received your feedback.",
            });
            form.reset();
            router.push('/');
        } catch (error) {
            console.error("Error submitting feedback:", error);
            toast({
                variant: "destructive",
                title: "Submission Failed",
                description: "Could not submit your feedback. Please try again.",
            });
        }
    }

    return (
        <Card>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardContent className="pt-6 space-y-6">
                        <FormField
                            control={form.control}
                            name="rating"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>How would you rate our service?</FormLabel>
                                    <FormControl>
                                        <div 
                                            className="flex items-center gap-1"
                                            onMouseLeave={() => setHoverRating(0)}
                                        >
                                            {[...Array(5)].map((_, index) => {
                                                const ratingValue = index + 1;
                                                return (
                                                    <button
                                                        type="button"
                                                        key={ratingValue}
                                                        onClick={() => setValue('rating', ratingValue, { shouldValidate: true })}
                                                        onMouseEnter={() => setHoverRating(ratingValue)}
                                                        className="focus:outline-none"
                                                    >
                                                        <Star className={cn(
                                                            "h-8 w-8 cursor-pointer transition-colors",
                                                            ratingValue <= (hoverRating || currentRating)
                                                                ? "text-yellow-400 fill-yellow-400"
                                                                : "text-muted-foreground/30"
                                                        )} />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="message"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Your Message</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Tell us more about your experience, what we did well, or what we could improve..."
                                            {...field}
                                            rows={5}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="mr-2 h-4 w-4" />
                            )}
                            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    );
}
