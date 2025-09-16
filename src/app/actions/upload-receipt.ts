
'use server';

import { put } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';

export async function uploadReceipt(file: File) {
  if (!file) {
    throw new Error('No file provided');
  }

  const filename = `${uuidv4()}-${file.name}`;

  try {
    const blob = await put(filename, file, {
      access: 'public',
    });

    return blob;
  } catch (error) {
    console.error('Error uploading file to Vercel Blob:', error);
    throw new Error('Failed to upload receipt.');
  }
}
