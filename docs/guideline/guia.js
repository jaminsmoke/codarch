// La guía de CodArch: el índice y el «dónde estoy».
//
// Tres cosas, y ninguna necesita red:
//   1. el índice se arma con las entradas que hay en el documento;
//   2. la entrada que estás leyendo se marca en el índice;
//   3. la barra de arriba dice cuánto has leído.

const bloques = Array.from(
  document.querySelectorAll(".contenido > section, .contenido > article")
);
const lista = document.getElementById("indice-lista");
const progreso = document.getElementById("progreso");
const boton = document.getElementById("arriba");
const cuantas = document.getElementById("cuantas");

// 1. El índice.
for (const bloque of bloques) {
  const titulo = bloque.dataset.titulo;
  const id = bloque.id;
  if (!titulo || !id) continue;

  const item = document.createElement("li");
  const enlace = document.createElement("a");
  enlace.href = `#${id}`;
  enlace.textContent = titulo;
  if (bloque.classList.contains("entrada")) {
    enlace.classList.add("entrada-indice");
  }
  item.append(enlace);
  lista.append(item);
}

const enlaces = new Map(
  Array.from(lista.querySelectorAll("a")).map((enlace) => [
    enlace.getAttribute("href").slice(1),
    enlace
  ])
);

const entradas = bloques.filter((bloque) => bloque.classList.contains("entrada"));
if (cuantas) {
  cuantas.textContent = String(entradas.length);
}

// 2. Dónde estás: la entrada más alta que sigue en pantalla es la actual.
const marcar = (id) => {
  for (const [clave, enlace] of enlaces) {
    const activo = clave === id;
    if (activo) {
      enlace.setAttribute("aria-current", "true");
    } else {
      enlace.removeAttribute("aria-current");
    }
  }
};

const visibles = new Map();
const observador = new IntersectionObserver(
  (entradasObservadas) => {
    for (const observada of entradasObservadas) {
      visibles.set(observada.target.id, observada);
    }
    let actual = null;
    for (const bloque of bloques) {
      const estado = visibles.get(bloque.id);
      if (estado && estado.isIntersecting) {
        actual = bloque.id;
        break;
      }
    }
    if (!actual) {
      // Nada visible: se queda con la última que pasó por arriba.
      actual = [...visibles.entries()].find(([, e]) => e.boundingClientRect.top < 0);
      actual = actual ? actual[0] : actual;
    }
    if (actual) marcar(actual);
  },
  { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
);

for (const bloque of bloques) {
  observador.observe(bloque);
}

// 3. El progreso y el botón de volver arriba.
const actualizarProgreso = () => {
  const alto = document.documentElement.scrollHeight - window.innerHeight;
  const hecho = alto > 0 ? Math.min(1, window.scrollY / alto) : 0;
  if (progreso) progreso.style.width = `${(hecho * 100).toFixed(1)}%`;
  if (boton) boton.hidden = window.scrollY < window.innerHeight * 0.6;
};

window.addEventListener("scroll", actualizarProgreso, { passive: true });
actualizarProgreso();

if (boton) {
  boton.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}
