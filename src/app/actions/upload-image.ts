
'use server';

import { put, del } from '@vercel/blob';
import { customAlphabet } from 'nanoid';
import { z } from 'zod';

// Define a schema for validating the file
const fileSchema = z.object({
  file: z.instanceof(File).refine(file => file.size > 0, { message: 'File is empty.' }),
});

export async function uploadImage(formData: FormData) {
  const file = formData.get('file') as File;

  // Validate the file
  const validationResult = fileSchema.safeParse({ file });
  if (!validationResult.success) {
    throw new Error(validationResult.error.errors.map(e => e.message).join(', '));
  }

  // Generate a unique filename
  const nanoid = customAlphabet(
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    7
  );
  const extension = file.name.split('.').pop();
  const filename = `Teco-${nanoid()}.${extension}`;

  // Upload to Vercel Blob
  const blob = await put(filename, file, {
    access: 'public',
  });

  return blob;
}

export async function deleteImage(url: string) {
    if (!url) {
        throw new Error('No URL provided for deletion.');
    }
    await del(url);
}
