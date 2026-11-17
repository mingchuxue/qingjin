// 校验二级结论中所有公式能被本地 KaTeX 正常解析
const fs = require("fs"), path = require("path");
const root = process.argv[2] || path.resolve(__dirname,"..");
const katex = require(path.join(root, "assets/katex/katex.min.js"));
let n = 0, bad = 0;
function check(str, where) {
  const re = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$|\\\(([\s\S]+?)\\\)/g; let m;
  while ((m = re.exec(str))) {
    const tex = m[1] || m[2] || m[3]; n++;
    try { katex.renderToString(tex, { throwOnError: true, strict: false, displayMode: !!m[1] }); }
    catch (e) { bad++; console.log("✗", where, tex.slice(0, 80), "→", e.message.slice(0, 120)); }
  }
  const dollars = (str.replace(/\\\$/g, "").match(/\$/g) || []).length;
  if (dollars % 2) { bad++; console.log("✗ 美元符号不成对", where, str.slice(0, 60)); }
}
function walk(o, where) {
  if (typeof o === "string") return check(o, where);
  if (Array.isArray(o)) return o.forEach((x, i) => walk(x, where));
  if (o && typeof o === "object") for (const k of Object.keys(o)) walk(o[k], where + "." + k);
}
for (const f of fs.readdirSync(path.join(root, "data/conclusions"))) {
  for (const it of JSON.parse(fs.readFileSync(path.join(root, "data/conclusions", f), "utf8"))) walk(it, it.id);
}
console.log(`公式 ${n} 个，失败 ${bad} 个`);
process.exit(bad ? 1 : 0);
