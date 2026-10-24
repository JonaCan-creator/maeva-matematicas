# MaEva — Asistente Virtual de Cálculo y Precálculo

Proyecto inicial académico basado en la guía de la Universidad Mariano Gálvez.

## Incluye en esta primera versión
- Operaciones simbólicas: simplificar, factorizar y desarrollar.
- Resolver ecuaciones igualadas a cero.
- Dominio real de funciones continuas.
- Límites, derivadas e integrales definidas e indefinidas.
- Evaluar funciones, composición y análisis inicial de puntos críticos.
- Graficador interactivo.
- 10 ejercicios de práctica con retroalimentación.
- Validación básica de entradas y mensajes de error.
- Campos para los integrantes, asignatura y sección.

## Requisitos
Python 3.10 o posterior recomendado.

## Ejecutar en Windows
1. Instala Python desde https://www.python.org/downloads/ y marca **Add Python to PATH**.
2. Extrae el ZIP.
3. Abre CMD o PowerShell en la carpeta `MaEva`.
4. Ejecuta:

   ```bash
   py -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   py app.py
   ```

5. Abre http://127.0.0.1:5000

## Importante sobre esta versión
- El servidor calcula con SymPy. Las explicaciones son plantillas didácticas iniciales; todavía no se conecta a una API de IA generativa.
- La gráfica usa Plotly y Math.js por CDN. Para que funcione, se necesita conexión a internet.
- Antes de publicar: completar los nombres reales, probar todos los módulos y configurar despliegue seguro. No publicar el servidor de desarrollo de Flask en producción.
- La comparación de algunas respuestas de práctica es básica y debe ampliarse con pruebas de equivalencia matemática.
- Esta versión no sustituye una revisión académica: hay casos de dominio, rango, límites laterales, soluciones complejas y clasificación de extremos que requieren pruebas adicionales.


## Publicación en Render

- Build Command: `pip install -r requirements.txt`
- Start Command: `gunicorn app:app`
- Python: usar una versión compatible con Flask y SymPy.

La calculadora utiliza Math.js desde CDN, así que requiere conexión a internet para esa biblioteca.
