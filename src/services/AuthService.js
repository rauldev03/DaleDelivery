const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/UserRepository');
const { validateLoginInput } = require('../validations/authValidation');

class AuthService {
  authenticate(username, password) {
    // 1. Validar campos
    const validation = validateLoginInput({ username, password });
    if (!validation.isValid) {
      return {
        success: false,
        message: validation.errors[0]
      };
    }

    // 2. Buscar usuario en base de datos
    const user = userRepository.findByUsername(username.trim());
    if (!user) {
      return {
        success: false,
        message: 'Credenciales inválidas. Verifique el usuario y la contraseña.'
      };
    }

    // 3. Verificar estado
    if (!user.isActive()) {
      return {
        success: false,
        message: 'El usuario se encuentra inactivo. Contacte al administrador.'
      };
    }

    // 4. Comparar hash de contraseña
    const isPasswordValid = bcrypt.compareSync(password, user.passwordHash);
    if (!isPasswordValid) {
      return {
        success: false,
        message: 'Credenciales inválidas. Verifique el usuario y la contraseña.'
      };
    }

    // 5. Retornar datos seguros para la sesión
    return {
      success: true,
      user: user.toJSON()
    };
  }
}

module.exports = new AuthService();
