
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { PriceAlert } from "@/lib/types";
import { uploadImage, deleteImage } from "@/app/actions/upload-image";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { CardDescription } from "../ui/card";
import { Loader2, Upload, X } from "lucide-react";


const formSchema = z.object({
  display: z.boolean().default(true),
  alertType: z.enum(['alert', 'dialog']).default('alert'),
  
  // Fields for 'alert' type
  content: z.string().optional(),
  font: z.string().optional(),
  fontSize: z.string().optional(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),

  // Fields for 'dialog' type
  dialogImageUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
}).superRefine((data, ctx) => {
    if (data.alertType === 'alert' && (!data.content || data.content.length < 10)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['content'],
            message: "Alert content must be at least 10 characters for an inline alert.",
        });
    }
    if (data.alertType === 'dialog' && !data.dialogImageUrl) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['dialogImageUrl'],
            message: "An image must be uploaded for a dialog alert.",
        });
    }
});

export default function PriceAlertManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      display: true,
      alertType: 'alert',
      content: "",
      font: "font-arial",
      fontSize: "text-sm",
      bold: false,
      italic: false,
      dialogImageUrl: '',
    }
  });

  const watchAlertType = form.watch("alertType");

  useEffect(() => {
    const fetchAlert = async () => {
      setLoading(true);
      try {
        const alertDoc = await getDoc(doc(db, "alerts", "current"));
        if (alertDoc.exists()) {
          const data = alertDoc.data() as PriceAlert;
          form.reset(data);
          if(data.dialogImageUrl) {
            setCurrentImageUrl(data.dialogImageUrl);
          }
        }
      } catch (error) {
        console.error("Error fetching alert:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch the current alert." });
      } finally {
        setLoading(false);
      }
    };
    fetchAlert();
  }, [form, toast]);

   const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 4.5 * 1024 * 1024) { // Vercel Blob free tier limit
      toast({
        variant: "destructive",
        title: "File Too Large",
        description: "Image must be smaller than 4.5MB.",
      });
      return;
    }

    setIsUploading(true);

    if (currentImageUrl) {
        await deleteImage(currentImageUrl).catch(e => console.error("Failed to delete old image, continuing...", e));
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      const blob = await uploadImage(formData);
      
      form.setValue('dialogImageUrl', blob.url, { shouldValidate: true });
      setCurrentImageUrl(blob.url);

      toast({
        title: "Image Uploaded",
        description: "The new image has been uploaded successfully.",
      });
    } catch (error) {
      console.error("Image upload error:", error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Could not upload the image.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    const imageUrl = form.getValues('dialogImageUrl');
    if (!imageUrl) return;

    // Optimistically update UI
    form.setValue('dialogImageUrl', '', { shouldValidate: true });
    setCurrentImageUrl(null);

    try {
        await deleteImage(imageUrl);
        toast({ title: "Image Removed" });
    } catch (error) {
        console.error("Failed to delete image from blob storage", error);
        toast({
            variant: "destructive",
            title: "Deletion Failed",
            description: "Could not remove the image from storage, but it is unlinked from the alert."
        })
    }
  }

  async function onSubmit(data: z.infer<typeof formSchema>) {
    const alertRef = doc(db, "alerts", "current");
    
    // Clean data before saving
    const alertData: Partial<PriceAlert> = {
      display: data.display,
      alertType: data.alertType,
      updatedAt: Date.now(),
    };

    if (data.alertType === 'alert') {
        alertData.content = data.content;
        alertData.font = data.font;
        alertData.fontSize = data.fontSize;
        alertData.bold = data.bold;
        alertData.italic = data.italic;
        alertData.dialogImageUrl = ''; // Clear image url if it's an alert
    } else { // dialog
        alertData.dialogImageUrl = data.dialogImageUrl;
        alertData.content = ''; // Clear content for dialog
    }

    try {
      await setDoc(alertRef, alertData, { merge: true });
      toast({
        title: "Alert Settings Saved",
        description: "The alert configuration has been successfully updated.",
      });
    } catch (error) {
      console.error("Error saving alert:", error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Could not save the alert settings. Please try again.",
      });
    }
  }

  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>Site Alert Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="space-y-4">
                <div className="h-10 w-full bg-muted rounded animate-pulse" />
                <div className="h-24 w-full bg-muted rounded animate-pulse" />
                <div className="h-10 w-full bg-muted rounded animate-pulse" />
                <div className="h-10 w-full bg-muted rounded animate-pulse" />
              </div>
            ) : (
              <>
                <FormField control={form.control} name="alertType" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Alert Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select an alert type" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="alert">Inline Alert</SelectItem>
                            <SelectItem value="dialog">Popup Dialog (Image only)</SelectItem>
                        </SelectContent>
                        </Select>
                        <FormDescription>Choose how to display the alert to users.</FormDescription>
                        <FormMessage />
                    </FormItem>
                )} />

                <Separator />

                {watchAlertType === 'dialog' && (
                  <div className="space-y-6 p-4 border rounded-lg bg-muted/20">
                     <FormField control={form.control} name="dialogImageUrl" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dialog Image</FormLabel>
                          <FormControl>
                            <div>
                                {currentImageUrl ? (
                                    <div className="relative group w-full max-w-sm">
                                        <Image
                                            src={currentImageUrl}
                                            alt="Dialog preview"
                                            width={400}
                                            height={225}
                                            className="rounded-md border object-cover aspect-video"
                                        />
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="icon"
                                            className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={handleRemoveImage}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                      <Input
                                        id="image-upload"
                                        type="file"
                                        accept="image/png, image/jpeg, image/jpg, image/gif"
                                        onChange={handleImageUpload}
                                        disabled={isUploading}
                                        className="hidden"
                                      />
                                      <Label
                                        htmlFor="image-upload"
                                        className="flex-grow"
                                      >
                                        <div className="w-full flex items-center justify-center gap-2 h-10 px-4 py-2 text-sm font-medium border border-input rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground">
                                          {isUploading ? (
                                            <>
                                              <Loader2 className="h-4 w-4 animate-spin" />
                                              <span>Uploading...</span>
                                            </>
                                          ) : (
                                            <>
                                              <Upload className="h-4 w-4" />
                                              <span>Upload Image</span>
                                            </>
                                          )}
                                        </div>
                                      </Label>
                                  </div>
                                )}
                            </div>
                          </FormControl>
                          <FormDescription>Upload an image to display in the dialog popup (max 4.5MB).</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                  </div>
                )}
                
                {watchAlertType === 'alert' && (
                  <div className="space-y-6 p-4 border rounded-lg bg-muted/20">
                    <FormField control={form.control} name="content" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alert Content</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter the main message for your users here."
                            className="min-h-[150px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <Separator />
                    
                    <div className="space-y-4">
                        <CardTitle className="text-xl">Text Styling</CardTitle>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="font" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Font Family</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger><SelectValue placeholder="Select a font" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="font-arial">Arial</SelectItem>
                                    <SelectItem value="font-helvetica">Helvetica</SelectItem>
                                    <SelectItem value="font-montserrat">Montserrat</SelectItem>
                                    <SelectItem value="font-times-new-roman">Times New Roman</SelectItem>
                                    <SelectItem value="font-garamond">Garamond</SelectItem>
                                    <SelectItem value="font-playfair">Playfair Display</SelectItem>
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )} />
                        <FormField control={form.control} name="fontSize" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Font Size</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger><SelectValue placeholder="Select a size" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="text-xs">Extra Small</SelectItem>
                                    <SelectItem value="text-sm">Small (Default)</SelectItem>
                                    <SelectItem value="text-base">Medium</SelectItem>
                                    <SelectItem value="text-lg">Large</SelectItem>
                                    <SelectItem value="text-xl">Extra Large</SelectItem>
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )} />
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4">
                            <FormField
                                control={form.control}
                                name="bold"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                    <div className="space-y-0.5">
                                        <FormLabel>Bold</FormLabel>
                                    </div>
                                    <FormControl>
                                        <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    </FormItem>
                                )}
                                />
                            <FormField
                                control={form.control}
                                name="italic"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                    <div className="space-y-0.5">
                                        <FormLabel>Italic</FormLabel>
                                    </div>
                                    <FormControl>
                                        <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    </FormItem>
                                )}
                                />
                        </div>
                    </div>
                </div>
                )}


                <Separator/>
                
                <FormField
                  control={form.control}
                  name="display"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Display Alert to Customers</FormLabel>
                        <CardDescription>
                          Turn this on to make the alert visible on the customer homepage.
                        </CardDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </>
            )}
          </CardContent>
          <div className="px-6 pb-6">
            <Button type="submit" disabled={form.formState.isSubmitting || loading || isUploading}>
                {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>
    </Card>
  );
}
