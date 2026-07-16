const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// Rutas base de Chrome
const USER_DATA_DIR = path.join(process.env.LOCALAPPDATA, 'Google/Chrome/User Data');
const LOCAL_STATE_PATH = path.join(USER_DATA_DIR, 'Local State');
const TEMP_COOKIES_DIR = path.join(__dirname);

if (!fs.existsSync(TEMP_COOKIES_DIR)) {
  fs.mkdirSync(TEMP_COOKIES_DIR, { recursive: true });
}

// 1. Obtener la Master Key desencriptada vía DPAPI con PowerShell
function getMasterKey() {
  if (!fs.existsSync(LOCAL_STATE_PATH)) {
    throw new Error('Local State no encontrado');
  }
  const localState = JSON.parse(fs.readFileSync(LOCAL_STATE_PATH, 'utf-8'));
  const encryptedKeyB64 = localState.os_crypt.encrypted_key;
  
  // Decodificar Base64
  const encryptedKeyWithSignature = Buffer.from(encryptedKeyB64, 'base64');
  // Remover firma "DPAPI" (primeros 5 bytes)
  const encryptedKey = encryptedKeyWithSignature.slice(5);
  
  // Enviar a PowerShell para desencriptar vía DPAPI (ProtectedData)
  const encryptedHex = encryptedKey.toString('hex');
  const psCommand = `Add-Type -AssemblyName System.Security; $enc = [Convert]::FromBase64String('${encryptedKey.toString('base64')}'); $dec = [System.Security.Cryptography.ProtectedData]::Unprotect($enc, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser); [Convert]::ToBase64String($dec)`;
  
  const decryptedB64 = execSync(`powershell -Command "${psCommand}"`).toString().trim();
  return Buffer.from(decryptedB64, 'base64');
}

// 2. Desencriptar un valor individual cifrado por Chrome (v10/v11 AES-256-GCM)
function decryptValue(encryptedBuffer, masterKey) {
  try {
    const signature = encryptedBuffer.slice(0, 3).toString('utf-8');
    if (signature !== 'v10' && signature !== 'v11') {
      // No está cifrado en formato v10 o v11 (tal vez texto plano o formato antiguo)
      return encryptedBuffer.toString('utf-8');
    }
    
    // IV/Nonce (12 bytes después del prefijo v10/v11)
    const iv = encryptedBuffer.slice(3, 15);
    
    // El resto es el texto cifrado + el Tag de autenticación de 16 bytes al final
    const ciphertextAndTag = encryptedBuffer.slice(15);
    const ciphertext = ciphertextAndTag.slice(0, ciphertextAndTag.length - 16);
    const tag = ciphertextAndTag.slice(ciphertextAndTag.length - 16);
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, iv);
    decipher.setAuthTag(tag);
    
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]);
    
    return decrypted.toString('utf-8');
  } catch (err) {
    return `[Error al desencriptar: ${err.message}]`;
  }
}

// 3. Buscar y descifrar cookies de Railway en un perfil
function scanProfile(profileName, masterKey) {
  const cookiesPath = path.join(USER_DATA_DIR, profileName, 'Network/Cookies');
  if (!fs.existsSync(cookiesPath)) return;
  
  console.log(`\n--- Analizando perfil: ${profileName} ---`);
  
  // Copiar a archivo temporal para evitar bloqueos de Chrome
  const tempCookiesPath = path.join(TEMP_COOKIES_DIR, `Cookies_${profileName}`);
  fs.copyFileSync(cookiesPath, tempCookiesPath);
  
  try {
    // Consultar usando sqlite3
    const query = "SELECT host_key, name, encrypted_value FROM cookies WHERE host_key LIKE '%railway%'";
    // Nota: sqlite3 en Windows a veces necesita escapar comillas dobles y ruta con barra invertida doble
    const cmd = `sqlite3 -csv "${tempCookiesPath}" "${query}"`;
    
    const output = execSync(cmd).toString().trim();
    if (!output) {
      console.log('No se encontraron cookies de Railway en este perfil.');
      return;
    }
    
    // Procesar la salida CSV
    const lines = output.split('\n');
    for (const line of lines) {
      // El formato de salida CSV de sqlite3 suele separar por coma, pero hay que tener cuidado con las comas en los valores.
      // Sin embargo, para cookies de sesión o tokens, suelen ser valores alfanuméricos sin comas.
      const match = line.match(/^([^,]+),([^,]+),(.+)$/);
      if (match) {
        const host = match[1];
        const name = match[2];
        const encryptedValueHex = match[3];
        
        // sqlite3 -csv puede imprimir los blobs como hex o texto con caracteres especiales.
        // Si el valor empieza por X' y termina en ', es un Blob Hex de sqlite3 (ej. X'763130...')
        let rawBuffer;
        if (encryptedValueHex.startsWith("X'") || encryptedValueHex.startsWith("x'")) {
          const hexStr = encryptedValueHex.slice(2, encryptedValueHex.length - 1);
          rawBuffer = Buffer.from(hexStr, 'hex');
        } else {
          // Si sqlite3 lo devolvió como string plano o caracteres especiales, lo leemos
          rawBuffer = Buffer.from(encryptedValueHex, 'binary');
        }
        
        const decrypted = decryptValue(rawBuffer, masterKey);
        console.log(`Host: ${host} | Name: ${name} | Value: ${decrypted}`);
      }
    }
  } catch (err) {
    console.error(`Error en perfil ${profileName}:`, err.message);
  } finally {
    // Limpiar temp
    if (fs.existsSync(tempCookiesPath)) {
      fs.unlinkSync(tempCookiesPath);
    }
  }
}

function main() {
  try {
    const masterKey = getMasterKey();
    console.log('Master Key cargada y desencriptada correctamente.');
    
    // Listar perfiles disponibles en User Data
    const files = fs.readdirSync(USER_DATA_DIR);
    const profiles = files.filter(f => f === 'Default' || f.startsWith('Profile '));
    
    for (const profile of profiles) {
      scanProfile(profile, masterKey);
    }
  } catch (err) {
    console.error('Error general:', err.message);
  }
}

main();
