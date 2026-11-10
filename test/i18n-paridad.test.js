const es = require('../locales/es.json');
const en = require('../locales/en.json');

function obtenerClaves(objeto, prefijo = '') {
    return Object.entries(objeto).flatMap(([clave, valor]) => {
        const ruta = prefijo ? `${prefijo}.${clave}` : clave;

        if (
        valor !== null &&
        typeof valor === 'object' &&
        !Array.isArray(valor)
        ) {
        return obtenerClaves(valor, ruta);
        }

        return [ruta];
    }).sort();
    }

    describe('Internacionalización', () => {
    test('Español e inglés tienen las mismas claves', () => {
        expect(obtenerClaves(es)).toEqual(obtenerClaves(en));
    });

    test('Las traducciones no están vacías', () => {
        function verificar(objeto) {
        for (const valor of Object.values(objeto)) {
            if (
            valor !== null &&
            typeof valor === 'object' &&
            !Array.isArray(valor)
            ) {
            verificar(valor);
            } else {
            expect(typeof valor).toBe('string');
            expect(valor.trim()).not.toBe('');
            }
        }
        }

        verificar(es);
        verificar(en);
    });
});