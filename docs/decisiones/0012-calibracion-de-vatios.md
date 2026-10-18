# ADR 0012 — Calibración de los vatios de un enchufe

**Fecha:** 2026-10-18 · **Estado:** implementado y probado con datos simulados; falta calibrar el enchufe real

## Problema
Primera comparación real (18-oct): el enchufe BSD04 leía **48 W** donde un medidor de referencia (un cabezote con pantalla) marcaba **44 W**: un error de **+9,1 %**. Cumple por poco el criterio (≤ 10 %), pero el error se arrastra al costo y a todo lo que se calcula con los vatios.

## Qué se hizo
- Cada enchufe guarda un **factor de calibración** (1 = sin ajuste) y con qué medidor se calibró.
- **Calibrar:** en la pantalla del enchufe («Calibrar los vatios») la persona conecta un dispositivo, mira lo que marca su medidor y lo escribe. La API compara con lo que lee el enchufe y calcula `factor = referencia / lectura_cruda` (con 48 W leídos y 44 W de referencia: 0,9167).
- **Se aplica a las lecturas nuevas al guardarlas** (`potencia_w × factor`), así el costo, los avisos, los consejos y el semáforo usan los vatios ya corregidos sin tocar cada consulta. **El historial no cambia.**
- **Qué lectura cruda se usa:** el promedio de las lecturas de los últimos 90 s posteriores a la última calibración (deshaciendo el factor vigente), así recalibrar parte siempre de lo que realmente midió el enchufe y no acumula ajustes.
- **Cuándo se rechaza** (con el mensaje explicado): menos de 4 lecturas recientes (hay que esperar); dispositivo apagado; menos de 5 W (el error del medidor de referencia domina); lectura que oscila más del 10 % (no es una referencia estable); diferencia de más del 50 % entre el enchufe y el medidor (casi seguro el medidor mide otra cosa). Referencia válida: 0 < W ≤ 3.000.
- **Quitar la calibración** vuelve el factor a 1 (las lecturas nuevas se guardan sin ajuste).
- **Modo de pruebas con varias cuentas (ADR 0011):** cada cuenta aplica su propio factor a la misma lectura cruda.

## Decisiones y límites
- **Un solo punto de referencia, corrección de ganancia** (multiplicar). Si el error fuera un desfase fijo (por ejemplo +3 W a cualquier carga), un solo punto lo disfraza: lo ideal es calibrar con una carga parecida a la que se va a medir. Con dos cargas distintas (por ejemplo 40 W y 100 W) se podría ajustar ganancia y desfase; no se hizo porque con un enchufe de 10 A y una sola referencia disponible no hay cómo validarlo.
- Solo el **titular** de la casa calibra.
- El voltaje y la corriente no se ajustan: solo los vatios (los que usa el costo).
- Esto corrige el **enchufe**, no el medidor de referencia: si el cabezote tuviera su propio error, la calibración lo heredaría. Para el criterio de calidad conviene verificar con un bombillo incandescente de potencia nominal conocida.

## Cómo calibrar (para el equipo)
1. Conecta al enchufe un dispositivo de carga constante que gaste al menos 5 W (un bombillo incandescente es ideal; evita cargas con motor que oscilan).
2. Pon el cabezote entre el enchufe y el dispositivo, o mide el mismo dispositivo con el medidor de referencia.
3. En la app: Explorar › Enchufes › el enchufe › **Calibrar los vatios**: escribe lo que marca el medidor y toca «Calibrar ahora».
4. Comprueba: la app debe mostrar los mismos vatios que el medidor (puede tardar 5 s en reflejarlo, la lectura nueva).
