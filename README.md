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

Para ejecutar el proyecto se deben configurar las variables de JWT y bcrypt en `.env`, como se explica en la sección Autenticación. La variable `PORT` es opcional y su valor predeterminado es `3000`.

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
## Autenticación

Las contraseñas se protegen con bcrypt. El factor de costo se obtiene de `BCRYPT_SALT_ROUNDS`, configurado en `10`.

Al crear un usuario o cambiar su contraseña se generan un nuevo salt con `bcrypt.genSalt` y un nuevo hash con `bcrypt.hash`. Ambos se almacenan juntos en `salt_key` y `password_hash`. La contraseña se verifica con `bcrypt.compare`.

Las funciones reutilizables `hashPassword` y `verifyPassword` están en `utils/passwords.js`, separadas del controller de usuarios. `User.toJSON()` oculta `password`, `password_hash` y `salt_key` en las respuestas.

### Login

`POST /api/auth/login` recibe `email` y `password` en un cuerpo JSON.

Si las credenciales son correctas y el usuario está activo, responde `200` con un token firmado mediante jsonwebtoken y el algoritmo `HS256`. El token identifica al usuario mediante `sub` y contiene los datos estándar de emisión, expiración, issuer y audience.

Los datos incompletos reciben `400`. Las credenciales incorrectas y los usuarios inactivos reciben `401` con el mensaje genérico `Invalid credentials`.

### Usuario autenticado

`GET /api/auth/me` utiliza el middleware `authenticate`. Este verifica la firma, expiración, issuer y audience mediante express-jwt, permitiendo únicamente `HS256`.

A partir de `req.auth.sub`, busca al usuario, comprueba que esté activo y lo coloca en `req.user`.

Con un token válido responde `200` con los datos seguros del usuario. Un token inexistente, inválido o expirado recibe `401` en JSON. También se rechaza con `401` si el usuario del token ya no existe o está inactivo.

Ejemplo del encabezado:

```text
Authorization: Bearer <token>
```

### Variables de entorno

Crear `.env` a partir de `.env.example` y asignar una clave privada y aleatoria a `JWT_SECRET`.

```env
JWT_SECRET=
JWT_EXPIRES_IN=15m
JWT_ISSUER=stride-co
JWT_AUDIENCE=stride-co-api
BCRYPT_SALT_ROUNDS=10
```

La expiración configurada es de **15 minutos**. El archivo `.env` está excluido mediante `.gitignore`; el repositorio conserva `.env.example` sin secretos reales.

## Control de acceso basado en roles

### Descripción

El proyecto implementa un sistema de control de acceso basado en roles (RBAC, Role-Based Access Control). La autenticación identifica al usuario mediante un token JWT, mientras que la autorización determina qué operaciones puede realizar según los permisos asociados a su rol.

Los permisos se obtienen de la base de datos mediante la relación entre las entidades `Role` y `Permission`, utilizando la tabla intermedia `role_permissions`. No se utilizan nombres de roles codificados en el middleware para decidir el acceso.

### Convención de permisos

Cada permiso utiliza el formato:

`recurso:acción:posesión`

- **Recurso:** entidad sobre la que se realiza la operación, por ejemplo, `products` u `orders`.
- **Acción:** operación permitida: `create`, `read`, `update` o `delete`.
- **Posesión:** `own` permite operar únicamente sobre recursos propios; `any` permite operar sobre recursos de cualquier usuario, según el permiso concedido.

Ejemplos:

| Permiso | Significado |
|---|---|
| `products:delete:any` | Eliminar cualquier producto. |
| `orders:read:own` | Consultar únicamente órdenes propias. |
| `orders:read:any` | Consultar órdenes de cualquier usuario. |
| `orders:update:own` | Actualizar únicamente órdenes propias. |

### Matriz de permisos

La siguiente tabla muestra los escenarios de autorización comprobados mediante pruebas automatizadas. Los permisos efectivos de cada rol dependen de los registros almacenados en la base de datos.

| Rol de prueba | Permiso o escenario | Resultado esperado |
|---|---|---|
| ADMIN | `products:delete:any` | Permitido |
| SALES | Eliminar productos sin `products:delete:any` | Denegado |
| USER | `orders:read:own` sobre una orden propia | Permitido |
| USER | `orders:read:own` sobre una orden ajena | Denegado |
| USER | Consultar una orden ajena sin `orders:read:any` | Denegado |

### Endpoints protegidos

Las rutas protegidas utilizan primero el middleware `authenticate` y después `authorize`.

| Método | Endpoint | Permiso requerido |
|---|---|---|
| POST | `/api/products` | `products:create:any` |
| GET | `/api/products` | `products:read:any` |
| GET | `/api/products/:id` | `products:read:any` |
| PUT | `/api/products/:id` | `products:update:any` |
| DELETE | `/api/products/:id` | `products:delete:any` |
| POST | `/api/orders` | `orders:create:any` |
| GET | `/api/orders/:id` | `orders:read:own` u `orders:read:any` |
| PUT | `/api/orders/:id` | `orders:update:own` |
| DELETE | `/api/orders/:id` | `orders:delete:own` |

### Validación de la posesión

Para las órdenes, el middleware verifica la propiedad del recurso mediante la relación entre `Order` y `Customer`. Compara el usuario asociado al cliente (`Customer.userId`) con el identificador del usuario autenticado (`req.user.id`).

Cuando el permiso es `own`, una orden perteneciente a otro usuario se rechaza con HTTP `403 Forbidden`. Cuando existe el permiso `any` para la lectura de órdenes, se permite consultar órdenes de otros usuarios.

### Respuestas de autorización

- **401 Unauthorized:** no se proporcionó un token válido o el usuario no está autenticado.
- **403 Forbidden:** el usuario está autenticado, pero no tiene el permiso necesario o no es propietario del recurso.
- **404 Not Found:** la orden solicitada no existe.

### Pruebas automatizadas

Las pruebas de `test/rbac.test.js` utilizan Jest y Supertest para verificar los escenarios de acceso permitido y denegado, incluida la validación de propiedad de las órdenes.