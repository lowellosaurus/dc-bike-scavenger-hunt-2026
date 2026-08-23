const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('details').forEach((detail) => {
  detail.addEventListener('toggle', () => {
    if (!detail.open) return;
    document.querySelectorAll('details[open]').forEach((other) => {
      if (other !== detail) other.open = false;
    });
  });
});

const storyPanels = [...document.querySelectorAll('.story-panel')];
const mapElement = document.querySelector('#recap-map');
const mapFallback = document.querySelector('.map-fallback');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

if (storyPanels.length && mapElement && window.L) {
  const locations = {};
  const map = L.map(mapElement, {
    attributionControl: true,
    zoomControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
    tap: false,
    touchZoom: false
  }).setView([38.9097, -77.0433], 15);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).on('load', () => mapElement.parentElement.classList.add('map-ready')).addTo(map);

  storyPanels.forEach((panel) => {
    const label = panel.dataset.label;
    if (locations[label]) return;

    const coordinates = [Number(panel.dataset.lat), Number(panel.dataset.lng)];
    const icon = L.divIcon({
      className: '',
      html: '<div class="story-marker" aria-hidden="true"></div>',
      iconSize: [28, 28],
      iconAnchor: [14, 28]
    });
    const marker = L.marker(coordinates, { icon, interactive: false })
      .bindTooltip(label, { permanent: true, direction: 'top', offset: [0, -30], className: 'story-tooltip' })
      .addTo(map);

    locations[label] = { coordinates, marker };
  });

  const routeLine = L.polyline([], {
    color: '#df2a2a',
    weight: 5,
    opacity: 0.9,
    dashArray: '3 10',
    lineCap: 'round'
  }).addTo(map);

  let activePanel = storyPanels[0];

  const activatePanel = (panel) => {
    if (!panel) return;
    activePanel = panel;
    storyPanels.forEach((item) => item.classList.toggle('is-active', item === panel));

    const activeStop = panel.dataset.label;
    const activeLocation = locations[activeStop];
    Object.entries(locations).forEach(([label, location]) => {
      location.marker.getElement()?.querySelector('.story-marker')?.classList.toggle('active', label === activeStop);
    });

    const panelIndex = storyPanels.indexOf(panel);
    const visitedStops = [];
    storyPanels.slice(0, panelIndex + 1).forEach((item) => {
      if (!visitedStops.includes(item.dataset.label)) visitedStops.push(item.dataset.label);
    });
    routeLine.setLatLngs(visitedStops.map((label) => locations[label].coordinates));

    const destination = [Number(panel.dataset.lat), Number(panel.dataset.lng)];
    const zoom = Number(panel.dataset.zoom);
    if (prefersReducedMotion.matches) map.setView(destination, zoom);
    else map.flyTo(destination, zoom, { duration: 0.8, easeLinearity: 0.35 });

    if (mapFallback) {
      mapFallback.querySelector('strong').textContent = activeStop;
      mapFallback.querySelector('small').textContent = `${Math.abs(destination[0]).toFixed(4)}° N · ${Math.abs(destination[1]).toFixed(4)}° W`;
    }
  };

  const panelObserver = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
    if (visible[0]) activatePanel(visible[0].target);
  }, { rootMargin: '-20% 0px -30% 0px', threshold: [0.2, 0.45, 0.7] });

  storyPanels.forEach((panel) => panelObserver.observe(panel));
  activatePanel(activePanel);
  window.addEventListener('resize', () => map.invalidateSize(), { passive: true });
} else if (storyPanels.length) {
  const fallbackObserver = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
    if (!visible[0]) return;

    storyPanels.forEach((panel) => panel.classList.toggle('is-active', panel === visible[0].target));
    if (mapFallback) {
      const panel = visible[0].target;
      const destination = [Number(panel.dataset.lat), Number(panel.dataset.lng)];
      mapFallback.querySelector('strong').textContent = panel.dataset.label;
      mapFallback.querySelector('small').textContent = `${Math.abs(destination[0]).toFixed(4)}° N · ${Math.abs(destination[1]).toFixed(4)}° W`;
    }
  }, { rootMargin: '-20% 0px -30% 0px', threshold: [0.2, 0.45, 0.7] });

  storyPanels.forEach((panel) => fallbackObserver.observe(panel));
}
