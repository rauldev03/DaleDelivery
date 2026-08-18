function validateLoginInput(data) {
  const errors = [];

  if (!data.username || typeof data.username !== 'string' || data.username.trim() === '') {
    errors.push('El campo usuario es obligatorio.');
  }

  if (!data.password || typeof data.password !== 'string' || data.password.trim() === '') {
    errors.push('La contraseña es obligatoria.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateLoginInput
};
