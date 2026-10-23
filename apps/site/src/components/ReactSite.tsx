import Marco from "../Marco";
import Inicio from "../react-pages/Inicio";

export default function ReactSite({ lang = "es" }: { lang?: string }) {
  return (
    <Marco lang={lang}>
      <Inicio lang={lang} />
    </Marco>
  );
}
