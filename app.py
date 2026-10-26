import os
import random
import re
from flask import Flask, render_template, request, jsonify
import sympy as sp
from sympy.parsing.sympy_parser import (
    parse_expr, standard_transformations, implicit_multiplication_application,
    convert_xor
)

app = Flask(__name__)
x, y = sp.symbols("x y")
TRANSFORMS = standard_transformations + (
    implicit_multiplication_application, convert_xor
)
SAFE_GLOBALS = {
    "__builtins__": {},
    "Integer": sp.Integer, "Float": sp.Float, "Rational": sp.Rational,
    "Symbol": sp.Symbol, "Add": sp.Add, "Mul": sp.Mul, "Pow": sp.Pow,
}
SAFE_LOCALS = {
    "x": x, "y": y, "pi": sp.pi, "e": sp.E,
    "sin": sp.sin, "cos": sp.cos, "tan": sp.tan,
    "sqrt": sp.sqrt, "log": sp.log, "ln": sp.log,
    "exp": sp.exp, "abs": sp.Abs,
}


def parse_math(raw):
    if not isinstance(raw, str) or not raw.strip():
        raise ValueError("Escribe una expresión matemática.")

    raw = raw.strip()

    # Permitir funciones escritas como f(x)=...
    raw = re.sub(
        r"^\s*f\s*\(\s*x\s*\)\s*=\s*",
        "",
        raw,
        flags=re.IGNORECASE
    )

    if len(raw) > 180:
        raise ValueError("La expresión es demasiado larga (máximo 180 caracteres).")

    # Normalizar exponentes y símbolos matemáticos comunes
    raw = raw.replace("−", "-")
    raw = raw.replace("×", "*")
    raw = raw.replace("÷", "/")
    raw = raw.replace("²", "^2")
    raw = raw.replace("³", "^3")
    raw = raw.replace("⁴", "^4")
    raw = raw.replace("⁵", "^5")
    raw = raw.replace("⁶", "^6")
    raw = raw.replace("⁷", "^7")
    raw = raw.replace("⁸", "^8")
    raw = raw.replace("⁹", "^9")

    # Validar los caracteres permitidos
    if not re.fullmatch(r"[0-9a-zA-Z_+\-*/^().,\s]+", raw):
        raise ValueError(
            "Hay caracteres no permitidos. Usa números, x, operaciones y funciones conocidas."
        )

    expr = parse_expr(
        raw.replace("^", "**"),
        local_dict=SAFE_LOCALS.copy(),
        global_dict=SAFE_GLOBALS,
        transformations=TRANSFORMS,
        evaluate=True
    )
    if not expr.free_symbols.issubset({x, y}):
        raise ValueError("Solo se permiten las variables x e y.")

    return expr


def latex(expr):
    return sp.latex(expr)

def result(answer, steps, extra=None):
    data = {"answer": str(answer), "answer_latex": latex(answer) if isinstance(answer, sp.Basic) else None, "steps": steps}
    if extra:
        data.update(extra)
    return data

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/solve", methods=["POST"])
def solve():
    try:
        data = request.get_json(force=True) or {}
        mode = data.get("mode", "simplify")
        raw = data.get("expression", "")
        expr = parse_math(raw)
        steps = [f"Expresión ingresada: {sp.sstr(expr)}"]

        if mode == "simplify":
            ans = sp.simplify(expr)
            steps += ["Aplicamos simplificación algebraica.", f"Resultado simplificado: {sp.sstr(ans)}"]
            return jsonify(result(ans, steps))
        if mode == "factor":
            ans = sp.factor(expr)
            steps += ["Buscamos factores algebraicos equivalentes.", f"Factorización: {sp.sstr(ans)}"]
            return jsonify(result(ans, steps))
        if mode == "expand":
            ans = sp.expand(expr)
            steps += ["Aplicamos la propiedad distributiva y desarrollamos los productos.", f"Expresión desarrollada: {sp.sstr(ans)}"]
            return jsonify(result(ans, steps))
        if mode == "equation":
            equation = sp.Eq(expr, 0)
            ans = sp.solve(equation, x)
            steps += ["Igualamos la expresión a cero.", "Resolvemos la ecuación para x."]
            return jsonify(result(ans, steps))
        if mode == "limit":
            point_raw = str(data.get("point", "")).strip()
            if not point_raw:
                raise ValueError("Para calcular un límite, indica a qué valor tiende x.")
            point = sp.sympify(point_raw, locals={"oo": sp.oo, "-oo": -sp.oo, "pi": sp.pi})
            ans = sp.limit(expr, x, point)
            steps += [f"Evaluamos el límite cuando x tiende a {sp.sstr(point)}.", "SymPy determina el límite simbólico, cuando existe."]
            return jsonify(result(ans, steps))
        if mode == "derivative":
            ans = sp.diff(expr, x)
            steps += ["Aplicamos las reglas de derivación respecto de x.", f"Derivada: {sp.sstr(ans)}"]
            return jsonify(result(ans, steps))
        if mode == "integral":
            ans = sp.integrate(expr, x)
            steps += ["Integramos respecto de x.", "Para una integral indefinida se agrega la constante de integración C."]
            return jsonify(result(ans, steps, {"indefinite": True, "answer_text": f"{sp.sstr(ans)} + C"}))
        if mode == "definite":
            lower_raw = str(data.get("lower", "")).strip()
            upper_raw = str(data.get("upper", "")).strip()
            if not lower_raw or not upper_raw:
                raise ValueError("Indica el límite inferior y el límite superior.")
            lower = sp.sympify(lower_raw, locals={"pi": sp.pi})
            upper = sp.sympify(upper_raw, locals={"pi": sp.pi})
            anti = sp.integrate(expr, x)
            ans = sp.integrate(expr, (x, lower, upper))
            steps += [f"Una antiderivada es {sp.sstr(anti)}.", f"Evaluamos F({sp.sstr(upper)}) − F({sp.sstr(lower)}).", f"Integral definida: {sp.sstr(ans)}."]
            return jsonify(result(ans, steps, {"lower": str(lower), "upper": str(upper)}))
        if mode == "evaluate":
            val_raw = str(data.get("point", "")).strip()
            if not val_raw:
                raise ValueError("Indica el valor de x para evaluar la función.")
            val = sp.sympify(val_raw, locals={"pi": sp.pi})
            ans = sp.simplify(expr.subs(x, val))
            steps += [f"Sustituimos x = {sp.sstr(val)}.", f"Calculamos: {sp.sstr(ans)}."]
            return jsonify(result(ans, steps))
        if mode == "critical":
            derivative = sp.diff(expr, x)
            points = sp.solve(sp.Eq(derivative, 0), x)
            second = sp.diff(expr, x, 2)
            details = []
            for p in points:
                try:
                    fval = sp.simplify(expr.subs(x, p))
                    second_val = sp.simplify(second.subs(x, p))
                    if second_val.is_positive:
                        kind = "mínimo relativo (prueba de la segunda derivada)"
                    elif second_val.is_negative:
                        kind = "máximo relativo (prueba de la segunda derivada)"
                    else:
                        kind = "punto crítico; la prueba de la segunda derivada no concluye"
                    details.append({"x": str(p), "y": str(fval), "classification": kind})
                except Exception:
                    details.append({"x": str(p), "y": str(expr.subs(x,p)), "classification": "punto crítico"})
            steps += [f"Primera derivada: {sp.sstr(derivative)}.", f"Resolvemos f'(x) = 0: {sp.sstr(points)}.", f"Segunda derivada: {sp.sstr(second)}."]
            return jsonify(result(points, steps, {"critical_points": details, "derivative": sp.sstr(derivative), "second_derivative": sp.sstr(second)}))
        if mode == "domain":
            ans = sp.calculus.util.continuous_domain(expr, x, sp.S.Reals)
            steps += ["Buscamos los valores reales donde la expresión está definida y es continua."]
            return jsonify(result(ans, steps))
        if mode == "compose":
            other = parse_math(data.get("second_expression", ""))
            ans = sp.simplify(expr.subs(x, other))
            steps += [f"Componemos f(g(x)) sustituyendo x por {sp.sstr(other)}."]
            return jsonify(result(ans, steps))
        return jsonify({"error": "Operación no reconocida."}), 400
    except (ValueError, TypeError, SyntaxError, sp.SympifyError, ZeroDivisionError) as e:
        return jsonify({"error": str(e) or "No se pudo interpretar la expresión. Revisa los datos."}), 400
    except Exception:
        return jsonify({"error": "No se pudo resolver este caso. Revisa la expresión o prueba con una forma más sencilla."}), 400

PRACTICE = [
    {"question":"Simplifica: 2*x + 3*x", "expression":"2*x+3*x", "mode":"simplify", "expected":"5*x", "hint":"Suma los coeficientes de términos semejantes."},
    {"question":"Factoriza: x^2 - 9", "expression":"x^2-9", "mode":"factor", "expected":"(x - 3)*(x + 3)", "hint":"Es una diferencia de cuadrados."},
    {"question":"Deriva: x^3", "expression":"x^3", "mode":"derivative", "expected":"3*x**2", "hint":"Usa la regla de la potencia."},
    {"question":"Deriva: 4*x^2 - 2*x", "expression":"4*x^2-2*x", "mode":"derivative", "expected":"8*x - 2", "hint":"Deriva cada término por separado."},
    {"question":"Integra: 2*x", "expression":"2*x", "mode":"integral", "expected":"x**2", "hint":"Aumenta el exponente en uno y divide por el nuevo exponente."},
    {"question":"Límite cuando x→2: (x^2-4)/(x-2)", "expression":"(x^2-4)/(x-2)", "mode":"limit", "point":"2", "expected":"4", "hint":"Factoriza x²−4 y simplifica antes de sustituir."},
    {"question":"Resuelve: x^2 - 4 = 0", "expression":"x^2-4", "mode":"equation", "expected":"[-2, 2]", "hint":"Iguala a cero y factoriza."},
    {"question":"Evalúa f(x)=x^2+1 en x=3", "expression":"x^2+1", "mode":"evaluate", "point":"3", "expected":"10", "hint":"Sustituye x por 3."},
    {"question":"Desarrolla: (x+2)^2", "expression":"(x+2)^2", "mode":"expand", "expected":"x**2 + 4*x + 4", "hint":"Usa (a+b)² = a²+2ab+b²."},
    {"question":"Calcula ∫₀¹ 2*x dx", "expression":"2*x", "mode":"definite", "lower":"0", "upper":"1", "expected":"1", "hint":"Encuentra una antiderivada y evalúa F(1)−F(0)."}
]

@app.route("/api/practice", methods=["GET"])
def practice():
    item = random.choice(PRACTICE)
    return jsonify({k:v for k,v in item.items() if k not in ("expected", "hint")})

@app.route("/api/practice/check", methods=["POST"])
def practice_check():
    data = request.get_json(force=True) or {}
    question = data.get("question")
    answer = str(data.get("answer", "")).strip()
    item = next((p for p in PRACTICE if p["question"] == question), None)
    if not item:
        return jsonify({"error":"No se encontró ese ejercicio. Genera otro e inténtalo de nuevo."}), 400
    try:
        user_expr = parse_math(answer)
        expected_expr = parse_math(item["expected"])
        correct = sp.simplify(user_expr - expected_expr) == 0
        # For equation solutions or factored forms, compare symbolic expressions if direct comparison isn't enough.
        if not correct and item["mode"] == "factor":
            correct = sp.simplify(user_expr - expected_expr) == 0 or sp.simplify(user_expr - parse_math(item["expression"])) == 0
        return jsonify({"correct": bool(correct), "feedback": "¡Correcto! Buen trabajo." if correct else "Todavía no. Revisa el procedimiento y vuelve a intentarlo.", "hint": item["hint"], "expected": item["expected"] if not correct else None})
    except Exception:
        return jsonify({"correct":False, "feedback":"No pude interpretar tu respuesta. Usa una expresión como 3*x^2 o x+2.", "hint":item["hint"], "expected":item["expected"]}), 200

if __name__ == "__main__":
    app.run(debug=True)
