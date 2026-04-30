/**
 * dataLayer.js — Attribution Lab
 * ================================
 * All GTM dataLayer.push() events live here.
 * Keeping tracking logic separate from UI code is best practice —
 * it makes auditing, debugging, and handing over to clients cleaner.
 *
 * EVENTS INSTRUMENTED:
 *  1. page_view             — fires on load with page metadata
 *  2. nav_click             — top navigation link clicks
 *  3. cta_click             — any call-to-action button click
 *  4. scroll_depth          — 25 / 50 / 75 / 100% scroll milestones
 *  5. feature_card_visible  — when a problem card enters the viewport
 *  6. pricing_hover         — when user hovers over a pricing tier
 *  7. pricing_click         — when user clicks a pricing tier
 *  8. form_start            — when user focuses the email input
 *  9. form_interaction      — when user types in the email input
 * 10. form_submit           — on submit, with success or error outcome
 */


// ─────────────────────────────────────────
// 0. Initialise the dataLayer array
// ─────────────────────────────────────────
window.dataLayer = window.dataLayer || [];


// ─────────────────────────────────────────
// 1. PAGE VIEW
// Fires immediately when the script loads.
// Attach extra dimensions useful for attribution reports.
// ─────────────────────────────────────────
window.dataLayer.push({
  event: 'page_view',
  page_title:    document.title,
  page_location: window.location.href,
  page_path:     window.location.pathname,
  referrer:      document.referrer || '(direct)',
  utm_source:    getParam('utm_source'),
  utm_medium:    getParam('utm_medium'),
  utm_campaign:  getParam('utm_campaign'),
  utm_term:      getParam('utm_term'),
  utm_content:   getParam('utm_content'),
});

console.log('[dataLayer] page_view fired', {
  path: window.location.pathname,
  utm: getParam('utm_source') || 'none',
});


// ─────────────────────────────────────────
// HELPER: pull UTM params from the URL
// ─────────────────────────────────────────
function getParam(name) {
  return new URLSearchParams(window.location.search).get(name) || '';
}


// ─────────────────────────────────────────
// 2. NAV CLICK
// Called via onclick="trackNavClick('features')" in the HTML
// ─────────────────────────────────────────
function trackNavClick(destination) {
  window.dataLayer.push({
    event:           'nav_click',
    link_destination: destination,
    link_text:        destination,
  });
  console.log('[dataLayer] nav_click', destination);
}


// ─────────────────────────────────────────
// 3. CTA CLICK
// Called via onclick="trackCTAClick('hero', 'get_audit')" etc.
// section  = where on the page the CTA lives (hero, pricing, etc.)
// cta_name = what the button does
// ─────────────────────────────────────────
function trackCTAClick(section, ctaName) {
  window.dataLayer.push({
    event:    'cta_click',
    section:  section,
    cta_name: ctaName,
  });
  console.log('[dataLayer] cta_click', { section, ctaName });
}


// ─────────────────────────────────────────
// 4. SCROLL DEPTH
// Fires once each at 25%, 50%, 75%, 100%.
// Initialised from the inline script at the bottom of index.html.
// ─────────────────────────────────────────
function initScrollTracking() {
  const milestones = [25, 50, 75, 100];
  const fired = new Set();

  function getScrollPercent() {
    const doc   = document.documentElement;
    const body  = document.body;
    const scrollTop  = doc.scrollTop  || body.scrollTop;
    const scrollHeight = (doc.scrollHeight || body.scrollHeight) - doc.clientHeight;
    return scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 0;
  }

  window.addEventListener('scroll', () => {
    const pct = getScrollPercent();
    milestones.forEach((m) => {
      if (pct >= m && !fired.has(m)) {
        fired.add(m);
        window.dataLayer.push({
          event:        'scroll_depth',
          scroll_depth:  m,
          scroll_depth_label: m + '%',
        });
        console.log('[dataLayer] scroll_depth', m + '%');
      }
    });
  }, { passive: true });
}


// ─────────────────────────────────────────
// 5. FEATURE CARD VISIBLE (Intersection Observer)
// Fires when each problem card enters the viewport.
// Useful for measuring which content gets seen.
// ─────────────────────────────────────────
function initFeatureCardTracking() {
  if (!('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const featureName = entry.target.dataset.feature || 'unknown';
          window.dataLayer.push({
            event:        'feature_card_visible',
            feature_name:  featureName,
          });
          console.log('[dataLayer] feature_card_visible', featureName);
          observer.unobserve(entry.target); // fire once only
        }
      });
    },
    { threshold: 0.5 } // 50% of card must be visible
  );

  document.querySelectorAll('.feature-card').forEach((card) => {
    observer.observe(card);
  });
}


// ─────────────────────────────────────────
// 6. PRICING HOVER
// Called via onmouseenter="trackPricingHover('audit')" etc.
// Throttled so rapid mouse movement doesn't spam events.
// ─────────────────────────────────────────
const _pricingHoverThrottle = {};
function trackPricingHover(tier) {
  const now = Date.now();
  if (_pricingHoverThrottle[tier] && now - _pricingHoverThrottle[tier] < 2000) return;
  _pricingHoverThrottle[tier] = now;

  window.dataLayer.push({
    event:        'pricing_hover',
    pricing_tier:  tier,
  });
  console.log('[dataLayer] pricing_hover', tier);
}


// ─────────────────────────────────────────
// 7. PRICING CLICK
// Called via onclick="trackPricingClick('build')" etc.
// ─────────────────────────────────────────
function trackPricingClick(tier) {
  window.dataLayer.push({
    event:        'pricing_click',
    pricing_tier:  tier,
  });
  console.log('[dataLayer] pricing_click', tier);
}


// ─────────────────────────────────────────
// 8. FORM START
// Fires once when the email field is first focused.
// ─────────────────────────────────────────
let _formStarted = false;
function trackFormStart(formName) {
  if (_formStarted) return;
  _formStarted = true;
  window.dataLayer.push({
    event:     'form_start',
    form_name:  formName,
  });
  console.log('[dataLayer] form_start', formName);
}


// ─────────────────────────────────────────
// 9. FORM INTERACTION
// Fires on each input event — useful for seeing drop-off mid-form
// on longer forms. On a single-field form it fires once per keystroke;
// consider debouncing for multi-field forms.
// ─────────────────────────────────────────
let _formInteractionFired = false;
function trackFormInteraction(formName, fieldName) {
  if (_formInteractionFired) return; // fire only once per load
  _formInteractionFired = true;
  window.dataLayer.push({
    event:      'form_interaction',
    form_name:   formName,
    field_name:  fieldName,
  });
  console.log('[dataLayer] form_interaction', { formName, fieldName });
}


// ─────────────────────────────────────────
// 10. FORM SUBMIT
// Called by the submit button onclick handler.
// Validates email, pushes outcome (success / error) to dataLayer.
// ─────────────────────────────────────────
function handleFormSubmit() {
  const input   = document.getElementById('email-input');
  const message = document.getElementById('form-message');
  const email   = input ? input.value.trim() : '';
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!isValid) {
    // ── Error path ──
    window.dataLayer.push({
      event:          'form_submit',
      form_name:       'contact',
      form_outcome:    'error',
      error_reason:    'invalid_email',
    });
    console.log('[dataLayer] form_submit error — invalid email');

    if (message) {
      message.textContent = '⚠ Please enter a valid email address.';
      message.className   = 'form-note error';
    }
    return;
  }

  // ── Success path ──
  window.dataLayer.push({
    event:         'form_submit',
    form_name:      'contact',
    form_outcome:   'success',
    // Do NOT push the actual email address into dataLayer —
    // this is a PII best practice. Push a hashed version if needed.
  });
  console.log('[dataLayer] form_submit success');

  if (message) {
    message.textContent = '✓ Got it! Check your inbox shortly.';
    message.className   = 'form-note success';
  }
  if (input) input.value = '';
  _formStarted         = false;
  _formInteractionFired = false;
}