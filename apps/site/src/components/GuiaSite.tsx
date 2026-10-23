import type { Dia, Entrada, ResumenDia } from "../lib/guia";
import Marco from "../Marco";
import Futuro from "../react-pages/Futuro";
import Guia from "../react-pages/Guia";
import Normas from "../react-pages/Normas";

/**
 * La guía, con su marco y su línea del tiempo (ADR 0047).
 *
 * Cada modo es una página: un día, el futuro o las normas. La cabecera y la
 * línea del tiempo son las mismas; debajo solo cambia lo que se lee.
 */

interface Props {
  modo: "dia" | "futuro" | "normas";
  dias: ResumenDia[];
  activo: string;
  dia?: Dia;
  introduccion?: string;
  futuras?: Entrada[];
  normas?: string;
}

export default function GuiaSite({
  modo,
  dias,
  activo,
  dia,
  introduccion,
  futuras,
  normas
}: Props) {
  return (
    <Marco dias={dias} activo={activo}>
      {modo === "dia" && dia ? (
        <Guia dia={dia} dias={dias} introduccion={introduccion} />
      ) : null}
      {modo === "futuro" && futuras ? (
        <Futuro futuras={futuras} dias={dias} />
      ) : null}
      {modo === "normas" && normas ? <Normas normas={normas} /> : null}
    </Marco>
  );
}
