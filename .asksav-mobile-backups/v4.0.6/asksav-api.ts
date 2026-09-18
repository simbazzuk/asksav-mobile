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

// AskSAV Mobile v0.3.2 - exact web Market Intelligence contract.
// Server route requires JSON: { analysis: <fresh analysis payload> }.
export async function marketAskSAVAnalysis(user: User, analysis: Record<string, any>) {
  const token = await user.getIdToken();
  const response = await fetch(`${API_BASE}/api/v20/market-intelligence`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ analysis }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.message || payload?.error || `Market Intelligence failed (${response.status}).`;
    const error = new Error(message);
    (error as any).code = payload?.code || payload?.error;
    (error as any).plan = payload?.plan;
    throw error;
  }
  return payload?.market ?? payload;
}


// AskSAV Mobile v4.0.2 - server-authoritative account/entitlement state.
export async function getAskSAVEntitlements(user: User) {
  const token = await user.getIdToken();
  const response = await fetch(`${API_BASE}/api/v20/entitlements`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.message || payload?.error || `Unable to load AskSAV account (${response.status}).`);
    (error as any).code = payload?.code;
    throw error;
  }
  return payload;
}
