import { Router } from "express";
import { z } from "zod";
import { signToken, verifyPassword } from "../lib/auth.js";

const loginSchema = z.object({
  password: z.string().min(1),
});

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  try {
    const valid = await verifyPassword(parsed.data.password);
    if (!valid) {
      res.status(401).json({ error: "Invalid password" });
      return;
    }

    const token = signToken();
    res.json({ token });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Auth misconfigured",
    });
  }
});
