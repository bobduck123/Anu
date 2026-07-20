(() => {
  const slides = Array.from(document.querySelectorAll('.fs-slide'));
  const dots = Array.from(document.querySelectorAll('.fs-quick-btn'));
  const brandMark = document.querySelector('.brand-mark');
  const enterButton = document.querySelector('.enter-btn');
  const timerMs = 6500;
  const brandPositions = [
    { top: '12%', left: '8%', transform: 'rotate(-7deg) scale(1.00)' },
    { top: '9%', left: '62%', transform: 'rotate(9deg) scale(1.08)' },
    { top: '56%', left: '10%', transform: 'rotate(-11deg) scale(0.97)' },
    { top: '64%', left: '58%', transform: 'rotate(6deg) scale(1.1)' },
    { top: '31%', left: '33%', transform: 'rotate(-4deg) scale(1.2)' },
    { top: '7%', left: '37%', transform: 'rotate(5deg) scale(1.04)' },
    { top: '67%', left: '23%', transform: 'rotate(-8deg) scale(1.05)' },
    { top: '45%', left: '66%', transform: 'rotate(12deg) scale(0.95)' },
    { top: '22%', left: '14%', transform: 'rotate(-3deg) scale(1.13)' },
    { top: '61%', left: '49%', transform: 'rotate(7deg) scale(1.02)' }
  ];

  if (slides.length === 0) {
    return;
  }

  let currentIndex = 0;
  let timerId;

  const showSlide = (index) => {
    currentIndex = (index + slides.length) % slides.length;

    slides.forEach((slide, idx) => {
      slide.classList.toggle('active', idx === currentIndex);
    });

    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === currentIndex);
      dot.setAttribute('aria-current', idx === currentIndex ? 'true' : 'false');
    });

    if (brandMark) {
      const pos = brandPositions[currentIndex % brandPositions.length];
      brandMark.style.top = pos.top;
      brandMark.style.left = pos.left;
      brandMark.style.transform = pos.transform;
    }
  };

  const startTimer = () => {
    clearInterval(timerId);
    timerId = setInterval(() => {
      showSlide(currentIndex + 1);
    }, timerMs);
  };

  dots.forEach((dot, idx) => {
    dot.addEventListener('click', () => {
      showSlide(idx);
      startTimer();
    });
  });

  if (enterButton) {
    enterButton.addEventListener('click', (event) => {
      event.preventDefault();
      document.body.classList.add('is-transitioning');
      setTimeout(() => {
        window.location.href = enterButton.href;
      }, 520);
    });
  }

  showSlide(0);
  startTimer();
})();
