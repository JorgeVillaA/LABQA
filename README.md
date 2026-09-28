# QA Inventory Lab — Sistema de Inventarios con bugs para practicar QA

Laboratorio pequeño en **Node + Express + SQLite** para pruebas QA manuales.
Todo error funcional, visual o de idioma es **intencional**. No abras issues por bugs de la app.

## 1. Requisitos

- Node.js 22.5+ (`node --version`)
- npm

## 2. Instalación y uso en local

```bash
cd qa-inventory-lab
npm install
npm start
```

Abrir: **http://localhost:3000** (redirige a `/login.html`)

Resetear datos a estado inicial:

```bash
npm run reset-db
npm start
```

## 3. Credenciales demo (datos internos)

| Usuario   | Clave      | Rol      |
|-----------|------------|----------|
| `admin`   | `admin123` | admin    |
| `vendedor`| `venta123` | vendedor |

Hay 23 productos precargados en 5 categorías: Electrónica, Ropa, Alimentos, Hogar, Deportes.

## 4. Qué probar (alcance sugerido)

1. **Login:** válidos, inválidos, vacíos, espacios al inicio/fin, copiar-pegar.
2. **Inicio:** KPIs, gráficas (movimiento mensual con selector 3/6/12 meses y
   toggle Valor/Unidades, stock por mes, top productos con tabs y filtro,
   stock por categoría). Compara el KPI "Valor inventario" (total completo)
   con la tarjeta "Valor total (Stock value)" del módulo.
3. **Inventario:** tarjetas de totales, tabla, búsqueda, filtro por categoría,
   ordenar por precio, paginación (10 por página, configurable en Configuración),
   crear / editar / eliminar, botón "Vender 1".
4. **Ingresos:** tabla de entradas por mes con totales.
5. **Reportes:** descarga CSV y JSON, ábrelos en Excel/editor y compara con la tabla.
6. **POS:** vende productos (prueba doble clic rápido en "Cobrar / Vender").
7. **Configuración:** cambia productos por página y restablece los datos.
8. **Seguridad básica (nivel avanzado):**
   - Entrar directo a `http://localhost:3000/dashboard.html` sin login.
   - Llamar a la API sin token: `curl http://localhost:3000/api/products`.
   - Crear producto con `curl` con stock/precio negativo (la UI valida poco,
     ¿y el backend?).
   - Crear producto con nombre `<img src=x onerror=alert(1)>` y ver la tabla.
4. **Visual / responsive:** 1440px vs 375px (DevTools > device toolbar),
   idiomas mezclados, formatos de fecha y moneda.
5. **Cálculos:** compara el "Valor total" con la suma real
   (`precio × stock` de todos los productos). Prueba con decimales 0.1 y 0.2.

## 5. Cómo reportar un bug (plantilla)

```text
Título: [Módulo] resumen corto
Severidad: Alta / Media / Baja
Pasos:
1. ...
2. ...
Resultado esperado: ...
Resultado actual: ...
Evidencia: captura / video
Ambiente: OS + navegador + http://localhost:3000
```

## 6. Notas

- La DB es un archivo local `inventory.db` (SQLite). Se crea solo al arrancar.
- El "token" de login es simulado y no protege nada a propósito.
- Si el puerto 3000 está ocupado: `PORT=4000 npm start`.

¡A romperlo! 🔍
