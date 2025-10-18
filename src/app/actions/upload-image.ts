
'use server';

import { put, del } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';

export async function uploadImage(formData: FormData) {
  const file = formData.get('file') as File;
  if (!file) {
    throw new Error('No file provided');
  }

  // Sanitize the filename to remove special characters
  const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
  const filename = `${uuidv4()}-${sanitizedFilename}`;

  try {
    const blob = await put(filename, file, {
      access: 'public',
    });

    return blob;
  } catch (error) {
    console.error('Error uploading file to Vercel Blob:', error);
    throw new Error('Failed to upload image.');
  }
}

export async function deleteImage(url: string) {
    if (!url) {
        throw new Error('No URL provided');
    }
    try {
        await del(url);
    } catch (error) {
        console.error('Error deleting file from Vercel Blob:', error);
        // We don't throw here, as the user can continue even if deletion fails.
        // It might be an old/invalid URL.
    }
}
