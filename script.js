/* CarRentX — shared behaviour for every page.
   Page-specific code runs only when <body data-page="..."> matches.
   NOTE: this is a front-end demo. Accounts, bookings and profiles are kept in
   this browser's localStorage; real authentication needs a backend. */
(function () {
  "use strict";

  var KEYS = {
    profile: "carrentx_profile",
    user: "carrentx_user",
    bookings: "carrentxBookings",
    remember: "carrentx_remember_email"
  };

  var EMAIL_RE = /^\S+@\S+\.\S+$/;
  var PHONE_RE = /^[6-9]\d{9}$/;
  var MAX_FILE = 5 * 1024 * 1024;

  function $(id) { return document.getElementById(id); }

  function load(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function pad(n) { return String(n).padStart(2, "0"); }

  function toISODate(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function money(n) {
    return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
  }

  function normalizePhone(value) {
    var d = String(value || "").replace(/\D/g, "");
    if (d.length > 10 && d.indexOf("91") === 0) d = d.slice(2);
    else if (d.length === 11 && d.charAt(0) === "0") d = d.slice(1);
    return d;
  }

  function showMsg(box, text, type, field) {
    if (!box) return false;
    box.textContent = text;
    box.className = "msg " + (type || "err") + " show";
    if (field && field.focus) field.focus();
    return false;
  }

  function hideMsg(box) {
    if (!box) return;
    box.textContent = "";
    box.className = "msg";
  }

  /* ---------- Mobile navigation ---------- */

  function initNav() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = $("site-nav");
    if (!toggle || !nav) return;

    function setOpen(open) {
      nav.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    }

    toggle.addEventListener("click", function () {
      setOpen(!nav.classList.contains("open"));
    });

    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });

    document.addEventListener("click", function (e) {
      if (!e.target.closest(".site-header")) setOpen(false);
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 860) setOpen(false);
    });
  }

  /* ---------- Image fallbacks ----------
     <img data-fallback="a.jpg|b.jpg"> tries each file in order; if all fail
     the image is hidden and the dark card background shows instead. */

  function handleImageError(img) {
    var list = (img.getAttribute("data-fallback") || "").split("|").filter(Boolean);
    var index = Number(img.getAttribute("data-fb-index") || 0);

    if (index < list.length) {
      img.setAttribute("data-fb-index", String(index + 1));
      img.src = list[index];
    } else {
      // Nothing left to try: drop the broken source so no broken-image icon shows,
      // and let the dark placeholder background of the card fill the space.
      img.alt = "";
      img.removeAttribute("src");
      img.classList.add("img-missing");
    }
  }

  function initImages() {
    document.addEventListener("error", function (e) {
      if (e.target && e.target.tagName === "IMG") handleImageError(e.target);
    }, true);

    // Catch images that already failed before this script ran.
    Array.prototype.forEach.call(document.images, function (img) {
      if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) {
        handleImageError(img);
      }
    });
  }

  /* ---------- Login ---------- */

  function initLogin() {
    var form = $("f");
    if (!form) return;

    var msg = $("msg");
    var emailInput = $("email");
    var remember = $("remember");
    var user = load(KEYS.user, {});
    var remembered = load(KEYS.remember, "");

    if (remembered) {
      emailInput.value = remembered;
      if (remember) remember.checked = true;
    } else if (user.email) {
      emailInput.value = user.email;
    }

    if (new URLSearchParams(window.location.search).get("registered") === "1") {
      showMsg(msg, "Account created. Log in to continue.", "ok");
    }

    var forgot = $("forgot");
    if (forgot) {
      forgot.addEventListener("click", function (e) {
        e.preventDefault();
        showMsg(msg, "Password reset isn't available in this demo.", "info");
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var email = emailInput.value.trim();
      var password = $("pw").value;

      if (!EMAIL_RE.test(email)) return showMsg(msg, "Enter a valid email address.", "err", emailInput);
      if (password.length < 6) return showMsg(msg, "Password must be at least 6 characters.", "err", $("pw"));

      hideMsg(msg);

      var previous = load(KEYS.user, {});
      save(KEYS.user, {
        name: previous.email === email ? previous.name || "" : "",
        email: email
      });

      if (remember && remember.checked) save(KEYS.remember, email);
      else try { localStorage.removeItem(KEYS.remember); } catch (err) { /* ignore */ }

      // Demo only: a real site would verify the password on a server first.
      window.location.href = "carselection.html";
    });
  }

  /* ---------- Sign up ---------- */

  function initSignup() {
    var form = $("f");
    if (!form) return;

    var msg = $("msg");

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var name = $("name").value.trim();
      var email = $("email").value.trim();
      var password = $("pw").value;

      if (name.length < 2) return showMsg(msg, "Enter your full name.", "err", $("name"));
      if (!EMAIL_RE.test(email)) return showMsg(msg, "Enter a valid email address.", "err", $("email"));
      if (password.length < 6) return showMsg(msg, "Password must be at least 6 characters.", "err", $("pw"));

      hideMsg(msg);

      // Demo only: the password is never stored.
      save(KEYS.user, { name: name, email: email });
      window.location.href = "login.html?registered=1";
    });
  }

  /* ---------- Renter profile ---------- */

  function ageFrom(dateString) {
    var p = dateString.split("-").map(Number);
    var t = new Date();
    var age = t.getFullYear() - p[0];
    var m = t.getMonth() + 1 - p[1];
    if (m < 0 || (m === 0 && t.getDate() < p[2])) age--;
    return age;
  }

  function initProfile() {
    var form = $("f");
    if (!form) return;

    var ids = ["name", "dob", "email", "phone", "lno", "lexp", "addr", "city", "state", "pin"];
    var groups = {
      p: ["name", "dob"],
      c: ["email", "phone"],
      l: ["lno", "lexp"],
      a: ["addr", "city", "state", "pin"]
    };

    var okBox = $("ok");
    var errBox = $("err");
    var licence = $("lic");

    var today = toISODate(new Date());
    $("dob").max = today;
    $("lexp").min = today;

    // Prefill order: saved profile, then ?name=&email=, then the signed-in user.
    var saved = load(KEYS.profile, {});
    var user = load(KEYS.user, {});
    var query = new URLSearchParams(window.location.search);

    ids.forEach(function (id) { if (saved[id]) $(id).value = saved[id]; });
    if (!$("name").value) $("name").value = query.get("name") || user.name || "";
    if (!$("email").value) $("email").value = query.get("email") || user.email || "";

    function refresh() {
      Object.keys(groups).forEach(function (g) {
        var complete = groups[g].every(function (id) { return $(id).value.trim(); });
        var item = document.querySelector('[data-g="' + g + '"]');
        if (item) item.classList.toggle("done", complete);
      });

      var filled = ids.filter(function (id) { return $(id).value.trim(); }).length;
      var pct = Math.round((filled / ids.length) * 100);

      $("pct").textContent = pct + "%";
      $("bar").style.width = pct + "%";
      $("pb").setAttribute("aria-valuenow", String(pct));

      var name = $("name").value.trim();
      $("dn").textContent = name || "Your name";
      $("de").textContent = $("email").value.trim() || "Add your details";
      $("av").textContent = name
        ? name.split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join("").toUpperCase()
        : "?";
    }

    ids.forEach(function (id) { $(id).addEventListener("input", refresh); });
    refresh();

    $("pin").addEventListener("input", function () {
      this.value = this.value.replace(/\D/g, "").slice(0, 6);
    });

    licence.addEventListener("change", function () {
      var file = this.files && this.files[0];
      if (!file) return;
      $("fh").textContent = file.size > MAX_FILE
        ? "File is larger than 5 MB. Choose a smaller file."
        : "Selected: " + file.name;
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      okBox.classList.remove("show");
      hideMsg(errBox);

      var missing = ids.filter(function (id) { return !$(id).value.trim(); });
      if (missing.length) return showMsg(errBox, "Fill in all required fields before saving.", "err", $(missing[0]));

      if (!EMAIL_RE.test($("email").value.trim())) return showMsg(errBox, "Enter a valid email address.", "err", $("email"));

      var phone = normalizePhone($("phone").value);
      if (!PHONE_RE.test(phone)) return showMsg(errBox, "Enter a valid 10-digit Indian mobile number.", "err", $("phone"));

      if (ageFrom($("dob").value) < 18) return showMsg(errBox, "You must be at least 18 years old to rent a car.", "err", $("dob"));
      if ($("lexp").value <= today) return showMsg(errBox, "Your driving licence has expired. Enter a valid expiry date.", "err", $("lexp"));

      if (!/^\d{6}$/.test($("pin").value.trim())) return showMsg(errBox, "PIN code must be 6 digits.", "err", $("pin"));

      var file = licence.files && licence.files[0];
      if (file && file.size > MAX_FILE) return showMsg(errBox, "Licence file must be under 5 MB.", "err");

      var data = {};
      ids.forEach(function (id) { data[id] = $(id).value.trim(); });
      data.phone = phone;

      if (!save(KEYS.profile, data)) {
        return showMsg(errBox, "Could not save your profile in this browser.", "err");
      }

      $("phone").value = phone;
      refresh();

      // Text fields are saved on this device; the licence file is not uploaded in this demo.
      okBox.classList.add("show");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------- Booking ---------- */

  function initBooking() {
    var form = $("bookingForm");
    if (!form) return;

    var carSelect = $("car");
    var pickupDate = $("pickupDate");
    var returnDate = $("returnDate");
    var message = $("formMessage");

    // Single source of truth: the <option data-price data-category> values in booking.html.
    var cars = {};
    Array.prototype.forEach.call(carSelect.options, function (opt) {
      if (opt.value) {
        cars[opt.value] = { price: Number(opt.getAttribute("data-price")), category: opt.getAttribute("data-category") };
      }
    });

    var today = toISODate(new Date());
    pickupDate.min = today;
    returnDate.min = today;

    var requested = new URLSearchParams(window.location.search).get("car");
    if (requested && cars[requested]) carSelect.value = requested;

    // Prefill contact details from the saved profile or signed-in user.
    var profile = load(KEYS.profile, {});
    var user = load(KEYS.user, {});
    if (!$("fullName").value) $("fullName").value = profile.name || user.name || "";
    if (!$("email").value) $("email").value = profile.email || user.email || "";
    if (!$("phone").value && profile.phone) $("phone").value = normalizePhone(profile.phone);

    $("phone").addEventListener("input", function () {
      this.value = this.value.replace(/\D/g, "").slice(0, 10);
    });

    function rentalDays() {
      if (!pickupDate.value || !returnDate.value) return 0;
      var start = new Date(pickupDate.value + "T00:00:00");
      var end = new Date(returnDate.value + "T00:00:00");
      return Math.max(0, Math.round((end - start) / 86400000));
    }

    function updateSummary() {
      var name = carSelect.value;
      var car = cars[name];
      var days = rentalDays();

      $("summaryCarName").textContent = name || "No car selected";
      $("carCategory").textContent = car ? car.category : "Choose a car";
      $("dailyPrice").textContent = car ? money(car.price) : "0";
      $("rate").textContent = car ? "₹" + money(car.price) : "₹0";
      $("duration").textContent = days + (days === 1 ? " day" : " days");
      $("total").textContent = "₹" + money(car ? car.price * days : 0);
    }

    pickupDate.addEventListener("change", function () {
      returnDate.min = pickupDate.value || today;
      if (returnDate.value && returnDate.value <= pickupDate.value) returnDate.value = "";
      updateSummary();
    });

    carSelect.addEventListener("change", updateSummary);
    returnDate.addEventListener("change", updateSummary);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      message.className = "msg";
      message.textContent = "";

      if (!form.reportValidity()) return;

      var car = cars[carSelect.value];
      if (!car) return showMsg(message, "Please select a valid car.", "err", carSelect);

      var days = rentalDays();
      if (days < 1) return showMsg(message, "The return date must be after the pickup date.", "err", returnDate);

      var booking = {
        bookingId: "CRX-" + Date.now().toString().slice(-8),
        car: carSelect.value,
        dailyRate: car.price,
        days: days,
        estimatedTotal: car.price * days,
        pickupDate: pickupDate.value,
        returnDate: returnDate.value,
        pickupTime: $("pickupTime").value,
        returnTime: $("returnTime").value,
        pickupLocation: $("pickupLocation").value,
        fullName: $("fullName").value.trim(),
        phone: $("phone").value.trim(),
        email: $("email").value.trim(),
        notes: $("notes").value.trim(),
        status: "Pending confirmation",
        createdAt: new Date().toISOString()
      };

      var existing = load(KEYS.bookings, []);
      if (!Array.isArray(existing)) existing = [];
      existing.push(booking);

      if (!save(KEYS.bookings, existing)) {
        return showMsg(message, "We couldn't save your request in this browser. Check your storage settings and try again.", "err");
      }

      showMsg(
        message,
        "Booking request saved on this device. Your reference is " + booking.bookingId +
        ". This is a demo request, not a confirmed reservation.",
        "ok"
      );

      if (!load(KEYS.profile, null)) {
        message.appendChild(document.createTextNode(" "));
        var link = document.createElement("a");
        link.href = "renter-details.html?name=" + encodeURIComponent(booking.fullName) +
                    "&email=" + encodeURIComponent(booking.email);
        link.textContent = "Complete your profile for faster pickup.";
        message.appendChild(link);
      }

      message.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });

    updateSummary();
  }

  /* ---------- Start ---------- */

  function start() {
    initNav();
    initImages();

    switch (document.body.getAttribute("data-page")) {
      case "login": initLogin(); break;
      case "signup": initSignup(); break;
      case "profile": initProfile(); break;
      case "booking": initBooking(); break;
      default: break;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
