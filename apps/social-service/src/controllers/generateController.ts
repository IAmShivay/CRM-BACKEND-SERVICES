import { Request, Response } from "express";

export const generateContent = async (req: Request, res: Response) => {
  try {
    const { prompt, platform, tone } = req.body;

    res.json({
      success: true,
      content: `Generated content for ${platform || "general"} with ${tone || "professional"} tone based on: ${prompt}`,
      aiGenerated: true,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to generate content" });
  }
};
