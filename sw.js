// ท่องมาตรา: เก็บแอปไว้ในเครื่องให้เปิดได้แม้ไม่มีเน็ต
const VERSION = "tm-2569-10-21j";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const font = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (url.origin !== location.origin && !font) return;
  // ใช้ของในเครื่องก่อน แล้วค่อยอัปเดตจากเน็ตเบื้องหลัง
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then(r => { if (r && (r.ok || r.type === "opaque")) c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});

// ---- เตือนท่องทุกวัน: ทำงานเมื่อผู้ใช้เปิดการเตือนเองเท่านั้น ----
function kvGet(k){return new Promise(res=>{const r=indexedDB.open("tm-kv",1);r.onupgradeneeded=()=>r.result.createObjectStore("kv");
  r.onsuccess=()=>{try{const g=r.result.transaction("kv").objectStore("kv").get(k);g.onsuccess=()=>res(g.result);g.onerror=()=>res(undefined)}catch(e){res(undefined)}};r.onerror=()=>res(undefined)})}
function kvSet(k,v){return new Promise(res=>{const r=indexedDB.open("tm-kv",1);r.onupgradeneeded=()=>r.result.createObjectStore("kv");
  r.onsuccess=()=>{try{const t=r.result.transaction("kv","readwrite");t.objectStore("kv").put(v,k);t.oncomplete=()=>res();t.onerror=()=>res()}catch(e){res()}};r.onerror=()=>res()})}
function dayKey(d){return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate()}
async function maybeRemind(){
  const cfg=await kvGet("remind");if(!cfg||!cfg.on)return;
  const now=new Date(),today=dayKey(now);
  if(now.getHours()<cfg.hour)return;
  if((await kvGet("lastStudy"))===today)return;
  if((await kvGet("lastNotified"))===today)return;
  await self.registration.showNotification("ถึงเวลาท่องมาตราแล้ว",{body:"วันนี้ยังไม่ได้ท่องเลย มาท่องสัก ๑๐ มาตรากันเถอะ",icon:"icon-192.png",badge:"icon-192.png",tag:"tm-remind",lang:"th"});
  await kvSet("lastNotified",today);
}
self.addEventListener("periodicsync",e=>{if(e.tag==="tm-remind")e.waitUntil(maybeRemind())});
self.addEventListener("notificationclick",e=>{e.notification.close();e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(cs=>{for(const c of cs){if("focus" in c)return c.focus()}return self.clients.openWindow("./")}))});
self.addEventListener("message",e=>{
  if(e.data==="tm-remind-check")e.waitUntil(maybeRemind());
  if(e.data==="tm-remind-test")e.waitUntil(self.registration.showNotification("ทดลองการเตือน ท่องมาตรา",{body:"ถ้าเห็นข้อความนี้ แปลว่าการแจ้งเตือนใช้ได้แล้ว",icon:"icon-192.png",tag:"tm-test",lang:"th"}));
});
