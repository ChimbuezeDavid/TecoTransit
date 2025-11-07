
"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, deleteDoc, doc, orderBy } from "firebase/firestore";
import { formatDistanceToNow } from 'date-fns';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
import { Trash2, Star, Loader2, MessageSquare, AlertCircle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { Feedback } from "@/lib/types";
import { cn } from "@/lib/utils";

function FeedbackSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-72 mt-2" />
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                            <TableHead><Skeleton className="h-5 w-full" /></TableHead>
                            <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                            <TableHead className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[...Array(5)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-4 w-4",
            i < rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/50"
          )}
        />
      ))}
    </div>
  );
}

export default function AdminFeedbackPage() {
    const [feedback, setFeedback] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        const q = query(collection(db, "feedback"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const feedbackData = querySnapshot.docs.map(doc => {
                const data = doc.data();
                // Firestore timestamps need to be converted to Date objects
                const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: createdAt,
                } as Feedback;
            });
            setFeedback(feedbackData);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching feedback:", err);
            setError("Could not fetch feedback. Please check your connection and Firestore rules.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleDelete = async (id: string) => {
        try {
            await deleteDoc(doc(db, "feedback", id));
            toast({
                title: "Feedback Deleted",
                description: "The feedback entry has been removed.",
            });
        } catch (e) {
            console.error("Error deleting feedback:", e);
            toast({
                variant: "destructive",
                title: "Delete Failed",
                description: "Could not delete the feedback entry. Please try again.",
            });
        }
    };
    
    if (loading) {
        return (
            <div>
                 <div className="mb-8">
                    <h1 className="text-3xl font-bold font-headline">User Feedback</h1>
                    <p className="text-muted-foreground">Review feedback and ratings submitted by users.</p>
                </div>
                <FeedbackSkeleton />
            </div>
        )
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-headline">User Feedback</h1>
                <p className="text-muted-foreground">Review feedback and ratings submitted by users.</p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Submissions</CardTitle>
                    <CardDescription>A list of all user-submitted feedback.</CardDescription>
                </CardHeader>
                <CardContent>
                    {error ? (
                         <div className="text-center py-10 text-destructive">
                            <div className="flex flex-col items-center gap-2">
                                <AlertCircle className="h-8 w-8" />
                                <span className="font-semibold">An Error Occurred</span>
                                <p className="text-sm text-muted-foreground max-w-md mx-auto">{error}</p>
                            </div>
                        </div>
                    ) : feedback.length === 0 ? (
                        <div className="text-center py-10">
                            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-semibold">No Feedback Yet</h3>
                            <p className="mt-1 text-sm text-muted-foreground">When users submit feedback, it will appear here.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[120px]">Rating</TableHead>
                                    <TableHead>Message</TableHead>
                                    <TableHead className="w-[150px]">Submitted</TableHead>
                                    <TableHead className="w-[80px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {feedback.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <StarRating rating={item.rating} />
                                        </TableCell>
                                        <TableCell className="max-w-[500px] whitespace-pre-wrap">{item.message}</TableCell>
                                        <TableCell>{formatDistanceToNow(item.createdAt, { addSuffix: true })}</TableCell>
                                        <TableCell className="text-right">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will permanently delete this feedback entry. This action cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(item.id)} className={cn(buttonVariants({ variant: "destructive" }))}>
                                                            Delete
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
