// Encodes a game (lines, countries, claims) into a compact URL-safe string.

const toB64 = (bytes) => {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64 = (str) => {
  const s = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

async function pipe(bytes, stream) {
  const res = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await res.arrayBuffer());
}

// Lines are stored at half-cell precision, delta-encoded.
export function pack(state) {
  return {
    v: 1,
    l: state.lines.map((pts) => {
      const out = [];
      let px = 0, py = 0;
      for (const [x, y] of pts) {
        const qx = Math.round(x * 2), qy = Math.round(y * 2);
        out.push(qx - px, qy - py);
        px = qx; py = qy;
      }
      return out;
    }),
    c: state.countries.map((c) => [c.name, c.color]),
    k: state.claims.map((c) => [c.cell, c.country]),
  };
}

export function unpack(obj) {
  if (!obj || obj.v !== 1) throw new Error('Unknown save format');
  return {
    lines: obj.l.map((d) => {
      const pts = [];
      let x = 0, y = 0;
      for (let k = 0; k + 1 < d.length; k += 2) { x += d[k]; y += d[k + 1]; pts.push([x / 2, y / 2]); }
      return pts;
    }),
    countries: obj.c.map(([name, color]) => ({ name, color, autoName: false })),
    claims: obj.k.map(([cell, country]) => ({ cell, country })),
  };
}

export async function encodeState(state) {
  const json = new TextEncoder().encode(JSON.stringify(pack(state)));
  if (typeof CompressionStream === 'function') return 'z' + toB64(await pipe(json, new CompressionStream('deflate-raw')));
  return 'j' + toB64(json);
}

export async function decodeState(str) {
  const kind = str[0], bytes = fromB64(str.slice(1));
  const json = kind === 'z' ? await pipe(bytes, new DecompressionStream('deflate-raw')) : bytes;
  return unpack(JSON.parse(new TextDecoder().decode(json)));
}
