import { supabase } from "./supabase";

/**
 * Upload a photo to Supabase Storage and return the public URL
 * @param base64Photo - Base64 encoded photo data (data:image/jpeg;base64,...)
 * @param memberId - Committee member ID for naming the file
 * @param attendanceDate - Date for organizing photos by date
 * @returns Public URL of the uploaded photo or null if upload fails
 */
export async function uploadAttendancePhoto(
  base64Photo: string,
  memberId: string,
  attendanceDate: string
): Promise<string | null> {
  try {
    // Convert base64 to blob
    const base64Data = base64Photo.split(",")[1];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "image/jpeg" });

    // Generate unique filename: date/memberId_timestamp.jpg
    const timestamp = Date.now();
    const fileName = `${attendanceDate}/${memberId}_${timestamp}.jpg`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("attendance-photos")
      .upload(fileName, blob, {
        contentType: "image/jpeg",
        upsert: true, // Replace if exists
      });

    if (error) {
      console.error("Error uploading photo:", error);
      return null;
    }

    // Get the public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("attendance-photos").getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error("Error processing photo upload:", error);
    return null;
  }
}

/**
 * Delete a photo from Supabase Storage
 * @param photoUrl - The public URL of the photo to delete
 * @returns true if deletion was successful, false otherwise
 */
export async function deleteAttendancePhoto(
  photoUrl: string
): Promise<boolean> {
  try {
    // Extract the file path from the URL
    // URL format: https://xxx.supabase.co/storage/v1/object/public/attendance-photos/2024-12-19/memberId_timestamp.jpg
    const urlParts = photoUrl.split("/attendance-photos/");
    if (urlParts.length < 2) return false;

    const filePath = urlParts[1];

    const { error } = await supabase.storage
      .from("attendance-photos")
      .remove([filePath]);

    if (error) {
      console.error("Error deleting photo:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error processing photo deletion:", error);
    return false;
  }
}

/**
 * Check if a string is a base64 encoded image
 */
export function isBase64Image(str: string): boolean {
  return str.startsWith("data:image/");
}
