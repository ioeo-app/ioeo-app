// English by default. The button swaps the page text to Korean and back; the choice is remembered.
(function () {
  var root = document.documentElement;
  function stored() { try { return localStorage.getItem('ioeo-lang'); } catch (e) { return null; } }
  function apply(lang) {
    root.setAttribute('data-lang', lang);
    root.setAttribute('lang', lang);
    try { localStorage.setItem('ioeo-lang', lang); } catch (e) {}
  }
  var q = new URLSearchParams(location.search).get('lang');
  apply(q === 'ko' || q === 'en' ? q : (stored() || 'en'));
  document.addEventListener('DOMContentLoaded', function () {
    var b = document.querySelector('.lang');
    if (b) b.addEventListener('click', function () {
      apply(root.getAttribute('data-lang') === 'en' ? 'ko' : 'en');
    });
  });
})();
