# ProyectoDesarrollo
# Stride & Co.

## Descripcion del proyecto

Stride & Co. es una tienda deportiva que actualmente administra sus ventas, pedidos e inventario mediante WhatsApp, hojas de calculo y procesos manuales.

El proyecto consiste en desarrollar una aplicacion web que permita digitalizar estos procesos, facilitando la consulta del catalogo, la gestion del inventario, la realizacion y seguimiento de pedidos, asi como el control de usuarios y sus respectivos roles y permisos.

La aplicacion busca centralizar la informacion de la tienda, reducir errores en la administracion de pedidos e inventario y mejorar la comunicacion entre las areas de ventas, operaciones y administracion.

## Instalación

Clonar el repositorio e instalar las dependencias:

bash
npm install

## Integrantes del equipo

* **Product Owner:** Jose Fernando Martinez Pacheco
* **Scrum Master:** Elio Castillo Reyes
* **Developer:** Carlos Gonzalez Carrera
* **Developer:** Bruno Salazar Carrillo

## Requisitos

* [Node.js](https://nodejs.org/) 22 o superior (recomendado)
* npm (incluido con Node.js)
* Git

## Instalación

```bash
git clone https://github.com/CarlosGlezCar/ProyectoDesarrollo.git
cd ProyectoDesarrollo
npm install
```

No se necesita ningún archivo `.env` para ejecutar el proyecto. Opcionalmente se puede definir la variable `PORT` (por defecto `3000`).

## Ejecución

| Comando | Descripción |
| --- | --- |
| `npm start` | Inicia el servidor en `http://localhost:3000` |
| `npm run dev` | Inicia el servidor en modo desarrollo (se reinicia al guardar cambios) |
| `npm run lint` | Revisa el código con ESLint |
| `npm test` | Ejecuta las pruebas automatizadas |

Para usar otro puerto:

```bash
# Linux / macOS
PORT=4000 npm start

# Windows (PowerShell)
$env:PORT=4000; npm start
```

## Pruebas

Las pruebas automatizadas verifican los endpoints y controladores: código HTTP esperado, estructura de la respuesta, parámetros de ruta, recursos inexistentes y solicitudes incorrectas.

```bash
npm test
```

## Calidad de código

El proyecto usa [ESLint](https://eslint.org/) con la configuración de `eslint.config.js`. Antes de cada entrega se debe ejecutar:

```bash
npm run lint
```

y debe terminar sin errores.

## Logging

Todas las solicitudes HTTP se registran en consola con [morgan](https://github.com/expressjs/morgan):

* En **desarrollo** se usa el formato `dev` (método, ruta, código de estado y tiempo de respuesta).
* En **producción** (`NODE_ENV=production`) se usa el formato `combined`.
* Durante las **pruebas** (`NODE_ENV=test`) el logging se desactiva para no ensuciar la salida.

Ejemplo de salida en desarrollo:

```
GET /api/users 200 3.412 ms - 45
GET /api/no-existe 404 1.105 ms - 36
```

### Formato de respuesta

Respuesta exitosa:

```json
{
  "message": "Users list",
  "data": []
}
```

Ruta inexistente (404):

```json
{
  "message": "Not Found",
  "data": null
}
```
