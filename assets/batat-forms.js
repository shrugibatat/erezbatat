/* batat.com forms → email (Web3Forms).
 * Replaces Elementor's WordPress form handler, which needs a server.
 * Each submission is emailed to ארז as label: answer pairs.
 * The access key is public by design (Web3Forms docs); it only says where to send.
 */
(function () {
  var KEY = "26b96ddb-e56f-497d-b9ac-ba6a2ae0fdc5"; // locked to batat.com in Web3Forms
  var ENDPOINT = "https://api.web3forms.com/submit";
  var OK_TEXT = "תודה! ההודעה נשלחה, אחזור אליך בהקדם.";
  var FAIL_TEXT = "משהו השתבש בשליחה. אפשר לכתוב לי ישירות בוואטסאפ: ";
  var WHATSAPP = "https://wa.me/972556653762";

  function fieldLabel(el) {
    var group = el.closest(".elementor-field-group");
    var label = group && group.querySelector("label");
    var text = label ? label.textContent : el.placeholder || el.name;
    return text.replace(/\s+/g, " ").trim();
  }

  function showMessage(form, ok) {
    var old = form.querySelector(".batat-form-message");
    if (old) old.remove();
    var box = document.createElement("div");
    box.className = "batat-form-message elementor-message " +
      (ok ? "elementor-message-success" : "elementor-message-danger");
    box.setAttribute("role", "alert");
    box.textContent = ok ? OK_TEXT : FAIL_TEXT;
    if (!ok) {
      var a = document.createElement("a");
      a.href = WHATSAPP;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = "וואטסאפ";
      box.appendChild(a);
    }
    form.appendChild(box);
  }

  function addHoneypot(form) {
    if (form.querySelector("input[name=botcheck]")) return;
    var trap = document.createElement("input");
    trap.type = "checkbox";
    trap.name = "botcheck";
    trap.tabIndex = -1;
    var wrap = document.createElement("div");
    wrap.setAttribute("aria-hidden", "true");
    // !important: Elementor's form CSS otherwise shows the checkbox
    wrap.setAttribute("style", "display:none !important");
    wrap.appendChild(trap);
    form.appendChild(wrap);
  }

  document.querySelectorAll("form.elementor-form").forEach(addHoneypot);

  // Capture phase on window runs before Elementor's own (jQuery) submit handler,
  // and stopImmediatePropagation keeps that handler from firing at all.
  window.addEventListener("submit", function (e) {
    var form = e.target;
    if (!form.classList || !form.classList.contains("elementor-form")) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    addHoneypot(form); // popups can render their form after page load
    var page = document.title.replace(/\s*-\s*ארז בטאט\s*$/, "");
    var data = {
      access_key: KEY,
      subject: "batat.com: " + page,
      from_name: "batat.com",
      "עמוד": location.href,
      botcheck: form.querySelector("input[name=botcheck]").checked
    };
    var seen = {};
    form.querySelectorAll("input, textarea, select").forEach(function (el) {
      if (!el.name || el.name === "botcheck") return;
      if (el.type === "hidden" || el.type === "submit" || el.type === "button") return;
      if ((el.type === "checkbox" || el.type === "radio") && !el.checked) return;
      var key = fieldLabel(el);
      if (seen[key]) {
        data[key] += ", " + el.value;
        return;
      }
      seen[key] = true;
      data[key] = el.value;
      if (el.type === "email" && el.value) data.replyto = el.value;
    });

    var button = form.querySelector("[type=submit]");
    if (button) button.disabled = true;
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(data)
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        showMessage(form, !!res.success);
        if (res.success) form.reset();
      })
      .catch(function () { showMessage(form, false); })
      .then(function () { if (button) button.disabled = false; });
  }, true);
})();
