import { NextResponse } from "next/server"

export const runtime = "edge"

/**
 * Embed loader: clinics paste
 *   <script src=".../embed.js" data-clinic-slug="their-slug" async></script>
 * This injects a "Book Now" button that opens the booking page in a modal
 * iframe. Served as a route (not a static file) so it can read the app's
 * own origin at request time instead of requiring clinics to hardcode it.
 */
export async function GET(request: Request) {
  const origin = new URL(request.url).origin

  const script = `
(function () {
  var scripts = document.getElementsByTagName("script");
  var thisScript = scripts[scripts.length - 1];
  var slug = thisScript.getAttribute("data-clinic-slug");
  var buttonLabel = thisScript.getAttribute("data-label") || "Book Now";
  if (!slug) {
    console.error("[ClinicBook embed] missing data-clinic-slug attribute");
    return;
  }
  var origin = ${JSON.stringify(origin)};

  function openModal() {
    var overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;padding:16px;";
    var frameWrap = document.createElement("div");
    frameWrap.style.cssText =
      "position:relative;width:100%;max-width:480px;height:90vh;max-height:800px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3);";
    var closeBtn = document.createElement("button");
    closeBtn.textContent = "\\u00d7";
    closeBtn.setAttribute("aria-label", "Close booking");
    closeBtn.style.cssText =
      "position:absolute;top:8px;right:8px;z-index:1;width:32px;height:32px;border-radius:9999px;border:none;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.2);font-size:20px;line-height:1;cursor:pointer;";
    var iframe = document.createElement("iframe");
    iframe.src = origin + "/book/" + encodeURIComponent(slug) + "?embed=1";
    iframe.style.cssText = "width:100%;height:100%;border:0;";
    iframe.title = "Book an appointment";

    function close() {
      document.body.removeChild(overlay);
    }
    closeBtn.onclick = close;
    overlay.onclick = function (e) {
      if (e.target === overlay) close();
    };

    frameWrap.appendChild(closeBtn);
    frameWrap.appendChild(iframe);
    overlay.appendChild(frameWrap);
    document.body.appendChild(overlay);
  }

  var btn = document.createElement("button");
  btn.textContent = buttonLabel;
  btn.type = "button";
  btn.style.cssText =
    "display:inline-flex;align-items:center;justify-content:center;padding:10px 18px;border-radius:8px;border:none;background:#0d9488;color:#fff;font:600 14px system-ui,sans-serif;cursor:pointer;";
  btn.onclick = openModal;

  thisScript.parentNode.insertBefore(btn, thisScript);
})();
`.trim()

  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  })
}
