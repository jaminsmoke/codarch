// La guía de CodArch: el índice, la línea del tiempo y el «dónde estoy».
//
// Cuatro cosas, y ninguna necesita red:
//   1. el índice se arma con las entradas que hay en el documento;
//   2. la línea del tiempo pone una idea por punto, y al pulsarla salta;
//   3. la entrada que estás leyendo se marca en las dos;
//   4. la barra de arriba dice cuánto has leído.

const bloques = Array.from(
  document.querySelectorAll(".contenido > section, .contenido > article")
);
const lista = document.getElementById("indice-lista");
const puntos = document.getElementById("linea-puntos");
const tramo = document.getElementById("linea-tramo");
const leyendo = document.getElementById("linea-leyendo");
const progreso = document.getElementById("progreso");
const boton = document.getElementById("arriba");
const cuantas = document.getElementById("cuantas");

const entradas = bloques.filter((bloque) => bloque.classList.contains("entrada"));

/** La fecha de una entrada: la que tiene escrita debajo del título. */
const fechaDe = (entrada) =>
  entrada.querySelector(".fecha")?.textContent?.trim() ?? "";

/** El distintivo de la entrada: de ahí sale el color del punto. */
const distintivoDe = (entrada) => entrada.querySelector(".badge")?.className ?? "";

/** "2026-10-21" -> "21 oct" */
function fechaCorta(fecha) {
  const partes = fecha.split("-");
  if (partes.length !== 3) return fecha;
  const meses = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic"
  ];
  const mes = Number(partes[1]) - 1;
  return `${Number(partes[2])} ${meses[mes] ?? partes[1]}`;
}

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

// 2. La línea del tiempo: un punto por idea.
const puntosPorId = new Map();

for (const entrada of entradas) {
  const item = document.createElement("li");
  item.className = "linea-punto";

  const botonPunto = document.createElement("button");
  botonPunto.type = "button";
  botonPunto.className = "linea-boton";
  botonPunto.dataset.titulo = entrada.dataset.titulo ?? "";
  botonPunto.dataset.estado = distintivoDe(entrada);
  botonPunto.setAttribute("aria-label", entrada.dataset.titulo ?? entrada.id);

  // La casilla: altura fija, con el punto centrado en la línea.
  const casilla = document.createElement("span");
  casilla.className = "linea-casilla";
  const punto = document.createElement("span");
  punto.className = "linea-punto-grafico";
  casilla.append(punto);

  const fecha = document.createElement("span");
  fecha.className = "linea-fecha";
  fecha.textContent = fechaCorta(fechaDe(entrada));

  botonPunto.append(casilla, fecha);
  botonPunto.addEventListener("click", () => {
    entrada.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${entrada.id}`);
  });

  item.append(botonPunto);
  puntos.append(item);
  puntosPorId.set(entrada.id, botonPunto);
}

if (cuantas) {
  cuantas.textContent = String(entradas.length);
}

/** El centro de un punto, medido desde la cinta. */
const centroDe = (punto) => {
  if (!punto || !puntos) return 0;
  const caja = punto.getBoundingClientRect();
  const cinta = puntos.getBoundingClientRect();
  return caja.left + caja.width / 2 - cinta.left;
};

// 3. Dónde estás: la entrada más alta que sigue en pantalla es la actual.
const marcar = (id) => {
  for (const [clave, enlace] of enlaces) {
    if (clave === id) {
      enlace.setAttribute("aria-current", "true");
    } else {
      enlace.removeAttribute("aria-current");
    }
  }
  for (const [clave, punto] of puntosPorId) {
    if (clave === id) {
      punto.setAttribute("aria-current", "true");
    } else {
      punto.removeAttribute("aria-current");
    }
  }
  if (leyendo) {
    leyendo.textContent = enlaces.get(id)?.textContent ?? "";
  }
  if (tramo) {
    // El tramo va del primer punto al que estás leyendo.
    const primero = [...puntosPorId.values()][0];
    const centro = centroDe(puntosPorId.get(id));
    tramo.style.left = `${centroDe(primero)}px`;
    tramo.style.width = `${Math.max(0, centro - centroDe(primero))}px`;
  }
};

const visibles = new Map();
const observador = new IntersectionObserver(
  (observadas) => {
    for (const observada of observadas) {
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

// 4. El progreso y el botón de volver arriba.
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
