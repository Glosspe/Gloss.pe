import Redis from 'ioredis';

class HybridCache {
  constructor() {
    this.redis = null;
    this.memoryCache = new Map();
    this.isRedisConnected = false;

    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      console.log('[Cache Init] REDIS_URL detectada. Intentando conectar a Redis...');
      try {
        this.redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 1,
          connectTimeout: 5000,
          retryStrategy: (times) => {
            // Reintentar máximo 3 veces y si falla pasar a modo memoria local
            if (times > 3) {
              console.warn('[Cache Init] Conexión a Redis fallida. Usando caché en memoria local como fallback.');
              this.isRedisConnected = false;
              return null; // Detener reintentos
            }
            return Math.min(times * 100, 2000);
          }
        });

        this.redis.on('connect', () => {
          console.log('[Cache Redis] Conectado exitosamente a Redis.');
          this.isRedisConnected = true;
        });

        this.redis.on('error', (err) => {
          console.warn('[Cache Redis] Error de conexión:', err.message);
          this.isRedisConnected = false;
        });
      } catch (err) {
        console.error('[Cache Init] Error instanciando Redis:', err.message);
        this.isRedisConnected = false;
      }
    } else {
      console.log('[Cache Init] REDIS_URL no definida. Usando caché en memoria local.');
    }
  }

  // Obtener un valor del caché (asíncrono)
  async get(key) {
    // Modo Redis
    if (this.isRedisConnected && this.redis) {
      try {
        const val = await this.redis.get(key);
        if (val) {
          return JSON.parse(val);
        }
        return null;
      } catch (err) {
        console.warn('[Cache Redis] Error al leer llave, usando fallback de memoria:', err.message);
      }
    }

    // Modo Memoria Local
    if (!this.memoryCache.has(key)) return null;
    const entry = this.memoryCache.get(key);
    const now = Date.now();
    if (now > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }
    return entry.value;
  }

  // Guardar un valor con un tiempo de vida (TTL) en segundos (asíncrono)
  async set(key, value, ttlSeconds = 60) {
    const valueString = JSON.stringify(value);

    // Modo Redis
    if (this.isRedisConnected && this.redis) {
      try {
        await this.redis.set(key, valueString, 'EX', ttlSeconds);
        return true;
      } catch (err) {
        console.warn('[Cache Redis] Error al escribir llave:', err.message);
      }
    }

    // Modo Memoria Local
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    this.memoryCache.set(key, { value, expiresAt });
    return true;
  }

  // Eliminar una llave específica (asíncrono)
  async del(key) {
    // Modo Redis
    if (this.isRedisConnected && this.redis) {
      try {
        await this.redis.del(key);
        return true;
      } catch (err) {
        console.warn('[Cache Redis] Error al eliminar llave:', err.message);
      }
    }

    // Modo Memoria Local
    return this.memoryCache.delete(key);
  }

  // Eliminar llaves por prefijo o patrón (asíncrono)
  async delPattern(pattern) {
    const cleanPattern = pattern.toLowerCase();

    // Modo Redis
    if (this.isRedisConnected && this.redis) {
      try {
        let cursor = '0';
        let deletedCount = 0;
        do {
          const res = await this.redis.scan(cursor, 'MATCH', `*${cleanPattern}*`, 'COUNT', 100);
          cursor = res[0];
          const keys = res[1];
          if (keys.length > 0) {
            await this.redis.del(...keys);
            deletedCount += keys.length;
          }
        } while (cursor !== '0');
        console.log(`[Cache Redis] Se eliminaron ${deletedCount} llaves con patrón: "${pattern}"`);
        return deletedCount;
      } catch (err) {
        console.warn('[Cache Redis] Error al eliminar por patrón:', err.message);
      }
    }

    // Modo Memoria Local
    let deletedCount = 0;
    for (const key of this.memoryCache.keys()) {
      if (key.toLowerCase().includes(cleanPattern)) {
        this.memoryCache.delete(key);
        deletedCount++;
      }
    }
    if (deletedCount > 0) {
      console.log(`[Cache Invalidation] Se eliminaron ${deletedCount} llaves de memoria con patrón: "${pattern}"`);
    }
    return deletedCount;
  }

  // Limpiar todo el caché (asíncrono)
  async clear() {
    // Modo Redis
    if (this.isRedisConnected && this.redis) {
      try {
        await this.redis.flushdb();
        console.log('[Cache Redis] Base de datos de caché vaciada con éxito.');
        return true;
      } catch (err) {
        console.warn('[Cache Redis] Error al vaciar base de datos:', err.message);
      }
    }

    // Modo Memoria Local
    this.memoryCache.clear();
    console.log('[Cache Memoria] Todo el caché en memoria ha sido vaciado.');
    return true;
  }
}

// Exportar una instancia global única (Singleton) para compartir el caché en todo Node.js
const cacheInstance = new HybridCache();
export default cacheInstance;
