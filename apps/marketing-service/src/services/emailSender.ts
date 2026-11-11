const RESEND_API_URL = "https://api.resend.com/emails";

export async function sendEmail(params: { to: string; subject: string; html: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not configured");

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_FROM || "onboarding@resend.dev",
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
  });

  if (!res.ok) {
    const data: any = await res.json().catch(() => ({}));
    throw new Error(data?.message || `Resend error ${res.status}`);
  }
}
