import { PHOTOS } from './photos/photos-data.js?v=12';
import { buildPreviewSet, replacementForSlot } from './home-gallery-logic.mjs?v=1';

const gallery = document.querySelector('#home-photo-preview');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let current = buildPreviewSet(PHOTOS, 5);
let slotIndex = 0;

function photoSource(photo) {
  return `./photos/${photo.src}`;
}

function createFigure(photo, index) {
  const figure = document.createElement('figure');
  const link = document.createElement('a');
  link.href = '/photos/';
  link.setAttribute('aria-label', `${photo.title}－前往完整照片收藏`);
  const image = document.createElement('img');
  image.src = photoSource(photo);
  image.alt = photo.alt;
  image.loading = index === 0 ? 'eager' : 'lazy';
  image.decoding = 'async';
  const caption = document.createElement('figcaption');
  caption.textContent = photo.title;
  link.append(image, caption);
  figure.append(link);
  return figure;
}

function renderInitialPreview() {
  const fragment = document.createDocumentFragment();
  current.forEach((photo, index) => fragment.append(createFigure(photo, index)));
  gallery.replaceChildren(fragment);
}

function rotateOnePhoto() {
  if (document.hidden || gallery.matches(':hover') || gallery.contains(document.activeElement)) return;
  const next = replacementForSlot(PHOTOS, current, slotIndex);
  const figure = gallery.children[slotIndex];
  if (!next || !figure || next.id === current[slotIndex].id) {
    slotIndex = (slotIndex + 1) % current.length;
    return;
  }

  const preloader = new Image();
  preloader.onload = () => {
    figure.classList.add('is-changing');
    window.setTimeout(() => {
      const replacement = createFigure(next, slotIndex);
      figure.replaceWith(replacement);
      current[slotIndex] = next;
      slotIndex = (slotIndex + 1) % current.length;
    }, 220);
  };
  preloader.src = photoSource(next);
}

renderInitialPreview();
if (!reducedMotion.matches && current.length > 0) {
  window.setInterval(rotateOnePhoto, 8000);
}
