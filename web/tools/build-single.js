// Đóng gói thành MỘT tệp HTML chạy độc lập (kể cả không mạng): nhúng mọi js/*.js theo đúng thứ tự trong index.html
// và nhúng luôn three.js r128 + GLTFLoader + SkeletonUtils (MIT) nếu tìm thấy gói three@0.128.0 (node_modules hoặc THREE_DIR).
// Không thấy gói three → giữ thẻ CDN (cần mạng lần đầu). Phông Google Fonts vẫn tải qua mạng, mất mạng thì dùng phông hệ thống.
// Chạy:  cd web && node tools/build-single.js      → dist/Vạn Kiếm Kỳ Trận V1.5 FINAL.html
'use strict';
const fs = require('fs');
const path = require('path');

const WEB = path.resolve(__dirname, '..');
const OUT = path.join(WEB, 'dist', 'Vạn Kiếm Kỳ Trận V1.5 FINAL.html');
const THREE_DIR = process.env.THREE_DIR || (() => { try { return path.dirname(require.resolve('three/package.json', { paths: [WEB] })); } catch (e) { return null; } })();
const CDN = {
  'three.min.js': 'build/three.min.js',
  'GLTFLoader.js': 'examples/js/loaders/GLTFLoader.js',
  'SkeletonUtils.js': 'examples/js/utils/SkeletonUtils.js'
};
const safe = code => code.replace(/<\/script/gi, '<\\/script');   // không để chuỗi "</script" trong mã cắt ngang thẻ
let html = fs.readFileSync(path.join(WEB, 'index.html'), 'utf8');
let inlined = 0, vendored = 0, bytes = 0;
html = html.replace(/<script src="([^"]+)"><\/script>/g, (tag, src) => {
  if (/^https?:/.test(src)) {
    const name = src.split('/').pop(), rel = CDN[name];
    if (!THREE_DIR || !rel || !fs.existsSync(path.join(THREE_DIR, rel))) return tag;
    const code = fs.readFileSync(path.join(THREE_DIR, rel), 'utf8'); vendored++; bytes += code.length;
    return `<script>/* ${name} – three.js r128 (MIT License, © 2010-2021 three.js authors) */\n${safe(code)}\n</script>`;
  }
  const f = path.join(WEB, src);
  if (!fs.existsSync(f)) throw new Error('Thiếu tệp ' + src);
  const code = fs.readFileSync(f, 'utf8'); inlined++; bytes += code.length;
  return `<script>/* ${src} */\n${safe(code)}\n</script>`;
});
const head = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0b0d12">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="description" content="Vạn Kiếm Kỳ Trận V1.5 FINAL – cờ nhân phẩm tu tiên 3D (Three.js)">
`;
// index.html là phần thân dùng cho Artifact (title + style + nội dung); tách title / style / link lên <head>
const headTags = [], body = html.replace(/^(<title>[^]*?<\/title>|<link[^>]*>|<style>[^]*?<\/style>)\s*/gm, m => { headTags.push(m.trim()); return ''; });
const out = head + headTags.join('\n') + '\n</head>\n<body>\n' + body.trim() + '\n</body>\n</html>\n';
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out);
console.log(`Đã ghi ${path.relative(WEB, OUT)} – ${(out.length / 1024).toFixed(0)} KB · nhúng ${inlined} tệp js của game` + (vendored ? ` + ${vendored} tệp three.js (chạy không cần mạng)` : ' · three.js vẫn tải từ CDN (không tìm thấy gói three@0.128.0)'));
