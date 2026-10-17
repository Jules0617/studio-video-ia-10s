export default async function handler(req, res) {
  const spaces = [
    { id: "FrameAI4687/Omni-Video-Factory", name: "Omni-Video 10s-20s" },
    { id: "vamo455/Omni-videos-custom-auto_prompt_high-quality", name: "Omni-Video Mirror HQ" },
    { id: "zerogpu-aoti/wan2-2-fp8da-aoti-faster", name: "Wan 2.2 FP8 Faster" },
    { id: "Lightricks/ltx-video-distilled", name: "LTX-Video Distilled" },
    { id: "Lightricks/LTX-2-3", name: "LTX-2.3 HD" },
    { id: "zai-org/CogVideoX-5B-Space", name: "CogVideoX-5B" },
    { id: "multimodalart/Hunyuan-Video-1-5", name: "HunyuanVideo 1.5" },
    { id: "linoyts/FramePack-F1", name: "FramePack-F1 (60s)" }
  ];

  try {
    const statuses = await Promise.all(
      spaces.map(async (s) => {
        try {
          const r = await fetch(`https://huggingface.co/api/spaces/${s.id}`);
          const d = await r.json();
          return {
            id: s.id,
            name: s.name,
            stage: d?.runtime?.stage || "UNKNOWN",
            hardware: d?.runtime?.hardware?.current || "zero-a10g"
          };
        } catch (err) {
          return { id: s.id, name: s.name, stage: "UNREACHABLE", hardware: null };
        }
      })
    );
    res.status(200).json({ ok: true, spaces: statuses });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
}
