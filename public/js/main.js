document.addEventListener('DOMContentLoaded', () => {
  // Auto-cerrar alertas después de 5 segundos
  const alerts = document.querySelectorAll('.alert');
  if (alerts.length > 0) {
    setTimeout(() => {
      alerts.forEach(el => {
        el.style.transition = 'opacity 0.5s ease';
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 500);
      });
    }, 5000);
  }
});
