export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const prompt = body.prompt || "Cinematic 4k photorealistic scene, smooth camera movement";
    const width = Number(body.width) || 512;
    const height = Number(body.height) || 320;
    const steps = Number(body.steps) || 12;
    const frames = Number(body.frames) || 17;
    const seed = String(Math.floor(Math.random() * 9999999));

    const host = "https://alibaba-pai-easyanimate.hf.space";
    const sessionHash = Math.random().toString(36).substring(2, 12);

    const payload = {
      data: [
        "models/Diffusion_Transformer/EasyAnimateV5.1-12b-zh-InP",
        "none",
        "none",
        "none",
        0.55,
        prompt,
        "Twisted body, limb deformities, text captions, comic, static, ugly, error, messy code, watermark, blurry",
        "Flow",
        steps,
        "Generate by",
        width,
        height,
        512,
        "Video Generation",
        frames,
        6.0,
        null,
        null,
        null,
        null,
        0.7,
        seed
      ],
      fn_index: 5,
      session_hash: sessionHash
    };

    const joinResp = await fetch(`${host}/queue/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!joinResp.ok) {
      throw new Error(`Join failed with status ${joinResp.status}`);
    }

    const joinData = await joinResp.json();
    return res.status(200).json({
      ok: true,
      host,
      sessionHash,
      eventId: joinData.event_id,
      streamUrl: `${host}/queue/data?session_hash=${sessionHash}`
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
