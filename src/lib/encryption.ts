import CryptoJS from 'crypto-js';

// No ambiente de produção, esta chave deve ser injetada via variável de ambiente 
// e nunca exposta publicamente. Para este MVP, usamos um fallback caso não exista.
const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_CLINICAL_DATA_KEY || 'invivio_secure_key_123!';

/**
 * Encripta uma anotação clínica antes de salvar no Firestore (LGPD / HIPAA).
 * O texto criptografado será ilegível para administradores de banco de dados.
 */
export function encryptClinicalData(text: string | null | undefined): string | null {
  if (!text) return null;
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
}

/**
 * Descriptografa uma anotação clínica lida do Firestore.
 * Em caso de falha (chave errada ou dado corrompido), retorna uma mensagem de erro visual.
 */
export function decryptClinicalData(cipherText: string | null | undefined): string | null {
  if (!cipherText) return null;
  
  // Se o texto não parecer criptografado (ex: dados legados), podemos retornar direto.
  // Uma heurística simples é verificar se contém espaços, pois base64 não tem.
  if (cipherText.includes(' ')) {
    return cipherText;
  }

  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, ENCRYPTION_KEY);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    if (!originalText) {
       // Se o texto original for vazio após descriptografar, possivelmente a chave está errada.
       return "[Erro: Chave de criptografia inválida ou dado corrompido]";
    }
    return originalText;
  } catch (error) {
    console.error("Failed to decrypt clinical data", error);
    return "[Erro ao descriptografar dado sensível]";
  }
}
