#!/bin/sh
# Monta a apresentação: embute logo e mockups no HTML e gera o PDF.
# O HTML final é autocontido — caminho relativo quebra assim que o arquivo sai da pasta.
set -e
cd "$(dirname "$0")"

node -e '
const fs=require("fs");
let h=fs.readFileSync("apresentacao.src.html","utf8");
const uri=(a,m)=>"data:"+m+";base64,"+fs.readFileSync(a).toString("base64");
for(const [arq,mime] of [["club43-compacto-branco.svg","image/svg+xml"],
                         ["club43-compacto.svg","image/svg+xml"],
                         ["app-home.jpg","image/jpeg"],
                         ["app-cupom.jpg","image/jpeg"],
                         ["app-loja.jpg","image/jpeg"]]){
  const antes=h;
  h=h.split(`src="${arq}"`).join(`src="${uri(arq,mime)}"`);
  if(h===antes){ console.error("NAO EMBUTIU: "+arq); process.exit(1) }
}
const sobrou=(h.match(/src="(?!data:)/g)||[]).length;
if(sobrou){ console.error("sobraram "+sobrou+" referencias externas"); process.exit(1) }
fs.writeFileSync("apresentacao.html",h);
console.log("html autocontido: "+(h.length/1024/1024).toFixed(2)+" MB");
'

"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="club43-apresentacao.pdf" "file://$PWD/apresentacao.html" 2>/dev/null || true

ls -la club43-apresentacao.pdf | awk '{print "pdf: "$5" bytes"}'
