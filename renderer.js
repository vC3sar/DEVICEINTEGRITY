/**
 * Lógica del Renderer para detectar dispositivo y mostrar imagen
 */

const deviceImg = document.getElementById('device-image');
const deviceName = document.getElementById('device-name');
const statusText = document.getElementById('status');

async function updateDeviceInfo() {
    try {
        statusText.innerText = 'Buscando dispositivos...';
        
        // 1. Obtenemos el modelo del dispositivo mediante ADB
        const brand = (await window.adbAPI.run('adb shell getprop ro.product.brand')).trim();
        const model = (await window.adbAPI.run('adb shell getprop ro.product.model')).trim();

        if (model) {
            const cleanModel = model.trim();
            deviceName.innerText = cleanModel;
            statusText.innerText = 'Dispositivo conectado';

            // 2. Intentamos cargar una foto de internet con 3 variantes (Base, 4G, 5G)
            const cleanBrand = brand.toLowerCase().trim().replace(/\s+/g, '-');
            let cleanModel = model.toLowerCase().trim();

            // Si el modelo ya empieza con la marca, la quitamos para no duplicar en la URL
            if (cleanModel.startsWith(cleanBrand)) {
                cleanModel = cleanModel.replace(cleanBrand, '').trim();
            }

            // Limpieza específica para Samsung (SM-A525M -> a52)
            if (cleanBrand === 'samsung') {
                cleanModel = cleanModel.replace(/^sm-/, '');
                const match = cleanModel.match(/^([a-z]\d{2})/);
                if (match) cleanModel = match[1];
                if (!cleanModel.includes('galaxy')) cleanModel = 'galaxy-' + cleanModel;
            }

            cleanModel = cleanModel.replace(/\s+/g, '-');
            const basePath = `https://fdn2.gsmarena.com/vv/bigpic/${cleanBrand}-${cleanModel}`;
            const attempts = ['', '-4g', '-5g'];
            let success = false;

            for (const suffix of attempts) {
                const testUrl = `${basePath}${suffix}.jpg`;
                const isLoaded = await new Promise((resolve) => {
                    const tempImg = new Image();
                    tempImg.onload = () => resolve(true);
                    tempImg.onerror = () => resolve(false);
                    tempImg.src = testUrl;
                });

                if (isLoaded) {
                    deviceImg.src = testUrl;
                    deviceImg.style.display = 'block';
                    success = true;
                    break;
                }
            }

            if (!success) {
                console.log('[Renderer] No se encontró ninguna variante en internet.');
                deviceImg.style.display = 'none';
            }
        } else {
            deviceName.innerText = 'No se detectó dispositivo';
            deviceImg.style.display = 'none';
        }
    } catch (err) {
        console.error('Error al detectar dispositivo:', err);
        statusText.innerText = 'Error en ADB';
        deviceImg.style.display = 'none';
    }
}

// Ejecutar al cargar
updateDeviceInfo();