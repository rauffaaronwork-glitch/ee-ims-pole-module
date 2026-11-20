import type { CapacitorConfig } from "@capacitor/cli";

// Android app = a thin wrapper around the hosted web app.
// android-shell/index.html asks for (and remembers) the server link, then
// opens it inside the app. Camera, GPS and file upload go through the
// Android WebView, with the permissions declared in AndroidManifest.xml.
const config: CapacitorConfig = {
  appId: "ph.edu.csu.ims.poles",
  appName: "Pole Scanner",
  webDir: "android-shell",
  backgroundColor: "#0e0e11",
  server: {
    androidScheme: "https",
    // Hosts the wrapper may open inside the app (others open in the browser)
    allowNavigation: ["*.trycloudflare.com", "*.vercel.app", "*.hf.space", "*.onrender.com"],
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
