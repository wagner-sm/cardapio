// SERVICE WORKER - CACHE OFFLINE (CORRIGIDO)
const CACHE_NAME = 'cardapio-digital-v1.0';
const STATIC_CACHE = 'static-v1.0';
const DYNAMIC_CACHE = 'dynamic-v1.0';

// Arquivos para cache estático
const STATIC_FILES = [
    './',
    './index.html',
    './styles.min.css',
    './app.min.js'
];

// Instalar Service Worker
self.addEventListener('install', event => {
    console.log('🔧 Service Worker instalando...');

    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('📦 Cacheando arquivos estáticos');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('✅ Service Worker instalado');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('❌ Erro ao instalar SW:', error);
            })
    );
});

// Ativar Service Worker
self.addEventListener('activate', event => {
    console.log('🚀 Service Worker ativando...');

    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('🗑️ Removendo cache antigo:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('✅ Service Worker ativado');
                return self.clients.claim();
            })
    );
});

// Interceptar requisições
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignorar requisições não-HTTP
    if (!request.url.startsWith('http')) {
        return;
    }

    // Estratégia: Cache First para arquivos estáticos
    if (STATIC_FILES.some(file => request.url.includes(file.replace('./', '')))) {
        event.respondWith(
            caches.match(request)
                .then(response => {
                    return response || fetch(request);
                })
                .catch(() => {
                    // Fallback para página offline se necessário
                    if (request.destination === 'document') {
                        return caches.match('./index-optimized.html');
                    }
                })
        );
        return;
    }

    // Estratégia: Network First para dados das planilhas
    if (url.hostname.includes('docs.google.com') || url.hostname.includes('allorigins.win')) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    // Só cachear se a resposta for válida
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(DYNAMIC_CACHE)
                            .then(cache => {
                                cache.put(request, responseClone);
                            });
                    }
                    return response;
                })
                .catch(() => {
                    // Fallback para cache se offline
                    return caches.match(request);
                })
        );
        return;
    }

    // Estratégia padrão: Network First
    event.respondWith(
        fetch(request)
            .catch(() => {
                return caches.match(request);
            })
    );
});

// Sincronização em background
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        console.log('🔄 Sincronização em background');
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    console.log('📡 Executando sincronização...');
}
