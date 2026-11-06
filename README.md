# Stride & Co. — Backend de tienda deportiva

**Proyecto Integrador · Entregable 2 · Desarrollo de Aplicaciones Web**

**Repositorio:** https://github.com/CarlosGlezCar/ProyectoDesarrollo

**Rama de entrega:** `staging`

**API pública:** https://proyectodesarrollo-1.onrender.com

**Health Check:** https://proyectodesarrollo-1.onrender.com/health

> **Estado del proyecto:** se confirmó la conexión a PostgreSQL y MongoDB Atlas, la ejecución del seed, el inicio de sesión con JWT, controles básicos de RBAC, internacionalización en español e inglés y 16 pruebas locales aprobadas. Queda pendiente integrar y ejecutar las pruebas E2E del equipo y agregar sus evidencias.

---

## 1. Descripción del proyecto

Stride & Co. es el backend de una tienda deportiva desarrollado para administrar productos, variantes, inventario, clientes, pedidos y usuarios mediante una API REST.

El sistema utiliza autenticación mediante JSON Web Tokens (JWT), control de acceso basado en roles (RBAC), internacionalización y persistencia en bases de datos relacionales y documentales.

### Integrantes del equipo

| Integrante | Rol |
|---|---|
| José Fernando Martínez Pacheco | Product Owner |
| Elio Castillo Reyes | Scrum Master |
| Carlos González Carrera | Developer |
| Bruno Salazar Carrillo | Developer |

### Tecnologías utilizadas

| Componente | Tecnología |
|---|---|
| Backend | Node.js 22 y Express |
| Autenticación | JWT, express-jwt y bcrypt |
| Autorización | AccessControl y RBAC |
| Base de datos relacional | PostgreSQL |
| ORM | Sequelize |
| Base de datos documental | MongoDB Atlas |
| ODM | Mongoose |
| Internacionalización | i18n |
| Configuración | node-config |
| Vistas | Pug |
| Pruebas | Jest y Supertest |
| Calidad del código | ESLint |
| Contenedores | Docker |
| Despliegue | Render |
| Control de versiones | Git y GitHub |

---

## 2. Arquitectura del sistema

El backend está construido sobre Express y utiliza dos bases de datos.

**PostgreSQL** almacena los datos relacionales:

- Usuarios.
- Roles.
- Permisos.
- Productos.
- Variantes.
- Inventario.

**MongoDB Atlas** almacena los datos documentales:

- Clientes.
- Órdenes o pedidos.

La aplicación utiliza Sequelize para PostgreSQL y Mongoose para MongoDB.

### Flujo de las solicitudes

```text
Cliente HTTP
    |
    v
Express
    |
    v
Internacionalización (i18n)
    |
    v
Router
    |
    v
Autenticación JWT
    |
    v
Autorización RBAC
    |
    v
Controller
    |
    +-------------------+
    |                   |
    v                   v
Sequelize           Mongoose
    |                   |