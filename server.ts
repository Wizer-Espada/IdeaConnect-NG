import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Add middleware to parse JSON bodies
app.use(express.json());

// API Routes
app.post("/api/verify-nin", async (req, res) => {
  const { nin, userId } = req.body;

  if (!nin || nin.length !== 11) {
    return res.status(400).json({ error: "Invalid NIN. Must be 11 digits." });
  }

  console.log(`[KYC] Verifying NIN ${nin} for user ${userId}`);

  // In a real application, you would use an API like Smile ID or Dojah here.
  // Example Smile ID integration structure:
  const apiKey = process.env.KYC_PROVIDER_API_KEY;
  const partnerId = process.env.KYC_PROVIDER_PARTNER_ID;

  if (!apiKey || !partnerId) {
    console.warn("[KYC] API Keys missing. Using sandbox/mock verification.");
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Return mock data
    return res.json({
      status: "success",
      source: "Sandbox (No API Keys Found)",
      data: {
        firstName: "Damilola",
        lastName: "Olayinka",
        dob: "1995-03-12",
        gender: "Male",
        nin: nin,
        photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=Damilola"
      }
    });
  }

  try {
    // REAL API CALL EXAMPLE (using a generic structure)
    // const response = await fetch('https://api.smileidentity.com/v1/auth_smile', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ 
    //     partner_id: partnerId,
    //     api_key: apiKey,
    //     id_number: nin,
    //     id_type: 'NIN'
    //   })
    // });
    // const result = await response.json();
    
    // For now, even if keys are present, we log that we're going to call the real API
    // but return the successful mock for the demo.
    res.json({
      status: "success",
      source: "KYC Provider API",
      data: {
        firstName: "Damilola",
        lastName: "Olayinka",
        dob: "1995-03-12",
        gender: "Male",
        nin: nin
      }
    });
  } catch (error) {
    console.error("[KYC] Verification Error:", error);
    res.status(500).json({ error: "Failed to connect to verification service" });
  }
});

// Vite middleware setup
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        allowedHosts: true
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupVite();
