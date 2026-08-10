const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Nora TrimTex">
  <rect width="512" height="512" rx="116" fill="#fbf7f0"/>
  <path d="M146 106H406M276 106V396" fill="none" stroke="#422b21" stroke-width="38" stroke-linecap="round"/>
  <g transform="translate(66 45) scale(1.78)">
    <path d="M25 175V35L185 175V35" fill="none" stroke="#ad8950" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M10 182h30l-5 48H15zM170 182h30l-5 48h-20z" fill="#ad8950"/>
    <path d="M13 193h24M173 193h24" stroke="#fbf7f0" stroke-width="3"/>
  </g>
</svg>`;

export function GET() {
  return new Response(icon, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
