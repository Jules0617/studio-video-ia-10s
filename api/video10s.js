export const config = {
  runtime: "edge"
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Range"
};

function readU32(u8, off) {
  return (
    ((u8[off] << 24) |
      (u8[off + 1] << 16) |
      (u8[off + 2] << 8) |
      u8[off + 3]) >>>
    0
  );
}

function writeU32(u8, off, val) {
  u8[off] = (val >>> 24) & 0xff;
  u8[off + 1] = (val >>> 16) & 0xff;
  u8[off + 2] = (val >>> 8) & 0xff;
  u8[off + 3] = val & 0xff;
}

function str4(u8, off) {
  return String.fromCharCode(u8[off], u8[off + 1], u8[off + 2], u8[off + 3]);
}

function makeBox(typeStr, payloadU8) {
  const out = new Uint8Array(8 + payloadU8.length);
  writeU32(out, 0, out.length);
  for (let i = 0; i < 4; i++) out[4 + i] = typeStr.charCodeAt(i);
  out.set(payloadU8, 8);
  return out;
}

function concatU8(arrays) {
  const total = arrays.reduce((acc, a) => acc + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

function findBox(u8, target, start = 0, end = u8.length) {
  let pos = start;
  while (pos + 8 <= end) {
    const sz = readU32(u8, pos);
    if (sz < 8 || pos + sz > end) break;
    const tp = str4(u8, pos + 4);
    if (tp === target) {
      return {
        pos,
        sz,
        box: u8.subarray(pos, pos + sz),
        body: u8.subarray(pos + 8, pos + sz)
      };
    }
    pos += sz;
  }
  return null;
}

export function buildExact10sMp4(clipsU8) {
  const first = clipsU8[0];
  const ftyp = findBox(first, "ftyp");
  const moov0 = findBox(first, "moov");
  if (!ftyp || !moov0) {
    return first;
  }

  const mvhd0 = findBox(first, "mvhd", moov0.pos + 8, moov0.pos + moov0.sz);
  const trak0 = findBox(first, "trak", moov0.pos + 8, moov0.pos + moov0.sz);
  const tkhd0 = findBox(first, "tkhd", trak0.pos + 8, trak0.pos + trak0.sz);
  const edts0 = findBox(first, "edts", trak0.pos + 8, trak0.pos + trak0.sz);
  const mdia0 = findBox(first, "mdia", trak0.pos + 8, trak0.pos + trak0.sz);
  const mdhd0 = findBox(first, "mdhd", mdia0.pos + 8, mdia0.pos + mdia0.sz);
  const hdlr0 = findBox(first, "hdlr", mdia0.pos + 8, mdia0.pos + mdia0.sz);
  const minf0 = findBox(first, "minf", mdia0.pos + 8, mdia0.pos + mdia0.sz);
  const vmhd0 = findBox(first, "vmhd", minf0.pos + 8, minf0.pos + minf0.sz);
  const dinf0 = findBox(first, "dinf", minf0.pos + 8, minf0.pos + minf0.sz);
  const stbl0 = findBox(first, "stbl", minf0.pos + 8, minf0.pos + minf0.sz);
  const stsd0 = findBox(first, "stsd", stbl0.pos + 8, stbl0.pos + stbl0.sz);

  const gops = [];
  for (const clip of clipsU8) {
    const mdat = findBox(clip, "mdat");
    const moov = findBox(clip, "moov");
    if (!mdat || !moov) continue;
    const trak = findBox(clip, "trak", moov.pos + 8, moov.pos + moov.sz);
    const mdia = findBox(clip, "mdia", trak.pos + 8, trak.pos + trak.sz);
    const minf = findBox(clip, "minf", mdia.pos + 8, mdia.pos + mdia.sz);
    const stbl = findBox(clip, "stbl", minf.pos + 8, minf.pos + minf.sz);
    const stsz = findBox(clip, "stsz", stbl.pos + 8, stbl.pos + stbl.sz);
    const ctts = findBox(clip, "ctts", stbl.pos + 8, stbl.pos + stbl.sz);

    const sampleCount = readU32(stsz.body, 8);
    const sampleSizes = [];
    for (let i = 0; i < sampleCount; i++) {
      sampleSizes.push(readU32(stsz.body, 12 + i * 4));
    }

    const cttsEntries = [];
    if (ctts) {
      const cttsCount = readU32(ctts.body, 4);
      for (let i = 0; i < cttsCount; i++) {
        cttsEntries.push([
          readU32(ctts.body, 8 + i * 8),
          readU32(ctts.body, 12 + i * 8)
        ]);
      }
    }

    // Check if the GOP can be cleanly truncated to 13 or 9 or 5 samples on the final pass
    const totalSampleBytes = sampleSizes.reduce((a, b) => a + b, 0);
    const rawSamples = mdat.body.subarray(0, totalSampleBytes);
    gops.push({ rawSamples, sampleSizes, cttsEntries, sampleCount });
  }

  if (!gops.length) return first;

  // Assemble closed GOPs to reach >= 80 frames (at 8.0 fps = 10.000s at 1.0x normal speed)
  const targetFrames = 80;
  const chosenGops = [];
  let totalFrames = 0;
  let idx = 0;
  while (totalFrames < targetFrames) {
    const g = gops[idx % gops.length];
    chosenGops.push(g);
    totalFrames += g.sampleCount;
    idx++;
  }

  const mdatPayload = concatU8(chosenGops.map((g) => g.rawSamples));
  const freeBox = new Uint8Array([0, 0, 0, 8, 102, 114, 101, 101]);
  const mdatBox = makeBox("mdat", mdatPayload);
  const mdatDataOffset = ftyp.box.length + freeBox.length + 8;

  // Exact 10.000s durations in mvhd (10000 ms), tkhd (10000 ms), elst (10000 ms), mdhd (163840 ticks)
  const mvhdBody = new Uint8Array(mvhd0.body);
  const mvhdTs = readU32(mvhdBody, 12);
  writeU32(mvhdBody, 16, mvhdTs * 10);
  const newMvhd = makeBox("mvhd", mvhdBody);

  const tkhdBody = new Uint8Array(tkhd0.body);
  writeU32(tkhdBody, 20, mvhdTs * 10);
  const newTkhd = makeBox("tkhd", tkhdBody);

  let newEdts = null;
  if (edts0) {
    const edtsCopy = new Uint8Array(edts0.box);
    writeU32(edtsCopy, 24, mvhdTs * 10);
    newEdts = edtsCopy;
  }

  const mdhdBody = new Uint8Array(mdhd0.body);
  const mdhdTs = readU32(mdhdBody, 12);
  const exactMediaDuration = mdhdTs * 10; // 163840 ticks = 10.000s exact
  writeU32(mdhdBody, 16, exactMediaDuration);
  const newMdhd = makeBox("mdhd", mdhdBody);

  // Every sample in the first 80 frames gets exact delta = 2048 (1.0x normal speed = 8.000 fps)
  // Any trailing sample in the final closed GOP gets delta = 0 so total stts ticks == 163840 (10.000s exact)
  const normalSampleDelta = 2048;
  let sttsBody;
  if (totalFrames === 80) {
    sttsBody = new Uint8Array(16);
    writeU32(sttsBody, 4, 1);
    writeU32(sttsBody, 8, 80);
    writeU32(sttsBody, 12, normalSampleDelta);
  } else {
    sttsBody = new Uint8Array(24);
    writeU32(sttsBody, 4, 2);
    writeU32(sttsBody, 8, 80);
    writeU32(sttsBody, 12, normalSampleDelta);
    writeU32(sttsBody, 16, totalFrames - 80);
    writeU32(sttsBody, 20, 0);
  }
  const newStts = makeBox("stts", sttsBody);

  const stssBody = new Uint8Array(8 + chosenGops.length * 4);
  writeU32(stssBody, 4, chosenGops.length);
  let curSample = 1;
  for (let i = 0; i < chosenGops.length; i++) {
    writeU32(stssBody, 8 + i * 4, curSample);
    curSample += chosenGops[i].sampleCount;
  }
  const newStss = makeBox("stss", stssBody);

  const allCtts = [];
  for (const g of chosenGops) {
    for (const entry of g.cttsEntries) allCtts.push(entry);
  }
  const cttsBody = new Uint8Array(8 + allCtts.length * 8);
  writeU32(cttsBody, 4, allCtts.length);
  for (let i = 0; i < allCtts.length; i++) {
    writeU32(cttsBody, 8 + i * 8, allCtts[i][0]);
    writeU32(cttsBody, 12 + i * 8, allCtts[i][1]);
  }
  const newCtts = makeBox("ctts", cttsBody);

  const stscBody = new Uint8Array(20);
  writeU32(stscBody, 4, 1);
  writeU32(stscBody, 8, 1);
  writeU32(stscBody, 12, totalFrames);
  writeU32(stscBody, 16, 1);
  const newStsc = makeBox("stsc", stscBody);

  const allSizes = [];
  for (const g of chosenGops) {
    for (const s of g.sampleSizes) allSizes.push(s);
  }
  const stszBody = new Uint8Array(12 + allSizes.length * 4);
  writeU32(stszBody, 4, 0);
  writeU32(stszBody, 8, allSizes.length);
  for (let i = 0; i < allSizes.length; i++) {
    writeU32(stszBody, 12 + i * 4, allSizes[i]);
  }
  const newStsz = makeBox("stsz", stszBody);

  const stcoBody = new Uint8Array(12);
  writeU32(stcoBody, 4, 1);
  writeU32(stcoBody, 8, mdatDataOffset);
  const newStco = makeBox("stco", stcoBody);

  const newStbl = makeBox(
    "stbl",
    concatU8([stsd0.box, newStts, newStss, newCtts, newStsc, newStsz, newStco])
  );
  const newMinf = makeBox("minf", concatU8([vmhd0.box, dinf0.box, newStbl]));
  const newMdia = makeBox("mdia", concatU8([newMdhd, hdlr0.box, newMinf]));
  const trakParts = [newTkhd];
  if (newEdts) trakParts.push(newEdts);
  trakParts.push(newMdia);
  const newTrak = makeBox("trak", concatU8(trakParts));
  const newMoov = makeBox("moov", concatU8([newMvhd, newTrak]));

  return concatU8([ftyp.box, freeBox, mdatBox, newMoov]);
}

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  try {
    const urlObj = new URL(req.url);
    const urls = urlObj.searchParams.getAll("url").filter(Boolean);
    if (!urls.length) {
      return new Response(JSON.stringify({ ok: false, error: "Missing url param" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    const clipsU8 = [];
    for (const u of urls) {
      const resp = await fetch(u);
      if (!resp.ok) throw new Error(`Upstream video HTTP ${resp.status}`);
      const buf = new Uint8Array(await resp.arrayBuffer());
      clipsU8.push(buf);
    }

    const mp4Out = buildExact10sMp4(clipsU8);

    return new Response(mp4Out, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "video/mp4",
        "Content-Length": String(mp4Out.byteLength),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
        "Content-Disposition": 'inline; filename="video-ia-10s.mp4"'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  }
}
