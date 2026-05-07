// script.js — Scroll reveal animation
//
// Uses IntersectionObserver to watch for .reveal elements entering the
// viewport. Once 15% of the element is visible, it gets .is-visible
// which triggers the CSS fade-in transition defined in style.css.
// Each element only animates once — we unobserve after triggering.

const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target); // only animate once
        }
      });
    },
    { threshold: 0.15 } // trigger when 15% of the element is visible
  );
  
  // observe every element with the .reveal class
  document.querySelectorAll(".reveal").forEach(el => observer.observe(el));