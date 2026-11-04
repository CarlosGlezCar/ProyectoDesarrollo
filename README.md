# Stride & Co. — Backend de tienda deportiva

**Proyecto Integrador · Entregable 2 · Desarrollo de Aplicaciones Web**  
**Repositorio:** https://github.com/CarlosGlezCar/ProyectoDesarrollo  
**Rama de entrega:** [`staging`](https://github.com/CarlosGlezCar/ProyectoDesarrollo/tree/staging)  
**API pública:** https://proyectodesarrollo-1.onrender.com  
**Health Check:** https://proyectodesarrollo-1.onrender.com/health

> **Estado de esta documentación:** la API fue puesta en marcha en Render y los logs compartidos por el equipo confirman la conexión a PostgreSQL y MongoDB Atlas, la sincronización de tablas y el inicio del servidor en el puerto asignado. Los datos señalados como **PENDIENTE** deben completarse o comprobarse antes de entregar. No se publican secretos reales.

## 1. Descripción

Stride & Co. es el backend de una tienda deportiva que busca sustituir la gestión manual de productos, inventario, clientes y pedidos por una API centralizada. La aplicación incluye autenticación mediante JWT, permisos basados en roles (RBAC), internacionalización y persistencia en bases de datos relacionales y documentales.

**Equipo:** José Fernando Martínez Pacheco (Product Owner), Elio Castillo Reyes (Scrum Master), Carlos González Carrera (Developer) y Bruno Salazar Carrillo (Developer).

### Tecnologías

| Capa | Tecnología |
| --- | --- |
| Servidor HTTP | Node.js 22, Express 4 |
| Autenticación | `jsonwebtoken`, `express-jwt`, `bcrypt` |
| Autorización | `accesscontrol`, permisos en PostgreSQL |
| Base de datos relacional | PostgreSQL, Sequelize, `pg`, `pg-hstore` |
| Base de datos documental | MongoDB Atlas / MongoDB local, Mongoose |
| Traducciones | `i18n`, archivos `locales/es.json` y `locales/en.json` |
| Configuración | `config` 4.x |
| Plantillas | Pug |
| Calidad | ESLint, Jest, Supertest |
| Despliegue | Docker y Render Web Service |

## 2. Arquitectura y persistencia

```text
Cliente HTTP
   |
   v
Render Web Service (Express / Node.js)
   |-- GET /health
   |-- /api/auth -> JWT
   |-- /api/* -> authenticate -> authorize (RBAC) -> controller
   |
   |-- Sequelize ----------> Render PostgreSQL
   |   users, roles, permissions, products, variants, inventory
   |
   `-- Mongoose -----------> MongoDB Atlas
       customers, orders
```

La fuente de verdad de los permisos son las relaciones de PostgreSQL entre `Role`, `Permission` y su tabla intermedia. Las órdenes y los clientes se almacenan en MongoDB.

## 3. Instalación desde cero

### Requisitos

- Node.js **22**, npm y Git.
- PostgreSQL local accesible (puerto habitual `5432`) o una instancia configurada para desarrollo.
- MongoDB local o un clúster de MongoDB Atlas.
- Opcional: Docker para trabajar con contenedores.

### Descargar dependencias

```bash
git clone https://github.com/CarlosGlezCar/ProyectoDesarrollo.git
cd ProyectoDesarrollo
git switch staging
npm ci
```

### Preparar la configuración privada de desarrollo

```bash
cp config/local-development.example.json config/local-development.json
```

En Windows PowerShell, si no dispones de `cp`:

```powershell
Copy-Item config/local-development.example.json config/local-development.json
```

Edita **solo** el archivo privado `config/local-development.json` con tus valores locales:

```json
{
  "jwt": {
    "secret": "REEMPLAZAR_CON_UNA_CLAVE_ALEATORIA_LARGA"
  },
  "database": {
    "postgres": {
      "password": "CONTRASENA_LOCAL_DE_POSTGRESQL"
    },
    "mongo": {
      "uri": "mongodb://127.0.0.1:27017/stride_co"
    }
  }
}
```

En `config/default.json` se encuentran los parámetros no secretos, como el puerto `3000`, el host `localhost`, el nombre de la base `stride_co` y el usuario de PostgreSQL. Ajusta esos valores locales únicamente si tu instalación es diferente. Si utilizas Atlas para desarrollo, reemplaza la URI de MongoDB por una URI privada de Atlas **sin subirla a Git**.

### Preparar las bases de datos

1. Inicia PostgreSQL y crea una base de datos llamada `stride_co` y un usuario con acceso a ella; la contraseña de ese usuario debe coincidir con `config/local-development.json`.
2. Inicia MongoDB local o configura MongoDB Atlas con una base de datos `stride_co`.
3. Comprueba que la aplicación pueda conectarse a ambas bases.
4. Inicia la aplicación; la versión desplegada realiza la conexión y la sincronización de modelos Sequelize durante el arranque.

### Ejecutar

```bash
npm start
```

Servicio local: `http://localhost:3000`  
Comprobación: `http://localhost:3000/health`

```bash
curl http://localhost:3000/health
```

Respuesta esperada:

```json
{"status":"UP"}
```

Para desarrollo con reinicio automático, el proyecto dispone de `npm run dev`. Para ejecutar con otro puerto, configura `PORT` en el proceso.

### Carga de datos iniciales (seed)

El Entregable 2 exige un comando que cree roles, permisos y relaciones, un usuario activo por rol y datos de muestra para los recursos:

```bash
npm run seed
```

**PENDIENTE:** en el `package.json` consultado de `staging`, el script `seed` aún no está declarado; este comando funcionará cuando el equipo incorpore el seeder y su entrada en `scripts`. Ejecutarlo en producción requiere conectarse a las bases correctas y emplear exclusivamente usuarios de demostración con contraseñas ficticias.

## 4. Configuración por entornos y secretos

Se utiliza la biblioteca `config`. Los archivos versionados deben almacenar únicamente configuración pública; las claves y contraseñas deben permanecer fuera de Git.

| Archivo | Uso | ¿Se sube a Git? |
| --- | --- | --- |
| `config/default.json` | Valores generales y no secretos | Sí |
| `config/development.json` | Opciones públicas de desarrollo, si existe | Sí |
| `config/test.json` | Pruebas aisladas con valores ficticios | Sí |
| `config/production.json` | Opciones públicas de producción | Sí |
| `config/custom-environment-variables.json` | Mapea `PORT` a `server.port` | Sí |
| `config/local-development.example.json` | Plantilla sin secretos válidos | Sí |
| `config/local-development.json` | Secretos de desarrollo | **No** |
| `config/local-production.json` | Secretos de producción | **No** |

Las variables de entorno previstas para la aplicación son `NODE_ENV` (`development`, `test`, `production`) y `PORT` (asignada por Render). Los módulos de la aplicación deben leer las demás propiedades mediante `config.get('...')`, sin utilizar `dotenv`.

En desarrollo se emplean las conexiones locales; en producción se utiliza la URL interna de PostgreSQL y la URI de MongoDB Atlas. El servidor debe rechazar el arranque si falta `jwt.secret`.

### Entrega de secretos a Render

En el Web Service de Render, configura `NODE_ENV=production` y crea en **Environment → Secret Files** un archivo llamado `local-production.json`. Render lo monta como `/etc/secrets/local-production.json`; el `Dockerfile` enlaza ese archivo con `/app/config/local-production.json` antes de ejecutar `npm start`.

**Estructura ilustrativa (los valores son marcadores, no credenciales):**

```json
{
  "jwt": {
    "secret": "CLAVE_PRIVADA_NO_PUBLICAR"
  },
  "database": {
    "postgres": {
      "url": "POSTGRES_INTERNAL_DATABASE_URL_PRIVADA",
      "ssl": false
    },
    "mongo": {
      "uri": "MONGODB_ATLAS_URI_PRIVADA"
    }
  }
}
```

El equipo no debe incluir el archivo real en el repositorio, las capturas, el README ni la imagen Docker. Las conexiones externas a Render PostgreSQL, cuando se utilicen desde una computadora, requieren la configuración SSL correspondiente.

## 5. API y endpoints

**URL base:** `https://proyectodesarrollo-1.onrender.com`

Las rutas usan JSON y, para los recursos protegidos, el encabezado `Authorization: Bearer <token>`. Una respuesta estándar debe seguir la forma `{ "message": "mensaje traducido", "data": ... }`.

**Leyenda de seguridad:** la columna **RBAC requerido** indica la política que debe verificarse en la versión final según el entregable. **Aplicado** indica que el middleware `authorize(...)` aparece en las rutas de `staging` que se pudieron consultar; **Pendiente** indica que la ruta consultada aún no lo mostraba. Esta tabla no equivale a una certificación de que todos los endpoints pasaron pruebas E2E.

| Método | Endpoint | Descripción | RBAC requerido | Revisión de rutas |
| --- | --- | --- | --- | --- |
| GET | `/` | Página de inicio (Pug) | Público | Público esperado |
| GET | `/health` | Estado del servidor | Público | Público esperado |
| POST | `/api/auth/login` | Iniciar sesión, obtener JWT | Público | Público |
| GET | `/api/auth/me` | Consultar usuario autenticado | Solo JWT | `authenticate` |
| POST | `/api/users` | Crear usuario | `users:create:any` | Pendiente |
| GET | `/api/users` | Listar usuarios | `users:read:any` | Pendiente |
| GET | `/api/users/:id` | Consultar usuario | `users:read:any` | Pendiente |
| PUT | `/api/users/:id` | Actualizar usuario | `users:update:any` | Pendiente |
| DELETE | `/api/users/:id` | Eliminar usuario | `users:delete:any` | Pendiente |
| POST | `/api/roles` | Crear rol | `roles:create:any` | Pendiente |
| GET | `/api/roles` | Listar roles | `roles:read:any` | Pendiente |
| GET | `/api/roles/:id` | Consultar rol | `roles:read:any` | Pendiente |
| PUT | `/api/roles/:id` | Modificar rol | `roles:update:any` | Pendiente |
| POST | `/api/permissions` | Crear permiso | `permissions:create:any` | Pendiente |
| GET | `/api/permissions` | Listar permisos | `permissions:read:any` | Pendiente |
| GET | `/api/permissions/:id` | Consultar permiso | `permissions:read:any` | Pendiente |
| PUT | `/api/permissions/:id` | Modificar permiso | `permissions:update:any` | Pendiente |
| DELETE | `/api/permissions/:id` | Eliminar permiso | `permissions:delete:any` | Pendiente |
| POST | `/api/products` | Crear producto | `products:create:any` | Aplicado |
| GET | `/api/products` | Listar productos | `products:read:any` | Aplicado |
| GET | `/api/products/:id` | Consultar producto | `products:read:any` | Aplicado |
| PUT | `/api/products/:id` | Actualizar producto | `products:update:any` | Aplicado |
| DELETE | `/api/products/:id` | Eliminar producto | `products:delete:any` | Aplicado |
| POST | `/api/variants` | Crear variante | `variants:create:any` | Pendiente |
| GET | `/api/variants` | Listar variantes | `variants:read:any` | Pendiente |
| GET | `/api/variants/:id` | Consultar variante | `variants:read:any` | Pendiente |
| PUT | `/api/variants/:id` | Actualizar variante | `variants:update:any` | Pendiente |
| DELETE | `/api/variants/:id` | Eliminar variante | `variants:delete:any` | Pendiente |
| GET | `/api/inventory` | Listar existencias | `inventory:read:any` | Pendiente |
| GET | `/api/inventory/:id` | Consultar existencia | `inventory:read:any` | Pendiente |
| PUT | `/api/inventory/:id` | Actualizar existencia | `inventory:update:any` | Pendiente |
| POST | `/api/customers` | Crear cliente | `customers:create:any` | Pendiente |
| GET | `/api/customers` | Listar clientes | `customers:read:any` | Pendiente |
| GET | `/api/customers/:id` | Consultar cliente | `customers:read:any` | Pendiente |
| PUT | `/api/customers/:id` | Actualizar cliente | `customers:update:any` | Pendiente |
| DELETE | `/api/customers/:id` | Eliminar cliente | `customers:delete:any` | Pendiente |
| POST | `/api/orders` | Crear pedido | `orders:create:any` | Aplicado |
| GET | `/api/orders/:id` | Consultar pedido | `orders:read:own` **o** `orders:read:any` | Aplicado (`ownOrAny`) |
| PUT | `/api/orders/:id` | Modificar pedido propio | `orders:update:own` | Aplicado |
| DELETE | `/api/orders/:id` | Eliminar pedido propio | `orders:delete:own` | Aplicado |

**Aclaración de cobertura:** en las rutas consultadas no están declarados `DELETE /api/roles`, `POST /api/inventory`, `DELETE /api/inventory` ni `GET /api/orders`; no se deben presentar como implementados. Si el equipo añade estos métodos, actualizar la tabla y sus permisos correspondientes.

### Códigos HTTP previstos

| Código | Caso |
| --- | --- |
| `200` | Consulta o actualización correcta |
| `201` | Creación correcta |
| `400` | Datos inválidos, identificador incorrecto o duplicidad |
| `401` | JWT ausente, inválido o expirado |
| `403` | Permiso insuficiente o acceso `own` a un recurso ajeno |
| `404` | Recurso inexistente |
| `500` | Error inesperado |

Nunca deben devolverse `password`, `password_hash` ni `salt_key`.

## 6. Control de acceso basado en roles (RBAC)

La autenticación valida quién realiza la solicitud; la autorización comprueba qué acciones puede ejecutar. Los permisos se guardan en PostgreSQL y se consultan desde la relación `Role → RolePermission → Permission`, con `accesscontrol`.

La clave de cada permiso usa el formato:

```text
recurso:accion:alcance
```

Por ejemplo, `products:delete:any`, `orders:read:own` y `orders:read:any`.

- `any`: la operación puede aplicarse a cualquier registro dentro de los permisos concedidos.
- `own`: solo puede aplicarse a un registro propiedad del usuario autenticado. Para órdenes, se verifica la relación `Order → Customer → userId`.

### Matriz mínima de escenarios RBAC

La siguiente matriz contiene los **escenarios requeridos por el entregable y descritos por las pruebas RBAC del proyecto**. **PENDIENTE:** contrastarla con los registros creados por el seed y completar la matriz integral de permisos para `users`, `roles`, `permissions`, `products`, `variants`, `inventory`, `customers` y `orders`.

| Rol | Operación | Resultado esperado |
| --- | --- | --- |
| `admin` | `products:delete:any` | Permitido |
| `sales` | `products:delete:any` | `403 Forbidden` |
| `user` | `orders:read:own` de una orden propia | Permitido |
| `user` | `orders:read:own` de una orden ajena | `403 Forbidden` |
| `user` | `orders:read:any` | `403 Forbidden` |

El middleware reutilizable `authorize(recurso, accion, alcance)` debe ejecutarse después de `authenticate` en todas las rutas protegidas. Las rutas `/`, `/health` y `/api/auth/login` son públicas; `/api/auth/me` exige autenticación, sin permiso RBAC adicional.

## 7. Internacionalización (i18n)

La aplicación admite los idiomas **español (`es`)** e **inglés (`en`)**, mediante `i18n` y archivos de claves en `locales/es.json` y `locales/en.json`.

La prioridad de idioma requerida es:

1. Parámetro `?lang=es` o `?lang=en`.
2. Encabezado `Accept-Language: es` o `Accept-Language: en`.
3. Idioma por defecto: `es`.

Las variantes regionales, como `es-MX`, se interpretan por su idioma base. Los idiomas no admitidos deben usar el idioma por defecto. Tanto los mensajes de respuestas y errores como las vistas Pug deben traducirse.

```bash
curl -H "Accept-Language: en" https://proyectodesarrollo-1.onrender.com/health
curl -H "Accept-Language: es" https://proyectodesarrollo-1.onrender.com/health
```

> `/health` siempre devuelve el estado técnico `UP`; para comprobar cambios de idioma es necesario consultar un endpoint que devuelva un campo `message` traducido.

**Agregar un idioma nuevo:** crea `locales/<codigo>.json` con las mismas claves, registra el código en la configuración de `i18n`, actualiza la selección de idioma y agrega pruebas de equivalencia de claves y traducciones.

## 8. API pública: despliegue y ejemplos

| Dato | Valor |
| --- | --- |
| URL pública | **https://proyectodesarrollo-1.onrender.com** |
| Health Check | `GET https://proyectodesarrollo-1.onrender.com/health` |
| Estado observado | El equipo confirmó arranque con MongoDB Atlas y PostgreSQL conectados |
| Host de API | Render Web Service, Docker, Node.js 22 |
| Rama de despliegue | `staging` |
| Base relacional | Render PostgreSQL (plan gratuito) |
| Región PostgreSQL | **PENDIENTE: copiar región exacta del panel de Render** |
| Fecha de creación PostgreSQL | **PENDIENTE: anotar fecha exacta de creación** |
| Base documental | MongoDB Atlas, clúster `Cluster0` |
| Proveedor de Atlas | AWS |
| Región de Atlas | Oregon (`us-west-2`) |
| Network Access de Atlas | `0.0.0.0/0` configurado para permitir la salida variable de Render; proteger con credenciales robustas |
| Secretos de producción | Render Secret Files; no se almacenan en el repositorio ni en el Dockerfile |

> El PostgreSQL gratuito de Render tiene una vigencia limitada. Revisar las condiciones actuales del plan en https://render.com/docs/free y verificar que la base permanezca activa para la evaluación.

### Usuarios de demostración

**PENDIENTE:** registrar únicamente los usuarios ficticios **realmente creados por `npm run seed`**. No se inventan correos ni contraseñas.

| Rol | Correo de demostración | Contraseña exclusiva de demostración |
| --- | --- | --- |
| `admin` | **PENDIENTE** | **PENDIENTE** |
| `sales` | **PENDIENTE** | **PENDIENTE** |
| `user` | **PENDIENTE** | **PENDIENTE** |

Las contraseñas documentadas aquí deben ser exclusivamente de cuentas ficticias, no reutilizadas en otros servicios.

### Ejemplo de login

Reemplaza el correo y la contraseña por los de un usuario **de demostración** creado por el seed:

```bash
curl -X POST \
  "https://proyectodesarrollo-1.onrender.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "Accept-Language: es" \
  -d '{"email":"CORREO_DEMO","password":"CONTRASENA_DEMO"}'
```

En la respuesta, copia el JWT que devuelva la implementación real y úsalo en la siguiente consulta:

```bash
curl "https://proyectodesarrollo-1.onrender.com/api/products?lang=en" \
  -H "Authorization: Bearer TU_TOKEN_JWT" \
  -H "Accept-Language: en"
```

La consulta anterior requiere un rol con permiso `products:read:any`. Para comprobar `403`, repite una operación con un rol sin el permiso correspondiente (por ejemplo, la eliminación de un producto como `sales`, según la matriz esperada). **No borres datos reales para realizar esta prueba; utiliza registros de demostración.**

## 9. Pruebas y calidad

### ESLint

```bash
npm run lint
```

### Jest y Supertest con mocks

```bash
npm test
```

Estas pruebas no deben depender de PostgreSQL ni de MongoDB reales. `NODE_ENV=test` debe seleccionar `config/test.json` y sus valores ficticios.

### Pruebas E2E contra la API real

El Entregable 2 requiere pruebas Jest + Supertest en `test/e2e/` para salud, autenticación, CRUD, códigos de error, relaciones, RBAC e i18n. Las pruebas deben limpiar los datos que crean.

**PENDIENTE:** agregar el script `test:e2e` al `package.json` y los archivos E2E si todavía no están integrados. Una vez implementado:

```bash
npm run test:e2e
```

Pruebas contra Render en Bash:

```bash
E2E_BASE_URL=https://proyectodesarrollo-1.onrender.com npm run test:e2e
```

En PowerShell:

```powershell
$env:E2E_BASE_URL="https://proyectodesarrollo-1.onrender.com"
npm run test:e2e
```

**Evidencias por agregar antes de entregar:** captura de resultados de `npm run test:e2e` ejecutado contra Render y archivo [`docs/e2e-antigravity.md`](docs/e2e-antigravity.md), con los prompts utilizados, modificaciones revisadas por el equipo y evidencia de la sesión de Antigravity con la cuenta institucional de la UACH.

## 10. Despliegue con Render

1. Mantener actualizado `staging` mediante Pull Requests desde las ramas de trabajo, con Conventional Commits.
2. Crear una base de datos Render PostgreSQL y conservar su **Internal Database URL** como secreto.
3. Configurar MongoDB Atlas y permitir el acceso desde Render con un usuario exclusivo de base de datos.
4. Crear un Render **Web Service** conectado a este repositorio, con despliegue Docker desde `staging`.
5. Asignar `NODE_ENV=production` y dejar que Render proporcione `PORT`.
6. Subir `local-production.json` por **Environment → Secret Files**.
7. Configurar el **Health Check Path** como `/health`.
8. Desplegar y revisar los logs hasta confirmar conexión a ambas bases, tablas sincronizadas y servidor escuchando.
9. Ejecutar el seed contra las bases de producción una vez esté implementado; realizar las pruebas de autenticación, RBAC e i18n y guardar evidencia.

Render puede suspender el Web Service gratuito por inactividad; conviene abrir `/health` antes de ejecutar pruebas E2E. No publiques nunca credenciales, archivos de secretos, URIs completas ni claves JWT en commits, incidencias o capturas.

## 11. Pendientes antes de la revisión final

- [ ] Confirmar que el código actual de `staging` no contenga claves JWT fijas ni contraseñas publicadas; **rotar cualquier secreto expuesto**.
- [ ] Completar `authenticate` y `authorize` en todas las rutas requeridas y traducir errores y respuestas.
- [ ] Terminar los CRUD exigidos por la rúbrica, agregar validación `400` y asegurar que los datos sensibles nunca se devuelvan.
- [ ] Agregar `npm run seed` con roles, permisos, usuarios ficticios y registros de muestra; ejecutar contra producción.
- [ ] Completar la matriz RBAC con los permisos efectivos del seed y verificar los cinco escenarios obligatorios.
- [ ] Agregar `npm run test:e2e`, ejecutar la suite completa y subir las evidencias de Render y Antigravity.
- [ ] Sustituir **PENDIENTE** por la región y la fecha reales de Render PostgreSQL y las credenciales **ficticias** de los usuarios demo.
- [ ] Confirmar resultados correctos de `npm run lint`, `npm test` y `npm run test:e2e` sin errores.
- [ ] Verificar que la URL pública responda `GET /health` y que login, JWT, RBAC e i18n funcionen en producción.

## 12. Referencias

- [Render: planes gratuitos](https://render.com/docs/free)
- [Sequelize](https://sequelize.org/)
- [Mongoose](https://mongoosejs.com/)
- [Node config](https://github.com/node-config/node-config)
- [i18n para Node.js](https://www.npmjs.com/package/i18n)
- [AccessControl](https://www.npmjs.com/package/accesscontrol)
- [Jest](https://jestjs.io/)
- [Supertest](https://www.npmjs.com/package/supertest)
- [Conventional Commits](https://www.conventionalcommits.org/)