// AskSAV Mobile v0.3
import type { User } from "firebase/auth";

const API_BASE = (process.env.EXPO_PUBLIC_ASKSAV_API_BASE || "https://asksav.ai").replace(/\/+$/, "");

export async function analyseAskSAVImage(user: User, uri: string) {
  const token = await user.getIdToken();
  const name = uri.split("/").pop() || "asksav-photo.jpg";
  const extension = name.split(".").pop()?.toLowerCase();
  const type = extension === "png" ? "image/png" : extension === "heic" || extension === "heif" ? "image/heic" : "image/jpeg";

  const form = new FormData();
  form.append("image", { uri, name, type } as any);

  const response = await fetch(`${API_BASE}/api/v20/analyse-item`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
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
