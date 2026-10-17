export const config = {
  runtime: "edge"
};

const EAS_HOST = "https://alibaba-pai-easyanimate.hf.space";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

async function translateToEnglishServer(text) {
  if (!text) return "A majestic cinematic scene in 4k";
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 450))}&langpair=fr|en`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      const translated = data?.responseData?.translatedText;
      if (translated && !translated.includes("MYMEMORY WARNING")) {
        return translated;
      }
    }
  } catch (_) {}
  return text;
}

function base64ToUint8Array(base64Raw) {
  const binaryString = atob(base64Raw);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function uploadBase64ImageToEAS(base64DataUri) {
  const match = base64DataUri.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  const mimeType = match ? match[1] : "image/jpeg";
  const base64Raw = match ? match[2] : base64DataUri;
  const bytes = base64ToUint8Array(base64Raw);
  const ext = mimeType.split("/")[1] || "jpg";

  const formData = new FormData();
  const blob = new Blob([bytes], { type: mimeType });
  formData.append("files", blob, `upload.${ext}`);

  const upResp = await fetch(`${EAS_HOST}/upload`, {
    method: "POST",
    body: formData
  });

  if (!upResp.ok) {
    throw new Error(`Échec de l'envoi d'image vers le GPU (${upResp.status})`);
  }

  const upJson = await upResp.json();
  if (!Array.isArray(upJson) || !upJson[0]) {
    throw new Error("Chemin d'image non retourné par le serveur GPU");
  }
  return upJson[0];
}

async function runSingleAlibabaAttempt({
  promptEn,
  aspect = "16:9",
  speed = "fast",
  isImage = false,
  startImagePath = null,
  attemptIndex = 0,
  onEvent = () => {}
}) {
  let width = 512;
  let height = 288;
  if (aspect === "9:16") {
    width = 288;
    height = 512;
  } else if (aspect === "1:1") {
    width = 384;
    height = 384;
  } else if (speed === "high" && attemptIndex === 0) {
    width = 672;
    height = 384;
  }

  // EasyAnimate V5.1 valid parameters:
  // sample_step_slider minimum = 10
  // length_slider: 1 (for image) or 5, 9, 13, 17, 21 (step = 4)
  const steps = speed === "high" && attemptIndex === 0 ? 14 : 10;
  const frames = isImage
    ? 1
    : startImagePath
      ? 5
      : attemptIndex > 0
        ? 5
        : speed === "high"
          ? 13
          : 9;

  const genMethod = isImage ? "Image Generation" : "Video Generation";
  const seed = String(Math.floor(Math.random() * 99999999));
  const sessionHash =
    Math.random().toString(36).substring(2, 10) +
    Math.random().toString(36).substring(2, 6);

  const startImageObj = startImagePath
    ? { path: startImagePath, meta: { _type: "gradio.FileData" } }
    : null;

  const payload = {
    data: [
      "models/Diffusion_Transformer/EasyAnimateV5.1-12b-zh-InP",
      "none",
      "none",
      "none",
      0.55,
      `${promptEn}. High quality, masterpiece, best quality, high resolution, ultra-detailed, photorealistic cinema.`,
      "Twisted body, limb deformities, text captions, comic, static, ugly, error, messy code, watermark, blurry, low quality.",
      "Flow",
      steps,
      "Generate by",
      width,
      height,
      512,
      genMethod,
      frames,
      6.0,
      startImageObj,
      null,
      null,
      null,
      0.7,
      seed
    ],
    fn_index: 5,
    session_hash: sessionHash
  };

  onEvent({
    type: "joining",
    attempt: attemptIndex + 1,
    width,
    height,
    frames,
    steps
  });

  const joinResp = await fetch(`${EAS_HOST}/queue/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!joinResp.ok) {
    throw new Error(`Join HTTP ${joinResp.status}`);
  }

  const joinData = await joinResp.json();

  const streamResp = await fetch(
    `${EAS_HOST}/queue/data?session_hash=${sessionHash}`,
    {
      method: "GET",
      headers: { Accept: "text/event-stream" }
    }
  );

  if (!streamResp.ok || !streamResp.body) {
    throw new Error(`Stream HTTP ${streamResp.status}`);
  }

  const reader = streamResp.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith("data:")) continue;
      const jsonStr = line.slice(5).trim();
      if (!jsonStr) continue;

      let msg;
      try {
        msg = JSON.parse(jsonStr);
      } catch (_) {
        continue;
      }

      if (msg.msg === "estimation") {
        onEvent({
          type: "queue",
          rank: (msg.rank ?? 0) + 1,
          queueSize: msg.queue_size ?? 1,
          eta: Math.round(msg.rank_eta || 25)
        });
      } else if (msg.msg === "process_starts") {
        onEvent({
          type: "processing",
          eta: Math.round(msg.eta || 20)
        });
      } else if (msg.msg === "unexpected_error" || msg.msg === "queue_full") {
        throw new Error(msg.message || `Gradio ${msg.msg}`);
      } else if (msg.msg === "process_completed") {
        if (msg.success === false) {
          throw new Error(msg?.output?.error || "GPU process_completed failed");
        }

        const outData = msg?.output?.data || [];

        if (isImage && outData[0]?.value) {
          const imgVal = outData[0].value;
          const imgUrl = imgVal.url || `${EAS_HOST}/file=${imgVal.path}`;
          return {
            url: imgUrl,
            path: imgVal.path,
            eventId: joinData.event_id,
            engine: "Alibaba PAI EasyAnimate 12B (Image GPU Dédié)"
          };
        }

        const vidVal =
          outData[1]?.value?.video ||
          outData[1]?.video ||
          outData[1]?.value;

        if (vidVal && (vidVal.url || vidVal.path)) {
          const videoUrl = vidVal.url || `${EAS_HOST}/file=${vidVal.path}`;
          return {
            url: videoUrl,
            path: vidVal.path,
            eventId: joinData.event_id,
            engine: "Alibaba PAI EasyAnimate 12B (GPU Dédié Sans Quota)"
          };
        }

        throw new Error(outData[2] || "Sortie GPU sans fichier média");
      }
    }
  }

  throw new Error("Flux GPU fermé avant la fin du rendu");
}

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  const startTime = Date.now();
  let body = {};

  try {
    if (req.method === "GET") {
      const urlObj = new URL(req.url);
      body = Object.fromEntries(urlObj.searchParams.entries());
    } else {
      body = await req.json();
    }
  } catch (_) {
    body = {};
  }

  const rawPrompt = (
    body.prompt ||
    "Un lion majestueux marche dans la savane africaine au lever du soleil, lumière dorée cinématique 4K"
  ).trim();
  const style =
    body.style ||
    "photorealistic 4k cinema movie shot, ultra detailed, natural fluid motion, volumetric lighting, masterpiece";
  const aspect = body.aspect || "16:9";
  const speed = body.speed || "fast";
  const mode = body.mode || "t2v";
  const isImage = mode === "image" || body.isImage === true || body.isImage === "true";

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj) => {
        try {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                ...obj,
                elapsedMs: Date.now() - startTime
              }) + "\n"
            )
          );
        } catch (_) {}
      };

      // Heartbeat toutes les 3 secondes pour empêcher toute coupure LTE / Proxy / Vercel
      const heartbeatTimer = setInterval(() => {
        send({ type: "heartbeat" });
      }, 3000);

      try {
        send({
          type: "init",
          message: "Traduction et préparation du prompt sur le backend..."
        });

        const translatedPrompt = await translateToEnglishServer(rawPrompt);
        const fullPromptEn = `${translatedPrompt}, ${style}`;

        let startImagePath = body.startImagePath || null;
        if (!startImagePath && body.startImageBase64) {
          send({
            type: "uploading",
            message: "Transfert de l'image vers le cluster GPU dédié..."
          });
          startImagePath = await uploadBase64ImageToEAS(body.startImageBase64);
        }

        let lastError = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const result = await runSingleAlibabaAttempt({
              promptEn: fullPromptEn,
              aspect,
              speed,
              isImage,
              startImagePath,
              attemptIndex: attempt,
              onEvent: (ev) => send(ev)
            });

            clearInterval(heartbeatTimer);
            send({
              type: "completed",
              ok: true,
              url: result.url,
              path: result.path,
              engine: result.engine,
              promptOriginal: rawPrompt,
              promptEn: fullPromptEn,
              attempt: attempt + 1
            });
            controller.close();
            return;
          } catch (err) {
            lastError = err;
            send({
              type: "retry",
              attempt: attempt + 1,
              reason: err.message || "Nouvelle tentative GPU automatique..."
            });
          }
        }

        throw lastError || new Error("Serveur GPU occupé");
      } catch (err) {
        clearInterval(heartbeatTimer);
        send({
          type: "error",
          ok: false,
          error: err.message || "Erreur lors de la génération GPU"
        });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no"
    }
  });
}
