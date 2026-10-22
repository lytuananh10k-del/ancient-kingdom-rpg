// Gom kết quả hồi quy (log của từng bộ kiểm thử + mã thoát) thành docs/reports/regression.json.
// Dùng: node tools/collect-regression.js <thư mục log>   (mỗi bộ: reg-<tên>.log; reg-summary.log chứa "<tên> exit=<mã> <giây>s")
'use strict';
const fs = require('fs');
const path = require('path');

const WEB = path.resolve(__dirname, '..');
const dir = process.argv[2];
if (!dir) { console.error('cần thư mục log'); process.exit(1); }
const summary = fs.readFileSync(path.join(dir, 'reg-summary.log'), 'utf8').split('\n').filter(l => / exit=/.test(l));
const suites = summary.map(l => {
  const [, name, code, secs] = l.match(/^(\S+) exit=(\d+) (\d+)s/);
  const log = fs.existsSync(path.join(dir, `reg-${name}.log`)) ? fs.readFileSync(path.join(dir, `reg-${name}.log`), 'utf8') : '';
  const pass = (log.match(/^\s*(✓|PASS)(\s|$)/gm) || []).length, fail = (log.match(/^\s*(✗|FAIL)(\s|$)/gm) || []).length;
  const failed = (log.match(/^\s*(✗|FAIL)(\s|$).*$/gm) || []).map(s => s.trim().slice(0, 240));
  const total = (log.match(/(\d+)\/(\d+) PASS/) || [])[0] || null;
  return { name, exit: +code, secs: +secs, pass, fail, total, failed };
});
fs.mkdirSync(path.join(WEB, 'docs/reports'), { recursive: true });
fs.writeFileSync(path.join(WEB, 'docs/reports/regression.json'), JSON.stringify({ date: new Date().toISOString(), note: 'Chromium headless + SwiftShader', suites }, null, 1));
suites.forEach(s => console.log(`${s.exit === 0 ? 'PASS' : 'FAIL'} ${s.name}: ${s.pass} đạt / ${s.fail} lỗi (${s.secs} s)${s.failed.length ? '\n   ' + s.failed.join('\n   ') : ''}`));
