// AskSAV Mobile v0.3
import { fetch } from "expo/fetch";
import { File } from "expo-file-system";
import type { User } from "firebase/auth";

const API_BASE = (process.env.EXPO_PUBLIC_ASKSAV_API_BASE || "https://asksav.ai").replace(/\/+$/, "");

export async function analyseAskSAVImage(user: User, uri: string) {
  const token = await user.getIdToken();

  // Expo SDK uses a Blob-compatible File for multipart uploads.
  // This avoids React Native's "Unsupported FormDataPart implementation"
  // error from URI-shaped pseudo-file objects.
  const image = new File(uri);
  const form = new FormData();
  form.append("image", image);

  const response = await fetch(`${API_BASE}/api/v20/analyse-item`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error || `AskSAV analysis failed (${response.status}).`);
    (error as any).code = payload?.code;
    throw error;
  }

  return payload;
}