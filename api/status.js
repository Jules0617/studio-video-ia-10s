export const config = {
  runtime: "edge"
};

export default async function handler(req) {
  const spaces = [
    {
      id: "alibaba-pai/EasyAnimate",
      name: "Alibaba PAI EasyAnimate 12B (GPU Dédié Sans Quota)",
      url: "https://alibaba-pai-easyanimate.hf.space/config",
      quotaFree: true
    },
    {
      id: "Lightricks/ltx-video-distilled",
      name: "Lightricks LTX-Video Distilled",
      url: "https://lightricks-ltx-video-distilled.hf.space/config",
      quotaFree: false
    },
    {
      id: "zerogpu-aoti/wan2-2-fp8da-aoti-faster",
      name: "Wan 2.2 FP8 Faster",
      url: "https://zerogpu-aoti-wan2-2-fp8da-aoti-faster.hf.space/config",
      quotaFree: false
    },
    {
      id: "ByteDance/AnimateDiff-Lightning",
      name: "ByteDance AnimateDiff Lightning",
      url: "https://bytedance-animatediff-lightning.hf.space/config",
      quotaFree: false
    }
  ];

  const statuses = await Promise.all(
    spaces.map(async (s) => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const r = await fetch(s.url, { signal: controller.signal });
        clearTimeout(timer);
        return {
          id: s.id,
          name: s.name,
          quotaFree: s.quotaFree,
          stage: r.ok ? "RUNNING" : `HTTP_${r.status}`
        };
      } catch (_) {
        return {
          id: s.id,
          name: s.name,
          quotaFree: s.quotaFree,
          stage: "UNREACHABLE"
        };
      }
    })
  );

  return new Response(JSON.stringify({ ok: true, spaces: statuses }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
