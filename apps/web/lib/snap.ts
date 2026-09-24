declare global {
  interface Window {
    snap: { pay: (token: string, options: Record<string, unknown>) => void };
  }
}

let snapScriptLoaded = false;

export function loadSnap(clientKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (snapScriptLoaded || window.snap) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
    script.setAttribute("data-client-key", clientKey);
    script.onload = () => {
      snapScriptLoaded = true;
      resolve();
    };
    script.onerror = () => {
      reject(new Error("Failed to load Snap script"));
    };
    document.head.appendChild(script);
  });
}

export function paySnap(token: string): Promise<"success" | "pending" | "error" | "closed"> {
  return new Promise((resolve) => {
    if (!window.snap) {
      resolve("error");
      return;
    }
    window.snap.pay(token, {
      onSuccess: () => resolve("success"),
      onPending: () => resolve("pending"),
      onError: () => resolve("error"),
      onClose: () => resolve("closed"),
    });
  });
}
